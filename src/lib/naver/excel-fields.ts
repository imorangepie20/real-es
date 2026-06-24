// 엑셀 출력 필드 정의 — 클라이언트/서버 공용 (exceljs 미포함, 클라 번들 안전)
export type ExcelField = { key: string; header: string; width: number };

export const EXCEL_FIELDS: ExcelField[] = [
  { key: "complexName", header: "단지명", width: 20 },
  { key: "realEstateType", header: "매물유형", width: 10 },
  { key: "tradeType", header: "거래유형", width: 10 },
  { key: "price", header: "가격(원)", width: 16 },
  { key: "rentPrice", header: "월세", width: 12 },
  { key: "areaExclusive", header: "전용면적", width: 10 },
  { key: "areaSupply", header: "공급면적", width: 10 },
  { key: "floor", header: "층", width: 8 },
  { key: "dong", header: "동", width: 8 },
  { key: "realtorName", header: "중개사", width: 28 },
];
