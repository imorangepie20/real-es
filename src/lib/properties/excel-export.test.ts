import { describe, it, expect } from "vitest";

import { propertiesToWorkbook } from "./excel-export";

describe("propertiesToWorkbook", () => {
  it("선택 필드만·라벨 헤더·값 변환", async () => {
    const rows = [{ complexName: "정자동 자이", realEstateType: "A01", tradeType: "A1", price: BigInt(350000000), approvalDate: "20030808", isPreSale: true }];
    const wb = propertiesToWorkbook(rows, ["complexName", "realEstateType", "tradeType", "price", "approvalDate", "isPreSale"]);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).values).toEqual([undefined, "단지명", "매물유형", "거래유형", "가격", "사용승인일", "준공아파트여부"]);
    const r2 = ws.getRow(2);
    expect(r2.getCell(1).value).toBe("정자동 자이");
    expect(r2.getCell(2).value).toBe("아파트"); // 코드→라벨
    expect(r2.getCell(3).value).toBe("매매");
    expect(r2.getCell(4).value).toBe(35000); // money(원)→만원
    expect(r2.getCell(5).value).toBe("2003.08.08"); // date 포맷
    expect(r2.getCell(6).value).toBe("예"); // bool
  });
  it("미선택 필드는 컬럼 제외", () => {
    const wb = propertiesToWorkbook([{ complexName: "x", memo: "y" }], ["complexName"]);
    expect(wb.worksheets[0].columnCount).toBe(1);
  });
});
