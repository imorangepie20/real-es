# 우편번호 검색기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객 폼에 Daum 우편번호 검색 버튼을 달아 우편번호·도로명주소를 자동 입력한다.

**Architecture:** `Customer.zipcode` 필드 추가 + 재사용 가능한 `postcode-search.tsx`(Daum 스크립트 로드+버튼) + 고객 폼 주소 영역 개편 + 액션에 zipcode 추가.

**Tech Stack:** Next.js 16, React 19, Prisma 6/PostgreSQL, Daum 우편번호 서비스(무료·키 불필요), Base UI, pnpm. 설계: [docs/superpowers/specs/2026-06-26-postcode-search-design.md](../specs/2026-06-26-postcode-search-design.md).

## Global Constraints

- UI 카피·주석 한국어, 식별자 영문. 토큰만(임의 px/hex 금지). 기존 폼 패턴 따름.
- DB 변경 비파괴(컬럼 추가만). 액션 userId 스코프 유지.
- Daum 스크립트는 외부 CDN·클라 전용. 샌드박스 로드/팝업 불가 → tsc+eslint+build로 검증, 실 동작은 prod 라이브 1회.
- ⛔ 서브에이전트: `git restore/checkout/clean/stash/reset` 금지, `git add` 명시 파일만. `docs/project_structure.md`·`매물_샘플_*.xlsx`·`.env`·README/PROJECT_GUIDE 손대지 말 것(README/GUIDE는 컨트롤러 마감 일괄).

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `prisma/schema.prisma` + 마이그레이션 | `Customer.zipcode` | 1 |
| `.../dashboard/customers/actions.ts` | CustomerInput/Row·toData/toRow에 zipcode | 1 |
| `.../dashboard/customers/postcode-search.tsx` | Daum 검색 버튼(재사용) | 2 |
| `.../dashboard/customers/customer-form.tsx` | 주소 영역 개편(우편번호+검색) | 3 |

---

## Task 1: zipcode 필드·액션

**Files:**
- Modify: `prisma/schema.prisma`, `src/app/(dashboard)/dashboard/customers/actions.ts`

**Interfaces:**
- Produces: `Customer.zipcode`, `CustomerInput.zipcode`, `CustomerRow.zipcode`.

- [ ] **Step 1: schema에 zipcode 추가**

`prisma/schema.prisma`의 `model Customer`에서 `name String` 다음 줄에 추가:
```prisma
  zipcode    String?
```

- [ ] **Step 2: 마이그레이션**

Run: `pnpm exec prisma migrate dev --name add_customer_zipcode`
Expected: `ALTER TABLE "Customer" ADD COLUMN "zipcode"` (비파괴), prisma generate.

- [ ] **Step 3: actions.ts에 zipcode 반영**

`src/app/(dashboard)/dashboard/customers/actions.ts`:
- `CustomerInput` 타입에 `zipcode?: string | null;` 추가.
- `CustomerRow` 타입에 `zipcode: string | null;` 추가.
- `toData(input)` 반환 객체에 `zipcode: input.zipcode?.trim() || null,` 추가.
- `toRow(r)`의 인자 타입에 `zipcode: string | null;` 추가하고, 반환 객체에 `zipcode: r.zipcode,` 추가.

(예: `toData` 내부에 `name`/`phone` 줄 옆에 `zipcode: input.zipcode?.trim() || null,`. `toRow`는 `id`/`types` 매핑 옆에 `zipcode: r.zipcode,`. Prisma의 `db.customer.findMany`/`findFirst`는 select 미지정이라 zipcode가 자동 포함됨 — 별도 select 추가 불필요.)

- [ ] **Step 4: 검증·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers/actions.ts"`
Expected: 0/0. (`r.zipcode`가 generate된 Customer 타입과 일치 — 불일치 시 tsc가 잡음.)
```bash
git add prisma/schema.prisma prisma/migrations "src/app/(dashboard)/dashboard/customers/actions.ts"
git commit -m "feat(customer): zipcode(우편번호) 필드·액션"
```

---

## Task 2: 우편번호 검색 컴포넌트

**Files:**
- Create: `src/app/(dashboard)/dashboard/customers/postcode-search.tsx`

**Interfaces:**
- Produces: `PostcodeSearch({ onComplete, className })` — `onComplete: (r: { zonecode: string; address: string }) => void`.

- [ ] **Step 1: postcode-search.tsx**

```tsx
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
```

- [ ] **Step 2: 검증·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers/postcode-search.tsx"`
Expected: 0/0.
```bash
git add "src/app/(dashboard)/dashboard/customers/postcode-search.tsx"
git commit -m "feat(customer): Daum 우편번호 검색 컴포넌트"
```

---

## Task 3: 고객 폼 통합

**Files:**
- Modify: `src/app/(dashboard)/dashboard/customers/customer-form.tsx`

**Interfaces:**
- Consumes: `PostcodeSearch` (T2), `CustomerInput.zipcode` (T1).

- [ ] **Step 1: zipcode 상태·저장 추가**

`customer-form.tsx`:
- import 추가: `import { PostcodeSearch } from "./postcode-search"`.
- 상태 추가(`address` 상태 줄 다음): `const [zipcode, setZipcode] = useState(customer?.zipcode ?? "")`.
- 저장 input 객체에 `zipcode` 추가: `const input = { name, phone, zipcode, address, email, gender, memo, types, propertyId }`.

- [ ] **Step 2: 주소 영역 교체**

기존 주소 Field:
```tsx
          <Field label="주소" className="sm:col-span-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="고객 거주지 주소" />
          </Field>
```
를 다음으로 교체:
```tsx
          <Field label="우편번호" className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <Input value={zipcode} readOnly placeholder="우편번호" className="w-32" />
              <PostcodeSearch onComplete={({ zonecode, address: addr }) => { setZipcode(zonecode); setAddress(addr); }} />
            </div>
          </Field>
          <Field label="주소" className="sm:col-span-2">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="도로명주소 + 상세주소(동/호)" />
          </Field>
```
(주소 검색으로 우편번호+도로명주소가 채워지고, 주소 칸에 상세주소를 이어 입력. 검색 없이 직접 입력도 가능.)

- [ ] **Step 3: 검증·빌드·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "src/app/(dashboard)/dashboard/customers/customer-form.tsx"
git commit -m "feat(customer): 고객 폼 우편번호 검색·주소 자동입력"
```

---

## 마감 (전체 통합 후)

- [ ] `pnpm exec vitest run`(전체 그린)·`pnpm build` 확인.
- [ ] README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태에 기능 요약 1줄(CLAUDE.md §5).
- [ ] ⚠️ **Daum 스크립트 로드·검색 팝업·자동입력은 prod 라이브 1회 확인**(샌드박스 외부 CDN 불가).
- [ ] spec·plan 포함 commit, push는 사용자 요청 시.
