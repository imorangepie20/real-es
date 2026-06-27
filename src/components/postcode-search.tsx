"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"

type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string }
type DaumPostcode = { open: () => void }
declare global {
  interface Window {
    daum?: { Postcode: new (opts: { oncomplete: (data: PostcodeData) => void }) => DaumPostcode }
  }
}

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.daum?.Postcode) { resolve(); return }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("로드 실패")))
      return
    }
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("우편번호 스크립트 로드 실패"))
    document.body.appendChild(s)
  })
}

export function PostcodeSearch({ onComplete, className }: { onComplete: (r: { zonecode: string; address: string }) => void; className?: string }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    setBusy(true)
    try {
      await loadScript()
      new window.daum!.Postcode({
        oncomplete: (data) => onComplete({ zonecode: data.zonecode, address: data.roadAddress || data.jibunAddress }),
      }).open()
    } catch {
      // 로드 실패 시 무시 — 주소 직접 입력으로 진행
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button type="button" variant="outline" onClick={open} disabled={busy} className={className}>
      <Search className="size-3.5" />주소 검색
    </Button>
  )
}
