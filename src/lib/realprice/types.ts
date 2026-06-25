// 실거래 정규화 타입.
export type RealTradeKind = "sale" | "rent"; // 매매 / 전월세

export type RealTxRecord = {
  propertyType: string;
  kind: RealTradeKind;
  name: string;          // 단지명(없으면 주택유형/지목)
  umdNm: string;         // 법정동
  jibun: string;
  roadNm?: string;
  area: number | null;   // ㎡
  dealAmount?: number | null;   // 매매(원)
  deposit?: number | null;      // 임대 보증금(원)
  monthlyRent?: number | null;  // 임대 월세(원)
  floor?: number | null;
  buildYear?: number | null;
  dealDate: string;      // YYYYMMDD
  isRenewal?: boolean;   // 임대 갱신
  preDeposit?: number | null;
  preMonthlyRent?: number | null;
  isCanceled?: boolean;  // 매매 해제거래
};

export type RealStats = {
  count: number;
  avgPrice: number | null;     // 매매=dealAmount / 임대=deposit (원)
  medianPrice: number | null;
  avgPerArea: number | null;   // ㎡당 평균(원)
  byArea: { label: string; count: number }[];
  byMonth: { ym: string; count: number; avgPrice: number | null }[];
  canceledRatio?: number;      // 매매
  jeonseRatio?: number;        // 임대(전세 비중)
  renewalRatio?: number;       // 임대(갱신 비중)
  avgRentIncrease?: number | null; // 임대 갱신 인상률(%)
};
