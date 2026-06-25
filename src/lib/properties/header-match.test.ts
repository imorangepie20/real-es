import { describe, it, expect } from "vitest";
import { matchHeaders } from "./header-match";

describe("matchHeaders", () => {
  it("라벨·별칭 매칭", () => {
    const m = matchHeaders(["단지명", "매매가", "전용", "없는헤더"]);
    expect(m[0].fieldKey).toBe("complexName");
    expect(m[1].fieldKey).toBe("price");
    expect(m[2].fieldKey).toBe("areaExclusive");
    expect(m[3].fieldKey).toBeNull();
  });
  it("공백 무시", () => {
    expect(matchHeaders(["주차가능대수"])[0].fieldKey).toBe("parkingCount");
    expect(matchHeaders(["사용 승인일"])[0].fieldKey).toBe("approvalDate");
  });
  it("index 보존", () => {
    expect(matchHeaders(["a", "단지명"])[1].index).toBe(1);
  });
});
