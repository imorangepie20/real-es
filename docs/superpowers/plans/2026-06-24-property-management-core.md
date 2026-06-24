# 매물 관리 코어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에이전시 자체 매물 DB(개인별)를 만들어 전체/관심/계약완료 목록·등록·수정·삭제·인라인편집·엑셀 입력까지 동작하는 "매물 관리" 메뉴를 추가한다.

**Architecture:** 네이버 캐시(`Article`/`Favorite`)와 **별개**의 `Property` 테이블(userId 소유). 모든 필드 정의를 `src/lib/properties/fields.ts` **단일 소스**에 두고 그리드 컬럼·폼 섹션·엑셀 헤더 매칭을 전부 거기서 구동한다. UI는 관심매물 그리드 패턴(`EditCell`/`SelectCell`)을 공용 모듈로 추출해 재사용한다. 엑셀 읽기(exceljs)는 서버 전용 모듈, 매칭·정규화는 클라/서버 공용 순수 모듈로 분리한다(네이버 `excel`/`excel-fields` 분리와 동일).

**Tech Stack:** Next.js 16 App Router · React 19 · Prisma 6/PostgreSQL · Base UI(shadcn 클론) 프리미티브 · exceljs · vitest.

## Global Constraints

- **응답·커뮤니케이션은 한국어**(CLAUDE.md). 코드·식별자·로그는 기술 토큰 그대로.
- **§6 템플릿 우선**: `src/components/ui/` 프리미티브·Tailwind 토큰만 사용. 임의 px/hex 하드코딩 금지. 새 프리미티브 자작 금지.
- **§3 surgical**: 요청 외 코드 수정·리팩터 금지. 내 변경이 만든 orphan import만 정리.
- **§5 마무리**: 각 Task 끝에서 README §"현재 반영 상태" + docs/PROJECT_GUIDE.md §"현재 참고 상태"를 한두 줄 갱신한 **뒤에만** commit. commit 메시지 끝줄에 `문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태`. commit 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. **push는 절대 자동 금지**(명시 요청 시만).
- **단일 소스**: 거래/매물유형 코드·라벨은 `@/lib/naver/trade-types`·`@/lib/naver/property-types`에서만 import. 새 필드 정의는 `@/lib/properties/fields`에만.
- **BigInt 직렬화**: 서버액션이 클라로 넘기는 값에 BigInt 금지 → `toRow`에서 `string`으로 변환.
- **userId 스코핑**: 모든 매물 읽기/쓰기는 `where: { ..., userId: user.id }`로 격리(`updateMany`/`deleteMany`/`findFirst`). 인증은 `getCurrentUser()` → 없으면 throw.
- **검증 명령**: `pnpm exec tsc --noEmit` · `pnpm exec eslint <files>` · `pnpm exec vitest run <test>` · 마이그레이션 `pnpm prisma migrate dev --name <n>` + `pnpm prisma generate`.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` (수정) | `Property` 모델 + `User.properties` 관계 |
| `src/lib/properties/fields.ts` (생성) | **단일 소스**: 필드 정의·그룹·리스트 컬럼·상태 옵션·값 정규화(`coerceField`) |
| `src/lib/properties/fields.test.ts` (생성) | `coerceField`·필드 정합성 단위 테스트 |
| `src/lib/properties/header-match.ts` (생성) | 엑셀 헤더 → fieldKey 자동 매칭(순수) |
| `src/lib/properties/header-match.test.ts` (생성) | 매칭 단위 테스트 |
| `src/lib/properties/excel-import.ts` (생성, 클라/서버 공용) | `ParsedSheet` 타입 · `buildImportRows` · `countIssues` (exceljs 미포함) |
| `src/lib/properties/excel-import.test.ts` (생성) | `buildImportRows`·`countIssues` 단위 테스트 |
| `src/lib/properties/excel-read.ts` (생성, 서버 전용) | `parseWorkbook`(exceljs) — 업로드 시트 → `ParsedSheet` |
| `src/lib/properties/excel-read.test.ts` (생성) | exceljs 라운드트립 파싱 테스트 |
| `src/components/data-grid/editable-cell.tsx` (생성) | 관심매물에서 추출한 공용 `EditCell`/`SelectCell` |
| `src/app/(dashboard)/dashboard/naver/favorites/favorites-view.tsx` (수정) | 로컬 `EditCell`/`SelectCell` 제거 → 공용 import (orphan 정리) |
| `src/app/(dashboard)/dashboard/properties/actions.ts` (생성) | 서버액션 전체 + `PropertyRow`/`toRow`/`toData` |
| `src/app/(dashboard)/dashboard/properties/property-list.tsx` (생성) | 상태 뷰 공용 그리드(체크박스·넘버링·인라인편집·필터·삭제·상태전환·관심토글) |
| `src/app/(dashboard)/dashboard/properties/property-form.tsx` (생성) | 섹션형 등록/수정 폼 |
| `src/app/(dashboard)/dashboard/properties/excel-import-dialog.tsx` (생성) | 엑셀 입력 다이얼로그(매핑 확인 + 형식 경고) |
| `src/app/(dashboard)/dashboard/properties/page.tsx` (생성) | 전체 목록 |
| `src/app/(dashboard)/dashboard/properties/favorites/page.tsx` (생성) | 관심 목록 |
| `src/app/(dashboard)/dashboard/properties/contracted/page.tsx` (생성) | 계약완료 목록 |
| `src/app/(dashboard)/dashboard/properties/new/page.tsx` (생성) | 등록 폼 페이지 |
| `src/app/(dashboard)/dashboard/properties/[id]/edit/page.tsx` (생성) | 수정 폼 페이지 |
| `src/lib/nav.ts` (수정) | "매물 관리" NavGroup 추가 |

**범위 메모(§2 단순화):** 첫 빌드 결정 범위는 **엑셀 입력까지**. 매물 **엑셀 출력**은 §1 비범위(후속) — 그리드에 엑셀 다운로드 버튼은 **넣지 않는다**(나중에 favorites export 패턴 재사용으로 쉽게 추가 가능). 스펙 §3의 "엑셀출력" 언급은 이 범위 결정으로 보류.

---

## Task 1: 기반 — Property 모델 + 필드 단일소스 + 서버액션

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/properties/fields.ts`
- Test: `src/lib/properties/fields.test.ts`
- Create: `src/app/(dashboard)/dashboard/properties/actions.ts`

**Interfaces:**
- Produces (Task 2~4가 의존):
  - `fields.ts`: `type FieldType`, `type PropertyField = { key; label; group; type; options? }`, `PROPERTY_FIELDS: PropertyField[]`, `FIELD_BY_KEY: Record<string,PropertyField>`, `FORM_GROUPS: readonly string[]`, `LIST_COLUMNS: string[]`, `STATUS_OPTIONS: {value;label}[]`, `coerceField(type, raw): string|number|boolean|null`
  - `actions.ts`: `type PropertyView = "all"|"favorites"|"contracted"`, `type PropertyRow = { id: string; isFavorite: boolean } & Record<string, string|number|boolean|null>`, `listProperties(view?)`, `getProperty(id)`, `createProperty(input)`, `updateProperty(id, patch)`, `deleteProperties(ids)`, `setPropertyStatus(ids, status)`, `togglePropertyFavorite(id, isFavorite)`, `importProperties(rows)`

