/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef } from "react"

declare global { interface Window { kakao: any } }

export type MapMarker = { key: string; lat: number; lng: number; name: string }

export function KakaoMap({ appKey, markers, selectedKey, onSelect }: {
  appKey: string
  markers: MapMarker[]
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerObjs = useRef<Map<string, any>>(new Map())

  // 마커가 바뀔 때만 다시 그림 (좌표 시그니처로 감지)
  const sig = markers.map((m) => `${m.key}@${m.lat},${m.lng}`).join("|")

  useEffect(() => {
    if (!appKey || markers.length === 0) return
    let cancelled = false

    const draw = () => window.kakao.maps.load(() => {
      if (cancelled || !ref.current) return
      const kakao = window.kakao
      if (!mapRef.current) {
        mapRef.current = new kakao.maps.Map(ref.current, {
          center: new kakao.maps.LatLng(markers[0].lat, markers[0].lng),
          level: 6,
        })
      }
      const map = mapRef.current
      markerObjs.current.forEach((mk) => mk.setMap(null))
      markerObjs.current.clear()

      const bounds = new kakao.maps.LatLngBounds()
      markers.forEach((m) => {
        const pos = new kakao.maps.LatLng(m.lat, m.lng)
        const marker = new kakao.maps.Marker({ position: pos, map, title: m.name })
        if (onSelect) kakao.maps.event.addListener(marker, "click", () => onSelect(m.key))
        markerObjs.current.set(m.key, marker)
        bounds.extend(pos)
      })
      if (markers.length > 1) map.setBounds(bounds)
      else map.setCenter(new kakao.maps.LatLng(markers[0].lat, markers[0].lng))
    })

    if (window.kakao?.maps) {
      draw()
    } else {
      const id = "kakao-maps-sdk"
      const existing = document.getElementById(id) as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener("load", draw)
      } else {
        const s = document.createElement("script")
        s.id = id
        s.async = true
        s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
        s.onload = draw
        document.head.appendChild(s)
      }
    }
    return () => { cancelled = true }
  }, [appKey, sig]) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 단지로 지도 이동
  useEffect(() => {
    const kakao = window.kakao
    if (!mapRef.current || !selectedKey || !kakao?.maps) return
    const sel = markers.find((m) => m.key === selectedKey)
    if (sel) mapRef.current.panTo(new kakao.maps.LatLng(sel.lat, sel.lng))
  }, [selectedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!appKey) {
    return <div className="flex h-full min-h-72 items-center justify-center rounded-lg border text-sm text-muted-foreground">지도 키 없음</div>
  }
  return (
    <div className="relative h-full min-h-72 w-full">
      <div ref={ref} aria-label="지도" className="h-full w-full rounded-lg border" />
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          좌표 없음 — 단지·매물 선택 후 표시
        </div>
      )}
    </div>
  )
}
