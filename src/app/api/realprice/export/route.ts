import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { getCurrentUser } from "@/lib/auth/current-user";
import { loadRealPrice } from "@/app/(dashboard)/dashboard/realprice/actions";
import { REALPRICE_PROPERTY_TYPES } from "@/lib/realprice/endpoints";
import type { RealTradeKind, RealTxRecord } from "@/lib/realprice/types";

export const dynamic = "force-dynamic";

const propLabel = (v: string) => REALPRICE_PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v;

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const lawdCd = params.get("lawdCd");
  const type = params.get("type");
  const kind = params.get("kind") as RealTradeKind | null;
  const months = Number(params.get("months") ?? "3");
  const split = params.get("split"); // 매매 | 전세 | 월세 — 임대 클라 분기 미러링

  if (!lawdCd || !type || (kind !== "sale" && kind !== "rent")) {
    return NextResponse.json({ error: "lawdCd·type·kind 필요" }, { status: 400 });
  }

  const { records } = await loadRealPrice({ lawdCd, propertyType: type, kind, months: months || 3 });

  // 화면과 동일하게 전세/월세 분기.
  let rows: RealTxRecord[] = records;
  if (split === "전세") rows = records.filter((r) => (r.monthlyRent ?? 0) === 0);
  else if (split === "월세") rows = records.filter((r) => (r.monthlyRent ?? 0) > 0);

  const isRent = kind === "rent";
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("실거래");
  ws.columns = [
    { header: "단지/유형", key: "name", width: 24 },
    { header: "법정동", key: "umdNm", width: 12 },
    { header: "면적(㎡)", key: "area", width: 10 },
    ...(isRent
      ? [
          { header: "보증금(원)", key: "deposit", width: 16 },
          { header: "월세(원)", key: "monthlyRent", width: 12 },
        ]
      : [{ header: "매매가(원)", key: "dealAmount", width: 16 }]),
    { header: "층", key: "floor", width: 8 },
    { header: "건축년도", key: "buildYear", width: 10 },
    { header: "계약일", key: "dealDate", width: 12 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    ws.addRow({
      name: r.name ?? "",
      umdNm: r.umdNm ?? "",
      area: r.area,
      deposit: r.deposit ?? null,
      monthlyRent: r.monthlyRent ?? null,
      dealAmount: r.dealAmount ?? null,
      floor: r.floor ?? null,
      buildYear: r.buildYear ?? null,
      dealDate: r.dealDate ?? "",
    });
  }

  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const label = split && split !== "매매" ? split : propLabel(type);
  const filename = encodeURIComponent(`실거래_${label}_${lawdCd}_${ts}.xlsx`);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