- [ ] **Step 1: Prisma `Property` 모델 추가**

`prisma/schema.prisma`에 `User` 모델의 `favorites Favorite[]` 다음 줄에 `properties Property[]` 추가:

```prisma
model User {
  id           String    @id @default(cuid())
  agencyId     String
  agency       Agency    @relation(fields: [agencyId], references: [id])
  email        String    @unique
  passwordHash String
  name         String?
  role         String    @default("member")
  createdAt    DateTime  @default(now())
  sessions     Session[]
  favorites    Favorite[]
  properties   Property[]
}
```

파일 끝(`Favorite` 모델 뒤)에 추가:

```prisma
// 자체 매물 (사용자별 소유) — 네이버 캐시와 무관. 스펙 §필드정의.
model Property {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  articleNo      String?
  complexName    String?
  realEstateType String? // property-types 코드
  tradeType      String? // trade-types 코드
  status         String  @default("진행") // 진행 | 계약완료
  isFavorite     Boolean @default(false)
  source         String  @default("수기") // 수기 | 엑셀 | 네이버

  siteArea      Float?
  areaExclusive Float?
  areaSupply    Float?
  landArea      Float?
  buildingArea  Float?
  area          Float?

  dealAmount BigInt? // 거래금액(원)
  price      BigInt? // 가격(원)

  totalHouseholds Int?
  approvalDate    String?
  parkingCount    Int?
  heating         String?
  isPreSale       Boolean?

  customerName   String?
  customerPhone  String?
  partnerName    String?
  partnerPhone   String?
  partnerManager String?
  manager        String?

  contractHopeDate String?
  contractDate     String?
  moveInHopeDate   String?
  moveInDate       String?
  interim1Date     String?
  interim2Date     String?
  balanceDate      String?

  note String?
  memo String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, status])
  @@index([userId, isFavorite])
}
```

- [ ] **Step 2: 마이그레이션 생성·적용**

Run: `pnpm prisma migrate dev --name add_property`
Expected: 새 마이그레이션 폴더 생성, "Your database is now in sync", Prisma Client 재생성. 에러 없음.

- [ ] **Step 3: `fields.ts` 작성**

Create `src/lib/properties/fields.ts`:

```ts
// 매물 필드 단일 정의 — 그리드 컬럼·폼 섹션·엑셀 매칭의 단일 소스. 하드코딩 금지.
import { PROPERTY_OPTIONS } from "@/lib/naver/property-types";
import { TRADE_OPTIONS } from "@/lib/naver/trade-types";

export type FieldType = "text" | "number" | "money" | "area" | "select" | "date" | "bool";
export type FieldOption = { value: string; label: string };
export type PropertyField = { key: string; label: string; group: string; type: FieldType; options?: FieldOption[] };

export const STATUS_OPTIONS: FieldOption[] = [
  { value: "진행", label: "진행" },
  { value: "계약완료", label: "계약완료" },
];

const propertyOpts: FieldOption[] = PROPERTY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
const tradeOpts: FieldOption[] = TRADE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const PROPERTY_FIELDS: PropertyField[] = [
  // 기본
  { key: "articleNo", label: "매물번호", group: "기본", type: "text" },
  { key: "complexName", label: "단지명", group: "기본", type: "text" },
  { key: "realEstateType", label: "매물유형", group: "기본", type: "select", options: propertyOpts },
  { key: "tradeType", label: "거래유형", group: "기본", type: "select", options: tradeOpts },
  { key: "status", label: "상태", group: "기본", type: "select", options: STATUS_OPTIONS },
  { key: "source", label: "출처", group: "기본", type: "text" },
  // 면적
  { key: "siteArea", label: "소재지면적", group: "면적", type: "area" },
  { key: "areaExclusive", label: "전용면적", group: "면적", type: "area" },
  { key: "areaSupply", label: "공급면적", group: "면적", type: "area" },
  { key: "landArea", label: "대지면적", group: "면적", type: "area" },
  { key: "buildingArea", label: "건축면적", group: "면적", type: "area" },
  { key: "area", label: "연면적", group: "면적", type: "area" },
  // 금액
  { key: "dealAmount", label: "거래금액", group: "금액", type: "money" },
  { key: "price", label: "가격", group: "금액", type: "money" },
  // 건물
  { key: "totalHouseholds", label: "총세대수", group: "건물", type: "number" },
  { key: "approvalDate", label: "사용승인일", group: "건물", type: "date" },
  { key: "parkingCount", label: "주차가능대수", group: "건물", type: "number" },
  { key: "heating", label: "난방방식", group: "건물", type: "text" },
  { key: "isPreSale", label: "준공아파트여부", group: "건물", type: "bool" },
  // 고객
  { key: "customerName", label: "고객명", group: "고객", type: "text" },
  { key: "customerPhone", label: "고객전화", group: "고객", type: "text" },
  // 관련부동산
  { key: "partnerName", label: "관련부동산", group: "관련부동산", type: "text" },
  { key: "partnerPhone", label: "관련부동산전화", group: "관련부동산", type: "text" },
  { key: "partnerManager", label: "관련부동산담당", group: "관련부동산", type: "text" },
  { key: "manager", label: "담당자", group: "관련부동산", type: "text" },
  // 일정
  { key: "contractHopeDate", label: "계약희망일", group: "일정", type: "date" },
  { key: "contractDate", label: "계약일", group: "일정", type: "date" },
  { key: "moveInHopeDate", label: "입주희망일", group: "일정", type: "date" },
  { key: "moveInDate", label: "입주일", group: "일정", type: "date" },
  { key: "interim1Date", label: "중도금1", group: "일정", type: "date" },
  { key: "interim2Date", label: "중도금2", group: "일정", type: "date" },
  { key: "balanceDate", label: "잔금일", group: "일정", type: "date" },
  // 메모
  { key: "note", label: "특이사항", group: "메모", type: "text" },
  { key: "memo", label: "메모", group: "메모", type: "text" },
];

export const FIELD_BY_KEY: Record<string, PropertyField> = Object.fromEntries(
  PROPERTY_FIELDS.map((f) => [f.key, f]),
);

export const FORM_GROUPS = ["기본", "면적", "금액", "건물", "고객", "관련부동산", "일정", "메모"] as const;

// 목록 그리드에 노출할 컬럼(나머지는 폼에서 편집)
export const LIST_COLUMNS = [
  "articleNo", "complexName", "realEstateType", "tradeType", "status",
  "price", "dealAmount", "areaExclusive", "customerName", "manager",
];

// 엑셀·폼·인라인 공용 값 정규화. null=빈값.
export function coerceField(type: FieldType, raw: unknown): string | number | boolean | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  switch (type) {
    case "number": { const n = Number(s.replace(/[,\s]/g, "")); return Number.isFinite(n) ? Math.trunc(n) : null; }
    case "money": { const n = Number(s.replace(/[,\s원]/g, "")); return Number.isFinite(n) ? n : null; }
    case "area": { const n = Number(s.replace(/[,\s㎡]/g, "")); return Number.isFinite(n) ? n : null; }
    case "date": { const d = s.replace(/[^0-9]/g, ""); return d.length === 8 ? d : s; }
    case "bool": return /^(y|yes|true|1|예|o|t|준공)$/i.test(s);
    default: return s;
  }
}
```

