import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

import { parseWorkbook } from "./excel-read";

async function makeBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.addRow(["단지명", "매매가", "없는헤더"]);
  ws.addRow(["행복아파트", 350000000, "x"]);
  ws.addRow([null, null, null]); // 빈 행 — 무시되어야
  ws.addRow(["풍경마을", 250000000, "y"]);
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

describe("parseWorkbook", () => {
  it("헤더 매칭 + 빈 행 제외", async () => {
    const parsed = await parseWorkbook(await makeBuffer());
    expect(parsed.headers).toEqual(["단지명", "매매가", "없는헤더"]);
    expect(parsed.matches[0].fieldKey).toBe("complexName");
    expect(parsed.matches[1].fieldKey).toBe("price");
    expect(parsed.matches[2].fieldKey).toBeNull();
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0][0]).toBe("행복아파트");
    expect(parsed.rows[1][0]).toBe("풍경마을");
  });
});
