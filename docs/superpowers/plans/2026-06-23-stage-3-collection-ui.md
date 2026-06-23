# 단계 3: 매물 수집 페이지(UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/naver` 페이지에서 동 선택 → 단지 목록 → 단지 선택 → 카카오지도 + 매물 그리드 → 엑셀 다운로드를 구현한다.

**Architecture:** 동/단지/매물 데이터는 단계 2의 `LegalDivision`/`Complex`/`Article` + `src/lib/naver` 스크래퍼를 재사용. 페이지는 `(dashboard)` 그룹의 클라이언트 컴포넌트들 + 서버 액션(수집/캐시 조회)으로 구성. 카카오지도는 JS SDK(클라이언트), 엑셀은 `exceljs`(라우트 핸들러). 수집은 네이버 민감성 때문에 캐시 우선 + [갱신].

**Tech Stack:** Next.js 16(App Router·서버 액션) · React 19 · @tanstack/react-table 8 · shadcn/Base UI(NativeSelect/Table/Button/Card) · Kakao Maps JS SDK · exceljs · Prisma 6 · Playwright/vitest · pnpm

## Global Constraints

- 스택 변경 금지(Next 16 + React 19 + TS + Tailwind v4 + shadcn/Base UI + pnpm). 앱 포트 3001.
- 네이버 수집은 **캐시 우선 + [갱신]**. 페이지 진입마다 라이브 수집 금지(네이버 민감/anti-bot).
- 수집은 서버 전용(`src/lib/naver`, 헤드리스). 클라이언트는 서버 액션으로만 트리거.
- `KAKAO_MAP_KEY`는 서버 컴포넌트에서 읽어 prop으로 전달(NEXT_PUBLIC 리네임 금지).
- 인증 보호: `(dashboard)` 가드 하위.
- 설계 출처: `docs/superpowers/specs/2026-06-23-stage-3-collection-ui-design.md`

---

## File Structure

- Modify `prisma/schema.prisma` — `Complex.lat/lng` 추가
- Modify `src/lib/naver/fetch.ts` — `tradeTypes` 빈 배열(전체) 그대로 전달(이미 가능; 확인)
- Modify `src/lib/naver/parse.ts` — 매물 좌표(`address.coordinates`) 파싱 추가
- Modify `src/lib/naver/types.ts` — `NaverArticle.lng/lat`
- Modify `src/lib/naver/cache.ts` — 매물 좌표로 `Complex.lat/lng` 채움
- Modify `src/lib/naver/index.ts` — `getComplexArticles` 기본 `tradeTypes: []`(전체)
- Create `src/lib/naver/excel.ts` — 매물 → 워크북(행 변환, 단위테스트 대상)
- Create `src/lib/naver/excel.test.ts`
- Create `src/app/api/naver/export/route.ts` — xlsx 다운로드
- Create `src/app/(dashboard)/naver/actions.ts` — 서버 액션(동/단지/매물 조회·수집)
- Create `src/app/(dashboard)/naver/page.tsx` — 서버 컴포넌트(시도 + KAKAO 키)
- Create `src/app/(dashboard)/naver/collection-view.tsx` — 상태 오케스트레이션(client)
- Create `src/app/(dashboard)/naver/region-picker.tsx` — 동 cascading select(client)
- Create `src/app/(dashboard)/naver/complex-list.tsx` — 단지 목록(client)
- Create `src/app/(dashboard)/naver/articles-grid.tsx` — 매물 그리드 + 엑셀 버튼(client)
- Create `src/app/(dashboard)/naver/kakao-map.tsx` — 카카오지도(client)
- Modify `src/lib/nav.ts` — 사이드바에 "매물 수집" 추가
- Create `e2e/naver-collection.spec.ts`

---

## Task 1: 스키마·모듈 보완 (좌표 + 전체 거래유형)

**Files:** Modify `prisma/schema.prisma`, `src/lib/naver/{types,parse,cache,index}.ts`; Test: `src/lib/naver/parse.test.ts`

**Interfaces:**
- Produces: `NaverArticle`에 `lng/lat`; `Complex.lat/lng`; `getComplexArticles(complexNumber, {tradeTypes:[]})` 전체 거래유형.

