"use client"

import { buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TRADE_LABEL } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL } from "@/lib/naver/property-types"
import type { ArticleRow } from "./actions"

const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function ArticlesGrid({ exportHref, articles, loading, onRefresh }: {
  exportHref: string; articles: ArticleRow[]; loading: boolean; onRefresh: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button className={buttonVariants({ size: "sm", variant: "outline" })} onClick={onRefresh} disabled={loading}>{loading ? "수집 중..." : "갱신"}</button>
        <span className="text-sm text-muted-foreground">매물 {articles.length}개</span>
        <a className={buttonVariants({ size: "sm" }) + " ml-auto"} href={exportHref}>엑셀 다운로드</a>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead><TableHead>거래</TableHead><TableHead>가격</TableHead><TableHead>월세</TableHead><TableHead>전용</TableHead><TableHead>공급</TableHead><TableHead>층</TableHead><TableHead>동</TableHead><TableHead>중개사</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((a) => (
              <TableRow key={a.articleNumber}>
                <TableCell>{PROPERTY_LABEL[a.realEstateType] ?? a.realEstateType}</TableCell>
                <TableCell>{TRADE_LABEL[a.tradeType] ?? a.tradeType}</TableCell>
                <TableCell>{won(a.price)}</TableCell>
                <TableCell>{won(a.rentPrice)}</TableCell>
                <TableCell>{a.areaExclusive ?? "-"}</TableCell>
                <TableCell>{a.areaSupply ?? "-"}</TableCell>
                <TableCell>{a.floor ?? "-"}</TableCell>
                <TableCell>{a.dong ?? "-"}</TableCell>
                <TableCell>{a.realtorName ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
