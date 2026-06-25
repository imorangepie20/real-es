"use server";
import { db } from "@/lib/db";
import { fetchRealTransactions, recentMonths } from "@/lib/realprice/fetch";
import { computeStats } from "@/lib/realprice/stats";
import { geocode } from "@/lib/realprice/geocode";
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

  // 동별 집계 + 좌표: LegalDivision(읍면동) 우선, 매칭 실패 시(군 지역의 리 등) 대표 지번 지오코딩 폴백.
  const dongs = [...new Set(records.map((r) => r.umdNm).filter(Boolean))];
  const divisions = await db.legalDivision.findMany({
    where: { level: "EMD", sigunguCode: filters.lawdCd },
  });
  const coordByName = new Map(divisions.map((d) => [d.name, d]));
  const sigungu = await db.legalDivision.findUnique({ where: { code: filters.lawdCd } });
  const regionFull = sigungu?.fullName ?? "";
  const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null;
  const byDong: { umdNm: string; count: number; avg: number | null; lat: number | null; lng: number | null }[] = [];
  for (const umdNm of dongs) {
    const rs = records.filter((r) => r.umdNm === umdNm);
    const ps = rs.map(price).filter((v): v is number => v != null);
    const d = coordByName.get(umdNm);
    let lat: number | null = d?.lat ?? null;
    let lng: number | null = d?.lng ?? null;
    if (lat == null && regionFull) {
      // 읍면동 매칭 실패 → 그 동의 대표 지번 주소로 좌표 조회(GeocodeCache 캐시).
      const sample = rs.find((r) => r.jibun);
      const g = await geocode(sample ? `${regionFull} ${umdNm} ${sample.jibun}` : `${regionFull} ${umdNm}`);
      if (g) { lat = g.lat; lng = g.lng; }
    }
    byDong.push({
      umdNm,
      count: rs.length,
      avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null,
      lat,
      lng,
    });
  }

  return { records, stats: computeStats(records), byDong, failedMonths };
}

export async function loadComplexPoints(items: { name: string; umdNm: string; jibun: string; count: number; avg: number | null }[], cityDivision: string): Promise<{ key: string; lat: number; lng: number; count: number; avg: number | null }[]> {
  if (!(await getCurrentUser())) throw new Error("인증이 필요합니다");
  const out: { key: string; lat: number; lng: number; count: number; avg: number | null }[] = [];
  for (const it of items.slice(0, 200)) { // 상한
    // 단지명은 주소가 아니라 지오코딩이 안 됨 → 지번 주소로 좌표 조회(지번 없으면 단지명 폴백).
    const addr = it.jibun ? `${cityDivision} ${it.umdNm} ${it.jibun}` : `${cityDivision} ${it.umdNm} ${it.name}`;
    const g = await geocode(addr);
    if (g) out.push({ key: `${it.umdNm}/${it.name}`, lat: g.lat, lng: g.lng, count: it.count, avg: it.avg });
  }
  return out;
}
