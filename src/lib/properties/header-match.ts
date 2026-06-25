// 엑셀 시트 헤더 → Property fieldKey 자동 매칭. 공백·괄호·슬래시 무시.
import { PROPERTY_FIELDS } from "./fields";

const norm = (s: string) => s.replace(/[\s()（）[\]/]/g, "").toLowerCase();

// 라벨 외 별칭(현장 표기 변형)
const ALIASES: Record<string, string> = {
  종류: "realEstateType", 거래: "tradeType",
  전용: "areaExclusive", 공급: "areaSupply", 대지: "landArea", 건축: "buildingArea", 연면적: "area",
  매매가: "price", 보증금: "price", 세대수: "totalHouseholds", 주차: "parkingCount", 난방: "heating",
  잔금: "balanceDate",
};

const LOOKUP: Record<string, string> = {};
for (const f of PROPERTY_FIELDS) LOOKUP[norm(f.label)] = f.key;
for (const [alias, key] of Object.entries(ALIASES)) LOOKUP[norm(alias)] = key;

export type HeaderMatch = { header: string; index: number; fieldKey: string | null };

export function matchHeaders(headers: string[]): HeaderMatch[] {
  return headers.map((h, index) => ({ header: h, index, fieldKey: LOOKUP[norm(h ?? "")] ?? null }));
}
