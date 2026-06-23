import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { parseArticles, parseRegionComplexes } from "./parse";
import { upsertArticles, upsertComplexes } from "./cache";
import regionFixture from "./__fixtures__/region.json";
import articlesFixture from "./__fixtures__/articles.json";

const TEST_REGION = "9999999999"; // 테스트 전용 동 코드
const CN = "102614"; // region 픽스처 첫 단지

async function cleanup() {
  await db.article.deleteMany({ where: { complex: { regionCode: TEST_REGION } } });
  await db.complex.deleteMany({ where: { regionCode: TEST_REGION } });
}

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("cache", () => {
  it("upserts complexes from parsed region data", async () => {
    const { complexes } = parseRegionComplexes(regionFixture);
    await upsertComplexes(complexes, TEST_REGION);

    const c = await db.complex.findUnique({ where: { complexNumber: CN } });
    expect(c?.name).toBe("수원SK스카이뷰");
    expect(c?.totalHouseholds).toBe(3498);
    expect(c?.regionCode).toBe(TEST_REGION);
  });

  it("upserts articles linked to the complex (price as BigInt)", async () => {
    const { complexes } = parseRegionComplexes(regionFixture);
    await upsertComplexes(complexes, TEST_REGION);

    const { articles } = parseArticles(articlesFixture, CN);
    const n = await upsertArticles(CN, articles);
    expect(n).toBe(2);

    const saved = await db.article.findUnique({ where: { articleNumber: "2633772224" } });
    expect(saved?.tradeType).toBe("A1");
    expect(saved?.price).toBe(BigInt(690000000));
    expect(saved?.areaExclusive).toBe(84.77);
  });

  it("is idempotent on re-run", async () => {
    const { complexes } = parseRegionComplexes(regionFixture);
    await upsertComplexes(complexes, TEST_REGION);
    await upsertComplexes(complexes, TEST_REGION);
    const count = await db.complex.count({ where: { regionCode: TEST_REGION } });
    expect(count).toBe(2);
  });
});
