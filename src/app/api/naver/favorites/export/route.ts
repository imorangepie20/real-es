import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { articlesToWorkbook, type ExcelRow } from "@/lib/naver/excel";

export const dynamic = "force-dynamic";

type Snap = {
  name?: string | null; realEstateType?: string | null; tradeType?: string | null;
  price?: string | null; rentPrice?: string | null; areaExclusive?: number | null; areaSupply?: number | null;
  floor?: string | null; dong?: string | null; realtorName?: string | null; address?: string | null; approvalDate?: string | null;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const realEstateType = params.get("realEstateType");
  const tradeType = params.get("tradeType");
  const fieldsParam = params.get("fields");
  const fields = fieldsParam ? fieldsParam.split(",").filter(Boolean) : undefined;

  const favs = await db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  let data = favs.map((f) => f.data as Snap);
  if (realEstateType) data = data.filter((d) => d.realEstateType === realEstateType);
  if (tradeType) data = data.filter((d) => d.tradeType === tradeType);

  const rows: ExcelRow[] = data.map((d) => ({
    complexName: d.name ?? "",
    realEstateType: d.realEstateType ?? "",
    tradeType: d.tradeType ?? "",
    price: d.price != null ? BigInt(d.price) : null,
    rentPrice: d.rentPrice != null ? BigInt(d.rentPrice) : null,
    areaExclusive: d.areaExclusive ?? null,
    areaSupply: d.areaSupply ?? null,
    floor: d.floor ?? null,
    dong: d.dong ?? null,
    realtorName: d.realtorName ?? null,
    address: d.address ?? null,
    approvalDate: d.approvalDate ?? null,
  }));

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = encodeURIComponent(`관심매물_${ts}.xlsx`);

  const wb = articlesToWorkbook(rows, fields);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
