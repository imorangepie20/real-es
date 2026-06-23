"use client"

import { Building2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ComplexRow } from "./actions"

export function ComplexList({ complexes, loading, onRefresh, onSelect, selectedNumber }: {
  complexes: ComplexRow[]; loading: boolean; onRefresh: () => void; onSelect: (c: ComplexRow) => void; selectedNumber?: string
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> 단지 목록</CardTitle>
        <CardAction className="flex items-center gap-2">
          {!loading && <span className="text-sm text-muted-foreground">{complexes.length}개</span>}
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />{loading ? "수집 중" : "갱신"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : complexes.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
              <EmptyTitle>단지가 없습니다</EmptyTitle>
              <EmptyDescription>다른 동·매물유형을 선택하거나 갱신을 눌러 다시 수집하세요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {complexes.map((c) => (
              <button
                key={c.complexNumber}
                onClick={() => onSelect(c)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selectedNumber === c.complexNumber && "border-primary ring-1 ring-primary",
                )}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">세대 {c.totalHouseholds ?? "-"} · 매매 {c.dealCount}/전세 {c.leaseDepositCount}/월세 {c.leaseMonthlyCount}</div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