- [ ] **Step 4: `fields.test.ts` 작성**

Create `src/lib/properties/fields.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { coerceField, FIELD_BY_KEY, PROPERTY_FIELDS, LIST_COLUMNS } from "./fields";

describe("coerceField", () => {
  it("number: 콤마 제거·정수화", () => {
    expect(coerceField("number", "1,234")).toBe(1234);
    expect(coerceField("number", "12.9")).toBe(12);
  });
  it("money: 원/콤마 제거", () => {
    expect(coerceField("money", "350,000,000원")).toBe(350000000);
  });
  it("area: ㎡ 제거·소수 유지", () => {
    expect(coerceField("area", "84.21㎡")).toBe(84.21);
  });
  it("date: 8자리 ymd 정규화", () => {
    expect(coerceField("date", "2003-08-08")).toBe("20030808");
    expect(coerceField("date", "2003.08.08")).toBe("20030808");
  });
  it("bool: 참/거짓 토큰", () => {
    expect(coerceField("bool", "예")).toBe(true);
    expect(coerceField("bool", "N")).toBe(false);
  });
  it("공백 → null", () => {
    expect(coerceField("text", "  ")).toBeNull();
    expect(coerceField("number", "")).toBeNull();
  });
});

describe("필드 정의 정합성", () => {
  it("LIST_COLUMNS는 모두 실제 필드", () => {
    for (const k of LIST_COLUMNS) expect(FIELD_BY_KEY[k]).toBeDefined();
  });
  it("key는 유일", () => {
    const keys = PROPERTY_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 5: 테스트 실행(통과 확인)**

Run: `pnpm exec vitest run src/lib/properties/fields.test.ts`
Expected: 모든 테스트 PASS.

- [ ] **Step 6: `actions.ts` 작성**

Create `src/app/(dashboard)/dashboard/properties/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { PROPERTY_FIELDS, FIELD_BY_KEY } from "@/lib/properties/fields";

export type PropertyView = "all" | "favorites" | "contracted";
export type PropertyRow = { id: string; isFavorite: boolean } & Record<string, string | number | boolean | null>;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

const MONEY = new Set(PROPERTY_FIELDS.filter((f) => f.type === "money").map((f) => f.key));
const INT = new Set(PROPERTY_FIELDS.filter((f) => f.type === "number").map((f) => f.key));
const FLOAT = new Set(PROPERTY_FIELDS.filter((f) => f.type === "area").map((f) => f.key));
const BOOL = new Set(PROPERTY_FIELDS.filter((f) => f.type === "bool").map((f) => f.key));

// Prisma Property → 직렬화 가능한 PropertyRow (BigInt→string)
function toRow(p: Record<string, unknown>): PropertyRow {
  const row: PropertyRow = { id: p.id as string, isFavorite: !!p.isFavorite };
  for (const f of PROPERTY_FIELDS) {
    const v = p[f.key];
    row[f.key] = typeof v === "bigint" ? v.toString() : ((v as string | number | boolean | null | undefined) ?? null);
  }
  return row;
}

// PropertyRow patch → Prisma data (문자열→BigInt/Int/Float/Bool). 알 수 없는 키 무시.
function toData(patch: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!FIELD_BY_KEY[k]) continue;
    if (v == null || v === "") { data[k] = null; continue; }
    if (MONEY.has(k)) data[k] = BigInt(Math.trunc(Number(v)));
    else if (INT.has(k)) data[k] = Math.trunc(Number(v));
    else if (FLOAT.has(k)) data[k] = Number(v);
    else if (BOOL.has(k)) data[k] = v === true || v === "true";
    else data[k] = String(v);
  }
  return data;
}

export async function listProperties(view: PropertyView = "all"): Promise<PropertyRow[]> {
  const user = await requireUser();
  const where: { userId: string; isFavorite?: boolean; status?: string } = { userId: user.id };
  if (view === "favorites") where.isFavorite = true;
  if (view === "contracted") where.status = "계약완료";
  const rows = await db.property.findMany({ where, orderBy: { updatedAt: "desc" } });
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

export async function getProperty(id: string): Promise<PropertyRow | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  return p ? toRow(p as unknown as Record<string, unknown>) : null;
}

export async function createProperty(input: Record<string, unknown>): Promise<string> {
  const user = await requireUser();
  const data = toData(input);
  const p = await db.property.create({ data: { ...data, userId: user.id, source: (data.source as string) || "수기" } });
  revalidatePath("/dashboard/properties");
  return p.id;
}

export async function updateProperty(id: string, patch: Record<string, unknown>): Promise<void> {
  const user = await requireUser();
  await db.property.updateMany({ where: { id, userId: user.id }, data: toData(patch) });
  revalidatePath("/dashboard/properties");
}

export async function deleteProperties(ids: string[]): Promise<number> {
  const user = await requireUser();
  const res = await db.property.deleteMany({ where: { id: { in: ids }, userId: user.id } });
  revalidatePath("/dashboard/properties");
  return res.count;
}

export async function setPropertyStatus(ids: string[], status: string): Promise<number> {
  const user = await requireUser();
  const res = await db.property.updateMany({ where: { id: { in: ids }, userId: user.id }, data: { status } });
  revalidatePath("/dashboard/properties");
  return res.count;
}

export async function togglePropertyFavorite(id: string, isFavorite: boolean): Promise<void> {
  const user = await requireUser();
  await db.property.updateMany({ where: { id, userId: user.id }, data: { isFavorite } });
  revalidatePath("/dashboard/properties");
}

