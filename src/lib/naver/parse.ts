// 네이버 응답 → 정규화 (순수 함수, 픽스처 단위테스트 대상)
import type {
  ArticleClustersResult,
  ArticlesResult,
  NaverArticle,
  NaverCluster,
  NaverComplex,
  RegionComplexesResult,
} from "./types";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** complex/boundedComplexes 응답 → 단지 목록 (동 + realEstateType 필터) */
export function parseBoundedComplexes(json: unknown): RegionComplexesResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.list as unknown[]) ?? [];

  const complexes: NaverComplex[] = list.map((row) => {
    const c = (row as { complex?: Record<string, unknown> }).complex ?? {};
    const ci = (c.complexInfo as Record<string, unknown>) ?? {};
    const ac = (c.articleCountInfoDto as Record<string, unknown>) ?? {};
    const coords = ((ci.address as Record<string, unknown>)?.coordinates as Record<string, unknown>) ?? {};
    return {
      complexNumber: String(ci.complexNumber),
      name: String(ci.name),
      type: String(ci.type),
      totalHouseholds: num(ci.totalHouseholdNumber),
      approvalDate: ci.useApprovalDate ? String(ci.useApprovalDate) : null,
      dealCount: num(ac.dealCount) ?? 0,
      leaseDepositCount: num(ac.leaseDepositCount) ?? 0,
      leaseMonthlyCount: num(ac.leaseMonthlyCount) ?? 0,
      lat: num(coords.yCoordinate),
      lng: num(coords.xCoordinate),
    };
  });

  return {
    complexes,
    lastInfo: (result.lastInfo as unknown[]) ?? [],
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: num(result.totalCount) ?? complexes.length,
  };
}

/** article/list · article/boundedArticles 응답 → 매물 목록 (대표 매물 기준, 기본 정보만) */
export function parseArticles(json: unknown, complexNumber: string): ArticlesResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.list as unknown[]) ?? [];

  const articles: NaverArticle[] = list.map((row) => {
    const a = (row as { representativeArticleInfo: Record<string, unknown> })
      .representativeArticleInfo;
    const space = (a.spaceInfo as Record<string, unknown>) ?? {};
    const detail = (a.articleDetail as Record<string, unknown>) ?? {};
    const broker = (a.brokerInfo as Record<string, unknown>) ?? {};
    const price = (a.priceInfo as Record<string, unknown>) ?? {};
    const addr = (a.address as Record<string, unknown>) ?? {};
    const building = (a.buildingInfo as Record<string, unknown>) ?? {};

    const deal = num(price.dealPrice);
    const warranty = num(price.warrantyPrice);
    const coords = (addr.coordinates as Record<string, unknown>) ?? {};
    return {
      articleNumber: String(a.articleNumber),
      name: a.articleName ? String(a.articleName) : a.complexName ? String(a.complexName) : null,
      complexNumber,
      realEstateType: String(a.realEstateType),
      tradeType: String(a.tradeType),
      price: deal || warranty || null,
      rentPrice: num(price.rentPrice),
      areaExclusive: num(space.exclusiveSpace),
      areaSupply: num(space.supplySpace),
      floor: detail.floorInfo ? String(detail.floorInfo) : null,
      realtorName: broker.brokerageName ? String(broker.brokerageName) : null,
      dong: a.dongName ? String(a.dongName) : null,
      address: [addr.city, addr.division, addr.sector].filter(Boolean).map(String).join(" ") || null,
      approvalDate: building.buildingConjunctionDate ? String(building.buildingConjunctionDate) : null,
      lng: num(coords.xCoordinate),
      lat: num(coords.yCoordinate),
    };
  });

  return {
    articles,
    lastInfo: (result.lastInfo as unknown[]) ?? [],
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: num(result.totalCount) ?? articles.length,
  };
}

/** article/map/articleClusters 응답 → 클러스터(원 안 숫자) 목록 (비단지형 지도) */
export function parseArticleClusters(json: unknown): ArticleClustersResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.clusters as unknown[]) ?? [];

  const clusters: NaverCluster[] = list.map((row) => {
    const c = row as Record<string, unknown>;
    const coords = (c.coordinates as Record<string, unknown>) ?? {};
    return {
      clusterId: String(c.clusterId),
      lat: num(coords.yCoordinate),
      lng: num(coords.xCoordinate),
      count: num(c.articleCount) ?? 0,
    };
  });

  return { clusters, totalCount: num(result.totalCount) ?? clusters.length };
}
