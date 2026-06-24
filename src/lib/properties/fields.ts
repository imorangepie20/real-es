// 매물 필드 단일 정의 — 그리드 컬럼·폼 섹션·엑셀 매칭의 단일 소스. 하드코딩 금지.
import { PROPERTY_OPTIONS } from "@/lib/naver/property-types";
import { TRADE_OPTIONS } from "@/lib/naver/trade-types";

export type FieldType = "text" | "number" | "money" | "area" | "select" | "date" | "bool";
export type FieldOption = { value: string; label: string };
export type PropertyField = { key: string; label: string; group: string; type: FieldType; options?: FieldOption[] };

export const STATUS_OPTIONS: FieldOption[] = [
  { value: "진행", label: "진행" },
  { value: "계약완료", label: "계약완료" },
];

const propertyOpts: FieldOption[] = PROPERTY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
const tradeOpts: FieldOption[] = TRADE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const PROPERTY_FIELDS: PropertyField[] = [
  // 기본
  { key: "articleNo", label: "매물번호", group: "기본", type: "text" },
  { key: "complexName", label: "단지명", group: "기본", type: "text" },
  { key: "realEstateType", label: "매물유형", group: "기본", type: "select", options: propertyOpts },
  { key: "tradeType", label: "거래유형", group: "기본", type: "select", options: tradeOpts },
  { key: "status", label: "상태", group: "기본", type: "select", options: STATUS_OPTIONS },
  { key: "source", label: "출처", group: "기본", type: "text" },
  // 면적
  { key: "siteArea", label: "소재지면적", group: "면적", type: "area" },
  { key: "areaExclusive", label: "전용면적", group: "면적", type: "area" },
  { key: "areaSupply", label: "공급면적", group: "면적", type: "area" },
  { key: "landArea", label: "대지면적", group: "면적", type: "area" },
  { key: "buildingArea", label: "건축면적", group: "면적", type: "area" },
  { key: "area", label: "연면적", group: "면적", type: "area" },
  // 금액
  { key: "dealAmount", label: "거래금액", group: "금액", type: "money" },
  { key: "price", label: "가격", group: "금액", type: "money" },
  // 건물
  { key: "totalHouseholds", label: "총세대수", group: "건물", type: "number" },
  { key: "approvalDate", label: "사용승인일", group: "건물", type: "date" },
  { key: "parkingCount", label: "주차가능대수", group: "건물", type: "number" },
  { key: "heating", label: "난방방식", group: "건물", type: "text" },
  { key: "isPreSale", label: "준공아파트여부", group: "건물", type: "bool" },
  // 고객
  { key: "customerName", label: "고객명", group: "고객", type: "text" },
  { key: "customerPhone", label: "고객전화", group: "고객", type: "text" },
  // 관련부동산
  { key: "partnerName", label: "관련부동산", group: "관련부동산", type: "text" },
  { key: "partnerPhone", label: "관련부동산전화", group: "관련부동산", type: "text" },
  { key: "partnerManager", label: "관련부동산담당", group: "관련부동산", type: "text" },
  { key: "manager", label: "담당자", group: "관련부동산", type: "text" },
  // 일정
  { key: "contractHopeDate", label: "계약희망일", group: "일정", type: "date" },
  { key: "contractDate", label: "계약일", group: "일정", type: "date" },
  { key: "moveInHopeDate", label: "입주희망일", group: "일정", type: "date" },
  { key: "moveInDate", label: "입주일", group: "일정", type: "date" },
  { key: "interim1Date", label: "중도금1", group: "일정", type: "date" },
  { key: "interim2Date", label: "중도금2", group: "일정", type: "date" },
  { key: "balanceDate", label: "잔금일", group: "일정", type: "date" },
  // 메모
  { key: "note", label: "특이사항", group: "메모", type: "text" },
  { key: "memo", label: "메모", group: "메모", type: "text" },
];

export const FIELD_BY_KEY: Record<string, PropertyField> = Object.fromEntries(
  PROPERTY_FIELDS.map((f) => [f.key, f]),
);

export const FORM_GROUPS = ["기본", "면적", "금액", "건물", "고객", "관련부동산", "일정", "메모"] as const;

// 목록 그리드에 노출할 컬럼(나머지는 폼에서 편집)
export const LIST_COLUMNS = [
  "articleNo", "complexName", "realEstateType", "tradeType", "status",
  "price", "dealAmount", "areaExclusive", "customerName", "manager",
];

// 엑셀·폼·인라인 공용 값 정규화. null=빈값.
export function coerceField(type: FieldType, raw: unknown): string | number | boolean | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  switch (type) {
    case "number": { const n = Number(s.replace(/[,\s]/g, "")); return Number.isFinite(n) ? Math.trunc(n) : null; }
    case "money": { const n = Number(s.replace(/[,\s원]/g, "")); return Number.isFinite(n) ? n : null; }
    case "area": { const n = Number(s.replace(/[,\s㎡]/g, "")); return Number.isFinite(n) ? n : null; }
    case "date": { const d = s.replace(/[^0-9]/g, ""); return d.length === 8 ? d : s; }
    case "bool": return /^(y|yes|true|1|예|o|t|준공)$/i.test(s);
    default: return s;
  }
}
