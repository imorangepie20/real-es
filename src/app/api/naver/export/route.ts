import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { articlesToWorkbook, type ExcelRow } from "@/lib/naver/excel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const complexNumber = new URL(req.url).searchParams.get("complexNumber");
  if (!complexNumber) return NextResponse.json({ error: "complexNumber 필요" }, { status: 400 });

  const complex = await db.complex.findUnique({
    where: { complexNumber },
    include: { articles: { orderBy: { fetchedAt: "desc" } } },
  });
  if (!complex) return NextResponse.json({ error: "단지 없음" }, { status: 404 });

  const rows: ExcelRow[] = complex.articles.map((a) => {
    const raw = (a.raw ?? {}) as { dong?: string };
    return {
      complexName: complex.name,
      tradeType: a.tradeType,
      price: a.price,
      rentPrice: a.rentPrice,
      areaExclusive: a.areaExclusive,
      areaSupply: a.areaSupply,
      floor: a.floor,
      dong: raw.dong ?? null,
      realtorName: a.realtorName,
    };
  });

  const wb = articlesToWorkbook(rows);
  const buf = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`${complex.name}_매물.xlsx`);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
