import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { upsertComplexArticles, upsertRegionArticles } from "./cache";
import type { NaverArticle } from "./types";

const CX = "TEST-CX-1";
const REGION = "9999999900";
const ART_C = "TEST-AR-C";
const ART_R = "TEST-AR-R";

const art = (over: Partial<NaverArticle>): NaverArticle => ({
  articleNumber: "x", complexNumber: "", realEstateType: "A01", tradeType: "A1",
  price: 100, rentPrice: 0, areaExclusive: 84, areaSupply: 109, floor: "2/23",
  realtorName: "중개사", dong: "101", lng: 127, lat: 37, ...over,
});

describe("cache upsert", () => {
  afterAll(async () => {
    await db.article.deleteMany({ where: { articleNumber: { in: [ART_C, ART_R] } } });
    await db.complex.deleteMany({ where: { complexNumber: CX } });
  });

  it("단지형: complex stub 생성 + complexId 연결", async () => {
    await upsertComplexArticles(CX, [art({ articleNumber: ART_C, complexNumber: CX })]);
    const a = await db.article.findUnique({ where: { articleNumber: ART_C } });
    expect(a?.complexId).not.toBeNull();
    expect(a?.realEstateType).toBe("A01");
    expect(a?.dong).toBe("101");
  });

  it("비단지형: complexId null + regionCode/realEstateType 저장", async () => {
    await upsertRegionArticles(REGION, [art({ articleNumber: ART_R, realEstateType: "D02", tradeType: "A1", price: 890000000 })]);
    const a = await db.article.findUnique({ where: { articleNumber: ART_R } });
    expect(a?.complexId).toBeNull();
    expect(a?.regionCode).toBe(REGION);
    expect(a?.realEstateType).toBe("D02");
    expect(a?.price).toBe(BigInt(890000000));
  });
});
