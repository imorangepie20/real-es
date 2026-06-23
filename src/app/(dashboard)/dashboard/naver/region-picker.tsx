"use client"

import { useState } from "react"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { getEmds, getSigungus, type Region } from "./actions"

export function RegionPicker({ sidos, onPick }: { sidos: Region[]; onPick: (naverCode: string) => void }) {
  const [sigungus, setSigungus] = useState<Region[]>([])
  const [emds, setEmds] = useState<Region[]>([])

  return (
    <div className="flex flex-wrap gap-2">
      <NativeSelect defaultValue="" onChange={async (e) => { setEmds([]); setSigungus(e.target.value ? await getSigungus(e.target.value) : []) }}>
        <NativeSelectOption value="">시/도</NativeSelectOption>
        {sidos.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>

      <NativeSelect defaultValue="" disabled={!sigungus.length} onChange={async (e) => setEmds(e.target.value ? await getEmds(e.target.value) : [])}>
        <NativeSelectOption value="">시/군/구</NativeSelectOption>
        {sigungus.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>

      <NativeSelect defaultValue="" disabled={!emds.length} onChange={(e) => { const emd = emds.find((x) => x.code === e.target.value); if (emd?.naverCode) onPick(emd.naverCode) }}>
        <NativeSelectOption value="">읍/면/동</NativeSelectOption>
        {emds.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  )
}
