import { describe, it, expect } from "vitest";
import { buildImportRows, countIssues, type ParsedSheet } from "./excel-import";
import { matchHeaders } from "./header-match";

const sheet: ParsedSheet = {
  headers: ["단지명", "매매가", "전용"],
  matches: matchHeaders(["단지명", "매매가", "전용"]),
  rows: [
    ["행복아파트", "350,000,000원", "84.21"],
    ["풍경마을", "오백만", "59.9"],
  ],
};
const mapping = { 0: "complexName", 1: "price", 2: "areaExclusive" };

describe("buildImportRows", () => {
  it("매핑·정규화 적용", () => {
    const rows = buildImportRows(sheet, mapping);
    expect(rows[0]).toEqual({ complexName: "행복아파트", price: 350000000, areaExclusive: 84.21 });
  });
  it("파싱 실패 숫자 셀 → null", () => {
    expect(buildImportRows(sheet, mapping)[1].price).toBeNull();
  });
  it("매핑 null 컬럼은 제외", () => {
    const rows = buildImportRows(sheet, { 0: "complexName", 1: null, 2: "areaExclusive" });
    expect(rows[0]).toEqual({ complexName: "행복아파트", areaExclusive: 84.21 });
  });
});

describe("countIssues", () => {
  it("숫자형 파싱 실패 카운트", () => {
    expect(countIssues(sheet, mapping)).toBe(1); // "오백만"
  });
});
