import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { articlesToWorkbook, type ExcelRow } from "@/lib/naver/excel";
import { PROPERTY_LABEL } from "@/lib/naver/property-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const complexNumber = params.get("complexNumber");
  const regionCode = params.get("regionCode");
  const realEstateType = params.get("realEstateType");
  const tradeType = params.get("tradeType");
  const fieldsParam = params.get("fields");
  const fields = fieldsParam ? fieldsParam.split(",").filter(Boolean) : undefined;

  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  let rows: ExcelRow[];
  let filename: string;

  if (complexNumber) {
    // 단지형
    const complex = await db.complex.findUnique({
      where: { complexNumber },
      include: { articles: { orderBy: { fetchedAt: "desc" } } },
    });
    if (!complex) return NextResponse.json({ error: "단지 없음" }, { status: 404 });

    rows = complex.articles.map((a) => {
      const raw = (a.raw ?? {}) as { address?: string | null; approvalDate?: string | null };
      return {
        complexName: complex.name,
        realEstateType: a.realEstateType ?? "",
        tradeType: a.tradeType,
        price: a.price,
        rentPrice: a.rentPrice,
        areaExclusive: a.areaExclusive,
        areaSupply: a.areaSupply,
        floor: a.floor,
        dong: a.dong,
        realtorName: a.realtorName,
        address: raw.address ?? null,
        approvalDate: raw.approvalDate ?? null,
      };
    });
    filename = encodeURIComponent(`${complex.name}_매물_${ts}.xlsx`);
  } else if (regionCode && realEstateType && tradeType) {
    // 비단지형
    const articles = await db.article.findMany({
      where: { regionCode, realEstateType, tradeType },
      orderBy: { fetchedAt: "desc" },
    });

    rows = articles.map((a) => {
      const raw = (a.raw ?? {}) as { address?: string | null; approvalDate?: string | null };
      return {
        complexName: "",
        realEstateType: a.realEstateType ?? "",
        tradeType: a.tradeType,
        price: a.price,
        rentPrice: a.rentPrice,
        areaExclusive: a.areaExclusive,
        areaSupply: a.areaSupply,
        floor: a.floor,
        dong: a.dong,
        realtorName: a.realtorName,
        address: raw.address ?? null,
        approvalDate: raw.approvalDate ?? null,
      };
    });
    filename = encodeURIComponent(`${regionCode}_${PROPERTY_LABEL[realEstateType] ?? realEstateType}_매물_${ts}.xlsx`);
  } else {
    return NextResponse.json({ error: "complexNumber 또는 regionCode+realEstateType+tradeType 필요" }, { status: 400 });
  }

  const wb = articlesToWorkbook(rows, fields);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
