import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";
import type { RealTxRecord } from "./types";

const sale = (amt: number, area: number, ym: string, canceled = false): RealTxRecord => ({
  propertyType: "apt", kind: "sale", name: "A", umdNm: "역삼동", jibun: "1", area, dealAmount: amt, dealDate: `${ym}15`, isCanceled: canceled,
});

describe("computeStats 매매", () => {
  const recs = [sale(1_000_000_000, 50, "202604"), sale(2_000_000_000, 100, "202605"), sale(3_000_000_000, 100, "202605", true)];
  const s = computeStats(recs);
  it("건수·평균·중위·㎡당·월별·해제비중", () => {
    expect(s.count).toBe(3);
    expect(s.avgPrice).toBe(2_000_000_000);
    expect(s.medianPrice).toBe(2_000_000_000);
    expect(s.avgPerArea).toBeGreaterThan(0);
    expect(s.byMonth.find((m) => m.ym === "202605")!.count).toBe(2);
    expect(s.canceledRatio).toBeCloseTo(1 / 3);
  });
});

describe("computeStats 임대(전세/월세·갱신 인상률)", () => {
  const rent = (dep: number, mon: number, ren = false, pre?: number): RealTxRecord => ({
    propertyType: "apt", kind: "rent", name: "A", umdNm: "역삼동", jibun: "1", area: 84, deposit: dep, monthlyRent: mon, dealDate: "20260515", isRenewal: ren, preDeposit: pre ?? null,
  });
  const s = computeStats([rent(1_000_000_000, 0), rent(500_000_000, 1_000_000), rent(1_100_000_000, 0, true, 1_000_000_000)]);
  it("전세비중·갱신비중·인상률", () => {
    expect(s.jeonseRatio).toBeCloseTo(2 / 3);
    expect(s.renewalRatio).toBeCloseTo(1 / 3);
    expect(s.avgRentIncrease).toBeCloseTo(10); // (11억-10억)/10억 = 10%
  });
});

describe("빈 입력", () => {
  it("count 0·평균 null", () => {
    const s = computeStats([]);
    expect(s.count).toBe(0);
    expect(s.avgPrice).toBeNull();
  });
});
