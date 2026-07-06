import { describe, it, expect } from "vitest";
import { paymentMismatch } from "./payment-sum";

describe("paymentMismatch (값은 만원 단위 문자열)", () => {
  it("합계 ≠ 가격이면 불일치 반환", () => {
    expect(paymentMismatch({ price: "85000", downPayment: "8000", interim1Amount: "20000", balanceAmount: "50000" }))
      .toEqual({ sum: 78000, price: 85000 });
  });
  it("합계 = 가격이면 null (중도금 2건 포함)", () => {
    expect(paymentMismatch({ price: "85000", downPayment: "8500", interim1Amount: "20000", interim2Amount: "6500", balanceAmount: "50000" }))
      .toBeNull();
  });
  it("중도금 없이 계약금+잔금=가격도 정상(null)", () => {
    expect(paymentMismatch({ price: "50000", downPayment: "5000", balanceAmount: "45000" })).toBeNull();
  });
  it("계약금·잔금·가격 중 하나라도 없으면 검사 안 함(null)", () => {
    expect(paymentMismatch({ price: "50000", downPayment: "5000" })).toBeNull();
    expect(paymentMismatch({ price: "", downPayment: "5000", balanceAmount: "45000" })).toBeNull();
    expect(paymentMismatch({ downPayment: "5000", balanceAmount: "45000" })).toBeNull();
  });
});
