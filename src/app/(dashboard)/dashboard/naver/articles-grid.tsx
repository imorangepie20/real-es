"use client"

import { Download, Inbox, ListFilter, RefreshCw } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TRADE_LABEL } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL } from "@/lib/naver/property-types"
import type { ArticleRow } from "./actions"

const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function ArticlesGrid({ exportHref, articles, loading, onRefresh }: {
  exportHref: string; articles: ArticleRow[]; loading: boolean; onRefresh: () => void
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><ListFilter className="size-4" /> 매물</CardTitle>
        <CardAction className="flex items-center gap-2">
          {!loading && <span className="text-sm text-muted-foreground">{articles.length}개</span>}
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />{loading ? "수집 중" : "갱신"}
          </Button>
          <a className={cn(buttonVariants({ size: "sm" }))} href={exportHref}><Download className="size-3.5" />엑셀</a>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
          </div>
        ) : articles.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
              <EmptyTitle>매물이 없습니다</EmptyTitle>
              <EmptyDescription>다른 조건을 선택하거나 갱신을 눌러 다시 수집하세요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="max-h-96 overflow-auto">
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
        )}
      </CardContent>
    </Card>
  )
}
