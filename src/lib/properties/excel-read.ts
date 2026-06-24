// 업로드 엑셀(첫 시트) → ParsedSheet. exceljs 사용(서버 전용).
import ExcelJS from "exceljs";

import type { ParsedSheet } from "./excel-import";
import { matchHeaders } from "./header-match";

function cellToString(v: ExcelJS.CellValue): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown };
    const s = o.text ?? (o.result != null ? String(o.result) : "");
    return s.trim() || null;
  }
  const s = String(v).trim();
  return s || null;
}

export async function parseWorkbook(buf: ArrayBuffer): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], matches: [], rows: [] };

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => { headers[col - 1] = (cellToString(cell.value) ?? "").trim(); });
  const width = headers.length;
  const matches = matchHeaders(headers);

  const rows: (string | null)[][] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells: (string | null)[] = [];
    let empty = true;
    for (let c = 1; c <= width; c++) {
      const s = cellToString(row.getCell(c).value);
      cells[c - 1] = s;
      if (s != null) empty = false;
    }
    if (!empty) rows.push(cells);
  }
  return { headers, matches, rows };
}
