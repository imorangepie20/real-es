import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { propertiesToWorkbook } from "@/lib/properties/excel-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const view = p.get("view");
  const realEstateType = p.get("realEstateType");
  const tradeType = p.get("tradeType");
  const status = p.get("status");
  const fieldsParam = p.get("fields");
  const fields = fieldsParam ? fieldsParam.split(",").filter(Boolean) : [];

  const where: { userId: string; isFavorite?: boolean; status?: string; realEstateType?: string; tradeType?: string } = { userId: user.id };
  if (view === "favorites") where.isFavorite = true;
  if (view === "contracted") where.status = "계약완료";
  if (realEstateType) where.realEstateType = realEstateType;
  if (tradeType) where.tradeType = tradeType;
  if (status && view !== "contracted") where.status = status;

  const rows = await db.property.findMany({ where, orderBy: { createdAt: "desc" } });
  const wb = propertiesToWorkbook(rows as unknown as Record<string, unknown>[], fields);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = encodeURIComponent(`매물_${ts}.xlsx`);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