- [ ] **Step 1: `Complex.lat/lng` 추가 + 마이그레이션**

`prisma/schema.prisma`의 `Complex`에 추가:
```prisma
  regionCode      String?
  lat             Float?
  lng             Float?
  raw             Json?
```
실행:
```bash
cd /opt/real-es && pnpm prisma migrate dev --name complex_coords
```
Expected: `Database schema is up to date!`

- [ ] **Step 2: `NaverArticle`에 좌표 필드 (실패 테스트)**

`src/lib/naver/parse.test.ts`의 `parseArticles` 기대 객체에 좌표 추가 — 첫 매물 `expect(...).toEqual({...})`에 아래 키 추가:
```typescript
      lng: 127.00909,
      lat: 37.305275,
```
그리고 픽스처 `src/lib/naver/__fixtures__/articles.json`의 첫 매물 `representativeArticleInfo`에 `address` 추가(다른 필드 사이 어디든):
```json
          "address": { "coordinates": { "xCoordinate": 127.00909, "yCoordinate": 37.305275 } },
```

- [ ] **Step 3: 테스트 실행 → 실패**

```bash
cd /opt/real-es && pnpm test:unit src/lib/naver/parse.test.ts
```
Expected: FAIL — `lng/lat` undefined.

- [ ] **Step 4: 타입 + 파서 구현**

`src/lib/naver/types.ts`의 `NaverArticle`에 추가:
```typescript
  lng: number | null;
  lat: number | null;
```
`src/lib/naver/parse.ts`의 `parseArticles` map 콜백에서 `const price = ...` 다음에:
```typescript
    const coords = ((a.address as Record<string, unknown>)?.coordinates as Record<string, unknown>) ?? {};
```
그리고 반환 객체에 추가:
```typescript
      lng: num(coords.xCoordinate),
      lat: num(coords.yCoordinate),
```

- [ ] **Step 5: 테스트 통과**

```bash
cd /opt/real-es && pnpm test:unit src/lib/naver/parse.test.ts
```
Expected: PASS.

- [ ] **Step 6: 캐시가 좌표를 Complex에 채우도록 + 전체 거래유형**

`src/lib/naver/cache.ts`의 `upsertArticles`에서, `const complex = ...` 다음에 좌표 갱신 추가:
```typescript
  const coord = articles.find((a) => a.lat != null && a.lng != null);
  if (coord) {
    await db.complex.update({ where: { id: complex.id }, data: { lat: coord.lat, lng: coord.lng } });
  }
```
`src/lib/naver/index.ts`의 `getComplexArticles` 기본값을 전체 거래유형으로:
```typescript
  { tradeTypes = [], size = 30, maxPages = 5 }: { tradeTypes?: string[]; size?: number; maxPages?: number } = {},
```
> `fetch.ts`의 `fetchArticles`는 이미 `tradeTypes`를 그대로 body에 넣으므로 `[]`이면 전체(검증: totalCount 236). 수정 불필요.

- [ ] **Step 7: 검증 + Commit**

```bash
cd /opt/real-es && pnpm test:unit src/lib/naver/ && pnpm exec tsc --noEmit
git add prisma src/lib/naver
git commit -m "feat(naver): 매물 좌표 파싱 + Complex.lat/lng, getComplexArticles 전체 거래유형 기본"
```
Expected: 단위 통과, tsc exit 0.

---

## Task 2: 엑셀 export (`exceljs`)

**Files:** Create `src/lib/naver/excel.ts`, `src/lib/naver/excel.test.ts`, `src/app/api/naver/export/route.ts`; Modify `package.json`

**Interfaces:**
- Produces: `articlesToWorkbook(rows): ExcelJS.Workbook`; `GET /api/naver/export?complexNumber=` → xlsx 다운로드.

- [ ] **Step 1: exceljs 설치**

```bash
cd /opt/real-es && pnpm add exceljs
```
Expected: `dependencies`에 `exceljs`.

- [ ] **Step 2: 실패 테스트 작성**

