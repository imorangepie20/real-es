"use client"

import { buttonVariants } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ArticleRow } from "./actions"

const TRADE: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" }
const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function ArticlesGrid({ complexNumber, articles, loading, trade, onTrade, onRefresh }: {
  complexNumber: string; articles: ArticleRow[]; loading: boolean; trade: string; onTrade: (t: string) => void; onRefresh: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NativeSelect value={trade} onChange={(e) => onTrade(e.target.value)} className="w-28">
          <NativeSelectOption value="">전체</NativeSelectOption>
          <NativeSelectOption value="A1">매매</NativeSelectOption>
          <NativeSelectOption value="B1">전세</NativeSelectOption>
          <NativeSelectOption value="B2">월세</NativeSelectOption>
        </NativeSelect>
        <button className={buttonVariants({ size: "sm", variant: "outline" })} onClick={onRefresh} disabled={loading}>{loading ? "수집 중..." : "갱신"}</button>
        <span className="text-sm text-muted-foreground">매물 {articles.length}개</span>
        <a className={buttonVariants({ size: "sm" }) + " ml-auto"} href={`/api/naver/export?complexNumber=${complexNumber}`}>엑셀 다운로드</a>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래</TableHead><TableHead>가격</TableHead><TableHead>월세</TableHead><TableHead>전용</TableHead><TableHead>공급</TableHead><TableHead>층</TableHead><TableHead>동</TableHead><TableHead>중개사</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((a) => (
              <TableRow key={a.articleNumber}>
                <TableCell>{TRADE[a.tradeType] ?? a.tradeType}</TableCell>
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
