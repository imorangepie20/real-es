"use client"

import { useState } from "react"

import { loadComplexes, type ComplexRow, type Region } from "./actions"
import { RegionPicker } from "./region-picker"
import { ComplexList } from "./complex-list"

export function CollectionView({ sidos, kakaoKey }: { sidos: Region[]; kakaoKey: string }) {
  const [naverCode, setNaverCode] = useState<string | null>(null)
  const [complexes, setComplexes] = useState<ComplexRow[]>([])
  const [loading, setLoading] = useState(false)

  async function pick(code: string) {
    setNaverCode(code); setLoading(true)
    try { setComplexes(await loadComplexes(code)) } finally { setLoading(false) }
  }
  async function refresh() {
    if (!naverCode) return
    setLoading(true)
    try { setComplexes(await loadComplexes(naverCode, true)) } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <RegionPicker sidos={sidos} onPick={(code) => pick(code)} />
      {naverCode && <ComplexList complexes={complexes} loading={loading} onRefresh={refresh} onSelect={() => {}} />}
      {/* 단지 상세(지도+그리드)는 Task 5에서 */}
      <span className="hidden">{kakaoKey ? "" : ""}</span>
    </div>
  )
}