`src/lib/naver/excel.test.ts`:
```typescript
import { describe, expect, it } from "vitest";

import { articlesToWorkbook, type ExcelRow } from "./excel";

const rows: ExcelRow[] = [
  { complexName: "수원SK스카이뷰", tradeType: "A1", price: 690000000n, rentPrice: 0n, areaExclusive: 84.77, areaSupply: 109.23, floor: "2/23", dong: "142", realtorName: "아파트뱅크공인중개사사무소" },
];

describe("articlesToWorkbook", () => {
  it("builds a sheet with header + rows and maps tradeType to 한글", async () => {
    const wb = articlesToWorkbook(rows);
    const ws = wb.getWorksheet("매물")!;
    expect(ws.getRow(1).getCell(1).value).toBe("단지명");
    expect(ws.getRow(2).getCell(2).value).toBe("매매"); // A1 → 매매
    expect(ws.getRow(2).getCell(3).value).toBe(690000000);
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: 실행 → 실패**

```bash
cd /opt/real-es && pnpm test:unit src/lib/naver/excel.test.ts
```
Expected: FAIL — `./excel` 없음.

- [ ] **Step 4: `excel.ts` 구현**

`src/lib/naver/excel.ts`:
```typescript
import ExcelJS from "exceljs";

export type ExcelRow = {
  complexName: string;
  tradeType: string;
  price: bigint | null;
  rentPrice: bigint | null;
  areaExclusive: number | null;
  areaSupply: number | null;
  floor: string | null;
  dong: string | null;
  realtorName: string | null;
};

const TRADE: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" };

export function articlesToWorkbook(rows: ExcelRow[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.columns = [
    { header: "단지명", key: "complexName", width: 20 },
    { header: "거래유형", key: "tradeType", width: 10 },
    { header: "가격(원)", key: "price", width: 16 },
    { header: "월세", key: "rentPrice", width: 12 },
    { header: "전용면적", key: "areaExclusive", width: 10 },
    { header: "공급면적", key: "areaSupply", width: 10 },
    { header: "층", key: "floor", width: 8 },
    { header: "동", key: "dong", width: 8 },
    { header: "중개사", key: "realtorName", width: 28 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      complexName: r.complexName,
      tradeType: TRADE[r.tradeType] ?? r.tradeType,
      price: r.price != null ? Number(r.price) : null,
      rentPrice: r.rentPrice != null ? Number(r.rentPrice) : null,
      areaExclusive: r.areaExclusive,
      areaSupply: r.areaSupply,
      floor: r.floor,
      dong: r.dong,
      realtorName: r.realtorName,
    });
  }
  return wb;
}
```

- [ ] **Step 5: 실행 → 통과**

```bash
cd /opt/real-es && pnpm test:unit src/lib/naver/excel.test.ts
```
Expected: PASS.

- [ ] **Step 6: export 라우트**

`src/app/api/naver/export/route.ts`:
```typescript
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { articlesToWorkbook, type ExcelRow } from "@/lib/naver/excel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const complexNumber = new URL(req.url).searchParams.get("complexNumber");
  if (!complexNumber) return NextResponse.json({ error: "complexNumber 필요" }, { status: 400 });

  const complex = await db.complex.findUnique({
    where: { complexNumber },
    include: { articles: { orderBy: { fetchedAt: "desc" } } },
  });
  if (!complex) return NextResponse.json({ error: "단지 없음" }, { status: 404 });

  const rows: ExcelRow[] = complex.articles.map((a) => {
    const raw = (a.raw ?? {}) as { dong?: string };
    return {
      complexName: complex.name,
      tradeType: a.tradeType,
      price: a.price,
      rentPrice: a.rentPrice,
      areaExclusive: a.areaExclusive,
      areaSupply: a.areaSupply,
      floor: a.floor,
      dong: raw.dong ?? null,
      realtorName: a.realtorName,
    };
  });

  const wb = articlesToWorkbook(rows);
  const buf = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`${complex.name}_매물.xlsx`);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
