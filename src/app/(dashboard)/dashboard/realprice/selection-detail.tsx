"use client"

import { MapPin } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RealTxRecord } from "@/lib/realprice/types"

// 금액(원) → 억/만 표기 (뷰·통계패널과 동일 규칙).
function won억(v: number | null | undefined): string {
  if (v == null) return "-"
  const 억 = Math.floor(v / 100_000_000)
  const 만 = Math.round((v % 100_000_000) / 10_000)
  if (억 && 만) return `${억}억 ${만.toLocaleString("ko-KR")}만`
  if (억) return `${억}억`
  return `${만.toLocaleString("ko-KR")}만`
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const range = (xs: number[], unit = "") => {
  if (!xs.length) return "-"
  const lo = Math.min(...xs), hi = Math.max(...xs)
  return lo === hi ? `${lo.toLocaleString("ko-KR")}${unit}` : `${lo.toLocaleString("ko-KR")}~${hi.toLocaleString("ko-KR")}${unit}`
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
    </div>
  )
}

export function SelectionDetail({
  records,
  label,
  isComplex,
  uiKind,
}: {
  records: RealTxRecord[]
  label: string
  isComplex: boolean
  uiKind: "매매" | "전세" | "월세"
}) {
  if (!records.length) return null

  const priceOf = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null
  const prices = records.map(priceOf).filter((v): v is number => v != null)
  const perArea = records
    .map((r) => { const p = priceOf(r); return p != null && r.area ? p / r.area : null })
    .filter((v): v is number => v != null)
  const monthlies = records.map((r) => r.monthlyRent).filter((v): v is number => v != null && v > 0)
  const areas = records.map((r) => r.area).filter((v): v is number => v != null)
  const floors = records.map((r) => r.floor).filter((v): v is number => v != null)
  const years = records.map((r) => r.buildYear).filter((v): v is number => v != null)

  const priceLabel = uiKind === "매매" ? "평균 매매가" : "평균 보증금"

  // 동 선택 시: 단지별 집계(건수 내림차순).
  const complexes = !isComplex
    ? (() => {
        const m = new Map<string, { count: number; sum: number; n: number }>()
        for (const r of records) {
          const k = r.name || "-"
          const c = m.get(k) ?? { count: 0, sum: 0, n: 0 }
          c.count += 1
          const p = priceOf(r)
          if (p != null) { c.sum += p; c.n += 1 }
          m.set(k, c)
        }
        return [...m.entries()]
          .map(([name, c]) => ({ name, count: c.count, avg: c.n ? c.sum / c.n : null }))
          .sort((a, b) => b.count - a.count)
      })()
    : []
  const topComplexes = complexes.slice(0, 8)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" /> 선택 상세 · {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="거래" value={`${records.length.toLocaleString("ko-KR")}건`} />
          <Tile label={priceLabel} value={won억(mean(prices))} />
          <Tile label="중위" value={won억(median(prices))} />
          <Tile label="㎡당 평균" value={won억(mean(perArea))} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><span className="text-muted-foreground">면적</span> <span className="tabular-nums">{range(areas, "㎡")}</span></div>
          <div><span className="text-muted-foreground">층</span> <span className="tabular-nums">{range(floors)}</span></div>
          <div><span className="text-muted-foreground">건축년도</span> <span className="tabular-nums">{range(years)}</span></div>
          {uiKind === "월세" && <div><span className="text-muted-foreground">평균 월세</span> <span className="tabular-nums">{mean(monthlies) != null ? `${Math.round(mean(monthlies)! / 10_000).toLocaleString("ko-KR")}만` : "-"}</span></div>}
        </div>

        {!isComplex && topComplexes.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-medium">단지별 {complexes.length}곳{complexes.length > topComplexes.length ? ` (상위 ${topComplexes.length})` : ""}</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>단지/유형</TableHead>
                    <TableHead className="text-right">건수</TableHead>
                    <TableHead className="text-right">{priceLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topComplexes.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.count.toLocaleString("ko-KR")}</TableCell>
                      <TableCell className="text-right tabular-nums">{won억(c.avg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
