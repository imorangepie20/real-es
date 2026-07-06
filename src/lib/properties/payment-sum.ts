// 매매 대금 합계 검사 — 계약금·잔금·가격이 모두 입력된 경우에만. 값은 폼 상태(만원 단위 문자열).
export function paymentMismatch(values: Record<string, string>): { sum: number; price: number } | null {
  const n = (s: string | undefined): number | null => {
    if (s == null || s.trim() === "") return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };
  const down = n(values.downPayment);
  const balance = n(values.balanceAmount);
  const price = n(values.price);
  if (down == null || balance == null || price == null) return null;
  const sum = down + (n(values.interim1Amount) ?? 0) + (n(values.interim2Amount) ?? 0) + balance;
  return sum === price ? null : { sum, price };
}
