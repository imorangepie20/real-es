import { describe, it, expect } from "vitest";
import { parseResponse, normalizeItems } from "./normalize";

const aptRentXml = `<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
<body><items>
<item><aptNm>개포자이</aptNm><umdNm>개포동</umdNm><jibun>12-2</jibun><excluUseAr>84.97</excluUseAr>
<dealYear>2026</dealYear><dealMonth>5</dealMonth><dealDay>3</dealDay>
<deposit>120,000</deposit><monthlyRent>0</monthlyRent><floor>10</floor><buildYear>2004</buildYear>
<contractType>갱신</contractType><preDeposit>100,000</preDeposit><preMonthlyRent>0</preMonthlyRent></item>
</items><totalCount>1</totalCount><numOfRows>10</numOfRows><pageNo>1</pageNo></body></response>`;

describe("parseResponse", () => {
  it("XML에서 resultCode·items·totalCount 추출", () => {
    const r = parseResponse(aptRentXml);
    expect(r.resultCode).toBe("000");
    expect(r.totalCount).toBe(1);
    expect(r.items[0].aptNm).toBe("개포자이");
  });
  it("item 1건일 때도 배열로", () => {
    expect(Array.isArray(parseResponse(aptRentXml).items)).toBe(true);
  });
  it("JSON 응답도 파싱", () => {
    const json = JSON.stringify({ response: { header: { resultCode: "000" }, body: { items: { item: { aptNm: "A", deposit: "1,000" } }, totalCount: 1 } } });
    const r = parseResponse(json);
    expect(r.resultCode).toBe("000");
    expect(r.items[0].aptNm).toBe("A");
  });
});

describe("normalizeItems 아파트 전월세", () => {
  const recs = normalizeItems(parseResponse(aptRentXml).items, "apt", "rent");
  it("만원→원·전세 분기·날짜 조립·갱신 플래그", () => {
    const r = recs[0];
    expect(r.name).toBe("개포자이");
    expect(r.deposit).toBe(1_200_000_000);  // 120,000만원 → 원
    expect(r.monthlyRent).toBe(0);
    expect(r.dealDate).toBe("20260503");
    expect(r.area).toBeCloseTo(84.97);
    expect(r.isRenewal).toBe(true);
    expect(r.preDeposit).toBe(1_000_000_000);
    expect(r.kind).toBe("rent");
  });
});

describe("normalizeItems 매매 해제거래", () => {
  const saleXml = `<response><header><resultCode>000</resultCode></header><body><items>
  <item><aptNm>X</aptNm><umdNm>역삼동</umdNm><jibun>1</jibun><excluUseAr>59.9</excluUseAr>
  <dealAmount>250,000</dealAmount><dealYear>2026</dealYear><dealMonth>4</dealMonth><dealDay>1</dealDay>
  <floor>5</floor><buildYear>2010</buildYear><cdealType>O</cdealType></item>
  </items><totalCount>1</totalCount></body></response>`;
  it("dealAmount 원 변환·해제거래 플래그", () => {
    const r = normalizeItems(parseResponse(saleXml).items, "apt", "sale")[0];
    expect(r.dealAmount).toBe(2_500_000_000);
    expect(r.isCanceled).toBe(true);
  });
});