export async function importProperties(rows: Record<string, unknown>[]): Promise<number> {
  const user = await requireUser();
  let n = 0;
  for (const r of rows) {
    const data = toData(r);
    if (Object.keys(data).length === 0) continue;
    await db.property.create({ data: { ...data, userId: user.id, source: "엑셀" } });
    n++;
  }
  revalidatePath("/dashboard/properties");
  return n;
}
```

- [ ] **Step 7: 타입·린트 검증**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음(특히 `db.property` 타입 인식 = 마이그레이션/generate 정상).
Run: `pnpm exec eslint src/lib/properties/fields.ts "src/app/(dashboard)/dashboard/properties/actions.ts"`
Expected: 에러 없음.

- [ ] **Step 8: 문서 갱신**

`README.md` §"현재 반영 상태" 마지막 항목 앞(`- (작업 단위가...` 줄 위)에 추가:

```md
- 매물 관리 기반(① 모델·필드 단일소스·서버액션): 자체 `Property` 모델(개인별 userId, 네이버 캐시와 별개) + 마이그레이션. 필드 정의 단일 소스 `src/lib/properties/fields.ts`(그리드·폼·엑셀 공용, `coerceField` 정규화). 서버액션(목록 상태뷰/등록/수정/삭제/상태전환/관심토글/엑셀입력) — UI는 다음 단계.
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가(형식은 해당 섹션 기존 항목과 맞춤).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma src/lib/properties/fields.ts src/lib/properties/fields.test.ts "src/app/(dashboard)/dashboard/properties/actions.ts" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 매물 관리 기반 — Property 모델·필드 단일소스·서버액션

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

> **주의:** `prisma/migrations/` 새 폴더도 함께 staged 되었는지 `git status`로 확인 후 add. `docs/project_structure.md`(사용자 수정본)는 staged 하지 말 것.

---

## Task 2: 목록 — 공용 셀 추출 + 상태 뷰 그리드 + 페이지 + nav

**Files:**
- Create: `src/components/data-grid/editable-cell.tsx`
- Modify: `src/app/(dashboard)/dashboard/naver/favorites/favorites-view.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/property-list.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/page.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/favorites/page.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/contracted/page.tsx`
- Modify: `src/lib/nav.ts`

**Interfaces:**
- Consumes: Task 1의 `PROPERTY_FIELDS`, `FIELD_BY_KEY`, `LIST_COLUMNS`, `STATUS_OPTIONS`, `PropertyRow`, `PropertyView`, `listProperties`, `updateProperty`, `deleteProperties`, `setPropertyStatus`, `togglePropertyFavorite`. Task 4의 `ExcelImportDialog`(아직 없음 — Step 4에서 임시 처리).
- Produces: 공용 `EditCell`/`SelectCell`(시그니처는 기존 favorites와 동일):
  - `EditCell({ value: string|number|null; display: ReactNode; onSave: (v: string) => void; numeric?: boolean })`
  - `SelectCell({ value: string; label: string; options: {value;label}[]; onSave: (v: string) => void })`

- [ ] **Step 1: 공용 `editable-cell.tsx` 생성(기존 코드 그대로 이동)**

Create `src/components/data-grid/editable-cell.tsx` — favorites-view.tsx의 `EditCell`/`SelectCell`를 **동작 변경 없이** 이동:

```tsx
"use client"

import { type ReactNode, useState } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// 더블클릭 → 입력 편집, blur/Enter 저장, Esc 취소
export function EditCell({ value, display, onSave, numeric }: { value: string | number | null; display: ReactNode; onSave: (v: string) => void; numeric?: boolean }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <input
        autoFocus
        type={numeric ? "number" : "text"}
        defaultValue={value ?? ""}
        onBlur={(e) => { if (String(value ?? "") !== e.target.value) onSave(e.target.value); setEditing(false) }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); else if (e.key === "Escape") setEditing(false) }}
        className={cn("w-full min-w-16 rounded bg-background px-1 py-0.5 outline-none ring-1 ring-ring", numeric && "text-right tabular-nums")}
      />
    )
  }
  return (
    <div onDoubleClick={() => setEditing(true)} title="더블클릭하여 편집" className="cursor-text rounded px-1 py-0.5 hover:bg-muted/50">{display}</div>
  )
}

// 더블클릭 → 셀렉트 편집
export function SelectCell({ value, label, options, onSave }: { value: string; label: string; options: { value: string; label: string }[]; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <Select defaultOpen value={value} onOpenChange={(o) => { if (!o) setEditing(false) }} onValueChange={(v) => { if (v != null) onSave(v); setEditing(false) }}>
        <SelectTrigger className="h-7 px-1"><SelectValue>{label}</SelectValue></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    )
  }
  return (
    <div onDoubleClick={() => setEditing(true)} title="더블클릭하여 편집" className="cursor-text rounded px-1 py-0.5 hover:bg-muted/50">{label}</div>
  )
}
```

- [ ] **Step 2: `favorites-view.tsx`를 공용 import로 전환(orphan 정리)**

`src/app/(dashboard)/dashboard/naver/favorites/favorites-view.tsx`:
1. 로컬 `EditCell`(24~41행)·`SelectCell`(44~57행) **함수 정의 두 개 삭제**.
2. import 정리 — `EditCell`/`SelectCell` 외에 더 안 쓰는 것 제거:
   - 3행 `import { type ReactNode, useState } from "react"` → `import { useState } from "react"` (ReactNode는 삭제된 함수에서만 사용).
   - 14행 `import { cn } from "@/lib/utils"` **삭제**(삭제된 함수에서만 사용).
   - 12행 `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`는 **유지**(필터 셀렉트에서 사용 중).
3. 새 import 추가(17행 `ExportDialog` import 부근):

```tsx
import { EditCell, SelectCell } from "@/components/data-grid/editable-cell"
```

- [ ] **Step 3: favorites 회귀 검증**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음(특히 `cn`/`ReactNode` unused 에러 없음 = orphan 정리 완료).
Run: `pnpm exec eslint "src/app/(dashboard)/dashboard/naver/favorites/favorites-view.tsx" src/components/data-grid/editable-cell.tsx`
Expected: 에러 없음.

- [ ] **Step 4: `property-list.tsx` 생성**

Create `src/app/(dashboard)/dashboard/properties/property-list.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Star, Trash2, Pencil, CircleCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { EditCell, SelectCell } from "@/components/data-grid/editable-cell"
import { FIELD_BY_KEY, LIST_COLUMNS, STATUS_OPTIONS, type PropertyField } from "@/lib/properties/fields"
import { TRADE_LABEL, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { PROPERTY_LABEL, PROPERTY_OPTIONS } from "@/lib/naver/property-types"
import { deleteProperties, setPropertyStatus, togglePropertyFavorite, updateProperty, type PropertyRow, type PropertyView } from "./actions"

const VIEW_TITLE: Record<PropertyView, string> = { all: "전체 매물", favorites: "관심 매물", contracted: "계약완료" }
const won = (v: string | number | null) => (v == null || v === "" ? "-" : Number(v).toLocaleString("ko-KR"))
const ymd = (v: string | number | null) => { const s = v == null ? "" : String(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : (s || "-") }

function display(field: PropertyField, value: string | number | boolean | null) {
  if (value == null || value === "") return "-"
  switch (field.type) {
    case "money": return won(value as string)
    case "date": return ymd(value as string)
    case "select": return field.options?.find((o) => o.value === value)?.label ?? String(value)
    case "bool": return value ? "예" : "아니오"
    default: return String(value)
  }
}

export function PropertyList({ rows: initial, view }: { rows: PropertyRow[]; view: PropertyView }) {
  const router = useRouter()
  const [data, setData] = useState(initial)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setData(initial) }

  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [fType, setFType] = useState("ALL")
  const [fTrade, setFTrade] = useState("ALL")

  const rows = data.filter(
    (p) => (fType === "ALL" || p.realEstateType === fType) && (fTrade === "ALL" || p.tradeType === fTrade),
  )
  const allSelected = rows.length > 0 && rows.every((p) => sel.has(p.id))
  const someSelected = rows.some((p) => sel.has(p.id)) && !allSelected
  const toggleAll = (c: boolean) => setSel(c ? new Set(rows.map((p) => p.id)) : new Set())
  const toggleOne = (id: string, c: boolean) => setSel((prev) => { const next = new Set(prev); if (c) next.add(id); else next.delete(id); return next })

  function patchRow(id: string, patch: Partial<PropertyRow>) {
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    updateProperty(id, patch).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"))
  }
  function toggleFav(p: PropertyRow) {
    const next = !p.isFavorite
    setData((prev) => prev.map((r) => (r.id === p.id ? { ...r, isFavorite: next } : r)))
    togglePropertyFavorite(p.id, next).then(() => router.refresh()).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"))
  }
  async function run(fn: () => Promise<unknown>, ok: string) {
    if (!sel.size) return
    setBusy(true)
    try { await fn(); toast.success(ok); setSel(new Set()); router.refresh() }
    catch (e) { toast.error(e instanceof Error ? e.message : "실패") }
    finally { setBusy(false) }
  }

  return (
    <Card className="gap-0">
      <CardHeader className="border-b">
        <CardTitle>{VIEW_TITLE[view]}</CardTitle>
        <CardAction className="flex flex-wrap items-center gap-2">
          <Select value={fType} onValueChange={(v) => { if (v != null) setFType(v) }}>
            <SelectTrigger className="h-8"><SelectValue>{fType === "ALL" ? "매물유형 전체" : PROPERTY_LABEL[fType] ?? fType}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">매물유형 전체</SelectItem>
              {PROPERTY_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fTrade} onValueChange={(v) => { if (v != null) setFTrade(v) }}>
            <SelectTrigger className="h-8"><SelectValue>{fTrade === "ALL" ? "거래유형 전체" : TRADE_LABEL[fTrade] ?? fTrade}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">거래유형 전체</SelectItem>
              {TRADE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {sel.size > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => run(() => setPropertyStatus([...sel], "계약완료"), "계약완료로 전환했습니다")} disabled={busy}>
                <CircleCheck className="size-3.5" />계약완료
              </Button>
              <Button size="sm" variant="destructive" onClick={() => run(() => deleteProperties([...sel]), "삭제했습니다")} disabled={busy}>
                <Trash2 className="size-3.5" />삭제 {sel.size}
              </Button>
            </>
          )}
          {/* Task 4에서 ExcelImportDialog가 여기에 추가됨 */}
          <Button size="sm" render={<Link href="/dashboard/properties/new" />}>
            <Plus className="size-3.5" />새 매물
          </Button>
          <span className="text-sm text-muted-foreground">{rows.length}개</span>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Star /></EmptyMedia>
              <EmptyTitle>매물이 없습니다</EmptyTitle>
              <EmptyDescription>{'"새 매물"로 직접 등록하거나 "엑셀 입력"으로 한 번에 추가하세요. 셀을 더블클릭하면 바로 수정됩니다.'}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={(c) => toggleAll(c)} aria-label="전체 선택" /></TableHead>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead className="w-10" aria-label="관심" />
                  {LIST_COLUMNS.map((k) => <TableHead key={k}>{FIELD_BY_KEY[k].label}</TableHead>)}
                  <TableHead className="w-10" aria-label="수정" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={p.id} data-state={sel.has(p.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={sel.has(p.id)} onCheckedChange={(c) => toggleOne(p.id, c)} aria-label="선택" /></TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{rows.length - i}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleFav(p)} aria-label="관심" className="text-muted-foreground hover:text-foreground">
                        <Star className={cn("size-4", p.isFavorite && "fill-amber-400 text-amber-400")} />
                      </button>
                    </TableCell>
                    {LIST_COLUMNS.map((k) => {
                      const f = FIELD_BY_KEY[k]
                      const v = p[k]
                      if (f.type === "select") {
                        return <TableCell key={k}><SelectCell value={String(v ?? "")} label={display(f, v)} options={f.options ?? []} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                      }
                      const numeric = f.type === "money" || f.type === "number" || f.type === "area"
                      return <TableCell key={k} className={cn(k === "complexName" && "min-w-40 font-medium")}><EditCell numeric={numeric} value={v as string | number | null} display={display(f, v)} onSave={(nv) => patchRow(p.id, { [k]: nv })} /></TableCell>
                    })}
                    <TableCell>
                      <Link href={`/dashboard/properties/${p.id}/edit`} aria-label="수정" className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

> **순서 메모:** `property-list`는 Task 2에서 `ExcelImportDialog`를 참조하지 **않는다**(엑셀 다이얼로그는 Task 4 산출물). Task 4에서 import 한 줄 + 버튼 한 줄을 추가해 연결한다. Task 2 단독으로 빌드·검증 가능.

- [ ] **Step 5: 세 목록 페이지 생성**

Create `src/app/(dashboard)/dashboard/properties/page.tsx`:

```tsx
import { listProperties } from "./actions"
import { PropertyList } from "./property-list"

export const dynamic = "force-dynamic"

export default async function PropertiesPage() {
  const rows = await listProperties("all")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 관리</h1>
      <PropertyList rows={rows} view="all" />
    </div>
  )
}
```

Create `src/app/(dashboard)/dashboard/properties/favorites/page.tsx`:

```tsx
import { listProperties } from "../actions"
import { PropertyList } from "../property-list"