```

- [ ] **Step 7: Commit**

```bash
cd /opt/real-es
git add src/lib/naver/excel.ts src/lib/naver/excel.test.ts src/app/api/naver/export/route.ts package.json pnpm-lock.yaml
git commit -m "feat(naver): 매물 엑셀 export(exceljs) + /api/naver/export 라우트"
```

---

## Task 3: 서버 액션 (동/단지/매물 조회·수집)

**Files:** Create `src/app/(dashboard)/naver/actions.ts`

**Interfaces:**
- Consumes: `LegalDivision`, `listComplexesByRegion`, `getComplexArticles`, `db`
- Produces:
  - `getSidos()`·`getSigungus(sidoCode)`·`getEmds(sigunguCode)` → `{code,name,naverCode?}[]`
  - `loadComplexes(naverCode, refresh)` → `ComplexRow[]`
  - `loadArticles(complexNumber, tradeTypes, refresh)` → `{ articles: ArticleRow[], lat, lng }`

- [ ] **Step 1: 작성**

`src/app/(dashboard)/naver/actions.ts`:
```typescript
"use server";

import { db } from "@/lib/db";
import { getComplexArticles, listComplexesByRegion } from "@/lib/naver";

export type Region = { code: string; name: string; naverCode: string | null };
export type ComplexRow = { complexNumber: string; name: string; totalHouseholds: number | null; dealCount: number; leaseDepositCount: number; leaseMonthlyCount: number };
export type ArticleRow = { articleNumber: string; tradeType: string; price: string | null; rentPrice: string | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };

export async function getSidos(): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "SIDO" }, orderBy: { code: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getSigungus(sidoCode: string): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "SIGUNGU", sidoCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: null }));
}
export async function getEmds(sigunguCode: string): Promise<Region[]> {
  const rows = await db.legalDivision.findMany({ where: { level: "EMD", sigunguCode }, orderBy: { name: "asc" } });
  return rows.map((r) => ({ code: r.code, name: r.name, naverCode: r.naverCode }));
}

export async function loadComplexes(naverCode: string, refresh = false): Promise<ComplexRow[]> {
  if (!refresh) {
    const cached = await db.complex.findMany({ where: { regionCode: naverCode }, orderBy: { totalHouseholds: "desc" } });
    if (cached.length) {
      return cached.map((c) => {
        const raw = (c.raw ?? {}) as { dealCount?: number; leaseDepositCount?: number; leaseMonthlyCount?: number };
        return { complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: raw.dealCount ?? 0, leaseDepositCount: raw.leaseDepositCount ?? 0, leaseMonthlyCount: raw.leaseMonthlyCount ?? 0 };
      });
    }
  }
  const list = await listComplexesByRegion(naverCode);
  return list.map((c) => ({ complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: c.dealCount, leaseDepositCount: c.leaseDepositCount, leaseMonthlyCount: c.leaseMonthlyCount }));
}

export async function loadArticles(complexNumber: string, tradeTypes: string[], refresh = false): Promise<{ articles: ArticleRow[]; lat: number | null; lng: number | null }> {
  const toRow = (a: { articleNumber: string; tradeType: string; price: bigint | null; rentPrice: bigint | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; realtorName: string | null; raw: unknown }): ArticleRow => {
    const raw = (a.raw ?? {}) as { dong?: string };
    return { articleNumber: a.articleNumber, tradeType: a.tradeType, price: a.price?.toString() ?? null, rentPrice: a.rentPrice?.toString() ?? null, areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong: raw.dong ?? null, realtorName: a.realtorName };
  };

  if (!refresh) {
    const complex = await db.complex.findUnique({ where: { complexNumber }, include: { articles: { orderBy: { fetchedAt: "desc" } } } });
    if (complex && complex.articles.length) {
      const filtered = tradeTypes.length ? complex.articles.filter((a) => tradeTypes.includes(a.tradeType)) : complex.articles;
      return { articles: filtered.map(toRow), lat: complex.lat, lng: complex.lng };
    }
  }
  await getComplexArticles(complexNumber, { tradeTypes });
  const complex = await db.complex.findUnique({ where: { complexNumber }, include: { articles: { orderBy: { fetchedAt: "desc" } } } });
  const arts = complex?.articles ?? [];
  const filtered = tradeTypes.length ? arts.filter((a) => tradeTypes.includes(a.tradeType)) : arts;
  return { articles: filtered.map(toRow), lat: complex?.lat ?? null, lng: complex?.lng ?? null };
}
```

- [ ] **Step 2: 타입체크 + Commit**

```bash
cd /opt/real-es && pnpm exec tsc --noEmit
git add "src/app/(dashboard)/naver/actions.ts"
git commit -m "feat(naver): 동/단지/매물 조회·수집 서버 액션 (캐시 우선)"
```
Expected: tsc exit 0.

---

## Task 4: 페이지 + 동 선택 + 단지 목록

**Files:** Create `src/app/(dashboard)/naver/{page.tsx,collection-view.tsx,region-picker.tsx,complex-list.tsx}`; Modify `src/lib/nav.ts`

**Interfaces:**
- Consumes: Task 3 액션
- Produces: `/dashboard/naver` 페이지(동 선택 → 단지 목록). `kakaoKey` prop 전달.

- [ ] **Step 1: 페이지(서버 컴포넌트)**

`src/app/(dashboard)/naver/page.tsx`:
```tsx
import { getSidos } from "./actions";
import { CollectionView } from "./collection-view";

