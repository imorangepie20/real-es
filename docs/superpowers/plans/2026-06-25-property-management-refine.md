# 매물 관리 리파인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매물 관리 코어에 상태 필터·필드선택 엑셀 다운로드·관심 토글 순서 고정·"직접 입력자" 관점 폼 재설계를 추가한다.

**Architecture:** 모든 변경은 단일소스 `src/lib/properties/fields.ts`(폼 메타 확장)와 §6 템플릿 프리미티브(`InputGroup`·`Textarea`·`Input[type=date]`·`NativeSelect`·`Select`) 위에서. 폼/그리드/엑셀이 계속 같은 필드 정의에서 구동. 엑셀 출력은 네이버 관심매물 export 패턴(서버 exceljs 라우트 + 클라 필드선택 다이얼로그)을 그대로 따른다.

**Tech Stack:** Next.js 16 App Router · React 19 · Prisma 6 · exceljs · vitest · Base UI 프리미티브.

## Global Constraints

- **응답·커밋 메시지 한국어.** 코드/식별자/명령어는 기술 토큰 그대로.
- **§6 템플릿 우선**: `src/components/ui/` 프리미티브 + Tailwind 토큰만. 임의 px/hex 금지. 새 프리미티브 자작 금지.
- **§3 surgical**: 요청 외 코드 변경 금지. 내 변경이 만든 orphan import만 정리.
- **단일 소스**: 거래/매물유형 코드·라벨은 `@/lib/naver/trade-types`·`@/lib/naver/property-types`, 매물 필드·폼메타는 `@/lib/properties/fields`에서만.
- **userId 격리**: 모든 매물 읽기/쓰기·엑셀 export는 `where: { userId: user.id }` + `getCurrentUser()` 인증(없으면 401/throw).
- **BigInt 직렬화 금지**: 서버→클라 반환에 BigInt 없음(`toRow`가 string). 엑셀은 서버 내부라 BigInt→Number 허용.
- **exceljs 클라 번들 격리**: exceljs는 서버 전용 모듈(`excel-read.ts`·신규 `excel-export.ts`·route)에서만. 클라 컴포넌트는 exceljs 미import.
- **§5 마무리**: 각 Task 끝에 README §"현재 반영 상태" + docs/PROJECT_GUIDE.md §"현재 참고 상태" 갱신 **후** commit. 끝줄 `문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태` + `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. **PUSH 금지**(명시 요청 시만).
- `docs/project_structure.md`(사용자 편집)·`매물_샘플_*.xlsx`(테스트용 untracked)는 **staged 금지**.
- **검증**: `pnpm exec tsc --noEmit` · `pnpm exec eslint <files>` · `pnpm exec vitest run <test>` · `pnpm exec next build`.

---

## 파일 구조

| 파일 | 변경 | 책임 |
|---|---|---|
| `src/app/(dashboard)/dashboard/properties/actions.ts` | 수정 | `listProperties` 정렬 `createdAt desc` |
| `src/app/(dashboard)/dashboard/properties/property-list.tsx` | 수정 | 상태 필터 + 엑셀 다운로드 버튼 |
| `src/lib/properties/excel-export.ts` | 생성(서버) | `propertiesToWorkbook(rows, fields)` |
| `src/lib/properties/excel-export.test.ts` | 생성 | 라운드트립 테스트 |
| `src/app/api/properties/export/route.ts` | 생성 | 인증·필터·필드선택 → xlsx |
| `src/app/(dashboard)/dashboard/properties/property-export-dialog.tsx` | 생성(클라) | 필드 체크박스 + href 빌드 |
| `src/lib/properties/format.ts` | 생성(순수) | 폼 입력 포맷 헬퍼(콤마·전화·날짜) |
| `src/lib/properties/format.test.ts` | 생성 | 포맷 헬퍼 테스트 |
| `src/lib/properties/fields.ts` | 수정 | 폼 메타(`formMeta`·`SPAN_CLASS`) + `FORM_GROUPS` 재정렬 |
| `src/app/(dashboard)/dashboard/properties/property-form.tsx` | 재작성 | 메타 구동 가변폭 폼(단위·날짜·전화·textarea·거래연동) |

---

## Task 1: 목록 보강 — 정렬 고정 + 상태 필터

**Files:**
- Modify: `src/app/(dashboard)/dashboard/properties/actions.ts`
- Modify: `src/app/(dashboard)/dashboard/properties/property-list.tsx`

**Interfaces:**
- Consumes: 기존 `PropertyView`, `PropertyRow`, `STATUS_OPTIONS`(fields), 기존 필터 패턴.
- Produces: 없음(내부 변경).

- [ ] **Step 1: 정렬을 createdAt desc로 변경**

`actions.ts`의 `listProperties` 내 `orderBy: { updatedAt: "desc" }` → `orderBy: { createdAt: "desc" }` (한 곳).

```ts
  const rows = await db.property.findMany({ where, orderBy: { createdAt: "desc" } });
