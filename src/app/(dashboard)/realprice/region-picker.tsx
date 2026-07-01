"use client"

import { useState } from "react"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { getSigungus, type Region } from "@/app/(dashboard)/naver/actions"

// 실거래 API는 시군구(LAWD_CD 5자리) 단위 — naver RegionPicker를 미러링하되 시군구에서 멈추고
// onPick으로 lawdCd(시군구 code)와 표시명을 넘긴다.
export function RegionPicker({ sidos, onPick }: { sidos: Region[]; onPick: (lawdCd: string, name: string) => void }) {
  const [sigungus, setSigungus] = useState<Region[]>([])

  return (
    <div className="flex flex-wrap gap-2">
      <NativeSelect defaultValue="" onChange={async (e) => { onPick("", ""); setSigungus(e.target.value ? await getSigungus(e.target.value) : []) }}>
        <NativeSelectOption value="">시/도</NativeSelectOption>
        {sidos.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>

      <NativeSelect defaultValue="" disabled={!sigungus.length} onChange={(e) => { const sg = sigungus.find((x) => x.code === e.target.value); if (sg) onPick(sg.code, sg.name); else onPick("", "") }}>
        <NativeSelectOption value="">시/군/구</NativeSelectOption>
        {sigungus.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  )
}
