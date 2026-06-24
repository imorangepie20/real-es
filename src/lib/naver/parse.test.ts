import { describe, expect, it } from "vitest";

import { parseArticleClusters, parseBoundedComplexes, parseArticles } from "./parse";
import boundedComplexesFixture from "./__fixtures__/boundedComplexes.json";
import boundedArticlesFixture from "./__fixtures__/boundedArticles.json";
import articlesFixture from "./__fixtures__/articles.json";
import articleClustersFixture from "./__fixtures__/articleClusters.json";

describe("parseBoundedComplexes", () => {
  const { complexes, hasNextPage, totalCount, lastInfo } = parseBoundedComplexes(boundedComplexesFixture);

  it("maps complex basic info + 좌표", () => {
    expect(complexes[0]).toEqual({
      complexNumber: "12045",
      name: "벽적골8단지두산,우성,한신",
      type: "A01",
      totalHouseholds: 1842,
      approvalDate: "19971216",
      dealCount: 118,
      leaseDepositCount: 2,
      leaseMonthlyCount: 14,
      lat: 37.2477,
      lng: 127.059237,
    });
  });

  it("carries pagination cursor", () => {
    expect(hasNextPage).toBe(true);
    expect(totalCount).toBe(40);
    expect(lastInfo).toEqual([1, "1812"]);
  });
});

describe("parseArticles", () => {
  it("단지형(complex/article/list)에서 realEstateType 추출", () => {
    const { articles } = parseArticles(articlesFixture, "2712");
    expect(articles[0].realEstateType).toBe("A01");
    expect(articles[0].complexNumber).toBe("2712");
    expect(articles[0].price).toBe(690000000);
  });

  it("비단지형(boundedArticles)도 같은 파서로 처리(realEstateType=D02)", () => {
    const { articles, totalCount } = parseArticles(boundedArticlesFixture, "");
    expect(articles[0]).toEqual({
      articleNumber: "2633824750",
      name: "복합상가",
      complexNumber: "",
      realEstateType: "D02",
      tradeType: "A1",
      price: 890000000,
      rentPrice: 0,
      areaExclusive: 54,
      areaSupply: 100,
      floor: "1/10",
      realtorName: "영통역IPARK부동산중개사무소",
      dong: null,
      address: "경기도 수원시 영통구 영통동",
      approvalDate: "20030808",
      lng: 127.0750347,
      lat: 37.2544778,
    });
    expect(totalCount).toBe(184);
  });
});

describe("parseArticleClusters", () => {
  it("클러스터(원 안 숫자) + 좌표 매핑", () => {
    const { clusters, totalCount } = parseArticleClusters(articleClustersFixture);
    expect(totalCount).toBe(208);
    expect(clusters).toHaveLength(3);
    expect(clusters[0]).toEqual({
      clusterId: "16/55901/25450",
      lat: 37.25375158,
      lng: 127.07511294,
      count: 72,
    });
  });
});
