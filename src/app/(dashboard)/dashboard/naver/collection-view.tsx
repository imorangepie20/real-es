"use client"

import { useState } from "react"

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
  const [trade, setTrade] = useState("")
  const [loadingA, setLoadingA] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(code: string) {
    setError(null); setNaverCode(code); setSelected(null); setLoadingC(true)
    try { setComplexes(await loadComplexes(code)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
  }
  async function refreshC() {
    if (!naverCode) return
    setError(null); setLoadingC(true)
    try { setComplexes(await loadComplexes(naverCode, true)) } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingC(false) }
  }
  async function selectComplex(c: ComplexRow, refresh = false, t = trade) {
    setError(null); setSelected(c); setLoadingA(true)
    try {
      const types = t ? [t] : []
      const res = await loadArticles(c.complexNumber, types, refresh)
      setArticles(res.articles); setCoord({ lat: res.lat, lng: res.lng })
    } catch (e) { setError(e instanceof Error ? e.message : "수집 중 오류가 발생했습니다") } finally { setLoadingA(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <RegionPicker sidos={sidos} onPick={(code) => pick(code)} />
      {naverCode && <ComplexList complexes={complexes} loading={loadingC} onRefresh={refreshC} onSelect={(c) => selectComplex(c)} />}
      {selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <KakaoMap appKey={kakaoKey} lat={coord.lat} lng={coord.lng} name={selected.name} />
          <ArticlesGrid
            complexNumber={selected.complexNumber}
            articles={articles}
            loading={loadingA}
            trade={trade}
            onTrade={(t) => { setTrade(t); selectComplex(selected, false, t) }}
            onRefresh={() => selectComplex(selected, true)}
          />
        </div>
      )}
    </div>
  )
}
