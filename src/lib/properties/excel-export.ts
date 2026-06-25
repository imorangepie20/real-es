// 매물 → 워크북. 선택 필드만, 라벨 헤더, 값 변환(enum 코드→라벨/money→Number/date 포맷/bool 예아니오). 서버 전용(exceljs).
import ExcelJS from "exceljs";

import { PROPERTY_FIELDS, FIELD_BY_KEY } from "./fields";

export type ExportRow = Record<string, unknown>;

const ymd = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s);

function cellValue(key: string, v: unknown): string | number | null {
  if (v == null || v === "") return null;
  const f = FIELD_BY_KEY[key];
  switch (f.type) {
    case "money": return Number(v) / 10000; // 원 → 만원
    case "area": case "number": return Number(v);
    case "select": return f.options?.find((o) => o.value === v)?.label ?? String(v);
    case "date": return ymd(String(v));
    case "bool": return v ? "예" : "아니오";
    default: return String(v);
  }
}

export function propertiesToWorkbook(rows: ExportRow[], fields: string[]): ExcelJS.Workbook {
  const cols = PROPERTY_FIELDS.filter((f) => fields.includes(f.key));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.columns = cols.map((f) => ({ header: f.label, key: f.key, width: 16 }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    const row: Record<string, string | number | null> = {};
    for (const f of cols) row[f.key] = cellValue(f.key, r[f.key]);
    ws.addRow(row);
  }
  return wb;
}
