import ExcelJS from "exceljs";

import { PROPERTY_LABEL } from "./property-types";
import { TRADE_LABEL } from "./trade-types";

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
};

export function articlesToWorkbook(rows: ExcelRow[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.columns = [
    { header: "단지명", key: "complexName", width: 20 },
    { header: "매물유형", key: "realEstateType", width: 10 },
    { header: "거래유형", key: "tradeType", width: 10 },
    { header: "가격(원)", key: "price", width: 16 },
    { header: "월세", key: "rentPrice", width: 12 },
    { header: "전용면적", key: "areaExclusive", width: 10 },
    { header: "공급면적", key: "areaSupply", width: 10 },
    { header: "층", key: "floor", width: 8 },
    { header: "동", key: "dong", width: 8 },
    { header: "중개사", key: "realtorName", width: 28 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
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
    });
  }
  return wb;
}
