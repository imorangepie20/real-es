import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { parseArticles, parseRegionComplexes } from "./parse";
import { upsertArticles, upsertComplexes } from "./cache";
import regionFixture from "./__fixtures__/region.json";
import articlesFixture from "./__fixtures__/articles.json";

const TEST_REGION = "9999999999"; // 테스트 전용 동 코드 (실데이터와 충돌 없음)

// 픽스처의 단지/매물 번호는 실제 번호(예: 102614)라, 그대로 upsert하면 실제 캐시를
// 덮어쓰고 cleanup이 cascade 삭제한다. 합성 번호로 치환해 실데이터와 완전히 격리한다.
function testComplexes() {
  return parseRegionComplexes(regionFixture).complexes.map((c, i) => ({ ...c, complexNumber: `TEST-CX-${i}` }));
}
function testArticles(complexNumber: string) {
  return parseArticles(articlesFixture, complexNumber).articles.map((a, i) => ({ ...a, articleNumber: `TEST-AR-${i}` }));
}
const CN = "TEST-CX-0"; // 합성 첫 단지

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
    await upsertComplexes(testComplexes(), TEST_REGION);

    const c = await db.complex.findUnique({ where: { complexNumber: CN } });
    expect(c?.name).toBe("수원SK스카이뷰");
    expect(c?.totalHouseholds).toBe(3498);
    expect(c?.regionCode).toBe(TEST_REGION);
  });

  it("upserts articles linked to the complex (price as BigInt)", async () => {
    await upsertComplexes(testComplexes(), TEST_REGION);

    const articles = testArticles(CN);
    const n = await upsertArticles(CN, articles);
    expect(n).toBe(2);

    const saved = await db.article.findUnique({ where: { articleNumber: "TEST-AR-0" } });
    expect(saved?.tradeType).toBe("A1");
    expect(saved?.price).toBe(BigInt(690000000));
    expect(saved?.areaExclusive).toBe(84.77);
  });

  it("is idempotent on re-run", async () => {
    await upsertComplexes(testComplexes(), TEST_REGION);
    await upsertComplexes(testComplexes(), TEST_REGION);
    const count = await db.complex.count({ where: { regionCode: TEST_REGION } });
    expect(count).toBe(2);
  });
});
