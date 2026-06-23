"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { getComplexArticles, getRegionArticles, listComplexesByRegion } from "@/lib/naver";

export type Region = { code: string; name: string; naverCode: string | null };
export type ComplexRow = { complexNumber: string; name: string; totalHouseholds: number | null; dealCount: number; leaseDepositCount: number; leaseMonthlyCount: number };
export type ArticleRow = { articleNumber: string; realEstateType: string; tradeType: string; price: string | null; rentPrice: string | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

type DbArticle = { articleNumber: string; realEstateType: string | null; tradeType: string; price: bigint | null; rentPrice: bigint | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };
const toRow = (a: DbArticle): ArticleRow => ({
  articleNumber: a.articleNumber, realEstateType: a.realEstateType ?? "", tradeType: a.tradeType,
  price: a.price?.toString() ?? null, rentPrice: a.rentPrice?.toString() ?? null,
  areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong: a.dong, realtorName: a.realtorName,
});

export async function getSidos(): Promise<Region[]> {
  await requireUser();
  const rows = await db.legalDivision.findMany({ where: { level: "SIDO" }, orderBy: { code: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getSigungus(sidoCode: string): Promise<Region[]> {
  await requireUser();
  const rows = await db.legalDivision.findMany({ where: { level: "SIGUNGU", sidoCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getEmds(sigunguCode: string): Promise<Region[]> {
  await requireUser();
  const rows = await db.legalDivision.findMany({ where: { level: "EMD", sigunguCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: r.naverCode }));
}

export async function loadComplexes(naverCode: string, realEstateType: string, tradeType: string, refresh = false): Promise<ComplexRow[]> {
  await requireUser();
  const readFromDb = async (): Promise<ComplexRow[]> => {
    const rows = await db.complex.findMany({ where: { regionCode: naverCode, type: realEstateType }, orderBy: { totalHouseholds: "desc" } });
    return rows.map((c) => {
      const raw = (c.raw ?? {}) as { dealCount?: number; leaseDepositCount?: number; leaseMonthlyCount?: number };
      return { complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: raw.dealCount ?? 0, leaseDepositCount: raw.leaseDepositCount ?? 0, leaseMonthlyCount: raw.leaseMonthlyCount ?? 0 };
    });
  };

  if (!refresh) {
    const cached = await readFromDb();
    if (cached.length) return cached;
  }
  await listComplexesByRegion(naverCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
  return readFromDb();
}

export async function loadRegionArticles(naverCode: string, realEstateType: string, tradeType: string, refresh = false): Promise<{ articles: ArticleRow[] }> {
  await requireUser();
  const readFromDb = async () => {
    const rows = await db.article.findMany({ where: { regionCode: naverCode, realEstateType, tradeType }, orderBy: { fetchedAt: "desc" } });
    return rows.map(toRow);
  };
  if (!refresh) { const cached = await readFromDb(); if (cached.length) return { articles: cached }; }
  await getRegionArticles(naverCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
  return { articles: await readFromDb() };
}

export async function loadArticles(complexNumber: string, tradeTypes: string[], refresh = false): Promise<{ articles: ArticleRow[]; lat: number | null; lng: number | null }> {
  await requireUser();

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
