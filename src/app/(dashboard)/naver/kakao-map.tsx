/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef } from "react"

declare global { interface Window { kakao: any } }

export function KakaoMap({ appKey, lat, lng, name }: { appKey: string; lat: number | null; lng: number | null; name: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!appKey || lat == null || lng == null) return
    const init = () => window.kakao.maps.load(() => {
      const center = new window.kakao.maps.LatLng(lat, lng)
      const map = new window.kakao.maps.Map(ref.current, { center, level: 4 })
      const marker = new window.kakao.maps.Marker({ position: center })
      marker.setMap(map)
    })
    if (window.kakao?.maps) { init(); return }
    const id = "kakao-maps-sdk"
    if (document.getElementById(id)) { document.getElementById(id)!.addEventListener("load", init); return }
    const s = document.createElement("script")
    s.id = id
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    s.onload = init
    document.head.appendChild(s)
  }, [appKey, lat, lng])

  if (lat == null || lng == null) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">좌표 없음 — 매물 수집 후 표시</div>
  return <div ref={ref} aria-label={`${name} 지도`} className="h-full min-h-72 w-full rounded-lg border" />
}
