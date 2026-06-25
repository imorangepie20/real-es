import { describe, it, expect } from "vitest";
import { endpointFor, REALPRICE_PROPERTY_TYPES, operationUrl } from "./endpoints";

describe("endpointFor", () => {
  it("아파트 매매/전월세 둘 다 지원", () => {
    expect(endpointFor("apt", "sale")?.service).toBe("RTMSDataSvcAptTradeDev");
    expect(endpointFor("apt", "rent")?.service).toBe("RTMSDataSvcAptRent");
  });
  it("토지·상업업무용은 매매만(전월세 null)", () => {
    expect(endpointFor("land", "sale")?.service).toBe("RTMSDataSvcLandTrade");
    expect(endpointFor("land", "rent")).toBeNull();
    expect(endpointFor("nrg", "rent")).toBeNull();
  });
  it("아파트 전월세 fieldMap이 deposit·monthlyRent·aptNm 매핑", () => {
    const fm = endpointFor("apt", "rent")!.fieldMap;
    expect(fm.deposit).toBe("deposit");
    expect(fm.aptNm).toBe("name");
    expect(fm.monthlyRent).toBe("monthlyRent");
  });
  it("토지는 거래면적·지목, 단지명/층 없음", () => {
    const e = endpointFor("land", "sale")!;
    expect(e.areaKind).toBe("토지");
    expect(e.nameField).toBe("jimok");
  });
});

describe("REALPRICE_PROPERTY_TYPES", () => {
  it("6종, 토지·상업용은 rent=false", () => {
    expect(REALPRICE_PROPERTY_TYPES).toHaveLength(6);
    const land = REALPRICE_PROPERTY_TYPES.find((t) => t.value === "land")!;
    expect(land.rent).toBe(false);
  });
});

describe("operationUrl", () => {
  it("service로 풀 URL 생성", () => {
    expect(operationUrl("RTMSDataSvcAptRent")).toBe("https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent");
  });
});
