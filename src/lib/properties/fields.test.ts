import { describe, it, expect } from "vitest";
import { coerceField, FIELD_BY_KEY, PROPERTY_FIELDS, LIST_COLUMNS } from "./fields";

describe("coerceField", () => {
  it("number: 콤마 제거·정수화", () => {
    expect(coerceField("number", "1,234")).toBe(1234);
    expect(coerceField("number", "12.9")).toBe(12);
  });
  it("money: 원/콤마 제거", () => {
    expect(coerceField("money", "350,000,000원")).toBe(350000000);
  });
  it("area: ㎡ 제거·소수 유지", () => {
    expect(coerceField("area", "84.21㎡")).toBe(84.21);
  });
  it("date: 8자리 ymd 정규화", () => {
    expect(coerceField("date", "2003-08-08")).toBe("20030808");
    expect(coerceField("date", "2003.08.08")).toBe("20030808");
  });
  it("bool: 참/거짓 토큰", () => {
    expect(coerceField("bool", "예")).toBe(true);
    expect(coerceField("bool", "N")).toBe(false);
  });
  it("공백 → null", () => {
    expect(coerceField("text", "  ")).toBeNull();
    expect(coerceField("number", "")).toBeNull();
  });
});

describe("필드 정의 정합성", () => {
  it("LIST_COLUMNS는 모두 실제 필드", () => {
    for (const k of LIST_COLUMNS) expect(FIELD_BY_KEY[k]).toBeDefined();
  });
  it("key는 유일", () => {
    const keys = PROPERTY_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("일정 그룹 재구성", () => {
  const schedule = PROPERTY_FIELDS.filter((f) => f.group === "일정").map((f) => f.key);
  it("실거래 흐름 순서(협의→계약→중도금→잔금→입주·기간)", () => {
    expect(schedule).toEqual([
      "contractHopeDate", "moveInHopeDate", "contractDate", "downPayment",
      "interim1Amount", "interim1Date", "interim2Amount", "interim2Date",
      "balanceAmount", "balanceDate", "moveInDate", "leaseEndDate",
    ]);
  });
  it("대금 필드는 money 타입", () => {
    for (const k of ["downPayment", "interim1Amount", "interim2Amount", "balanceAmount"])
      expect(FIELD_BY_KEY[k].type).toBe("money");
  });
  it("중도금은 매매 전용, 만기일은 임대차 전용, 나머지는 공통", () => {
    expect(FIELD_BY_KEY.interim1Amount.trades).toEqual(["A1"]);
    expect(FIELD_BY_KEY.interim2Date.trades).toEqual(["A1"]);
    expect(FIELD_BY_KEY.leaseEndDate.trades).toEqual(["B1", "B2", "B3"]);
    expect(FIELD_BY_KEY.contractDate.trades).toBeUndefined();
    expect(FIELD_BY_KEY.downPayment.trades).toBeUndefined();
  });
  it("중도금 날짜 라벨은 금액과 구분(중도금1일)", () => {
    expect(FIELD_BY_KEY.interim1Date.label).toBe("중도금1일");
    expect(FIELD_BY_KEY.interim1Amount.label).toBe("중도금1");
  });
});
