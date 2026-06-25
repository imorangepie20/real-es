import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROPERTY_LABEL } from "@/lib/naver/property-types";
import { TRADE_LABEL } from "@/lib/naver/trade-types";
import { formsFor } from "@/lib/properties/contract-forms";
import { getContractData } from "../../contract-actions";
import { ContractClient } from "./contract-client";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getContractData(id);
  if (!data) notFound();

  const g = (data.property.realEstateType as string) ?? "";
  const t = (data.property.tradeType as string) ?? "";
  const title = (data.property.name as string) || (data.property.complexName as string) || "매물";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        ⚠️ 실무 보조용 체크리스트·양식입니다. 공식·법적 효력을 보장하지 않으며, 구체적 거래는 전문가 확인이 필요합니다.
      </p>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.property.complexName as string} · {PROPERTY_LABEL[g] ?? g} · {TRADE_LABEL[t] ?? t}
            </p>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/properties" />}>목록</Button>
        </CardHeader>
        <CardContent className="pt-4">
          {!g || !t ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              먼저 매물유형·거래유형을 설정하세요.{" "}
              <Link href={`/dashboard/properties/${id}/edit`} className="text-primary underline">수정 폼 열기</Link>
            </div>
          ) : (
            <ContractClient id={id} data={data} forms={formsFor(g, t)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
