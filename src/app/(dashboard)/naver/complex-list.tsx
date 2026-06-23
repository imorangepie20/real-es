"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ComplexRow } from "./actions"

export function ComplexList({ complexes, loading, onRefresh, onSelect }: { complexes: ComplexRow[]; loading: boolean; onRefresh: () => void; onSelect: (c: ComplexRow) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">단지 {complexes.length}개</span>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>{loading ? "수집 중..." : "갱신"}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {complexes.map((c) => (
          <Card key={c.complexNumber} className="cursor-pointer p-3 hover:bg-muted/50" onClick={() => onSelect(c)}>
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-muted-foreground">세대 {c.totalHouseholds ?? "-"} · 매매 {c.dealCount}/전세 {c.leaseDepositCount}/월세 {c.leaseMonthlyCount}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
