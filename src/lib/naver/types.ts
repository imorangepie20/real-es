// 네이버 수집 정규화 타입 (기본 정보만 — 스펙 §4)

export type NaverComplex = {
  complexNumber: string;
  name: string;
  type: string; // A01 아파트 / A02 주상복합
  totalHouseholds: number | null;
  approvalDate: string | null; // YYYYMMDD (useApprovalDate)
  dealCount: number; // 매매 매물 수
  leaseDepositCount: number; // 전세
  leaseMonthlyCount: number; // 월세
};

export type TradeType = "A1" | "B1" | "B2"; // 매매 / 전세 / 월세

export type NaverArticle = {
  articleNumber: string;
  complexNumber: string;
  tradeType: string;
  price: number | null; // 거래금액(원): 매매가 또는 보증금
  rentPrice: number | null; // 월세
  areaExclusive: number | null; // 전용면적
  areaSupply: number | null; // 공급면적
  floor: string | null; // "2/23"
  realtorName: string | null;
  dong: string | null;
};

export type RegionComplexesResult = {
  complexes: NaverComplex[];
  hasNextPage: boolean;
  totalCount: number;
};

export type ArticlesResult = {
  articles: NaverArticle[];
  lastInfo: unknown[]; // 다음 페이지 커서
  hasNextPage: boolean;
  totalCount: number;
};
