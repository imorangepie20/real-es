"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, ChevronLeft, ChevronRight, Download, Inbox, Map, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { REALPRICE_PROPERTY_TYPES } from "@/lib/realprice/endpoints"
import type { RealTxRecord } from "@/lib/realprice/types"
import type { Region } from "@/app/(dashboard)/dashboard/naver/actions"
import { loadRealPrice } from "./actions"
import { RegionPicker } from "./region-picker"

const PAGE_SIZE = 20

// UI 거래유형: 매매 / 전세 / 월세. 서버 kind: 매매→sale, 전세·월세→rent.
type UiKind = "매매" | "전세" | "월세"
const TRADE_OPTIONS: { value: UiKind; label: string }[] = [
  { value: "매매", label: "매매" },
  { value: "전세", label: "전세" },
  { value: "월세", label: "월세" },
]
const MONTH_OPTIONS = [3, 6, 12]
const propLabel = (v: string) => REALPRICE_PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v

// 금액(원) → 억/만 표기
function won억(v: number | null | undefined): string {
  if (v == null) return "-"
  const 억 = Math.floor(v / 100_000_000)
  const 만 = Math.round((v % 100_000_000) / 10_000)
  if (억 && 만) return `${억}억 ${만.toLocaleString("ko-KR")}만`
  if (억) return `${억}억`
  return `${만.toLocaleString("ko-KR")}만`
}
const ymd = (v: string) => (v && v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6, 8)}` : v || "-")

type SortKey = "name" | "umdNm" | "area" | "price" | "floor" | "buildYear" | "dealDate"
type LoadResult = Awaited<ReturnType<typeof loadRealPrice>>

export function RealpriceView({ sidos }: { sidos: Region[] }) {
  const [uiKind, setUiKind] = useState<UiKind>("매매")
  const [propertyType, setPropertyType] = useState("apt")
  const [lawdCd, setLawdCd] = useState("")
  const [regionName, setRegionName] = useState("")
  const [months, setMonths] = useState(3)
  const [data, setData] = useState<LoadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queried, setQueried] = useState<{ uiKind: UiKind; propertyType: string; lawdCd: string; regionName: string; months: number } | null>(null)

  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "dealDate", dir: "desc" })

  const isRent = uiKind !== "매매"
  // 거래유형이 전세/월세면 rent 지원 유형만, 매매면 전체(sale).
  const propertyOptions = useMemo(() => REALPRICE_PROPERTY_TYPES.filter((t) => (isRent ? t.rent : t.sale)), [isRent])

  function changeKind(next: UiKind) {
    setUiKind(next)
    // 미지원 유형이 선택돼 있으면 첫 지원 유형으로 보정
    const rent = next !== "매매"
    if (rent && !REALPRICE_PROPERTY_TYPES.find((t) => t.value === propertyType)?.rent) setPropertyType("apt")
  }

  async function search() {
    if (!lawdCd) return
    setLoading(true); setError(null)
    const kind = uiKind === "매매" ? "sale" : "rent"
    try {
      const res = await loadRealPrice({ lawdCd, propertyType, kind, months })
      setData(res)
      setQueried({ uiKind, propertyType, lawdCd, regionName, months })
      setPage(0)
    } catch (e) {
      setData(null); setQueried(null)
      setError(e instanceof Error ? e.message : "조회 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  // 전세/월세 클라 분기: 전세 = monthlyRent===0, 월세 = monthlyRent>0.
  const records = useMemo(() => {
    if (!data || !queried) return []
    if (queried.uiKind === "전세") return data.records.filter((r) => (r.monthlyRent ?? 0) === 0)
    if (queried.uiKind === "월세") return data.records.filter((r) => (r.monthlyRent ?? 0) > 0)
    return data.records
  }, [data, queried])

  const priceOf = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null
  const sortVal = (r: RealTxRecord, k: SortKey): string | number => {
    switch (k) {
      case "name": return r.name ?? ""
      case "umdNm": return r.umdNm ?? ""
      case "area": return r.area ?? -Infinity
      case "price": return priceOf(r) ?? -Infinity
      case "floor": return r.floor ?? -Infinity
      case "buildYear": return r.buildYear ?? -Infinity
      case "dealDate": return r.dealDate ?? ""
    }
  }
  const sorted = useMemo(() => {
    const arr = [...records]
    arr.sort((a, b) => {
      const av = sortVal(a, sort.key), bv = sortVal(b, sort.key)
      const c = av < bv ? -1 : av > bv ? 1 : 0
      return sort.dir === "asc" ? c : -c
    })
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, sort])

  function toggleSort(key: SortKey) {
    setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }))
    setPage(0)
  }
  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k ? <ArrowUpDown className="size-3 opacity-40" /> : sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const paged = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  const exportHref = queried
    ? `/api/realprice/export?lawdCd=${queried.lawdCd}&type=${queried.propertyType}&kind=${queried.uiKind === "매매" ? "sale" : "rent"}&months=${queried.months}&split=${encodeURIComponent(queried.uiKind)}`
    : ""

  const priceHeader = !queried ? "금액" : queried.uiKind === "매매" ? "매매가" : queried.uiKind === "전세" ? "보증금" : "보증금/월세"
  const sortable = (key: SortKey, label: string, className?: string) => (
    <TableHead className={className}>
      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}<SortIcon k={key} />
      </button>
    </TableHead>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 조건 */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>검색 조건</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">거래유형</span>
              <RadioGroup value={uiKind} onValueChange={(v) => { if (v != null) changeKind(v as UiKind) }} className="flex w-fit flex-row flex-wrap gap-x-4 gap-y-2">
                {TRADE_OPTIONS.map((t) => (
                  <div key={t.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={t.value} id={`kind-${t.value}`} />
                    <Label htmlFor={`kind-${t.value}`} className="font-normal cursor-pointer">{t.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">매물유형</span>
              <Select value={propertyType} onValueChange={(v) => { if (v != null) setPropertyType(v) }}>
                <SelectTrigger>
                  <SelectValue>{propLabel(propertyType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {propertyOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">기간</span>
              <RadioGroup value={String(months)} onValueChange={(v) => { if (v != null) setMonths(Number(v)) }} className="flex w-fit flex-row flex-wrap gap-x-4 gap-y-2">
                {MONTH_OPTIONS.map((m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    <RadioGroupItem value={String(m)} id={`months-${m}`} />
                    <Label htmlFor={`months-${m}`} className="font-normal cursor-pointer">{m}개월</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">지역</span>
            <RegionPicker sidos={sidos} onPick={(code, name) => { setLawdCd(code); setRegionName(name) }} />
            <Button size="sm" onClick={search} disabled={!lawdCd || loading}>
              <Search className="size-3.5" />{loading ? "조회 중" : "조회"}
            </Button>
          </div>

          {lawdCd && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-sm text-muted-foreground">선택</span>
              <Badge variant="secondary">{uiKind}</Badge>
              <Badge variant="secondary">{propLabel(propertyType)}</Badge>
              <Badge variant="secondary">{months}개월</Badge>
              {regionName && <Badge variant="outline">{regionName}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {/* 통계 패널 placeholder (Task 8) */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> 통계</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">다음 단계에서 표시</CardContent>
      </Card>

      {/* 지도 placeholder (Task 9) */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><Map className="size-4" /> 지도</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-sm text-muted-foreground">다음 단계에서 표시</CardContent>
      </Card>

      {/* 실패 월 안내 */}
      {queried && data && data.failedMonths.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          일부 기간의 데이터를 불러오지 못했습니다: {data.failedMonths.join(", ")}
        </div>
      )}

      {/* 결과 그리드 */}
      {!queried ? (
        <Card>
          <CardContent className="py-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>조건을 선택하세요</EmptyTitle>
                <EmptyDescription>거래유형·매물유형·기간을 고르고 시/도 → 시/군/구를 선택한 뒤 조회를 누르면 실거래가를 불러옵니다.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>실거래 내역</CardTitle>
            <CardAction className="flex items-center gap-2">
              {!loading && <span className="text-sm text-muted-foreground">{sorted.length}건</span>}
              <a href={exportHref} className={cn(buttonVariants({ size: "sm" }), (loading || sorted.length === 0) && "pointer-events-none opacity-50")}>
                <Download className="size-3.5" />엑셀
              </a>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            ) : sorted.length === 0 ? (
              <Empty className="border-0 py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Inbox /></EmptyMedia>
                  <EmptyTitle>실거래 내역이 없습니다</EmptyTitle>
                  <EmptyDescription>다른 조건이나 기간을 선택해 다시 조회하세요.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-right">#</TableHead>
                      {sortable("name", "단지/유형")}
                      {sortable("umdNm", "법정동")}
                      {sortable("area", "면적(㎡)", "text-right")}
                      {sortable("price", priceHeader, "text-right")}
                      {sortable("floor", "층", "text-right")}
                      {sortable("buildYear", "건축년도", "text-right")}
                      {sortable("dealDate", "계약일")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r, j) => (
                      <TableRow key={`${r.name}-${r.umdNm}-${r.dealDate}-${current * PAGE_SIZE + j}`}>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{sorted.length - (current * PAGE_SIZE + j)}</TableCell>
                        <TableCell className="font-medium">{r.name || "-"}</TableCell>
                        <TableCell>{r.umdNm || "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.area != null ? r.area.toLocaleString("ko-KR") : "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {queried.uiKind === "월세"
                            ? `${won억(r.deposit)} / ${(r.monthlyRent ?? 0).toLocaleString("ko-KR")}만`
                            : won억(priceOf(r))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.floor ?? "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.buildYear ?? "-"}</TableCell>
                        <TableCell className="tabular-nums">{ymd(r.dealDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {!loading && sorted.length > 0 && (
            <CardFooter className="justify-between">
              <span className="text-sm text-muted-foreground">총 {sorted.length}건</span>
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
      )}
    </div>
  )
}