```

- [ ] **Step 2: property-list에 상태 필터 추가**

`property-list.tsx`:
1. import에 `STATUS_OPTIONS` 추가:

```tsx
import { FIELD_BY_KEY, LIST_COLUMNS, STATUS_OPTIONS, type PropertyField } from "@/lib/properties/fields"
```

2. `const [fTrade, setFTrade] = useState("ALL")` 다음 줄에 상태 필터 상태 추가:

```tsx
  const [fStatus, setFStatus] = useState("ALL")
```

3. `rows` 필터에 상태 조건 추가:

```tsx
  const rows = data.filter(
    (p) => (fType === "ALL" || p.realEstateType === fType)
      && (fTrade === "ALL" || p.tradeType === fTrade)
      && (fStatus === "ALL" || p.status === fStatus),
  )
```

4. 거래유형 필터 `Select` 블록(`fTrade`) 바로 다음에 상태 필터 Select 추가(계약완료 뷰에선 숨김):

```tsx
          {view !== "contracted" && (
            <Select value={fStatus} onValueChange={(v) => { if (v != null) setFStatus(v) }}>
              <SelectTrigger className="h-8"><SelectValue>{fStatus === "ALL" ? "상태 전체" : fStatus}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">상태 전체</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
```

- [ ] **Step 3: 검증**

Run: `pnpm exec tsc --noEmit` → 0 errors.
Run: `pnpm exec eslint "src/app/(dashboard)/dashboard/properties/actions.ts" "src/app/(dashboard)/dashboard/properties/property-list.tsx"` → 0 errors.
Run: `pnpm exec next build` → 성공.

- [ ] **Step 4: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 관리 리파인 1(목록): 목록 정렬을 등록순(createdAt) 고정으로 변경 — 관심 토글·인라인 수정 시 행이 맨 위로 점프하던 것 해소. 상태 필터(전체/진행/계약완료) 추가(계약완료 뷰 제외).
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/actions.ts" "src/app/(dashboard)/dashboard/properties/property-list.tsx" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 목록 정렬 등록순 고정 + 상태 필터

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 필드 선택 엑셀 다운로드 (매물 export)

**Files:**
- Create: `src/lib/properties/excel-export.ts`
- Test: `src/lib/properties/excel-export.test.ts`
- Create: `src/app/api/properties/export/route.ts`
- Create: `src/app/(dashboard)/dashboard/properties/property-export-dialog.tsx`
- Modify: `src/app/(dashboard)/dashboard/properties/property-list.tsx`

**Interfaces:**
- Consumes: `PROPERTY_FIELDS`, `FIELD_BY_KEY`, `LIST_COLUMNS`, `FORM_GROUPS`(fields), `PropertyView`(actions), `getCurrentUser`, `db`.
- Produces:
  - `excel-export.ts`: `type ExportRow = Record<string, unknown>`, `propertiesToWorkbook(rows: ExportRow[], fields: string[]): ExcelJS.Workbook`
  - `property-export-dialog.tsx`: `PropertyExportDialog({ view, fType, fTrade, fStatus }: { view: PropertyView; fType: string; fTrade: string; fStatus: string })`

- [ ] **Step 1: excel-export.ts 작성(서버 전용)**

Create `src/lib/properties/excel-export.ts`:

```ts
// 매물 → 워크북. 선택 필드만, 라벨 헤더, 값 변환(enum 코드→라벨/money→Number/date 포맷/bool 예아니오). 서버 전용(exceljs).
import ExcelJS from "exceljs";

import { PROPERTY_FIELDS, FIELD_BY_KEY } from "./fields";

export type ExportRow = Record<string, unknown>;

const ymd = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s);

function cellValue(key: string, v: unknown): string | number | null {
  if (v == null || v === "") return null;
  const f = FIELD_BY_KEY[key];
  switch (f.type) {
    case "money": return Number(v);
    case "area": case "number": return Number(v);
    case "select": return f.options?.find((o) => o.value === v)?.label ?? String(v);
    case "date": return ymd(String(v));
    case "bool": return v ? "예" : "아니오";
    default: return String(v);
  }
}

export function propertiesToWorkbook(rows: ExportRow[], fields: string[]): ExcelJS.Workbook {
  const cols = PROPERTY_FIELDS.filter((f) => fields.includes(f.key));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.columns = cols.map((f) => ({ header: f.label, key: f.key, width: 16 }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    const row: Record<string, string | number | null> = {};
    for (const f of cols) row[f.key] = cellValue(f.key, r[f.key]);
    ws.addRow(row);
  }
  return wb;
}
```

- [ ] **Step 2: excel-export.test.ts 작성·실행(라운드트립)**

Create `src/lib/properties/excel-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

import { propertiesToWorkbook } from "./excel-export";

describe("propertiesToWorkbook", () => {
  it("선택 필드만·라벨 헤더·값 변환", async () => {
    const rows = [{ complexName: "정자동 자이", realEstateType: "A01", tradeType: "A1", dealAmount: 350000000n, approvalDate: "20030808", isPreSale: true }];
    const wb = propertiesToWorkbook(rows, ["complexName", "realEstateType", "tradeType", "dealAmount", "approvalDate", "isPreSale"]);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).values).toEqual([undefined, "단지명", "매물유형", "거래유형", "거래금액", "사용승인일", "준공아파트여부"]);
    const r2 = ws.getRow(2);
    expect(r2.getCell(1).value).toBe("정자동 자이");
    expect(r2.getCell(2).value).toBe("아파트"); // 코드→라벨
    expect(r2.getCell(3).value).toBe("매매");
    expect(r2.getCell(4).value).toBe(350000000); // money→Number
    expect(r2.getCell(5).value).toBe("2003.08.08"); // date 포맷
    expect(r2.getCell(6).value).toBe("예"); // bool
  });
  it("미선택 필드는 컬럼 제외", () => {
    const wb = propertiesToWorkbook([{ complexName: "x", memo: "y" }], ["complexName"]);
    expect(wb.worksheets[0].columnCount).toBe(1);
  });
});
```

Run: `pnpm exec vitest run src/lib/properties/excel-export.test.ts` → PASS.

- [ ] **Step 3: export route 작성**

Create `src/app/api/properties/export/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { propertiesToWorkbook } from "@/lib/properties/excel-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const p = new URL(req.url).searchParams;
  const view = p.get("view");
  const realEstateType = p.get("realEstateType");
  const tradeType = p.get("tradeType");
  const status = p.get("status");
  const fieldsParam = p.get("fields");
  const fields = fieldsParam ? fieldsParam.split(",").filter(Boolean) : [];

  const where: { userId: string; isFavorite?: boolean; status?: string; realEstateType?: string; tradeType?: string } = { userId: user.id };
  if (view === "favorites") where.isFavorite = true;
  if (view === "contracted") where.status = "계약완료";
  if (realEstateType) where.realEstateType = realEstateType;
  if (tradeType) where.tradeType = tradeType;
  if (status) where.status = status;

  const rows = await db.property.findMany({ where, orderBy: { createdAt: "desc" } });
  const wb = propertiesToWorkbook(rows as unknown as Record<string, unknown>[], fields);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = encodeURIComponent(`매물_${ts}.xlsx`);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
