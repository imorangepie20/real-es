import ExcelJS from "exceljs";

import { PROPERTY_LABEL } from "./property-types";
import { TRADE_LABEL } from "./trade-types";
import { EXCEL_FIELDS } from "./excel-fields";

export type ExcelRow = {
  complexName: string;
  realEstateType: string;
  tradeType: string;
  price: bigint | null;
  rentPrice: bigint | null;
  areaExclusive: number | null;
  areaSupply: number | null;
  floor: string | null;
  dong: string | null;
  realtorName: string | null;
  address: string | null;
  approvalDate: string | null;
};

/** fields가 주어지면 해당 키 컬럼만 출력(순서 보존), 없으면 전체. */
export function articlesToWorkbook(rows: ExcelRow[], fields?: string[]): ExcelJS.Workbook {
  const cols = EXCEL_FIELDS.filter((f) => !fields || fields.length === 0 || fields.includes(f.key));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.columns = cols.map((f) => ({ header: f.header, key: f.key, width: f.width }));
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    const full: Record<string, string | number | null> = {
      complexName: r.complexName,
      realEstateType: PROPERTY_LABEL[r.realEstateType] ?? r.realEstateType,
      tradeType: TRADE_LABEL[r.tradeType] ?? r.tradeType,
      price: r.price != null ? Number(r.price) : null,
      rentPrice: r.rentPrice != null ? Number(r.rentPrice) : null,
      areaExclusive: r.areaExclusive,
      areaSupply: r.areaSupply,
      floor: r.floor,
      dong: r.dong,
      realtorName: r.realtorName,
      address: r.address,
      approvalDate: r.approvalDate,
    };
    const row: Record<string, string | number | null> = {};
    for (const f of cols) row[f.key] = full[f.key];
    ws.addRow(row);
  }
  return wb;
}
