import { db } from "@/lib/db";
import { endpointFor, operationUrl } from "./endpoints";
import { parseResponse, normalizeItems } from "./normalize";
import type { RealTradeKind, RealTxRecord } from "./types";

export function recentMonths(n: number, fromYmd: string): string[] {
  const y = Number(fromYmd.slice(0, 4)); const m = Number(fromYmd.slice(4, 6));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const FRESH_MS = 24 * 60 * 60 * 1000; // 당월·전월 캐시 TTL

async function fetchMonth(lawdCd: string, dealYmd: string, propertyType: string, kind: RealTradeKind, currentYmd: string): Promise<RealTxRecord[] | null> {
  const ep = endpointFor(propertyType, kind);
  if (!ep) return [];
  const cached = await db.realTxCache.findUnique({ where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } } });
  const recent = dealYmd >= recentMonths(2, currentYmd)[0]; // 당월·전월만 TTL
  if (cached && (!recent || Date.now() - cached.fetchedAt.getTime() < FRESH_MS)) {
    return cached.records as unknown as RealTxRecord[];
  }
  const key = process.env.PUBLIC_DATA_API_KEY ?? "";
  // URL 기본 파라미터 세팅 (pageNo만 루프마다 바꿈)
  const baseUrl = new URL(operationUrl(ep.service));
  baseUrl.searchParams.set("serviceKey", key);
  baseUrl.searchParams.set("LAWD_CD", lawdCd);
  baseUrl.searchParams.set("DEAL_YMD", dealYmd);
  baseUrl.searchParams.set("numOfRows", "1000");

  // 1페이지 먼저 요청 — 실패 시 null 반환(failedMonths 처리)
  baseUrl.searchParams.set("pageNo", "1");
  let res: Response;
  try { res = await fetch(baseUrl, { cache: "no-store" }); } catch { return null; }
  if (!res.ok) return null;
  const firstParsed = parseResponse(await res.text());
  if (firstParsed.resultCode && firstParsed.resultCode !== "000") return null;

  const allItems = [...firstParsed.items];
  const totalCount = firstParsed.totalCount;

  // 총 건수가 1페이지(1000건)를 초과하면 추가 페이지 요청
  // 안전 상한: 20페이지(=20,000건) — totalCount 오류로 인한 무한 루프 방지
  const MAX_PAGES = 20;
  let pageNo = 2;
  while (allItems.length < totalCount && pageNo <= MAX_PAGES) {
    baseUrl.searchParams.set("pageNo", String(pageNo));
    try {
      const pageRes = await fetch(baseUrl, { cache: "no-store" });
      if (!pageRes.ok) break; // 후속 페이지 실패 → 지금까지 누적분으로 진행
      const pageParsed = parseResponse(await pageRes.text());
      if (pageParsed.resultCode && pageParsed.resultCode !== "000") break;
      if (pageParsed.items.length === 0) break; // 더 이상 데이터 없음
      allItems.push(...pageParsed.items);
    } catch {
      // 후속 페이지 네트워크 오류 → 부분 결과 사용(month 전체 폐기 안 함)
      break;
    }
    pageNo++;
  }

  const records = normalizeItems(allItems, propertyType, kind);
  await db.realTxCache.upsert({
    where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } },
    create: { lawdCd, dealYmd, propertyType, kind, records: records as unknown as object, totalCount },
    update: { records: records as unknown as object, totalCount, fetchedAt: new Date() },
  });
  return records;
}

export async function fetchRealTransactions(args: { lawdCd: string; propertyType: string; kind: RealTradeKind; months: string[] }): Promise<{ records: RealTxRecord[]; failedMonths: string[] }> {
  const now = new Date();
  const currentYmd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const records: RealTxRecord[] = [];
  const failedMonths: string[] = [];
  for (const ymd of args.months) {
    const r = await fetchMonth(args.lawdCd, ymd, args.propertyType, args.kind, currentYmd);
    if (r == null) failedMonths.push(ymd); else records.push(...r);
  }
  return { records, failedMonths };
}