export const dynamic = "force-dynamic"

export default async function FavoritePropertiesPage() {
  const rows = await listProperties("favorites")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">관심 매물</h1>
      <PropertyList rows={rows} view="favorites" />
    </div>
  )
}
```

Create `src/app/(dashboard)/dashboard/properties/contracted/page.tsx`:

```tsx
import { listProperties } from "../actions"
import { PropertyList } from "../property-list"

export const dynamic = "force-dynamic"

export default async function ContractedPropertiesPage() {
  const rows = await listProperties("contracted")
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">계약완료</h1>
      <PropertyList rows={rows} view="contracted" />
    </div>
  )
}
```

- [ ] **Step 6: nav에 "매물 관리" 그룹 추가**

`src/lib/nav.ts`:
1. 아이콘 import에 `ClipboardList`, `CircleCheck` 추가(9행 `Component, Blocks, FlaskConical, Globe, Star,` 줄에 이어서). `Star`는 이미 있음.
2. `navGroups` 배열에서 `Dashboards` 그룹 객체 **다음**에 새 그룹 삽입:

```ts
  {
    label: "매물 관리",
    items: [
      { title: "전체 매물", href: "/dashboard/properties", icon: ClipboardList },
      { title: "관심 매물", href: "/dashboard/properties/favorites", icon: Star },
      { title: "계약완료", href: "/dashboard/properties/contracted", icon: CircleCheck },
    ],
  },
```

- [ ] **Step 7: 타입·린트·빌드 검증**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음.
Run: `pnpm exec eslint "src/app/(dashboard)/dashboard/properties/**/*.tsx" src/lib/nav.ts`
Expected: 에러 없음.
Run: `pnpm exec next build`  (또는 `pnpm build`)
Expected: `/dashboard/properties`·`/favorites`·`/contracted` 라우트가 빌드 산출물에 포함, 에러 없음.

- [ ] **Step 8: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 관리 목록(② 상태 뷰): "매물 관리" 메뉴(전체/관심/계약완료) — 공용 `Property` 그리드(체크박스·전체선택·넘버링·매물·거래유형 필터·**더블클릭 인라인편집**·선택 삭제·계약완료 전환·관심 별 토글). 관심매물 셀 편집 컴포넌트를 `components/data-grid/editable-cell`로 공용화해 재사용. (엑셀 출력 버튼은 첫 빌드 비범위)
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 9: Commit**

```bash
git add src/components/data-grid/editable-cell.tsx "src/app/(dashboard)/dashboard/naver/favorites/favorites-view.tsx" "src/app/(dashboard)/dashboard/properties" src/lib/nav.ts README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 매물 관리 목록(상태 뷰·인라인편집·삭제·상태전환·nav)

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 등록/수정 폼

