import { describe, it, expect } from "vitest";
import { recentMonths } from "./fetch";

describe("recentMonths", () => {
  it("최근 N개월 YYYYMM 오름차순", () => {
    expect(recentMonths(3, "202606")).toEqual(["202604", "202605", "202606"]);
  });
  it("연 경계 처리", () => {
    expect(recentMonths(3, "202602")).toEqual(["202512", "202601", "202602"]);
  });
});
