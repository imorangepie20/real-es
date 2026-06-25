"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { RealTxRecord } from "@/lib/realprice/types"
import { KakaoMap, type MapCluster, type MapMarker } from "@/app/(dashboard)/dashboard/naver/kakao-map"
import { loadComplexPoints } from "./actions"

type Dong = { umdNm: string; count: number; avg: number | null; lat: number | null; lng: number | null }
type ComplexPoint = Awaited<ReturnType<typeof loadComplexPoints>>[number]

const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null

export function RealpriceMap({
  appKey,
  cityDivision,
  byDong,
  records,
  selectedKey,
  onSelect,
}: {
  appKey: string
  cityDivision: string
  byDong: Dong[]
  records: RealTxRecord[]
  selectedKey?: string | null
  onSelect?: (key: string | null) => void
}) {
  // 드릴인된 동(umdNm). null이면 동 클러스터 뷰.
  const [drillDong, setDrillDong] = useState<string | null>(null)
  const [points, setPoints] = useState<ComplexPoint[]>([])
  const [loading, setLoading] = useState(false)

  // loadComplexPoints 경쟁조건 가드용 요청 ID.
  const drillReqRef = useRef(0)

  // 좌표 있는 동만 클러스터로. 없는 동은 제외(KakaoMap이 실좌표 필요).
  const withCoords = useMemo(() => byDong.filter((d) => d.lat != null && d.lng != null), [byDong])
  const missingCount = byDong.length - withCoords.length

  const clusters: MapCluster[] = useMemo(
    () => withCoords.map((d) => ({ clusterId: d.umdNm, lat: d.lat as number, lng: d.lng as number, count: d.count })),
    [withCoords],
  )

  // 드릴된 동(단지 좌표 0개일 때 폴백 중심으로 사용).
  const drilled = useMemo(() => (drillDong ? byDong.find((d) => d.umdNm === drillDong) : undefined), [byDong, drillDong])

  const markers: MapMarker[] = useMemo(() => {
    if (!drillDong) return []
    if (points.length) return points.map((p) => ({ key: p.key, lat: p.lat, lng: p.lng, name: p.key.split("/")[1] ?? p.key }))
    // 단지 좌표를 못 찾으면 동 자체 좌표 1개로 폴백 — 서울시청 리셋 방지.
    if (drilled?.lat != null && drilled?.lng != null) return [{ key: drillDong, lat: drilled.lat, lng: drilled.lng, name: drillDong }]
    return []
  }, [drillDong, points, drilled])

  async function drill(umdNm: string) {
    const reqId = ++drillReqRef.current
    setDrillDong(umdNm)
    setPoints([])
    setLoading(true)
    try {
      // 해당 동 records를 (umdNm, name)로 묶어 단지별 건수·평균가·대표 지번 생성.
      const rs = records.filter((r) => r.umdNm === umdNm)
      const byComplex = new Map<string, { name: string; umdNm: string; jibun: string; count: number; sum: number; n: number }>()
      for (const r of rs) {
        const name = r.name || "-"
        const k = `${umdNm}/${name}`
        const cur = byComplex.get(k) ?? { name, umdNm, jibun: r.jibun || "", count: 0, sum: 0, n: 0 }
        if (!cur.jibun && r.jibun) cur.jibun = r.jibun
        cur.count += 1
        const p = price(r)
        if (p != null) { cur.sum += p; cur.n += 1 }
        byComplex.set(k, cur)
      }
      const items = [...byComplex.values()].map((c) => ({
        name: c.name,
        umdNm: c.umdNm,
        jibun: c.jibun,
        count: c.count,
        avg: c.n ? c.sum / c.n : null,
      }))
      const res = await loadComplexPoints(items, cityDivision)
      if (reqId === drillReqRef.current) setPoints(res)
    } catch (e) {
      console.error("[realprice-map] 단지 좌표 조회 실패:", e)
      if (reqId === drillReqRef.current) setPoints([])
    } finally {
      if (reqId === drillReqRef.current) setLoading(false)
    }
  }

  function back() {
    setDrillDong(null)
    setPoints([])
    onSelect?.(null) // 그리드·엑셀 필터 해제
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {drillDong ? (
          <>
            <Button size="sm" variant="outline" onClick={back}>
              <ChevronLeft className="size-3.5" />동 전체
            </Button>
            <span className="font-medium text-foreground">{drillDong}</span>
            {!loading && points.length > 0 && <span>단지 {points.length}곳</span>}
            {!loading && points.length === 0 && <span>단지 좌표를 찾지 못해 동 위치를 표시합니다.</span>}
          </>
        ) : (
          <>
            <span>동을 클릭하면 단지별 위치를 표시합니다.</span>
            {missingCount > 0 && <span>· 좌표 없는 {missingCount}개 동 제외</span>}
          </>
        )}
      </div>
      <div className="h-[40rem]">
        <KakaoMap
          appKey={appKey}
          clusters={drillDong ? [] : clusters}
          markers={markers}
          selectedKey={selectedKey}
          onSelect={onSelect}
          onClusterClick={(umd) => { drill(umd); onSelect?.(umd) }}
          loading={loading}
        />
      </div>
    </div>
  )
}