**Files:**
- Create: `src/app/(dashboard)/dashboard/properties/property-form.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/new/page.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PROPERTY_FIELDS`, `FORM_GROUPS`, `PropertyField`(fields), `createProperty`, `updateProperty`, `getProperty`, `PropertyRow`(actions).
- Produces: `PropertyForm({ property?: PropertyRow })`.

- [ ] **Step 1: `property-form.tsx` 생성**

Create `src/app/(dashboard)/dashboard/properties/property-form.tsx`:

```tsx
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { FORM_GROUPS, PROPERTY_FIELDS, type PropertyField } from "@/lib/properties/fields"
import { createProperty, updateProperty, type PropertyRow } from "./actions"

export function PropertyForm({ property }: { property?: PropertyRow }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of PROPERTY_FIELDS) {
      const v = property?.[f.key]
      init[f.key] = v == null ? "" : f.type === "bool" ? (v ? "true" : "") : String(v)
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const f of PROPERTY_FIELDS) payload[f.key] = f.type === "bool" ? values[f.key] === "true" : values[f.key]
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
          {FORM_GROUPS.map((group) => (
            <FieldSet key={group}>
              <FieldLegend variant="label">{group}</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PROPERTY_FIELDS.filter((f) => f.group === group).map((f) => (
                  <FieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                ))}
              </FieldGroup>
            </FieldSet>
          ))}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
          <Button type="submit" disabled={busy}>{property ? "수정" : "등록"}</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function FieldInput({ field, value, onChange }: { field: PropertyField; value: string; onChange: (v: string) => void }) {
  if (field.type === "bool") {
    return (
      <Field orientation="horizontal">
        <Checkbox id={field.key} checked={value === "true"} onCheckedChange={(c) => onChange(c ? "true" : "")} />
        <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
      </Field>
    )
  }
  return (
    <Field>
      <FieldLabel htmlFor={field.key}>{field.label}</FieldLabel>
      {field.type === "select" ? (
        <NativeSelect className="w-full" id={field.key} value={value} onChange={(e) => onChange(e.target.value)}>
          <NativeSelectOption value="">선택</NativeSelectOption>
          {(field.options ?? []).map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
        </NativeSelect>
      ) : (
        <Input
          id={field.key}
          type={field.type === "number" || field.type === "money" || field.type === "area" ? "number" : "text"}
          inputMode={field.type === "money" || field.type === "number" ? "numeric" : undefined}
          placeholder={field.type === "date" ? "YYYYMMDD" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}
```

- [ ] **Step 2: 등록 페이지**

Create `src/app/(dashboard)/dashboard/properties/new/page.tsx`:

```tsx
import { PropertyForm } from "../property-form"

export default function NewPropertyPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 등록</h1>
      <PropertyForm />
    </div>
  )
}
```

- [ ] **Step 3: 수정 페이지**

Create `src/app/(dashboard)/dashboard/properties/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation"

import { getProperty } from "../../actions"
import { PropertyForm } from "../../property-form"

export const dynamic = "force-dynamic"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getProperty(id)
  if (!property) notFound()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">매물 수정</h1>
      <PropertyForm property={property} />
    </div>
  )
}
```

- [ ] **Step 4: 타입·린트·빌드 검증**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음.
Run: `pnpm exec eslint "src/app/(dashboard)/dashboard/properties/property-form.tsx" "src/app/(dashboard)/dashboard/properties/new/page.tsx" "src/app/(dashboard)/dashboard/properties/[id]/edit/page.tsx"`
Expected: 에러 없음.
Run: `pnpm exec next build`
Expected: `/dashboard/properties/new`·`/dashboard/properties/[id]/edit` 포함, 에러 없음.

- [ ] **Step 5: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 등록/수정 폼(③): `/dashboard/properties/new`·`/[id]/edit` — 필드 단일소스를 섹션(기본/면적/금액/건물/고객/관련부동산/일정/메모)으로 그룹화한 폼(템플릿 `Field`/`Input`/`NativeSelect`/`Checkbox`). 저장 후 목록으로 이동.
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/property-form.tsx" "src/app/(dashboard)/dashboard/properties/new" "src/app/(dashboard)/dashboard/properties/[id]" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 매물 등록/수정 폼(섹션 그룹)

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 엑셀 입력 (헤더 매핑 + 형식 검증)

**Files:**
- Create: `src/lib/properties/header-match.ts`
- Test: `src/lib/properties/header-match.test.ts`
- Create: `src/lib/properties/excel-import.ts`
- Test: `src/lib/properties/excel-import.test.ts`
- Create: `src/lib/properties/excel-read.ts`
- Test: `src/lib/properties/excel-read.test.ts`
- Modify: `src/app/(dashboard)/dashboard/properties/actions.ts` (analyzeWorkbook 추가)
- Create: `src/app/(dashboard)/dashboard/properties/excel-import-dialog.tsx`

**Interfaces:**
- Consumes: `PROPERTY_FIELDS`, `FIELD_BY_KEY`, `coerceField`(fields), `importProperties`(actions).
- Produces:
  - `header-match.ts`: `type HeaderMatch = { header: string; index: number; fieldKey: string | null }`, `matchHeaders(headers: string[]): HeaderMatch[]`
  - `excel-import.ts`: `type ParsedSheet = { headers: string[]; matches: HeaderMatch[]; rows: (string | null)[][] }`, `buildImportRows(parsed, mapping: Record<number, string|null>): Record<string, unknown>[]`, `countIssues(parsed, mapping): number`
  - `excel-read.ts`: `parseWorkbook(buf: ArrayBuffer): Promise<ParsedSheet>`
  - `actions.ts`: `analyzeWorkbook(formData: FormData): Promise<ParsedSheet>`
  - `excel-import-dialog.tsx`: `ExcelImportDialog()`

- [ ] **Step 1: `header-match.ts` 작성**

Create `src/lib/properties/header-match.ts`:

```ts
// 엑셀 시트 헤더 → Property fieldKey 자동 매칭. 공백·괄호·슬래시 무시.
import { PROPERTY_FIELDS } from "./fields";

const norm = (s: string) => s.replace(/[\s()（）[\]/]/g, "").toLowerCase();

// 라벨 외 별칭(현장 표기 변형)
const ALIASES: Record<string, string> = {
  종류: "realEstateType", 거래: "tradeType",
  전용: "areaExclusive", 공급: "areaSupply", 대지: "landArea", 건축: "buildingArea", 연면적: "area",
  매매가: "dealAmount", 보증금: "price", 세대수: "totalHouseholds", 주차: "parkingCount", 난방: "heating",
  잔금: "balanceDate",
};

const LOOKUP: Record<string, string> = {};
for (const f of PROPERTY_FIELDS) LOOKUP[norm(f.label)] = f.key;
for (const [alias, key] of Object.entries(ALIASES)) LOOKUP[norm(alias)] = key;

export type HeaderMatch = { header: string; index: number; fieldKey: string | null };

export function matchHeaders(headers: string[]): HeaderMatch[] {
  return headers.map((h, index) => ({ header: h, index, fieldKey: LOOKUP[norm(h ?? "")] ?? null }));
}
```

