import type { RealStats, RealTxRecord } from "./types";

const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const AREA_BANDS = [
  { label: "~60㎡", max: 60 }, { label: "60~85㎡", max: 85 }, { label: "85~135㎡", max: 135 }, { label: "135㎡~", max: Infinity },
];

export function computeStats(records: RealTxRecord[]): RealStats {
  const prices = records.map(price).filter((v): v is number => v != null);
  const perArea = records.map((r) => { const p = price(r); return p != null && r.area ? p / r.area : null; }).filter((v): v is number => v != null);
  const byArea = AREA_BANDS.map((b, i) => ({
    label: b.label,
    count: records.filter((r) => r.area != null && r.area < b.max && (i === 0 || r.area >= AREA_BANDS[i - 1].max)).length,
  }));
  const months = [...new Set(records.map((r) => r.dealDate.slice(0, 6)).filter(Boolean))].sort();
  const byMonth = months.map((ym) => {
    const rs = records.filter((r) => r.dealDate.startsWith(ym));
    return { ym, count: rs.length, avgPrice: mean(rs.map(price).filter((v): v is number => v != null)) };
  });

  const stats: RealStats = {
    count: records.length, avgPrice: mean(prices), medianPrice: median(prices), avgPerArea: mean(perArea), byArea, byMonth,
  };
  if (records.length && records[0].kind === "sale") {
    stats.canceledRatio = records.filter((r) => r.isCanceled).length / records.length;
  }
  if (records.length && records[0].kind === "rent") {
    stats.jeonseRatio = records.filter((r) => (r.monthlyRent ?? 0) === 0).length / records.length;
    stats.renewalRatio = records.filter((r) => r.isRenewal).length / records.length;
    const incs = records
      .filter((r) => r.isRenewal && r.preDeposit && r.deposit)
      .map((r) => ((r.deposit! - r.preDeposit!) / r.preDeposit!) * 100);
    stats.avgRentIncrease = mean(incs);
  }
  return stats;
}
