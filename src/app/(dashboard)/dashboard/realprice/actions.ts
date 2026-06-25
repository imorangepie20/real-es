"use server";
import { db } from "@/lib/db";
import { fetchRealTransactions, recentMonths } from "@/lib/realprice/fetch";
import { computeStats } from "@/lib/realprice/stats";
import type { RealTradeKind, RealStats, RealTxRecord } from "@/lib/realprice/types";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function loadRealPrice(filters: {
  lawdCd: string;
  propertyType: string;
  kind: RealTradeKind;
  months: number;
}): Promise<{
  records: RealTxRecord[];
  stats: RealStats;
  byDong: { umdNm: string; count: number; avg: number | null; lat: number | null; lng: number | null }[];
  failedMonths: string[];
}> {
  if (!(await getCurrentUser())) throw new Error("인증이 필요합니다");
  const now = new Date();
  const currentYmd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const months = recentMonths(filters.months, currentYmd);
  const { records, failedMonths } = await fetchRealTransactions({
    lawdCd: filters.lawdCd,
    propertyType: filters.propertyType,
    kind: filters.kind,
    months,
  });

  // 동별 집계 + LegalDivision 좌표
  const dongs = [...new Set(records.map((r) => r.umdNm).filter(Boolean))];
  const divisions = await db.legalDivision.findMany({
    where: { level: "EMD", sigunguCode: filters.lawdCd },
  });
  const coordByName = new Map(divisions.map((d) => [d.name, d]));
  const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null;
  const byDong = dongs.map((umdNm) => {
    const rs = records.filter((r) => r.umdNm === umdNm);
    const ps = rs.map(price).filter((v): v is number => v != null);
    const d = coordByName.get(umdNm);
    return {
      umdNm,
      count: rs.length,
      avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
      lat: d?.lat ?? null,
      lng: d?.lng ?? null,
    };
  });

  return { records, stats: computeStats(records), byDong, failedMonths };
}