- [ ] **Step 2: `header-match.test.ts` 작성·실행**

Create `src/lib/properties/header-match.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { matchHeaders } from "./header-match";

describe("matchHeaders", () => {
  it("라벨·별칭 매칭", () => {
    const m = matchHeaders(["단지명", "매매가", "전용", "없는헤더"]);
    expect(m[0].fieldKey).toBe("complexName");
    expect(m[1].fieldKey).toBe("dealAmount");
    expect(m[2].fieldKey).toBe("areaExclusive");
    expect(m[3].fieldKey).toBeNull();
  });
  it("공백 무시", () => {
    expect(matchHeaders(["주차가능대수"])[0].fieldKey).toBe("parkingCount");
    expect(matchHeaders(["사용 승인일"])[0].fieldKey).toBe("approvalDate");
  });
  it("index 보존", () => {
    expect(matchHeaders(["a", "단지명"])[1].index).toBe(1);
  });
});
```

Run: `pnpm exec vitest run src/lib/properties/header-match.test.ts`
Expected: PASS.

- [ ] **Step 3: `excel-import.ts` 작성(클라/서버 공용, exceljs 미포함)**

Create `src/lib/properties/excel-import.ts`:

```ts
// 매핑 확정 → import 행 빌드 / 형식 불일치 카운트. exceljs 미포함(클라 번들 안전).
import { coerceField, FIELD_BY_KEY } from "./fields";
import type { HeaderMatch } from "./header-match";

export type ParsedSheet = { headers: string[]; matches: HeaderMatch[]; rows: (string | null)[][] };

function active(mapping: Record<number, string | null>) {
  return Object.entries(mapping)
    .filter(([, k]) => k)
    .map(([i, k]) => ({ index: Number(i), key: k as string }));
}

export function buildImportRows(parsed: ParsedSheet, mapping: Record<number, string | null>): Record<string, unknown>[] {
  const cols = active(mapping);
  return parsed.rows.map((cells) => {
    const obj: Record<string, unknown> = {};
    for (const { index, key } of cols) {
      const f = FIELD_BY_KEY[key];
      if (!f) continue;
      obj[key] = coerceField(f.type, cells[index]);
    }
    return obj;
  });
}

// 숫자형(number/money/area)인데 비어있지 않은 값이 파싱 실패 → 형식 불일치 셀 수
export function countIssues(parsed: ParsedSheet, mapping: Record<number, string | null>): number {
  const cols = active(mapping);
  let n = 0;
  for (const cells of parsed.rows) {
    for (const { index, key } of cols) {
      const f = FIELD_BY_KEY[key];
      if (!f) continue;
      const orig = cells[index];
      if (orig != null && (f.type === "number" || f.type === "money" || f.type === "area") && coerceField(f.type, orig) == null) n++;
    }
  }
  return n;
}
```

- [ ] **Step 4: `excel-import.test.ts` 작성·실행**

Create `src/lib/properties/excel-import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildImportRows, countIssues, type ParsedSheet } from "./excel-import";
import { matchHeaders } from "./header-match";

const sheet: ParsedSheet = {
  headers: ["단지명", "매매가", "전용"],
  matches: matchHeaders(["단지명", "매매가", "전용"]),
  rows: [
    ["행복아파트", "350,000,000원", "84.21"],
    ["풍경마을", "오백만", "59.9"],
  ],
};
const mapping = { 0: "complexName", 1: "dealAmount", 2: "areaExclusive" };

describe("buildImportRows", () => {
  it("매핑·정규화 적용", () => {
    const rows = buildImportRows(sheet, mapping);
    expect(rows[0]).toEqual({ complexName: "행복아파트", dealAmount: 350000000, areaExclusive: 84.21 });
  });
  it("파싱 실패 숫자 셀 → null", () => {
    expect(buildImportRows(sheet, mapping)[1].dealAmount).toBeNull();
  });
  it("매핑 null 컬럼은 제외", () => {
    const rows = buildImportRows(sheet, { 0: "complexName", 1: null, 2: "areaExclusive" });
    expect(rows[0]).toEqual({ complexName: "행복아파트", areaExclusive: 84.21 });
  });
});

describe("countIssues", () => {
  it("숫자형 파싱 실패 카운트", () => {
    expect(countIssues(sheet, mapping)).toBe(1); // "오백만"
  });
});
```

Run: `pnpm exec vitest run src/lib/properties/excel-import.test.ts`
Expected: PASS.

- [ ] **Step 5: `excel-read.ts` 작성(서버 전용)**

Create `src/lib/properties/excel-read.ts`:

```ts
// 업로드 엑셀(첫 시트) → ParsedSheet. exceljs 사용(서버 전용).
import ExcelJS from "exceljs";

import type { ParsedSheet } from "./excel-import";
import { matchHeaders } from "./header-match";

function cellToString(v: ExcelJS.CellValue): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown };
    const s = o.text ?? (o.result != null ? String(o.result) : "");
    return s.trim() || null;
  }
  const s = String(v).trim();
  return s || null;
}

export async function parseWorkbook(buf: ArrayBuffer): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], matches: [], rows: [] };

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => { headers[col - 1] = (cellToString(cell.value) ?? "").trim(); });
  const width = headers.length;
  const matches = matchHeaders(headers);

  const rows: (string | null)[][] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells: (string | null)[] = [];
    let empty = true;
    for (let c = 1; c <= width; c++) {
      const s = cellToString(row.getCell(c).value);
      cells[c - 1] = s;
      if (s != null) empty = false;
    }
    if (!empty) rows.push(cells);
  }
  return { headers, matches, rows };
}
```

- [ ] **Step 6: `excel-read.test.ts` 작성·실행(exceljs 라운드트립)**

Create `src/lib/properties/excel-read.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

import { parseWorkbook } from "./excel-read";

async function makeBuffer(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("매물");
  ws.addRow(["단지명", "매매가", "없는헤더"]);
  ws.addRow(["행복아파트", 350000000, "x"]);
  ws.addRow([null, null, null]); // 빈 행 — 무시되어야
  ws.addRow(["풍경마을", 250000000, "y"]);
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

describe("parseWorkbook", () => {
  it("헤더 매칭 + 빈 행 제외", async () => {
    const parsed = await parseWorkbook(await makeBuffer());
    expect(parsed.headers).toEqual(["단지명", "매매가", "없는헤더"]);
    expect(parsed.matches[0].fieldKey).toBe("complexName");
    expect(parsed.matches[1].fieldKey).toBe("dealAmount");
    expect(parsed.matches[2].fieldKey).toBeNull();
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0][0]).toBe("행복아파트");
    expect(parsed.rows[1][0]).toBe("풍경마을");
  });
});
```

