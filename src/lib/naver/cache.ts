// 수집 결과 → DB 캐시(Complex/Article) upsert. 결정적(네트워크 없음, 픽스처 테스트 대상).
import { db } from "@/lib/db";
import type { NaverArticle, NaverComplex } from "./types";

const big = (v: number | null): bigint | null => (v != null ? BigInt(Math.round(v)) : null);

/** 동 중심좌표 (boundingBox 빌드용) — LegalDivision에서 조회 */
export async function getRegionCenter(naverCode: string): Promise<{ lat: number; lng: number }> {
  const ld = await db.legalDivision.findUnique({ where: { naverCode } });
  if (ld?.lat == null || ld?.lng == null) throw new Error(`동 좌표 없음: ${naverCode}`);
  return { lat: ld.lat, lng: ld.lng };
}

export async function upsertComplexes(complexes: NaverComplex[], regionCode: string): Promise<void> {
  for (const c of complexes) {
    const data = {
      name: c.name,
      type: c.type,
      totalHouseholds: c.totalHouseholds,
      approvalDate: c.approvalDate,
      regionCode,
      lat: c.lat,
      lng: c.lng,
      raw: c as object,
    };
    await db.complex.upsert({
      where: { complexNumber: c.complexNumber },
      create: { complexNumber: c.complexNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
}

function articleData(a: NaverArticle) {
  return {
    realEstateType: a.realEstateType,
    tradeType: a.tradeType,
    price: big(a.price),
    rentPrice: big(a.rentPrice),
    areaExclusive: a.areaExclusive,
    areaSupply: a.areaSupply,
    floor: a.floor,
    dong: a.dong,
    realtorName: a.realtorName,
    lat: a.lat,
    lng: a.lng,
    raw: a as object,
  };
}

/** 단지형: 단지 stub 보장 후 complexId로 연결 */
export async function upsertComplexArticles(complexNumber: string, articles: NaverArticle[]): Promise<number> {
  const complex =
    (await db.complex.findUnique({ where: { complexNumber } })) ??
    (await db.complex.create({ data: { complexNumber, name: `단지 ${complexNumber}` } }));

  const coord = articles.find((a) => a.lat != null && a.lng != null);
  if (coord && complex.lat == null) {
    await db.complex.update({ where: { id: complex.id }, data: { lat: coord.lat, lng: coord.lng } });
  }

  for (const a of articles) {
    const data = { complexId: complex.id, regionCode: null, ...articleData(a) };
    await db.article.upsert({
      where: { articleNumber: a.articleNumber },
      create: { articleNumber: a.articleNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
  return articles.length;
}

/** 비단지형: 단지 없이 동(regionCode) 기준 저장 */
export async function upsertRegionArticles(regionCode: string, articles: NaverArticle[]): Promise<number> {
  for (const a of articles) {
    const data = { complexId: null, regionCode, ...articleData(a) };
    await db.article.upsert({
      where: { articleNumber: a.articleNumber },
      create: { articleNumber: a.articleNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
  return articles.length;
}
