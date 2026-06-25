import { XMLParser } from "fast-xml-parser";
import { endpointFor } from "./endpoints";
import type { RealTradeKind, RealTxRecord } from "./types";

const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

function toArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

export function parseResponse(body: string): { resultCode: string; items: Record<string, string>[]; totalCount: number } {
  const obj = body.trimStart().startsWith("<") ? xml.parse(body) : JSON.parse(body);
  const res = obj.response ?? obj;
  const header = res.header ?? {};
  const b = res.body ?? {};
  const items = toArray<Record<string, string>>(b.items?.item);
  return { resultCode: String(header.resultCode ?? ""), items, totalCount: Number(b.totalCount ?? items.length) };
}

const num = (s: string | undefined): number | null => {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const manwon = (s: string | undefined): number | null => { const n = num(s); return n == null ? null : n * 10000; };

export function normalizeItems(items: Record<string, string>[], propertyType: string, kind: RealTradeKind): RealTxRecord[] {
  const ep = endpointFor(propertyType, kind);
  if (!ep) return [];
  return items.map((it) => {
    const r: RealTxRecord = { propertyType, kind, name: "", umdNm: "", jibun: "", area: null, dealDate: "" };
    r.name = String(it[ep.nameField] ?? "").trim();
    r.umdNm = String(it.umdNm ?? "").trim();
    r.jibun = String(it.jibun ?? "").trim();
    if (it.roadNm) r.roadNm = String(it.roadNm).trim();
    // 면적
    const areaField = Object.keys(ep.fieldMap).find((k) => ep.fieldMap[k] === "area");
    if (areaField) r.area = num(it[areaField]);
    // 금액
    if (kind === "sale") { r.dealAmount = manwon(it.dealAmount); r.isCanceled = String(it.cdealType ?? "").trim() === "O"; }
    else { r.deposit = manwon(it.deposit); r.monthlyRent = manwon(it.monthlyRent); }
    if (it.floor != null) r.floor = num(it.floor) == null ? null : Math.trunc(num(it.floor)!);
    if (it.buildYear != null) r.buildYear = num(it.buildYear) == null ? null : Math.trunc(num(it.buildYear)!);
    // 날짜
    const y = String(it.dealYear ?? "").padStart(4, "0");
    const m = String(it.dealMonth ?? "").padStart(2, "0");
    const d = String(it.dealDay ?? "").padStart(2, "0");
    r.dealDate = y.length === 4 ? `${y}${m}${d}` : "";
    // 임대 부가
    if (kind === "rent") {
      r.isRenewal = String(it.contractType ?? "").trim() === "갱신";
      r.preDeposit = manwon(it.preDeposit);
      r.preMonthlyRent = manwon(it.preMonthlyRent);
    }
    return r;
  });
}
