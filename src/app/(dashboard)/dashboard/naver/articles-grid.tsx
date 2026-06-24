"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Download, Inbox, ListFilter, RefreshCw } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TRADE_LABEL } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL } from "@/lib/naver/property-types"
import type { ArticleRow } from "./actions"

const PAGE_SIZE = 20
const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function ArticlesGrid({ exportHref, articles, loading, onRefresh }: {
  exportHref: string; articles: ArticleRow[]; loading: boolean; onRefresh: () => void
}) {
  const [page, setPage] = useState(0)
  const [sel, setSel] = useState<Set<string>>(new Set())
  // 새 매물 셋(검색·갱신)이 들어오면 1페이지로 리셋 + 선택 해제 — effect 대신 렌더 중 prop 변화 감지(React 권장)
  const [seen, setSeen] = useState(articles)
  if (seen !== articles) { setSeen(articles); setPage(0); setSel(new Set()) }

  const allSelected = articles.length > 0 && sel.size === articles.length
  const someSelected = sel.size > 0 && sel.size < articles.length
  const toggleAll = (c: boolean) => setSel(c ? new Set(articles.map((a) => a.articleNumber)) : new Set())
  const toggleOne = (n: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(n); else next.delete(n); return next })

  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const paged = articles.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><ListFilter className="size-4" /> 매물</CardTitle>
        <CardAction className="flex items-center gap-2">
          {sel.size > 0 && <span className="text-sm font-medium">선택 {sel.size}</span>}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={(c) => toggleAll(c)} aria-label="전체 선택" /></TableHead><TableHead className="w-12 text-right">#</TableHead><TableHead>매물명</TableHead><TableHead>유형</TableHead><TableHead>거래</TableHead><TableHead>가격</TableHead><TableHead>월세</TableHead><TableHead>전용</TableHead><TableHead>공급</TableHead><TableHead>층</TableHead><TableHead>동</TableHead><TableHead>중개사</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((a, j) => (
                  <TableRow key={a.articleNumber} data-state={sel.has(a.articleNumber) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.has(a.articleNumber)} onCheckedChange={(c) => toggleOne(a.articleNumber, c)} aria-label="선택" /></TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{articles.length - (current * PAGE_SIZE + j)}</TableCell>
                    <TableCell className="font-medium">{a.name ?? "-"}</TableCell>
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
      {!loading && articles.length > 0 && (
        <CardFooter className="justify-between">
          <span className="text-sm text-muted-foreground">총 {articles.length}개</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(current - 1)} disabled={current === 0}>
              <ChevronLeft className="size-3.5" />이전
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">{current + 1} / {pageCount}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1}>
              다음<ChevronRight className="size-3.5" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
