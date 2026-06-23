import { describe, expect, it } from "vitest";

import { parseRegionComplexes, parseArticles } from "./parse";
import regionFixture from "./__fixtures__/region.json";
import articlesFixture from "./__fixtures__/articles.json";

describe("parseRegionComplexes", () => {
  const { complexes, hasNextPage, totalCount } = parseRegionComplexes(regionFixture);

  it("maps complex basic info", () => {
    expect(complexes).toHaveLength(2);
    expect(complexes[0]).toEqual({
      complexNumber: "102614",
      name: "수원SK스카이뷰",
      type: "A01",
      totalHouseholds: 3498,
      approvalDate: "20130527",
      dealCount: 113,
      leaseDepositCount: 7,
      leaseMonthlyCount: 3,
    });
  });

  it("carries pagination", () => {
    expect(hasNextPage).toBe(true);
    expect(totalCount).toBe(72);
  });
});

describe("parseArticles", () => {
  const { articles, lastInfo, hasNextPage, totalCount } = parseArticles(articlesFixture, "2712");

  it("maps article basic info (매매 = dealPrice)", () => {
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      articleNumber: "2633772224",
      complexNumber: "2712",
      tradeType: "A1",
      price: 690000000,
      rentPrice: 0,
      areaExclusive: 84.77,
      areaSupply: 109.23,
      floor: "2/23",
      realtorName: "아파트뱅크공인중개사사무소",
      dong: "142",
      lng: 127.00909,
      lat: 37.305275,
    });
  });

  it("carries pagination cursor", () => {
    expect(hasNextPage).toBe(true);
    expect(totalCount).toBe(179);
    expect(lastInfo).toEqual([1, 1040.5181508521755, "2633442294"]);
  });
});
