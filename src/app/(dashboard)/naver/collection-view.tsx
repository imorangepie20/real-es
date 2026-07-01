"use client"

import { useState } from "react"
import { MapPin, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_TRADE, TRADE_LABEL, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { DEFAULT_PROPERTY, PROPERTY_LABEL, PROPERTY_OPTIONS, propertyMode } from "@/lib/naver/property-types"
import { loadArticleClusters, loadArticles, loadClusterArticles, loadComplexes, loadRegionArticles, saveFavorites, type ArticleRow, type ClusterRow, type ComplexRow, type Region } from "./actions"
import { RegionPicker } from "./region-picker"
import { ComplexList } from "./complex-list"
import { KakaoMap } from "./kakao-map"
import { ArticlesGrid } from "./articles-grid"

export function CollectionView({ sidos, kakaoKey }: { sidos: Region[]; kakaoKey: string }) {
  const [trade, setTrade] = useState(DEFAULT_TRADE)
  const [property, setProperty] = useState(DEFAULT_PROPERTY)
  const [naverCode, setNaverCode] = useState<string | null>(null)
  const [emdName, setEmdName] = useState<string | null>(null)
  const [complexes, setComplexes] = useState<ComplexRow[]>([])
  const [loadingC, setLoadingC] = useState(false)
  const [selected, setSelected] = useState<ComplexRow | null>(null)
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loadingA, setLoadingA] = useState(false)
  const [clusters, setClusters] = useState<ClusterRow[]>([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [clusterDrill, setClusterDrill] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mode = propertyMode(property)
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다")

  function resetRegionState() {
    setNaverCode(null); setEmdName(null); setComplexes([]); setSelected(null)
    setArticles([]); setClusters([]); setClusterDrill(null)
  }

  function changeTrade(t: string) { setTrade(t); resetRegionState() }
  function changeProperty(p: string) { setProperty(p); resetRegionState() }

  async function pick(code: string, name: string) {
    setError(null); setNaverCode(code); setEmdName(name)
    setSelected(null); setArticles([]); setClusters([]); setClusterDrill(null)
    if (propertyMode(property) === "complex") {
      setLoadingC(true)
      try { setComplexes(await loadComplexes(code, property, trade)) } catch (e) { fail(e) } finally { setLoadingC(false) }
    } else {
      setComplexes([])
      // 초기 테이블은 비움 — 지도 클러스터(원)를 클릭하면 그 묶음 매물이 채워짐
      setLoadingClusters(true)
      try { setClusters(await loadArticleClusters(code, property, trade)) } catch (e) { fail(e) } finally { setLoadingClusters(false) }
    }
  }

  async function refreshRegion() {
    if (!naverCode) return
    setError(null)
    if (mode === "complex") {
      setLoadingC(true)
      try { setComplexes(await loadComplexes(naverCode, property, trade, true)) } catch (e) { fail(e) } finally { setLoadingC(false) }
    } else {
      setClusterDrill(null); setArticles([])
      setLoadingClusters(true)
      try { setClusters(await loadArticleClusters(naverCode, property, trade)) } catch (e) { fail(e) } finally { setLoadingClusters(false) }
    }
  }

  async function selectComplex(c: ComplexRow, refresh = false, t = trade) {
    setError(null); setSelected(c); setLoadingA(true)
    try { setArticles((await loadArticles(c.complexNumber, [t], refresh)).articles) } catch (e) { fail(e) } finally { setLoadingA(false) }
  }

  async function drillCluster(clusterId: string) {
    if (!naverCode) return
    setError(null); setClusterDrill(clusterId); setLoadingA(true)
    try { setArticles((await loadClusterArticles(clusterId, naverCode, property, trade)).articles) } catch (e) { fail(e) } finally { setLoadingA(false) }
  }

  async function showAllRegion() {
    if (!naverCode) return
    setError(null); setClusterDrill(null); setLoadingA(true)
    try { setArticles((await loadRegionArticles(naverCode, property, trade)).articles) } catch (e) { fail(e) } finally { setLoadingA(false) }
  }

  async function saveFavs(rows: ArticleRow[]) {
    if (!rows.length) return
    try { const n = await saveFavorites(rows); toast.success(`관심 매물 ${n}건 저장했습니다`) }
    catch (e) { toast.error(e instanceof Error ? e.message : "관심 매물 저장 실패") }
  }

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
              <RadioGroup value={trade} onValueChange={(v) => { if (v != null) changeTrade(v) }} className="flex w-fit flex-row flex-wrap gap-x-4 gap-y-2">
                {TRADE_OPTIONS.map((t) => (
                  <div key={t.value} className="flex items-center gap-1.5">
                    <RadioGroupItem value={t.value} id={`trade-${t.value}`} />
                    <Label htmlFor={`trade-${t.value}`} className="font-normal cursor-pointer">{t.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">매물유형</span>
              <Select value={property} onValueChange={(v) => { if (v != null) changeProperty(v) }}>
                <SelectTrigger>
                  {/* Base UI SelectValue는 value(코드)를 렌더 → 라벨로 매핑해 children으로 전달 */}
                  <SelectValue>{PROPERTY_LABEL[property] ?? property}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">지역</span>
            <RegionPicker key={`${trade}-${property}`} sidos={sidos} onPick={pick} />
          </div>

          {naverCode && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-sm text-muted-foreground">선택</span>
              <Badge variant="secondary">{TRADE_LABEL[trade] ?? trade}</Badge>
              <Badge variant="secondary">{PROPERTY_LABEL[property] ?? property}</Badge>
              {emdName && <Badge variant="outline"><MapPin className="size-3" />{emdName}</Badge>}
              <span className="ml-auto text-sm text-muted-foreground">
                {mode === "complex" ? `단지 ${complexes.length}개` : `매물 ${articles.length}개`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {/* 결과 */}
      {!naverCode ? (
        <Card>
          <CardContent className="py-4">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>지역을 선택하세요</EmptyTitle>
                <EmptyDescription>거래유형·매물유형을 고르고 시/도 → 시/군/구 → 읍/면/동을 선택하면 매물을 수집합니다.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : mode === "complex" ? (
        // 단지형: 단지목록(좌) + 지도(우) → 매물(하단 풀너비)
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:h-[40rem] lg:flex-row">
            <div className="lg:w-80 lg:shrink-0">
              <ComplexList complexes={complexes} loading={loadingC} onRefresh={refreshRegion} onSelect={(c) => selectComplex(c)} selectedNumber={selected?.complexNumber} />
            </div>
            <div className="min-h-72 flex-1 lg:min-h-0">
              <KakaoMap
                appKey={kakaoKey}
                markers={complexes.flatMap((c) => (c.lat != null && c.lng != null ? [{ key: c.complexNumber, lat: c.lat, lng: c.lng, name: c.name }] : []))}
                selectedKey={selected?.complexNumber}
                onSelect={(key) => { const c = complexes.find((x) => x.complexNumber === key); if (c) selectComplex(c) }}
                loading={loadingC}
              />
            </div>
          </div>
          {selected && (
            <ArticlesGrid
              exportHref={`/api/naver/export?complexNumber=${selected.complexNumber}`}
              articles={articles}
              loading={loadingA}
              onRefresh={() => selectComplex(selected, true)}
              onSave={saveFavs}
            />
          )}
        </div>
      ) : (
        // 비단지형: 지도(위, 클러스터 원 안 숫자) → 매물(아래 풀너비)
        <div className="flex flex-col gap-4">
          <div className="h-[40rem]">
            <KakaoMap
              appKey={kakaoKey}
              clusters={clusters.flatMap((c) => (c.lat != null && c.lng != null ? [{ clusterId: c.clusterId, lat: c.lat, lng: c.lng, count: c.count }] : []))}
              loading={loadingClusters}
              onClusterClick={drillCluster}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button size="sm" variant="outline" onClick={showAllRegion}>전체 매물</Button>
            {clusterDrill && (
              <>
                <Badge variant="secondary">선택한 묶음 매물 {articles.length}개</Badge>
                <Button size="sm" variant="ghost" onClick={() => { setClusterDrill(null); setArticles([]) }}>선택 해제</Button>
              </>
            )}
          </div>
          <ArticlesGrid
            exportHref={`/api/naver/export?regionCode=${naverCode}&realEstateType=${property}&tradeType=${trade}`}
            articles={articles}
            loading={loadingA}
            onRefresh={() => (clusterDrill ? drillCluster(clusterDrill) : refreshRegion())}
            onSave={saveFavs}
          />
        </div>
      )}
    </div>
  )
}
