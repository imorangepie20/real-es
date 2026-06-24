import { describe, expect, it } from "vitest";

import { articlesToWorkbook, type ExcelRow } from "./excel";

const rows: ExcelRow[] = [
  { complexName: "수원SK스카이뷰", realEstateType: "A01", tradeType: "A1", price: BigInt(690000000), rentPrice: BigInt(0), areaExclusive: 84.77, areaSupply: 109.23, floor: "2/23", dong: "142", realtorName: "아파트뱅크공인중개사사무소", address: "경기도 수원시 권선구 곡반정동", approvalDate: "20180228" },
  { complexName: "수원SK스카이뷰", realEstateType: "A01", tradeType: "B1", price: BigInt(300000000), rentPrice: BigInt(0), areaExclusive: 84.77, areaSupply: 109.23, floor: "5/23", dong: "142", realtorName: "공인중개사A", address: "경기도 수원시 권선구 곡반정동", approvalDate: "20180228" },
  { complexName: "수원SK스카이뷰", realEstateType: "A01", tradeType: "B2", price: BigInt(10000000), rentPrice: BigInt(500000), areaExclusive: 84.77, areaSupply: 109.23, floor: "10/23", dong: "142", realtorName: "공인중개사B", address: "경기도 수원시 권선구 곡반정동", approvalDate: "20180228" },
  { complexName: "수원SK스카이뷰", realEstateType: "A01", tradeType: "B3", price: BigInt(5000000), rentPrice: BigInt(800000), areaExclusive: 84.77, areaSupply: 109.23, floor: "15/23", dong: "142", realtorName: "공인중개사C", address: "경기도 수원시 권선구 곡반정동", approvalDate: "20180228" },
];

describe("articlesToWorkbook", () => {
  it("builds a sheet with header + rows and maps tradeType to 한글", async () => {
    const wb = articlesToWorkbook(rows);
    const ws = wb.getWorksheet("매물")!;
    expect(ws.getRow(1).getCell(1).value).toBe("단지명");
    expect(ws.getRow(2).getCell(3).value).toBe("매매"); // A1 → 매매 (컬럼 3으로 이동)
    expect(ws.getRow(2).getCell(4).value).toBe(690000000);
    expect(ws.getRow(3).getCell(3).value).toBe("전세"); // B1 → 전세
    expect(ws.getRow(4).getCell(3).value).toBe("월세"); // B2 → 월세
    expect(ws.getRow(5).getCell(3).value).toBe("단기임대"); // B3 → 단기임대
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("매물유형 라벨 매핑(A01 → 아파트)", () => {
    const wb = articlesToWorkbook(rows);
    const ws = wb.getWorksheet("매물")!;
    expect(ws.getRow(2).getCell(2).value).toBe("아파트"); // 매물유형 컬럼
  });
});
