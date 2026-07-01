import { db } from "@/lib/db";
import { getApiKey } from "@/lib/config/keys";
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

// data.go.kr serviceKey는 Encoding/Decoding 2형으로 발급된다. 어느 형이든 정확히 1번만
// 인코딩되도록 정규화한다(이미 인코딩된 키를 searchParams로 또 인코딩하면 인증 실패).
function encodeServiceKey(raw: string): string {
  try { return encodeURIComponent(decodeURIComponent(raw)); } catch { return encodeURIComponent(raw); }
}

// 성공 코드: 실거래 API는 정상 시 resultCode "000" 또는 "00"을 준다(서비스별 상이).
const OK_RESULT_CODES = new Set(["000", "00"]);
const ERR_ENVELOPE = /<returnReasonCode>|<cmmMsgHeader>|<errMsg>|<returnAuthMsg>/i;
function isOkResponse(resultCode: string, body: string): boolean {
  if (OK_RESULT_CODES.has(resultCode)) return true;
  return resultCode === "" && !ERR_ENVELOPE.test(body); // 코드 없고 에러봉투도 없으면 정상 취급
}

async function fetchMonth(lawdCd: string, dealYmd: string, propertyType: string, kind: RealTradeKind, currentYmd: string): Promise<RealTxRecord[] | null> {
  const ep = endpointFor(propertyType, kind);
  if (!ep) return [];
  const cached = await db.realTxCache.findUnique({ where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } } });
  const recent = dealYmd >= recentMonths(2, currentYmd)[0]; // 당월·전월만 TTL
  if (cached && (!recent || Date.now() - cached.fetchedAt.getTime() < FRESH_MS)) {
    return cached.records as unknown as RealTxRecord[];
  }
  // serviceKey는 정규화 후 raw로 부착(searchParams.set은 재인코딩하므로 쓰지 않음). 나머지 파라미터만 인코딩.
  const key = encodeServiceKey(await getApiKey("publicDataApiKey", "PUBLIC_DATA_API_KEY"));
  const rest = new URLSearchParams({ LAWD_CD: lawdCd, DEAL_YMD: dealYmd, numOfRows: "1000" });
  const pageUrl = (p: number) => `${operationUrl(ep.service)}?serviceKey=${key}&${rest.toString()}&pageNo=${p}`;
  const label = `${ep.service} ${dealYmd}`;

  // 1페이지 먼저 요청 — 실패 시 null 반환(failedMonths 처리). 실패 사유는 서버 로그로 노출.
  let res: Response;
  try { res = await fetch(pageUrl(1), { cache: "no-store" }); }
  catch (e) { console.warn(`[realprice] ${label} fetch 예외:`, String(e)); return null; }
  const firstText = await res.text();
  if (!res.ok) { console.warn(`[realprice] ${label} HTTP ${res.status} — ${firstText.slice(0, 120)}`); return null; }
  const firstParsed = parseResponse(firstText);
  if (!isOkResponse(firstParsed.resultCode, firstText)) {
    console.warn(`[realprice] ${label} 응답거부 resultCode=${firstParsed.resultCode || "(none)"} — ${firstText.slice(0, 160)}`);
    return null;
  }

  const allItems = [...firstParsed.items];
  const totalCount = firstParsed.totalCount;

  // 총 건수가 1페이지(1000건)를 초과하면 추가 페이지 요청
  // 안전 상한: 20페이지(=20,000건) — totalCount 오류로 인한 무한 루프 방지
  const MAX_PAGES = 20;
  let pageNo = 2;
  while (allItems.length < totalCount && pageNo <= MAX_PAGES) {
    try {
      const pageRes = await fetch(pageUrl(pageNo), { cache: "no-store" });
      if (!pageRes.ok) break; // 후속 페이지 실패 → 지금까지 누적분으로 진행
      const pageText = await pageRes.text();
      const pageParsed = parseResponse(pageText);
      if (!isOkResponse(pageParsed.resultCode, pageText)) break;
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
