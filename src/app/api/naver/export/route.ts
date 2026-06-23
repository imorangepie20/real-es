import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { articlesToWorkbook, type ExcelRow } from "@/lib/naver/excel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const complexNumber = params.get("complexNumber");
  const regionCode = params.get("regionCode");
  const realEstateType = params.get("realEstateType");
  const tradeType = params.get("tradeType");

  let rows: ExcelRow[];
  let filename: string;

  if (complexNumber) {
    // 단지형
    const complex = await db.complex.findUnique({
      where: { complexNumber },
      include: { articles: { orderBy: { fetchedAt: "desc" } } },
    });
    if (!complex) return NextResponse.json({ error: "단지 없음" }, { status: 404 });

    rows = complex.articles.map((a) => ({
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
    }));
    filename = encodeURIComponent(`${complex.name}_매물.xlsx`);
  } else if (regionCode && realEstateType && tradeType) {
    // 비단지형
    const articles = await db.article.findMany({
      where: { regionCode, realEstateType, tradeType },
      orderBy: { fetchedAt: "desc" },
    });

    rows = articles.map((a) => ({
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
    }));
    filename = encodeURIComponent(`${regionCode}_${realEstateType}_매물.xlsx`);
  } else {
    return NextResponse.json({ error: "complexNumber 또는 regionCode+realEstateType+tradeType 필요" }, { status: 400 });
  }

  const wb = articlesToWorkbook(rows);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