export default async function NaverPage() {
  const sidos = await getSidos();
  const kakaoKey = process.env.KAKAO_MAP_KEY ?? "";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 수집</h1>
      <CollectionView sidos={sidos} kakaoKey={kakaoKey} />
    </div>
  );
}
```

- [ ] **Step 2: 동 cascading select**

`src/app/(dashboard)/naver/region-picker.tsx`:
```tsx
"use client"

import { useState } from "react"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { getEmds, getSigungus, type Region } from "./actions"

export function RegionPicker({ sidos, onPick }: { sidos: Region[]; onPick: (naverCode: string, name: string) => void }) {
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

      <NativeSelect defaultValue="" disabled={!emds.length} onChange={(e) => { const emd = emds.find((x) => x.code === e.target.value); if (emd?.naverCode) onPick(emd.naverCode, emd.name) }}>
        <NativeSelectOption value="">읍/면/동</NativeSelectOption>
        {emds.map((s) => <NativeSelectOption key={s.code} value={s.code}>{s.name}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  )
}
```
> `NativeSelect`/`NativeSelectOption`은 `src/components/ui/native-select.tsx` export 사용.

- [ ] **Step 3: 단지 목록**

`src/app/(dashboard)/naver/complex-list.tsx`:
```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ComplexRow } from "./actions"