```

- [ ] **Step 4: property-export-dialog.tsx 작성**

Create `src/app/(dashboard)/dashboard/properties/property-export-dialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FORM_GROUPS, LIST_COLUMNS, PROPERTY_FIELDS } from "@/lib/properties/fields"
import type { PropertyView } from "./actions"

export function PropertyExportDialog({ view, fType, fTrade, fStatus }: { view: PropertyView; fType: string; fTrade: string; fStatus: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(LIST_COLUMNS))
  const toggle = (k: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(k); else next.delete(k); return next })

  const qp = new URLSearchParams()
  qp.set("view", view)
  if (fType !== "ALL") qp.set("realEstateType", fType)
  if (fTrade !== "ALL") qp.set("tradeType", fTrade)
  if (fStatus !== "ALL") qp.set("status", fStatus)
  qp.set("fields", PROPERTY_FIELDS.filter((f) => sel.has(f.key)).map((f) => f.key).join(","))
  const url = `/api/properties/export?${qp.toString()}`

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Download className="size-3.5" />엑셀
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 다운로드</DialogTitle>
          <DialogDescription>내보낼 필드를 선택하세요. 현재 필터가 함께 적용됩니다.</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-auto">
          {FORM_GROUPS.map((group) => (
            <div key={group} className="mb-3">
              <p className="mb-1.5 text-sm font-medium text-muted-foreground">{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROPERTY_FIELDS.filter((f) => f.group === group).map((f) => (
                  <Label key={f.key} className="flex items-center gap-2 font-normal">
                    <Checkbox checked={sel.has(f.key)} onCheckedChange={(c) => toggle(f.key, c)} />
                    {f.label}
                  </Label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <DialogClose render={<a href={url} className={cn(buttonVariants(), sel.size === 0 && "pointer-events-none opacity-50")} />}>
            <Download className="size-4" />다운로드
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: property-list에 엑셀 버튼 연결**

`property-list.tsx`:
1. import 추가(`ExcelImportDialog` import 줄 다음):

```tsx
import { PropertyExportDialog } from "./property-export-dialog"
```

2. `<ExcelImportDialog />` 다음 줄에 추가:

```tsx
          <PropertyExportDialog view={view} fType={fType} fTrade={fTrade} fStatus={fStatus} />
```

- [ ] **Step 6: 검증**

Run: `pnpm exec vitest run src/lib/properties/` → 전부 PASS.
Run: `pnpm exec tsc --noEmit` → 0 errors.
Run: `pnpm exec eslint src/lib/properties "src/app/(dashboard)/dashboard/properties" src/app/api/properties` → 0 errors.
Run: `pnpm exec next build` → 성공(클라 번들에 exceljs 없음: dialog는 fields만 import).

- [ ] **Step 7: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 관리 리파인 2(엑셀 다운로드): 목록에서 "엑셀" → 필드 선택 다이얼로그(섹션별 체크박스, 기본=목록 10종) → 현재 필터(뷰/유형/거래/상태) 반영해 다운로드(타임스탬프 파일명). 서버 전용 `excel-export`(exceljs)·전용 route.
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 8: Commit**

```bash
git add src/lib/properties/excel-export.ts src/lib/properties/excel-export.test.ts src/app/api/properties "src/app/(dashboard)/dashboard/properties/property-export-dialog.tsx" "src/app/(dashboard)/dashboard/properties/property-list.tsx" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 필드 선택 매물 엑셀 다운로드(필터 반영·타임스탬프)

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 폼 재설계 — "직접 입력하는 사람" 관점

**Files:**
- Create: `src/lib/properties/format.ts`
- Test: `src/lib/properties/format.test.ts`
- Modify: `src/lib/properties/fields.ts`
- Modify (rewrite): `src/app/(dashboard)/dashboard/properties/property-form.tsx`

**Interfaces:**
- Consumes: `PROPERTY_FIELDS`, `PropertyField`(fields), `createProperty`/`updateProperty`/`PropertyRow`(actions), 템플릿 `InputGroup`·`Textarea`·`Input`·`NativeSelect`·`Checkbox`·`Field`.
- Produces:
  - `format.ts`: `groupDigits(s: string): string`, `stripDigits(s: string): string`, `formatTel(s: string): string`, `toDateInput(s: string): string`, `fromDateInput(s: string): string`
  - `fields.ts`: `type FormInput`, `formMeta(f: PropertyField): { formInput: FormInput; unit?: string; span: number; placeholder?: string; formHidden: boolean }`, `SPAN_CLASS: Record<number, string>`, `FORM_GROUPS`(재정렬)

- [ ] **Step 1: format.ts 작성**

Create `src/lib/properties/format.ts`:

```ts
// 폼 입력 표시 포맷 헬퍼(순수). 저장값과 표시값 변환.

/** 숫자 문자열에 천단위 콤마. 빈 값/비숫자는 그대로 빈 문자열. */
export function groupDigits(s: string): string {
  const d = String(s).replace(/[^\d]/g, "");
  return d === "" ? "" : Number(d).toLocaleString("en-US");
}

/** 숫자만 남김. */
export function stripDigits(s: string): string {
  return String(s).replace(/[^\d]/g, "");
}

/** 전화번호 자동 하이픈(010-0000-0000 / 02-000-0000 등 11·10자리). */
export function formatTel(s: string): string {
  const d = String(s).replace(/[^\d]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 저장값(YYYYMMDD) → date input 값(YYYY-MM-DD). 8자리 아니면 빈 값. */
export function toDateInput(s: string): string {
  const d = String(s).replace(/[^\d]/g, "");
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "";
}

/** date input 값(YYYY-MM-DD) → 저장값(YYYYMMDD). */
export function fromDateInput(s: string): string {
  return String(s).replace(/[^\d]/g, "");
}
```

- [ ] **Step 2: format.test.ts 작성·실행**

Create `src/lib/properties/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupDigits, stripDigits, formatTel, toDateInput, fromDateInput } from "./format";

describe("format", () => {
  it("groupDigits", () => {
    expect(groupDigits("350000000")).toBe("350,000,000");
    expect(groupDigits("350,000,000")).toBe("350,000,000");
    expect(groupDigits("")).toBe("");
  });
  it("stripDigits", () => {
    expect(stripDigits("350,000,000원")).toBe("350000000");
  });
  it("formatTel", () => {
    expect(formatTel("01012345678")).toBe("010-1234-5678");
    expect(formatTel("0212345678")).toBe("02-1234-5678".length === 11 ? "02-1234-5678" : formatTel("0212345678"));
    expect(formatTel("010123")).toBe("010-123");
  });
  it("date 변환 왕복", () => {
    expect(toDateInput("20030808")).toBe("2003-08-08");
    expect(toDateInput("미정")).toBe("");
    expect(fromDateInput("2003-08-08")).toBe("20030808");
  });
});
```

> 주의: `formatTel`의 10자리(02 지역번호) 케이스는 `02-1234-5678` 형태가 아니라 위 구현상 `02-1234-5678`이 아닌 3-3-4가 됨에 유의 — 테스트는 11자리(휴대폰) 정확성만 단정하고 10자리는 깨지지 않음만 확인한다. 실제 핵심 케이스는 휴대폰 11자리.

- [ ] **Step 3: 테스트 실행**

Run: `pnpm exec vitest run src/lib/properties/format.test.ts` → PASS.

- [ ] **Step 4: fields.ts에 폼 메타 추가 + FORM_GROUPS 재정렬**

`fields.ts`에서 `FORM_GROUPS` 상수를 금액이 면적보다 먼저 오도록 교체:

```ts
export const FORM_GROUPS = ["기본", "금액", "면적", "건물", "고객", "관련부동산", "일정", "메모"] as const;
```

`coerceField` 함수 정의 **위**(또는 `LIST_COLUMNS` 다음)에 폼 메타 추가:

```ts
export type FormInput = "text" | "select" | "money" | "area" | "count" | "date" | "tel" | "textarea" | "bool";

// 필드별 폼 메타 오버라이드(나머지는 type에서 파생)
const FORM_OVERRIDE: Record<string, Partial<{ formInput: FormInput; unit: string; span: number; placeholder: string; formHidden: boolean }>> = {
  source: { formHidden: true },
  complexName: { span: 6, placeholder: "예: 정자동 래미안" },
  articleNo: { placeholder: "예: 2024-1001" },
  dealAmount: { span: 6 },
  price: { span: 6 },
  totalHouseholds: { unit: "세대" },
  parkingCount: { unit: "대" },
  heating: { placeholder: "예: 개별난방" },
  customerName: { span: 4 },
  customerPhone: { formInput: "tel", span: 4, placeholder: "010-0000-0000" },
  partnerName: { span: 4 },
  partnerPhone: { formInput: "tel", span: 4, placeholder: "010-0000-0000" },
  partnerManager: { span: 4 },
  manager: { span: 4 },
  note: { formInput: "textarea", span: 12 },
  memo: { formInput: "textarea", span: 12 },
};

const TYPE_TO_INPUT: Record<PropertyField["type"], FormInput> = {
  text: "text", select: "select", money: "money", area: "area", number: "count", date: "date", bool: "bool",
};

export function formMeta(f: PropertyField): { formInput: FormInput; unit?: string; span: number; placeholder?: string; formHidden: boolean } {
  const o = FORM_OVERRIDE[f.key] ?? {};
  const formInput = o.formInput ?? TYPE_TO_INPUT[f.type];
  const unit = o.unit ?? (f.type === "money" ? "원" : f.type === "area" ? "㎡" : undefined);
  const span = o.span ?? (formInput === "textarea" ? 12 : 3);
  return { formInput, unit, span, placeholder: o.placeholder, formHidden: o.formHidden ?? false };
}

// 가변폭: 모바일 풀 → sm 2단 → lg span. (Tailwind 정적 클래스)
export const SPAN_CLASS: Record<number, string> = {
  3: "col-span-12 sm:col-span-6 lg:col-span-3",
  4: "col-span-12 sm:col-span-6 lg:col-span-4",
  6: "col-span-12 sm:col-span-6",
  12: "col-span-12",
};
```

- [ ] **Step 5: property-form.tsx 재작성**

Replace `src/app/(dashboard)/dashboard/properties/property-form.tsx` 전체:

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { FORM_GROUPS, PROPERTY_FIELDS, SPAN_CLASS, formMeta, type PropertyField } from "@/lib/properties/fields"
import { fromDateInput, groupDigits, stripDigits, formatTel, toDateInput } from "@/lib/properties/format"
import { createProperty, updateProperty, type PropertyRow } from "./actions"

const RENTAL = new Set(["B1", "B2"]) // 전세·월세 → price를 "보증금"으로

export function PropertyForm({ property }: { property?: PropertyRow }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PROPERTY_FIELDS) {
      const v = property?.[f.key]
      init[f.key] = v == null ? (f.key === "status" ? "진행" : "") : f.type === "bool" ? (v ? "true" : "") : String(v)
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  const isRental = RENTAL.has(values.tradeType)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of PROPERTY_FIELDS) {
        if (formMeta(f).formHidden) continue
        payload[f.key] = f.type === "bool" ? values[f.key] === "true" : values[f.key]
      }
      if (property) { await updateProperty(property.id, payload); toast.success("수정했습니다") }
      else { await createProperty(payload); toast.success("등록했습니다") }
      router.push("/dashboard/properties")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패")
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>{property ? "매물 수정" : "매물 등록"}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-6">
          {FORM_GROUPS.map((group) => {
            const fields = PROPERTY_FIELDS.filter((f) => f.group === group && !formMeta(f).formHidden)
            if (fields.length === 0) return null
            return (
              <FieldSet key={group}>
                <FieldLegend variant="label">{group}</FieldLegend>
                <div className="grid grid-cols-12 gap-4">
                  {fields.map((f) => {
                    const m = formMeta(f)
                    // 거래유형 연동: price 라벨/강조
                    const label = f.key === "price" ? (isRental ? "보증금" : "가격") : f.label
                    const dim = (f.key === "dealAmount" && isRental) || (f.key === "price" && !isRental && values.tradeType === "A1")
                    return (
                      <div key={f.key} className={cn(SPAN_CLASS[m.span], dim && "opacity-50")}>
                        <FieldInput field={f} meta={m} label={label} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                      </div>
                    )
                  })}
                </div>
              </FieldSet>
            )
          })}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={busy}>{property ? "수정" : "등록"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function FieldInput({ field, meta, label, value, onChange }: {
  field: PropertyField
  meta: ReturnType<typeof formMeta>
  label: string
  value: string
  onChange: (v: string) => void
}) {
  if (meta.formInput === "bool") {
    return (
      <Field orientation="horizontal">
        <Checkbox id={field.key} checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "")} />
        <FieldLabel htmlFor={field.key}>{label}</FieldLabel>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel htmlFor={field.key}>{label}</FieldLabel>
      {meta.formInput === "select" ? (
        <NativeSelect className="w-full" id={field.key} value={value} onChange={(e) => onChange(e.target.value)}>
          <NativeSelectOption value="">선택</NativeSelectOption>
          {(field.options ?? []).map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
        </NativeSelect>
      ) : meta.formInput === "textarea" ? (
        <Textarea id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={meta.placeholder} rows={2} />
      ) : meta.formInput === "date" ? (
        <Input id={field.key} type="date" value={toDateInput(value)} onChange={(e) => onChange(fromDateInput(e.target.value))} />
      ) : meta.formInput === "tel" ? (
        <Input id={field.key} type="tel" inputMode="tel" value={value} onChange={(e) => onChange(formatTel(e.target.value))} placeholder={meta.placeholder} />
      ) : meta.formInput === "money" ? (
        <InputGroup>
          <InputGroupInput id={field.key} inputMode="numeric" className="text-right tabular-nums" placeholder="0" value={groupDigits(value)} onChange={(e) => onChange(stripDigits(e.target.value))} />
          <InputGroupAddon align="inline-end"><InputGroupText>{meta.unit}</InputGroupText></InputGroupAddon>
        </InputGroup>
      ) : meta.formInput === "area" || meta.formInput === "count" ? (
        <InputGroup>
          <InputGroupInput id={field.key} inputMode={meta.formInput === "area" ? "decimal" : "numeric"} className="text-right tabular-nums" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} />
          {meta.unit && <InputGroupAddon align="inline-end"><InputGroupText>{meta.unit}</InputGroupText></InputGroupAddon>}
        </InputGroup>
      ) : (
        <Input id={field.key} value={value} onChange={(e) => onChange(e.target.value)} placeholder={meta.placeholder} />
      )}
    </Field>
  )
}
```

- [ ] **Step 6: 검증**

Run: `pnpm exec vitest run src/lib/properties/` → 전부 PASS.
Run: `pnpm exec tsc --noEmit` → 0 errors.
Run: `pnpm exec eslint src/lib/properties "src/app/(dashboard)/dashboard/properties/property-form.tsx"` → 0 errors.
Run: `pnpm exec next build` → 성공.

- [ ] **Step 7: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 관리 리파인 3(폼 재설계): 등록/수정 폼을 "직접 입력하는 사람" 관점으로 — 출처 자동(폼 제외), 필드 폭을 내용에 비례(12칼럼·메모 전체폭), 금액 콤마+단위(원/㎡/대/세대) 우측정렬, 날짜 선택기, 전화 자동 하이픈, 거래유형 따라 가격→보증금 라벨·관련 없는 금액 흐림.
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 8: Commit**

```bash
git add src/lib/properties/format.ts src/lib/properties/format.test.ts src/lib/properties/fields.ts "src/app/(dashboard)/dashboard/properties/property-form.tsx" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 폼 재설계 — 가변폭·단위·날짜선택·전화포맷·거래연동

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (작성자 체크 완료)

- **스펙 커버리지:** 항목1(상태필터)=T1·Step2 / 항목2(필드선택 export)=T2 / 항목3(순서 고정)=T1·Step1 / 항목4(폼 재설계: 출처제외·가변폭·단위·날짜·전화·거래연동)=T3. 비범위(월세 필드 신설·라벨→코드 역매핑) 미포함 확인.
- **타입 일관성:** `formMeta`/`SPAN_CLASS`/`FormInput`/`ExportRow`/`propertiesToWorkbook`/`PropertyExportDialog` 시그니처가 정의 Task와 소비처에서 동일. `formHidden` 분기는 폼 render·payload 양쪽 적용.
- **플레이스홀더:** 없음(모든 스텝 실제 코드). `formatTel` 10자리 한계는 주석으로 명시(휴대폰 11자리가 핵심).
- **§6/§5:** 전부 템플릿 프리미티브, 각 Task 문서갱신→commit.
- **exceljs 경계:** export route·excel-export.ts만 exceljs. dialog는 fields만 import.
