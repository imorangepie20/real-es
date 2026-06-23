"use server";

import { db } from "@/lib/db";
import { getComplexArticles, listComplexesByRegion } from "@/lib/naver";

export type Region = { code: string; name: string; naverCode: string | null };
export type ComplexRow = { complexNumber: string; name: string; totalHouseholds: number | null; dealCount: number; leaseDepositCount: number; leaseMonthlyCount: number };
export type ArticleRow = { articleNumber: string; tradeType: string; price: string | null; rentPrice: string | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };

export async function getSidos(): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "SIDO" }, orderBy: { code: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getSigungus(sidoCode: string): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "SIGUNGU", sidoCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getEmds(sigunguCode: string): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "EMD", sigunguCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: r.naverCode }));
}

export async function loadComplexes(naverCode: string, refresh = false): Promise<ComplexRow[]> {
  if (!refresh) {
    const cached = await db.complex.findMany({ where: { regionCode: naverCode }, orderBy: { totalHouseholds: "desc" } });
    if (cached.length) {
      return cached.map((c) => {
        const raw = (c.raw ?? {}) as { dealCount?: number; leaseDepositCount?: number; leaseMonthlyCount?: number };
        return { complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: raw.dealCount ?? 0, leaseDepositCount: raw.leaseDepositCount ?? 0, leaseMonthlyCount: raw.leaseMonthlyCount ?? 0 };
      });
    }
  }
  const list = await listComplexesByRegion(naverCode);
  return list.map((c) => ({ complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: c.dealCount, leaseDepositCount: c.leaseDepositCount, leaseMonthlyCount: c.leaseMonthlyCount }));
}

export async function loadArticles(complexNumber: string, tradeTypes: string[], refresh = false): Promise<{ articles: ArticleRow[]; lat: number | null; lng: number | null }> {
  const toRow = (a: { articleNumber: string; tradeType: string; price: bigint | null; rentPrice: bigint | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; realtorName: string | null; raw: unknown }): ArticleRow => {
    const raw = (a.raw ?? {}) as { dong?: string };
    return { articleNumber: a.articleNumber, tradeType: a.tradeType, price: a.price?.toString() ?? null, rentPrice: a.rentPrice?.toString() ?? null, areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong: raw.dong ?? null, realtorName: a.realtorName };
  };

  if (!refresh) {
    const complex = await db.complex.findUnique({ where: { complexNumber }, include: { articles: { orderBy: { fetchedAt: "desc" } } } });
    if (complex && complex.articles.length) {
      const filtered = tradeTypes.length ? complex.articles.filter((a) => tradeTypes.includes(a.tradeType)) : complex.articles;
      return { articles: filtered.map(toRow), lat: complex.lat, lng: complex.lng };
    }
  }
  await getComplexArticles(complexNumber, { tradeTypes });
  const complex = await db.complex.findUnique({ where: { complexNumber }, include: { articles: { orderBy: { fetchedAt: "desc" } } } });
  const arts = complex?.articles ?? [];
  const filtered = tradeTypes.length ? arts.filter((a) => tradeTypes.includes(a.tradeType)) : arts;
  return { articles: filtered.map(toRow), lat: complex?.lat ?? null, lng: complex?.lng ?? null };
}
