import { describe, expect, it } from "vitest";

import { articlesToWorkbook, type ExcelRow } from "./excel";

const rows: ExcelRow[] = [
  { complexName: "수원SK스카이뷰", tradeType: "A1", price: BigInt(690000000), rentPrice: BigInt(0), areaExclusive: 84.77, areaSupply: 109.23, floor: "2/23", dong: "142", realtorName: "아파트뱅크공인중개사사무소" },
];

describe("articlesToWorkbook", () => {
  it("builds a sheet with header + rows and maps tradeType to 한글", async () => {
    const wb = articlesToWorkbook(rows);
    const ws = wb.getWorksheet("매물")!;
    expect(ws.getRow(1).getCell(1).value).toBe("단지명");
    expect(ws.getRow(2).getCell(2).value).toBe("매매"); // A1 → 매매
    expect(ws.getRow(2).getCell(3).value).toBe(690000000);
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
