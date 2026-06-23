import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

const NUM = "TEST-PROP-1";

describe("Article 비단지형 저장", () => {
  afterAll(async () => {
    await db.article.deleteMany({ where: { articleNumber: NUM } });
  });

  it("complexId 없이(비단지형) realEstateType/regionCode로 저장", async () => {
    await db.article.upsert({
      where: { articleNumber: NUM },
      create: { articleNumber: NUM, complexId: null, regionCode: "4111710500", realEstateType: "D02", tradeType: "A1", price: BigInt(890000000), lat: 37.25, lng: 127.07 },
      update: {},
    });
    const a = await db.article.findUnique({ where: { articleNumber: NUM } });
    expect(a?.complexId).toBeNull();
    expect(a?.regionCode).toBe("4111710500");
    expect(a?.realEstateType).toBe("D02");
  });
});
