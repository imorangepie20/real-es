import type { RealTradeKind, RealTxRecord } from "./types";

export type RealEndpoint = {
  service: string;
  areaKind: "전용" | "연" | "대지" | "토지" | "건물";
  nameField: string;                                  // 레코드 name 으로 쓸 원본 필드
  fieldMap: Record<string, keyof RealTxRecord>;        // 원본필드 → RealTxRecord 키
};

export const REALPRICE_PROPERTY_TYPES: { value: string; label: string; sale: boolean; rent: boolean }[] = [
  { value: "apt", label: "아파트", sale: true, rent: true },
  { value: "offi", label: "오피스텔", sale: true, rent: true },
  { value: "rh", label: "연립다세대", sale: true, rent: true },
  { value: "sh", label: "단독/다가구", sale: true, rent: true },
  { value: "land", label: "토지", sale: true, rent: false },
  { value: "nrg", label: "상업업무용", sale: true, rent: false },
];

// 공통 매매 필드 + 유형별 단지명/면적 필드. (아파트 전월세는 공개 스펙 확정, 그 외는 data.go.kr 문서 기준 — 첫 라이브에서 검증)
const DATE = { dealYear: "dealDate", dealMonth: "dealDate", dealDay: "dealDate" } as const; // dealDate는 normalize에서 조립
const ENDPOINTS: Record<string, { sale?: Omit<RealEndpoint, "service"> & { service: string }; rent?: Omit<RealEndpoint, "service"> & { service: string } }> = {
  apt: {
    sale: { service: "RTMSDataSvcAptTrade", areaKind: "전용", nameField: "aptNm",
      fieldMap: { aptNm: "name", umdNm: "umdNm", jibun: "jibun", roadNm: "roadNm", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", cdealType: "isCanceled", ...DATE } },
    rent: { service: "RTMSDataSvcAptRent", areaKind: "전용", nameField: "aptNm",
      fieldMap: { aptNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", contractType: "isRenewal", preDeposit: "preDeposit", preMonthlyRent: "preMonthlyRent", ...DATE } },
  },
  offi: {
    sale: { service: "RTMSDataSvcOffiTrade", areaKind: "전용", nameField: "offiNm",
      fieldMap: { offiNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcOffiRent", areaKind: "전용", nameField: "offiNm",
      fieldMap: { offiNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", ...DATE } },
  },
  rh: {
    sale: { service: "RTMSDataSvcRHTrade", areaKind: "전용", nameField: "mhouseNm",
      fieldMap: { mhouseNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcRHRent", areaKind: "전용", nameField: "mhouseNm",
      fieldMap: { mhouseNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", ...DATE } },
  },
  sh: {
    sale: { service: "RTMSDataSvcSHTrade", areaKind: "연", nameField: "houseType",
      fieldMap: { houseType: "name", umdNm: "umdNm", jibun: "jibun", totalFloorAr: "area", dealAmount: "dealAmount", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcSHRent", areaKind: "연", nameField: "houseType",
      fieldMap: { houseType: "name", umdNm: "umdNm", totalFloorAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", buildYear: "buildYear", contractType: "isRenewal", ...DATE } },
  },
  land: {
    sale: { service: "RTMSDataSvcLandTrade", areaKind: "토지", nameField: "jimok",
      fieldMap: { jimok: "name", umdNm: "umdNm", jibun: "jibun", dealArea: "area", dealAmount: "dealAmount", ...DATE } },
  },
  nrg: {
    sale: { service: "RTMSDataSvcNrgTrade", areaKind: "건물", nameField: "buildingType",
      fieldMap: { buildingType: "name", umdNm: "umdNm", jibun: "jibun", buildingAr: "area", dealAmount: "dealAmount", buildYear: "buildYear", floor: "floor", ...DATE } },
  },
};

export function endpointFor(propertyType: string, kind: RealTradeKind): RealEndpoint | null {
  const e = ENDPOINTS[propertyType]?.[kind];
  return e ? { service: e.service, areaKind: e.areaKind, nameField: e.nameField, fieldMap: e.fieldMap } : null;
}

export function operationUrl(service: string): string {
  return `https://apis.data.go.kr/1613000/${service}/get${service}`;
}
