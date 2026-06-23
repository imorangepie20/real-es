"use client"

import { useState } from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_TRADE, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { DEFAULT_PROPERTY, PROPERTY_LABEL, PROPERTY_OPTIONS, propertyMode } from "@/lib/naver/property-types"
import { loadArticles, loadComplexes, loadRegionArticles, type ArticleRow, type ComplexRow, type Region } from "./actions"
import { RegionPicker } from "./region-picker"
import { ComplexList } from "./complex-list"
import { KakaoMap } from "./kakao-map"
import { ArticlesGrid } from "./articles-grid"

export function CollectionView({ sidos, kakaoKey }: { sidos: Region[]; kakaoKey: string }) {
  const [trade, setTrade] = useState(DEFAULT_TRADE)
  const [property, setProperty] = useState(DEFAULT_PROPERTY)
  const [naverCode, setNaverCode] = useState<string | null>(null)
  const [complexes, setComplexes] = useState<ComplexRow[]>([])
  const [loadingC, setLoadingC] = useState(false)
  const [selected, setSelected] = useState<ComplexRow | null>(null)
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [coord, setCoord] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [loadingA, setLoadingA] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode = propertyMode(property)

  function resetRegionState() {
    setNaverCode(null); setComplexes([]); setSelected(null); setArticles([]); setCoord({ lat: null, lng: null })
  }

  function changeTrade(t: string) {
    setTrade(t)
    resetRegionState()
  }

  function changeProperty(p: string) {
    setProperty(p)
    resetRegionState()
  }

  async function pick(code: string) {
    setError(null); setNaverCode(code); setSelected(null); setArticles([]); setCoord({ lat: null, lng: null })
    if (propertyMode(property) === "complex") {
      setLoadingC(true)
      try { setComplexes(await loadComplexes(code, property, trade)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
    } else {
      setComplexes([]); setLoadingA(true)
      try {
        const res = await loadRegionArticles(code, property, trade)
        setArticles(res.articles)
        const first = res.articles.find((a) => a.lat != null && a.lng != null)
        setCoord({ lat: first?.lat ?? null, lng: first?.lng ?? null })
      } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingA(false) }
    }
  }

  async function refreshRegion() {
    if (!naverCode) return
    setError(null)
    if (mode === "complex") {
      setLoadingC(true)
      try { setComplexes(await loadComplexes(naverCode, property, trade, true)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
    } else {
      setLoadingA(true)
      try {
        const res = await loadRegionArticles(naverCode, property, trade, true)
        setArticles(res.articles)
        const first = res.articles.find((a) => a.lat != null && a.lng != null)
        setCoord({ lat: first?.lat ?? null, lng: first?.lng ?? null })
      } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingA(false) }
    }
  }

  async function selectComplex(c: ComplexRow, refresh = false, t = trade) {
    setError(null); setSelected(c); setLoadingA(true)
    try {
      const res = await loadArticles(c.complexNumber, [t], refresh)
      setArticles(res.articles); setCoord({ lat: res.lat, lng: res.lng })
    } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingA(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 거래유형 단일선택 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">거래유형</span>
        <RadioGroup value={trade} onValueChange={(v) => { if (v != null) changeTrade(v) }} className="flex flex-row gap-4">
          {TRADE_OPTIONS.map((t) => (
            <div key={t.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={t.value} id={`trade-${t.value}`} />
              <Label htmlFor={`trade-${t.value}`} className="font-normal cursor-pointer">{t.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* 매물유형 단일선택 */}
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

      <RegionPicker sidos={sidos} onPick={(code) => pick(code)} />

      {/* 단지형: 동 선택 후 ComplexList, 단지 선택 후 지도+매물 */}
      {mode === "complex" && naverCode && (
        <ComplexList complexes={complexes} loading={loadingC} onRefresh={refreshRegion} onSelect={(c) => selectComplex(c)} />
      )}
      {mode === "complex" && selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <KakaoMap appKey={kakaoKey} lat={coord.lat} lng={coord.lng} name={selected.name} />
          <ArticlesGrid
            exportHref={`/api/naver/export?complexNumber=${selected.complexNumber}`}
            articles={articles}
            loading={loadingA}
            onRefresh={() => selectComplex(selected, true)}
          />
        </div>
      )}

      {/* 비단지형: 동 선택 후 매물 그리드 직접 표시 */}
      {mode === "article" && naverCode && (
        coord.lat != null && coord.lng != null ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <KakaoMap appKey={kakaoKey} lat={coord.lat} lng={coord.lng} name={PROPERTY_LABEL[property] ?? ""} />
            <ArticlesGrid
              exportHref={`/api/naver/export?regionCode=${naverCode}&realEstateType=${property}&tradeType=${trade}`}
              articles={articles}
              loading={loadingA}
              onRefresh={refreshRegion}
            />
          </div>
        ) : (
          <ArticlesGrid
            exportHref={`/api/naver/export?regionCode=${naverCode}&realEstateType=${property}&tradeType=${trade}`}
            articles={articles}
            loading={loadingA}
            onRefresh={refreshRegion}
          />
        )
      )}
    </div>
  )
}
