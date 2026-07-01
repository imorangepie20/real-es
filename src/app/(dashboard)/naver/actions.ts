"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { getArticleClusters, getClusteredArticles, getComplexArticles, getRegionArticles, listComplexesByRegion } from "@/lib/naver";
import type { NaverArticle } from "@/lib/naver";

export type Region = { code: string; name: string; naverCode: string | null };
export type ComplexRow = { complexNumber: string; name: string; totalHouseholds: number | null; dealCount: number; leaseDepositCount: number; leaseMonthlyCount: number; lat: number | null; lng: number | null };
export type ArticleRow = { articleNumber: string; name: string | null; realEstateType: string; tradeType: string; price: string | null; rentPrice: string | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null; address: string | null; approvalDate: string | null; lat: number | null; lng: number | null };
export type ClusterRow = { clusterId: string; lat: number | null; lng: number | null; count: number };

// 매물명 = 단지명 + 동명("N동")
const combineName = (name: string | null, dong: string | null): string | null =>
  [name, dong ? (dong.endsWith("동") ? dong : `${dong}동`) : null].filter(Boolean).join(" ") || null;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

type DbArticle = { articleNumber: string; realEstateType: string | null; tradeType: string; price: bigint | null; rentPrice: bigint | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null; lat: number | null; lng: number | null; raw: unknown };
const toRow = (a: DbArticle): ArticleRow => {
  const raw = (a.raw ?? {}) as { name?: string | null; dong?: string | null; address?: string | null; approvalDate?: string | null };
  const dong = a.dong ?? raw.dong ?? null;
  const name = combineName(raw.name ?? null, dong);
  return {
    articleNumber: a.articleNumber, name, realEstateType: a.realEstateType ?? "", tradeType: a.tradeType,
    price: a.price?.toString() ?? null, rentPrice: a.rentPrice?.toString() ?? null,
    areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong, realtorName: a.realtorName,
    address: raw.address ?? null, approvalDate: raw.approvalDate ?? null,
    lat: a.lat, lng: a.lng,
  };
};

// NaverArticle(클러스터 드릴 결과) → ArticleRow
const naverToRow = (a: NaverArticle): ArticleRow => ({
  articleNumber: a.articleNumber, name: combineName(a.name, a.dong), realEstateType: a.realEstateType, tradeType: a.tradeType,
  price: a.price != null ? String(a.price) : null, rentPrice: a.rentPrice != null ? String(a.rentPrice) : null,
  areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong: a.dong, realtorName: a.realtorName,
  address: a.address, approvalDate: a.approvalDate,
  lat: a.lat, lng: a.lng,
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
      return { complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: raw.dealCount ?? 0, leaseDepositCount: raw.leaseDepositCount ?? 0, leaseMonthlyCount: raw.leaseMonthlyCount ?? 0, lat: c.lat, lng: c.lng };
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

/** 비단지형 지도용 클러스터(원 안 숫자) — 단일 호출, 캐시 없음 */
export async function loadArticleClusters(naverCode: string, realEstateType: string, tradeType: string): Promise<ClusterRow[]> {
  await requireUser();
  const clusters = await getArticleClusters(naverCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
  return clusters.map((c) => ({ clusterId: c.clusterId, lat: c.lat, lng: c.lng, count: c.count }));
}

/** 클러스터 클릭 → 하위 매물(원 안 숫자 매물) 수집 + 반환 */
export async function loadClusterArticles(clusterId: string, naverCode: string, realEstateType: string, tradeType: string): Promise<{ articles: ArticleRow[] }> {
  await requireUser();
  const arts = await getClusteredArticles(clusterId, { realEstateTypes: [realEstateType], tradeTypes: [tradeType], regionCode: naverCode });
  return { articles: arts.map(naverToRow) };
}

// ── 관심 매물 (사용자별, 저장 시점 스냅샷) ──
export async function saveFavorites(rows: ArticleRow[]): Promise<number> {
  const user = await requireUser();
  for (const r of rows) {
    await db.favorite.upsert({
      where: { userId_articleNumber: { userId: user.id, articleNumber: r.articleNumber } },
      create: { userId: user.id, articleNumber: r.articleNumber, data: r as object },
      update: { data: r as object },
    });
  }
  return rows.length;
}

export async function listFavorites(): Promise<ArticleRow[]> {
  const user = await requireUser();
  const favs = await db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return favs.map((f) => f.data as ArticleRow);
}

export async function deleteFavorites(articleNumbers: string[]): Promise<number> {
  const user = await requireUser();
  const res = await db.favorite.deleteMany({ where: { userId: user.id, articleNumber: { in: articleNumbers } } });
  return res.count;
}

/** 관심 매물 셀 인라인 편집 → 스냅샷(data) 병합 저장 */
export async function updateFavorite(articleNumber: string, patch: Partial<ArticleRow>): Promise<void> {
  const user = await requireUser();
  const fav = await db.favorite.findUnique({ where: { userId_articleNumber: { userId: user.id, articleNumber } } });
  if (!fav) return;
  const data = { ...(fav.data as object), ...patch };
  await db.favorite.update({ where: { userId_articleNumber: { userId: user.id, articleNumber } }, data: { data: data as object } });
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
