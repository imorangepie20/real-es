// 네이버 응답 → 정규화 (순수 함수, 픽스처 단위테스트 대상)
import type {
  ArticlesResult,
  NaverArticle,
  NaverComplex,
  RegionComplexesResult,
} from "./types";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** complex/region 응답 → 단지 목록 (동 드릴다운) */
export function parseRegionComplexes(json: unknown): RegionComplexesResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.list as unknown[]) ?? [];

  const complexes: NaverComplex[] = list.map((row) => {
    const r = row as {
      complexInfo: Record<string, unknown>;
      articleCountInfo?: Record<string, unknown>;
    };
    const ci = r.complexInfo;
    const ac = r.articleCountInfo ?? {};
    return {
      complexNumber: String(ci.complexNumber),
      name: String(ci.name),
      type: String(ci.type),
      totalHouseholds: num(ci.totalHouseholdNumber),
      approvalDate: ci.useApprovalDate ? String(ci.useApprovalDate) : null,
      dealCount: (num(ac.dealCount) ?? 0),
      leaseDepositCount: (num(ac.leaseDepositCount) ?? 0),
      leaseMonthlyCount: (num(ac.leaseMonthlyCount) ?? 0),
    };
  });

  return {
    complexes,
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: (num(result.totalCount) ?? complexes.length),
  };
}

/** article/list 응답 → 매물 목록 (대표 매물 기준, 기본 정보만) */
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

    const deal = num(price.dealPrice);
    const warranty = num(price.warrantyPrice);
    const coords = ((a.address as Record<string, unknown>)?.coordinates as Record<string, unknown>) ?? {};
    return {
      articleNumber: String(a.articleNumber),
      complexNumber,
      tradeType: String(a.tradeType),
      // 매매가(dealPrice) 우선, 없으면 보증금(warrantyPrice)
      price: deal || warranty || null,
      rentPrice: num(price.rentPrice),
      areaExclusive: num(space.exclusiveSpace),
      areaSupply: num(space.supplySpace),
      floor: detail.floorInfo ? String(detail.floorInfo) : null,
      realtorName: broker.brokerageName ? String(broker.brokerageName) : null,
      dong: a.dongName ? String(a.dongName) : null,
      lng: num(coords.xCoordinate),
      lat: num(coords.yCoordinate),
    };
  });

  return {
    articles,
    lastInfo: (result.lastInfo as unknown[]) ?? [],
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: (num(result.totalCount) ?? articles.length),
  };
}
