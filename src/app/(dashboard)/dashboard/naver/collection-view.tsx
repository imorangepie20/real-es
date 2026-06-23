"use client"

import { useState } from "react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DEFAULT_TRADE, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { DEFAULT_PROPERTY } from "@/lib/naver/property-types"
import { loadArticles, loadComplexes, type ArticleRow, type ComplexRow, type Region } from "./actions"
import { RegionPicker } from "./region-picker"
import { ComplexList } from "./complex-list"
import { KakaoMap } from "./kakao-map"
import { ArticlesGrid } from "./articles-grid"

export function CollectionView({ sidos, kakaoKey }: { sidos: Region[]; kakaoKey: string }) {
  const [naverCode, setNaverCode] = useState<string | null>(null)
  const [complexes, setComplexes] = useState<ComplexRow[]>([])
  const [loadingC, setLoadingC] = useState(false)

  const [selected, setSelected] = useState<ComplexRow | null>(null)
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [coord, setCoord] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [trade, setTrade] = useState(DEFAULT_TRADE)
  const [loadingA, setLoadingA] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(code: string) {
    setError(null); setNaverCode(code); setSelected(null); setLoadingC(true)
    try { setComplexes(await loadComplexes(code, DEFAULT_PROPERTY, trade)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
  }
  async function refreshC() {
    if (!naverCode) return
    setError(null); setLoadingC(true)
    try { setComplexes(await loadComplexes(naverCode, DEFAULT_PROPERTY, trade, true)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
  }
  async function selectComplex(c: ComplexRow, refresh = false, t = trade) {
    setError(null); setSelected(c); setLoadingA(true)
    try {
      const res = await loadArticles(c.complexNumber, [t], refresh)
      setArticles(res.articles); setCoord({ lat: res.lat, lng: res.lng })
    } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingA(false) }
  }
  function changeTrade(t: string) {
    setTrade(t)
    if (selected) selectComplex(selected, false, t)
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 거래유형 단일선택 (지역 선택 이전) */}
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

      <RegionPicker sidos={sidos} onPick={(code) => pick(code)} />
      {naverCode && <ComplexList complexes={complexes} loading={loadingC} onRefresh={refreshC} onSelect={(c) => selectComplex(c)} />}
      {selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <KakaoMap appKey={kakaoKey} lat={coord.lat} lng={coord.lng} name={selected.name} />
          <ArticlesGrid
            complexNumber={selected.complexNumber}
            articles={articles}
            loading={loadingA}
            onRefresh={() => selectComplex(selected, true)}
          />
        </div>
      )}
    </div>
  )
}
