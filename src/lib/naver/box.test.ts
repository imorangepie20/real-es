import { describe, expect, it } from "vitest";

import { boxAround } from "./fetch";

describe("boxAround", () => {
  it("동 중심 ±0.3° 박스", () => {
    expect(boxAround({ lat: 37.2566, lng: 127.0738 })).toEqual({
      left: 126.7738,
      right: 127.3738,
      top: 37.5566,
      bottom: 36.9566,
    });
  });
});
