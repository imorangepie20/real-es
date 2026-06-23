// 수집 결과 → DB 캐시(Complex/Article) upsert. 결정적(네트워크 없음, 픽스처 테스트 대상).
import { db } from "@/lib/db";
import type { NaverArticle, NaverComplex } from "./types";

const big = (v: number | null): bigint | null => (v != null ? BigInt(Math.round(v)) : null);

export async function upsertComplexes(complexes: NaverComplex[], regionCode: string): Promise<void> {
  for (const c of complexes) {
    const data = {
      name: c.name,
      type: c.type,
      totalHouseholds: c.totalHouseholds,
      approvalDate: c.approvalDate,
      regionCode,
      raw: c as object,
    };
    await db.complex.upsert({
      where: { complexNumber: c.complexNumber },
      create: { complexNumber: c.complexNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
}

export async function upsertArticles(complexNumber: string, articles: NaverArticle[]): Promise<number> {
  // 단지가 아직 없으면 stub 생성 (region 수집이 나중에 채움)
  const complex =
    (await db.complex.findUnique({ where: { complexNumber } })) ??
    (await db.complex.create({ data: { complexNumber, name: `단지 ${complexNumber}` } }));

  for (const a of articles) {
    const data = {
      tradeType: a.tradeType,
      price: big(a.price),
      rentPrice: big(a.rentPrice),
      areaExclusive: a.areaExclusive,
      areaSupply: a.areaSupply,
      floor: a.floor,
      realtorName: a.realtorName,
      raw: a as object,
    };
    await db.article.upsert({
      where: { articleNumber: a.articleNumber },
      create: { articleNumber: a.articleNumber, complexId: complex.id, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
  return articles.length;
}