export function ComplexList({ complexes, loading, onRefresh, onSelect }: { complexes: ComplexRow[]; loading: boolean; onRefresh: () => void; onSelect: (c: ComplexRow) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">단지 {complexes.length}개</span>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>{loading ? "수집 중..." : "갱신"}</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {complexes.map((c) => (
          <Card key={c.complexNumber} className="cursor-pointer p-3 hover:bg-muted/50" onClick={() => onSelect(c)}>
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-muted-foreground">세대 {c.totalHouseholds ?? "-"} · 매매 {c.dealCount}/전세 {c.leaseDepositCount}/월세 {c.leaseMonthlyCount}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 사이드바 메뉴 추가**

`src/lib/nav.ts`에서 적절한 그룹에 항목 추가(기존 구조 따라). 예: real-estate 관련 그룹 items 배열에:
```typescript
{ title: "매물 수집", url: "/dashboard/naver" },
```
> 정확한 위치/형식은 `src/lib/nav.ts`의 기존 항목 구조를 그대로 따른다.

- [ ] **Step 5: 빌드(부분) — Task 5 후 전체 빌드. 지금은 타입체크.**

```bash
cd /opt/real-es && pnpm exec tsc --noEmit
```
> `collection-view.tsx`는 Task 5에서 생성하므로, 이 Task의 import가 미존재면 Task 5와 함께 커밋. tsc 통과를 위해 Step 6의 collection-view 스텁을 먼저 만든다.

- [ ] **Step 6: collection-view 스텁(오케스트레이션은 Task 5에서 완성)**

`src/app/(dashboard)/naver/collection-view.tsx` (Task 5에서 확장):
```tsx
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
```

- [ ] **Step 7: 타입체크 + Commit**

```bash
cd /opt/real-es && pnpm exec tsc --noEmit
git add "src/app/(dashboard)/naver" src/lib/nav.ts
git commit -m "feat(naver): 매물 수집 페이지 — 동 cascading select + 단지 목록"
```

---

## Task 5: 단지 상세 (카카오지도 + 매물 그리드 + 엑셀 버튼)

**Files:** Create `src/app/(dashboard)/naver/{kakao-map.tsx,articles-grid.tsx}`; Modify `collection-view.tsx`

**Interfaces:**
- Consumes: `loadArticles`(Task 3), `kakaoKey`
- Produces: 단지 선택 시 지도 + 매물 그리드 + 엑셀 다운로드.

- [ ] **Step 1: 카카오지도 컴포넌트**

`src/app/(dashboard)/naver/kakao-map.tsx`:
```tsx
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
```

- [ ] **Step 2: 매물 그리드 + 엑셀 버튼**

`src/app/(dashboard)/naver/articles-grid.tsx`:
```tsx
"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ArticleRow } from "./actions"

const TRADE: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" }
const won = (v: string | null) => (v == null ? "-" : Number(v).toLocaleString("ko-KR"))

export function ArticlesGrid({ complexNumber, articles, loading, trade, onTrade, onRefresh }: {
  complexNumber: string; articles: ArticleRow[]; loading: boolean; trade: string; onTrade: (t: string) => void; onRefresh: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NativeSelect value={trade} onChange={(e) => onTrade(e.target.value)} className="w-28">
          <NativeSelectOption value="">전체</NativeSelectOption>
          <NativeSelectOption value="A1">매매</NativeSelectOption>
          <NativeSelectOption value="B1">전세</NativeSelectOption>
          <NativeSelectOption value="B2">월세</NativeSelectOption>
        </NativeSelect>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>{loading ? "수집 중..." : "갱신"}</Button>
        <span className="text-sm text-muted-foreground">매물 {articles.length}개</span>
        <a className="ml-auto" href={`/api/naver/export?complexNumber=${complexNumber}`}>
          <Button size="sm">엑셀 다운로드</Button>
        </a>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>거래</TableHead><TableHead>가격</TableHead><TableHead>월세</TableHead><TableHead>전용</TableHead><TableHead>공급</TableHead><TableHead>층</TableHead><TableHead>동</TableHead><TableHead>중개사</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((a) => (
              <TableRow key={a.articleNumber}>
                <TableCell>{TRADE[a.tradeType] ?? a.tradeType}</TableCell>
                <TableCell>{won(a.price)}</TableCell>
                <TableCell>{won(a.rentPrice)}</TableCell>
                <TableCell>{a.areaExclusive ?? "-"}</TableCell>
                <TableCell>{a.areaSupply ?? "-"}</TableCell>
                <TableCell>{a.floor ?? "-"}</TableCell>
                <TableCell>{a.dong ?? "-"}</TableCell>
                <TableCell>{a.realtorName ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```
> `Table` 관련 export 이름은 `src/components/ui/table.tsx`를 확인해 정확히 import한다(`TableHead` 등).

- [ ] **Step 3: collection-view에 단지 상세 연결**

`src/app/(dashboard)/naver/collection-view.tsx`를 확장 — 선택 단지 상태 + 매물 로드 + 지도/그리드 렌더:
```tsx
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

  async function pick(code: string) {
    setNaverCode(code); setSelected(null); setLoadingC(true)
    try { setComplexes(await loadComplexes(code)) } finally { setLoadingC(false) }
  }
  async function refreshC() {
    if (!naverCode) return
    setLoadingC(true)
    try { setComplexes(await loadComplexes(naverCode, true)) } finally { setLoadingC(false) }
  }
  async function selectComplex(c: ComplexRow, refresh = false, t = trade) {
    setSelected(c); setLoadingA(true)
    try {
      const types = t ? [t] : []
      const res = await loadArticles(c.complexNumber, types, refresh)
      setArticles(res.articles); setCoord({ lat: res.lat, lng: res.lng })
    } finally { setLoadingA(false) }
  }

  return (
    <div className="flex flex-col gap-4">
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
```

- [ ] **Step 4: 프로덕션 빌드**

```bash
cd /opt/real-es && pnpm build
```
Expected: 빌드 성공. `/dashboard/naver`·`/api/naver/export` 라우트 생성.

- [ ] **Step 5: Commit**

```bash
cd /opt/real-es
git add "src/app/(dashboard)/naver"
git commit -m "feat(naver): 단지 상세 — 카카오지도 + 매물 그리드 + 엑셀 다운로드"
```

---

## Task 6: E2E + 문서

**Files:** Create `e2e/naver-collection.spec.ts`; Modify `README.md`, `docs/PROJECT_GUIDE.md`

**Interfaces:**
- Consumes: 캐시 데이터(real_es의 Complex/Article — 단계 2 라이브 수집분 102614 등)
- Produces: 페이지 E2E(인증 storageState).

- [ ] **Step 1: E2E (캐시 데이터 기준, 라이브 수집 안 함)**

`e2e/naver-collection.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("매물 수집 페이지가 열리고 동 선택 UI가 보인다", async ({ page }) => {
  await page.goto("/dashboard/naver");
  await expect(page.getByRole("heading", { name: "매물 수집" })).toBeVisible();
  await expect(page.getByText("시/도")).toBeVisible();
});

test("엑셀 export 라우트가 캐시 단지의 xlsx를 반환한다 (102614)", async ({ request }) => {
  const res = await request.get("/api/naver/export?complexNumber=102614");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
});
```
> `chromium` 프로젝트(storageState 인증)로 실행되어 `(dashboard)` 가드를 통과한다. 102614는 단계 2에서 수집·캐시됨.

- [ ] **Step 2: 실행 → 통과**

```bash
cd /opt/real-es && pnpm exec playwright test e2e/naver-collection.spec.ts
```
Expected: PASS (2 tests). (전체 스위트 회귀는 finishing 단계에서.)

- [ ] **Step 3: 문서 갱신**

`README.md` §현재 반영 상태, `docs/PROJECT_GUIDE.md` §현재 참고 상태에 단계 3 한 줄씩 추가:
```markdown
- 매물 수집 단계 3(UI): `/dashboard/naver` — 동 선택→단지 목록→단지 선택→카카오지도+매물 그리드→엑셀 다운로드(exceljs). 캐시 우선 수집, KAKAO_MAP_KEY(서버→prop).
```

- [ ] **Step 4: Commit**

```bash
cd /opt/real-es
git add e2e/naver-collection.spec.ts README.md docs/PROJECT_GUIDE.md
git commit -m "test(naver): 매물 수집 페이지 E2E + 문서"
```

---

## 단계 3 완료 기준 (Definition of Done)

- `/dashboard/naver`에서 동 선택 → 단지 목록(캐시/수집) → 단지 선택 → 카카오지도(단지 위치) + 매물 그리드(거래유형 필터) → **엑셀 다운로드** 동작.
- `pnpm test:unit` 통과(parse 좌표 + excel), `pnpm build` 성공, E2E 통과.
- 수집은 캐시 우선 + [갱신]. 네이버 라이브 호출 최소.

---

## Self-Review

**1. Spec coverage:** 설계 §1 페이지/§2 화면(동 select→단지→지도+그리드+엑셀) → Task 4·5. §3 데이터/수집(캐시 우선, 좌표, 전체 거래유형) → Task 1·3. §4 카카오 → Task 5. §5 엑셀 → Task 2. §6 파일 → 전 Task. §7 테스트 → Task 1·2·6. §8 deps(exceljs) → Task 2. ✓

**2. Placeholder scan:** TBD/TODO 없음. `nav.ts`·`table.tsx` export는 "기존 구조 확인" 명시(실파일 따라). ✓

**3. Type consistency:** `ComplexRow`/`ArticleRow`/`Region`(Task 3) → Task 4·5 컴포넌트에서 동일 import. `loadComplexes`/`loadArticles`/`getSidos` 시그니처 일관. `ExcelRow`(Task 2) ↔ export 라우트 매핑 일치. `getComplexArticles` 기본 `tradeTypes:[]`(Task 1) ↔ `loadArticles`(Task 3) 사용. ✓