Run: `pnpm exec vitest run src/lib/properties/excel-read.test.ts`
Expected: PASS.

- [ ] **Step 7: `analyzeWorkbook` 서버액션 추가**

`src/app/(dashboard)/dashboard/properties/actions.ts` 상단 import에 추가:

```ts
import { parseWorkbook } from "@/lib/properties/excel-read";
import type { ParsedSheet } from "@/lib/properties/excel-import";
```

파일 끝에 추가:

```ts
export async function analyzeWorkbook(formData: FormData): Promise<ParsedSheet> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("엑셀 파일을 선택하세요");
  const buf = await file.arrayBuffer();
  return parseWorkbook(buf);
}
```

- [ ] **Step 8: `excel-import-dialog.tsx` 작성**

Create `src/app/(dashboard)/dashboard/properties/excel-import-dialog.tsx`:

```tsx
"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PROPERTY_FIELDS } from "@/lib/properties/fields"
import { buildImportRows, countIssues, type ParsedSheet } from "@/lib/properties/excel-import"
import { analyzeWorkbook, importProperties } from "./actions"

export function ExcelImportDialog() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<Record<number, string | null>>({})
  const [busy, setBusy] = useState(false)

  function reset() { setParsed(null); setMapping({}); if (fileRef.current) fileRef.current.value = "" }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("file", file)
      const result = await analyzeWorkbook(fd)
      if (result.rows.length === 0) { toast.error("데이터 행이 없습니다"); reset(); return }
      setParsed(result)
      setMapping(Object.fromEntries(result.matches.map((m) => [m.index, m.fieldKey])))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "엑셀을 읽지 못했습니다")
    } finally { setBusy(false) }
  }

  const issues = parsed ? countIssues(parsed, mapping) : 0
  const mappedCount = Object.values(mapping).filter(Boolean).length

  async function confirm() {
    if (!parsed) return
    setBusy(true)
    try {
      const rows = buildImportRows(parsed, mapping)
      const n = await importProperties(rows)
      toast.success(`매물 ${n}건을 추가했습니다`)
      setOpen(false); reset(); router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가 실패")
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Upload className="size-3.5" />엑셀 입력
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>엑셀 입력</DialogTitle>
          <DialogDescription>
            {parsed ? "각 열을 매물 항목에 연결하세요. 자동으로 맞춘 항목은 바꿀 수 있습니다." : "첫 시트의 1행을 헤더로 읽어 항목을 자동 연결합니다."}
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} disabled={busy} className="text-sm" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>엑셀 열</TableHead><TableHead>미리보기</TableHead><TableHead>매물 항목</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.headers.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{h || `(열 ${i + 1})`}</TableCell>
                      <TableCell className="text-muted-foreground">{parsed.rows[0]?.[i] ?? "-"}</TableCell>
                      <TableCell>
                        <NativeSelect className="w-full" value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value || null }))}>
                          <NativeSelectOption value="">무시</NativeSelectOption>
                          {PROPERTY_FIELDS.map((f) => <NativeSelectOption key={f.key} value={f.key}>{f.label}</NativeSelectOption>)}
                        </NativeSelect>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              {parsed.rows.length}행 · 연결된 항목 {mappedCount}개
              {issues > 0 && <span className="text-destructive"> · 숫자 형식이 아닌 {issues}개 셀은 빈 값으로 들어갑니다</span>}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false) }}>취소</Button>
          <Button onClick={confirm} disabled={busy || !parsed || mappedCount === 0}>{parsed ? `${parsed.rows.length}건 추가` : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 9: property-list에 ExcelImportDialog 연결**

`src/app/(dashboard)/dashboard/properties/property-list.tsx`:
1. import 추가(`./actions` import 줄 다음):

```tsx
import { ExcelImportDialog } from "./excel-import-dialog"
```

2. `CardAction` 안의 `{/* Task 4에서 ExcelImportDialog가 여기에 추가됨 */}` 주석을 다음으로 교체:

```tsx
          <ExcelImportDialog />
```

- [ ] **Step 10: 타입·린트·테스트·빌드 검증**

Run: `pnpm exec vitest run src/lib/properties/`
Expected: fields·header-match·excel-import·excel-read 전부 PASS.
Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음.
Run: `pnpm exec eslint src/lib/properties "src/app/(dashboard)/dashboard/properties"`
Expected: 에러 없음.
Run: `pnpm exec next build`
Expected: 에러 없음. (`excel-read`의 exceljs가 클라 번들에 들어가지 않는지 — dialog는 `excel-import`만 import하므로 OK.)

- [ ] **Step 11: 문서 갱신**

`README.md` §"현재 반영 상태"에 추가:

```md
- 매물 엑셀 입력(④): "엑셀 입력" 다이얼로그 — 업로드 시 첫 시트 헤더를 매물 항목에 **자동 매칭**(라벨·별칭 사전, 공백/괄호 무시), 매핑 확인 표에서 열↔항목 수동 조정 + 미리보기, 숫자 형식 불일치 셀 경고 후 일괄 등록(출처=엑셀). 읽기 exceljs(서버), 매칭/정규화는 클라·서버 공용 순수 모듈로 분리. 단위 테스트(매칭·정규화·라운드트립 파싱).
```

`docs/PROJECT_GUIDE.md` §"현재 참고 상태"에 같은 한 줄 추가.

- [ ] **Step 12: Commit**

```bash
git add src/lib/properties "src/app/(dashboard)/dashboard/properties/excel-import-dialog.tsx" "src/app/(dashboard)/dashboard/properties/actions.ts" "src/app/(dashboard)/dashboard/properties/property-list.tsx" README.md docs/PROJECT_GUIDE.md
git commit -m "$(cat <<'EOF'
feat(property): 매물 엑셀 입력(헤더 자동매칭·매핑 확인·형식 검증)

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 빌드 후 라이브 검증(권장)

prod 재빌드로 실제 동작 확인(터널 운영 모드): `bash scripts/run-prod.sh` → `/dashboard/properties`에서 등록·인라인편집·상태전환·관심토글·엑셀 입력을 한 바퀴. (네이버처럼 anti-bot 의존은 없으므로 로컬 검증으로 충분하나, 터널 동작은 prod 모드에서만.)

## Self-Review (계획 작성자 체크 완료)

- **스펙 커버리지:** §2 모델(Task1)·§3 상태 뷰 목록(Task2)·§4 폼/인라인/삭제/상태(Task2·3)·§5 엑셀 입력(Task4)·§6 액션/컴포넌트(전 Task) 매핑됨. §1 "엑셀 출력"은 비범위로 명시 보류.
- **타입 일관성:** `PropertyRow`/`PropertyView`/`ParsedSheet`/`HeaderMatch`/`PropertyField`/`coerceField` 시그니처가 정의 Task와 소비 Task에서 동일. `EditCell`/`SelectCell` 시그니처는 기존 favorites와 동일하게 추출.
- **플레이스홀더:** 없음(모든 스텝 실제 코드). 단, Task2의 `ExcelImportDialog`는 Task4 산출물 — 순서 의존을 Step에 명시.
- **§5 준수:** 각 Task가 문서 갱신 → commit(끝줄 문서 갱신 라인 포함)로 종료. push 없음.
