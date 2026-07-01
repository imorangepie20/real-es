"use client"

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  BarChart,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { RealStats } from "@/lib/realprice/types"

// 금액(원) → 억/만 표기. realprice-view의 won억과 동일한 표시 규칙.
function won억(v: number | null | undefined): string {
  if (v == null) return "—"
  const 억 = Math.floor(v / 100_000_000)
  const 만 = Math.round((v % 100_000_000) / 10_000)
  if (억 && 만) return `${억}억 ${만.toLocaleString("ko-KR")}만`
  if (억) return `${억}억`
  return `${만.toLocaleString("ko-KR")}만`
}
// ㎡당 평균가는 값이 작아 만/원 단위로 표시.
function wonPerArea(v: number | null | undefined): string {
  if (v == null) return "—"
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`
  return `${Math.round(v).toLocaleString("ko-KR")}원`
}
// YYYYMM → "YY.MM"
function ymLabel(ym: string): string {
  return ym && ym.length === 6 ? `${ym.slice(2, 4)}.${ym.slice(4, 6)}` : ym
}
const pct = (v: number) => `${Math.round(v * 100)}%`

const monthConfig = {
  count: { label: "거래건수", color: "var(--chart-2)" },
  avgPrice: { label: "평균가", color: "var(--chart-1)" },
} satisfies ChartConfig

const areaConfig = {
  count: { label: "거래건수", color: "var(--chart-3)" },
} satisfies ChartConfig

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
      표시할 데이터가 없습니다
    </div>
  )
}

export function StatsPanel({ stats }: { stats: RealStats }) {
  const isSale = stats.canceledRatio !== undefined
  const isRent = stats.jeonseRatio !== undefined

  // 월별 추이는 시간순(과거→현재)으로 정렬해 표시.
  const monthData = [...stats.byMonth]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((m) => ({ label: ymLabel(m.ym), count: m.count, avgPrice: m.avgPrice }))

  return (
    <div className="flex flex-col gap-4">
      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="거래건수" value={`${stats.count.toLocaleString("ko-KR")}건`} />
        <SummaryCard label="평균가" value={won억(stats.avgPrice)} />
        <SummaryCard label="중위가" value={won억(stats.medianPrice)} />
        <SummaryCard label="㎡당 평균가" value={wonPerArea(stats.avgPerArea)} />
      </div>

      {/* 비중 배지 */}
      {(isSale || isRent) && (
        <div className="flex flex-wrap items-center gap-2">
          {isSale && (
            <Badge variant="outline">
              해제거래 비중 {pct(stats.canceledRatio ?? 0)}
            </Badge>
          )}
          {isRent && (
            <>
              <Badge variant="outline">전세 비중 {pct(stats.jeonseRatio ?? 0)}</Badge>
              <Badge variant="outline">갱신 비중 {pct(stats.renewalRatio ?? 0)}</Badge>
              <Badge variant="secondary">
                평균 갱신 인상률{" "}
                {stats.avgRentIncrease != null
                  ? `${stats.avgRentIncrease.toFixed(1)}%`
                  : "—"}
              </Badge>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 월별 추이: 건수 막대 + 평균가 선 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {monthData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={monthConfig} className="h-56 w-full">
                <ComposedChart data={monthData} margin={{ left: -8, right: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="left"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="avgPrice"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      v >= 100_000_000
                        ? `${(v / 100_000_000).toFixed(1)}억`
                        : `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {name === "avgPrice" ? "평균가" : "거래건수"}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {name === "avgPrice"
                                ? won억(value as number)
                                : `${(value as number).toLocaleString("ko-KR")}건`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar
                    yAxisId="count"
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="avgPrice"
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="var(--color-avgPrice)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* 면적대 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>면적대 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byArea.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer config={areaConfig} className="h-56 w-full">
                <BarChart data={stats.byArea} margin={{ left: -8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
