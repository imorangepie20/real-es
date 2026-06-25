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
  const url = new URL(operationUrl(ep.service));
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("LAWD_CD", lawdCd);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");
  let res: Response;
  try { res = await fetch(url, { cache: "no-store" }); } catch { return null; }
  if (!res.ok) return null;
  const parsed = parseResponse(await res.text());
  if (parsed.resultCode && parsed.resultCode !== "000") return null;
  const records = normalizeItems(parsed.items, propertyType, kind);
  await db.realTxCache.upsert({
    where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } },
    create: { lawdCd, dealYmd, propertyType, kind, records: records as unknown as object, totalCount: parsed.totalCount },
    update: { records: records as unknown as object, totalCount: parsed.totalCount, fetchedAt: new Date() },
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
