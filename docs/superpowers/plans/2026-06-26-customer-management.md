# 고객관리(Customer CRM) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매물과 별개로 고객을 등록·수정·삭제하는 CRM. 기본 정보(이름·전화)는 매물에서 추출하고 나머지는 관리자가 입력하며, 매물 없이도 등록 가능.

**Architecture:** 신규 `Customer` 모델(userId 스코프, `types String[]`) + 순수 유형검증(`customers/types.ts`) + 서버 CRUD 액션(`customers/actions.ts`) + 목록/폼 클라 뷰. 매물 상세의 "고객으로 등록" 버튼이 신규 폼을 이름·전화·출처매물로 프리필.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6/PostgreSQL(String[]), Tailwind v4, Base UI, vitest, pnpm. 설계: [docs/superpowers/specs/2026-06-26-customer-management-design.md](../specs/2026-06-26-customer-management-design.md).

## Global Constraints

- 응답·UI 카피·주석 **한국어**, 식별자 영문. 템플릿/기존 패턴 우선, 임의 px/hex 금지.
- DB 변경은 **비파괴 마이그레이션**. `db` 싱글톤(`@/lib/db`). 보호 라우트·액션은 `requireUser()`(getCurrentUser 기반) userId 스코프(IDOR 차단).
- 고객유형: 매도인·매수인·임대인·임차인은 다중, **단순방문은 단독(배타)**, 기본 `["단순방문"]`. 검증은 `normalizeCustomerTypes` 단일 정의.
- 검증: 순수 `pnpm exec vitest run <file>`, 타입 `pnpm exec tsc --noEmit`, 린트 `pnpm exec eslint <files>`, 빌드 `pnpm build`("use server" async-export·RSC 직렬화는 build/런타임만 잡음).
- ⛔ 서브에이전트: `git restore/checkout/clean/stash/reset` 금지, `git add`는 명시 파일만. `docs/project_structure.md`·`매물_샘플_*.xlsx`·`.env`·README/PROJECT_GUIDE 손대지 말 것(README/GUIDE는 컨트롤러가 마감 일괄). **CLAUDE.md §5에 따라 README/GUIDE를 per-task로 수정하지 말 것.**

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `prisma/schema.prisma` + 마이그레이션 | `Customer` 모델 + `Property.customers` 역참조 | 1 |
| `src/lib/nav.ts` | "고객관리" 메뉴 | 1 |
| `src/lib/customers/types.ts` (+test) | `CUSTOMER_TYPES`·`GENDERS`·`normalizeCustomerTypes` | 2 |
| `.../dashboard/customers/actions.ts` | CRUD + 매물추출 드래프트 | 3 |
| `.../dashboard/customers/page.tsx`·`customer-list.tsx` | 목록·검색·유형필터·삭제 | 4 |
| `.../dashboard/customers/customer-form.tsx`·`new/page.tsx`·`[id]/page.tsx` | 신규/수정 폼 | 5 |
| 매물 상세(`properties/[id]/...`) | "고객으로 등록" 버튼 | 6 |

---

## Task 1: 스키마·역참조·메뉴

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/nav.ts`

**Interfaces:**
- Produces: `Customer` 모델(`db.customer`), `Property.customers` 관계, nav "고객관리" 항목.

- [ ] **Step 1: schema에 Customer 추가**

`prisma/schema.prisma` 끝에 추가:
```prisma
model Customer {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  types      String[]  @default(["단순방문"]) // 매도인·매수인·임대인·임차인(다중) | 단순방문(단독)
  name       String
  phone      String?
  address    String?
  email      String?
  gender     String?   // 남 | 여 | 미지정
  memo       String?
  propertyId String?
  property   Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId])
}
```

- [ ] **Step 2: Property에 역참조 추가**

`model Property { ... }` 안, `contractChecklist Json?` 줄 **다음**에 추가(컬럼 아님 — 가상 관계):
```prisma
  customers Customer[]
```
(`User` 모델에도 `Customer` 역참조가 필요하면 Prisma `migrate dev`가 에러로 알려줌 — 그때 `User` 모델에 `customers Customer[]` 추가. 우선 Property만 추가하고 마이그레이션 시 확인.)

- [ ] **Step 3: 마이그레이션**

Run: `pnpm exec prisma migrate dev --name add_customer`
Expected: `CREATE TABLE "Customer"` + FK·인덱스만(비파괴), prisma generate.
만약 `User` 관계 누락 에러가 나면 `model User`에 `customers Customer[]` 한 줄 추가 후 재실행.

- [ ] **Step 4: nav 메뉴 추가**

`src/lib/nav.ts`의 `navGroups[0].items`(매물 관리 그룹)에서 "실거래가" 줄 다음에 추가(`Users`는 이미 import됨):
```ts
      { title: "고객관리", href: "/dashboard/customers", icon: Users },
```

- [ ] **Step 5: 검증·커밋**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음.
```bash
git add prisma/schema.prisma prisma/migrations src/lib/nav.ts
git commit -m "feat(customer): Customer 모델·역참조·메뉴 추가"
```

---

## Task 2: 유형 검증 (순수, TDD)

**Files:**
- Create: `src/lib/customers/types.ts`, `src/lib/customers/types.test.ts`

**Interfaces:**
- Produces:
  - `CUSTOMER_TYPES: readonly ["매도인","매수인","임대인","임차인","단순방문"]`
  - `PARTY_TYPES: string[]` (= 매도인·매수인·임대인·임차인)
  - `GENDERS: readonly ["남","여","미지정"]`
  - `normalizeCustomerTypes(input: string[]): string[]`

- [ ] **Step 1: 실패 테스트**

`src/lib/customers/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeCustomerTypes, CUSTOMER_TYPES } from "./types";

describe("normalizeCustomerTypes", () => {
  it("단순방문은 배타 — 거래 당사자가 있으면 단순방문 제거", () => {
    expect(normalizeCustomerTypes(["단순방문", "매도인"])).toEqual(["매도인"]);
  });
  it("거래 당사자 다중 유지·정규 순서·중복 제거", () => {
    expect(normalizeCustomerTypes(["매수인", "매도인", "매수인"])).toEqual(["매도인", "매수인"]);
  });
  it("빈 입력·무효값만 → 기본 단순방문", () => {
    expect(normalizeCustomerTypes([])).toEqual(["단순방문"]);
    expect(normalizeCustomerTypes(["xyz"])).toEqual(["단순방문"]);
  });
  it("단순방문 단독 유지", () => {
    expect(normalizeCustomerTypes(["단순방문"])).toEqual(["단순방문"]);
  });
  it("CUSTOMER_TYPES 5종", () => {
    expect(CUSTOMER_TYPES).toHaveLength(5);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/customers/types.test.ts`
Expected: FAIL(import 해결 실패).

- [ ] **Step 3: types.ts**

```ts
// 고객유형·성별 단일 정의 + 유형 정규화.
export const CUSTOMER_TYPES = ["매도인", "매수인", "임대인", "임차인", "단순방문"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export const PARTY_TYPES: CustomerType[] = ["매도인", "매수인", "임대인", "임차인"];
export const GENDERS = ["남", "여", "미지정"] as const;

// 거래 당사자(다중)가 있으면 그것만(정규 순서·중복 제거), 없으면 기본 단순방문.
export function normalizeCustomerTypes(input: string[]): string[] {
  const valid = new Set(input.filter((t): t is CustomerType => (CUSTOMER_TYPES as readonly string[]).includes(t)));
  const parties = PARTY_TYPES.filter((t) => valid.has(t));
  return parties.length ? parties : ["단순방문"];
}
```

- [ ] **Step 4: 통과 확인·커밋**

Run: `pnpm exec vitest run src/lib/customers/types.test.ts`
Expected: PASS.
```bash
git add src/lib/customers/types.ts src/lib/customers/types.test.ts
git commit -m "feat(customer): 고객유형 정규화(단순방문 배타)+테스트"
```

---

## Task 3: 서버 액션 (CRUD + 매물추출)

**Files:**
- Create: `src/app/(dashboard)/dashboard/customers/actions.ts`

**Interfaces:**
- Consumes: `normalizeCustomerTypes`/`GENDERS` (T2), `db`, `getCurrentUser`.
- Produces:
  - `type CustomerInput = { name: string; phone?: string|null; address?: string|null; email?: string|null; gender?: string|null; memo?: string|null; types?: string[]; propertyId?: string|null }`
  - `type CustomerRow = { id: string; types: string[]; name: string; phone: string|null; address: string|null; email: string|null; gender: string|null; memo: string|null; propertyId: string|null; propertyName: string|null; updatedAt: string }`
  - `listCustomers(opts?: { q?: string; type?: string }): Promise<CustomerRow[]>`
  - `getCustomer(id: string): Promise<CustomerRow | null>`
  - `createCustomer(input: CustomerInput): Promise<string>`
  - `updateCustomer(id: string, input: CustomerInput): Promise<void>`
  - `deleteCustomer(id: string): Promise<void>`
  - `customerDraftFromProperty(propertyId: string): Promise<{ name: string; phone: string; propertyId: string; propertyLabel: string } | null>`

- [ ] **Step 1: actions.ts**

```ts
"use server";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { normalizeCustomerTypes, GENDERS } from "@/lib/customers/types";

export type CustomerInput = {
  name: string; phone?: string | null; address?: string | null; email?: string | null;
  gender?: string | null; memo?: string | null; types?: string[]; propertyId?: string | null;
};
export type CustomerRow = {
  id: string; types: string[]; name: string; phone: string | null; address: string | null;
  email: string | null; gender: string | null; memo: string | null;
  propertyId: string | null; propertyName: string | null; updatedAt: string;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다");
  return user;
}

const cleanGender = (g?: string | null): string | null =>
  g && (GENDERS as readonly string[]).includes(g) ? g : null;

function toData(input: CustomerInput) {
  return {
    name: (input.name ?? "").trim(),
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    email: input.email?.trim() || null,
    gender: cleanGender(input.gender),
    memo: input.memo?.trim() || null,
    types: normalizeCustomerTypes(input.types ?? []),
  };
}

async function ownedPropertyId(userId: string, propertyId?: string | null): Promise<string | null> {
  if (!propertyId) return null;
  const p = await db.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } });
  return p ? p.id : null;
}

const toRow = (r: {
  id: string; types: string[]; name: string; phone: string | null; address: string | null;
  email: string | null; gender: string | null; memo: string | null; propertyId: string | null;
  updatedAt: Date; property?: { name: string | null; complexName: string | null } | null;
}): CustomerRow => ({
  id: r.id, types: r.types, name: r.name, phone: r.phone, address: r.address, email: r.email,
  gender: r.gender, memo: r.memo, propertyId: r.propertyId,
  propertyName: r.property?.name ?? r.property?.complexName ?? null,
  updatedAt: r.updatedAt.toISOString().slice(0, 10),
});

export async function listCustomers(opts?: { q?: string; type?: string }): Promise<CustomerRow[]> {
  const user = await requireUser();
  const q = opts?.q?.trim();
  const rows = await db.customer.findMany({
    where: {
      userId: user.id,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
      ...(opts?.type ? { types: { has: opts.type } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { property: { select: { name: true, complexName: true } } },
  });
  return rows.map(toRow);
}

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const user = await requireUser();
  const r = await db.customer.findFirst({
    where: { id, userId: user.id },
    include: { property: { select: { name: true, complexName: true } } },
  });
  return r ? toRow(r) : null;
}

export async function createCustomer(input: CustomerInput): Promise<string> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.name) throw new Error("이름은 필수입니다");
  const propertyId = await ownedPropertyId(user.id, input.propertyId);
  const c = await db.customer.create({ data: { ...data, userId: user.id, propertyId } });
  revalidatePath("/dashboard/customers");
  return c.id;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const user = await requireUser();
  const data = toData(input);
  if (!data.name) throw new Error("이름은 필수입니다");
  const propertyId = await ownedPropertyId(user.id, input.propertyId);
  await db.customer.updateMany({ where: { id, userId: user.id }, data: { ...data, propertyId } });
  revalidatePath("/dashboard/customers");
}

export async function deleteCustomer(id: string): Promise<void> {
  const user = await requireUser();
  await db.customer.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/customers");
}

// 매물에서 추출: 매물(userId 스코프)의 고객명·전화로 신규 폼 초기값.
export async function customerDraftFromProperty(
  propertyId: string,
): Promise<{ name: string; phone: string; propertyId: string; propertyLabel: string } | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({
    where: { id: propertyId, userId: user.id },
    select: { id: true, name: true, complexName: true, customerName: true, customerPhone: true },
  });
  if (!p) return null;
  return { name: p.customerName ?? "", phone: p.customerPhone ?? "", propertyId: p.id, propertyLabel: p.name ?? p.complexName ?? "매물" };
}
```

- [ ] **Step 2: 정적검증·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers/actions.ts"`
Expected: 0/0. (`db.customer`·`types: { has }`·`mode: "insensitive"`가 generate된 클라이언트와 일치 — 불일치 시 tsc가 잡음.)
```bash
git add "src/app/(dashboard)/dashboard/customers/actions.ts"
git commit -m "feat(customer): CRUD 서버액션·매물추출 드래프트"
```

---

## Task 4: 목록 페이지·검색·유형필터·삭제

**Files:**
- Create: `src/app/(dashboard)/dashboard/customers/page.tsx`, `src/app/(dashboard)/dashboard/customers/customer-list.tsx`

**Interfaces:**
- Consumes: `listCustomers`/`deleteCustomer` (T3), `CUSTOMER_TYPES` (T2), `getCurrentUser`.

- [ ] **Step 1: 기존 패턴 확인**

Read: `src/app/(dashboard)/dashboard/properties/page.tsx`·`property-list.tsx`(목록·툴바·삭제 패턴), `src/components/ui/`의 `table`·`button`·`input`·`badge`·`select`·`empty` 사용법.

- [ ] **Step 2: page.tsx (서버, 보호)**

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCustomers } from "./actions";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const rows = await listCustomers();
  return <CustomerList initial={rows} />;
}
```

- [ ] **Step 3: customer-list.tsx (클라)**

`property-list.tsx` 패턴을 따른다. 요구사항:
- props `{ initial: CustomerRow[] }`. 상태 `rows`(initial), `q`(검색), `typeFilter`(""=전체 또는 CUSTOMER_TYPES 중 하나).
- 클라 인메모리 필터: `q`는 이름/전화 contains(소문자 비교), `typeFilter`는 `r.types.includes(typeFilter)`.
- 상단 툴바: 검색 Input, 유형 Select(전체 + CUSTOMER_TYPES), 우측 "새 고객" 링크(`buttonVariants` + `Link href="/dashboard/customers/new"`).
- Table 컬럼: 이름·전화·유형(Badge 여러 개)·주소·출처매물(propertyName)·수정일, 행 우측에 "수정"(`Link href={\`/dashboard/customers/${r.id}\`}`)·"삭제"(Button) .
- 삭제: confirm 후 `await deleteCustomer(r.id)` → `setRows(rows.filter(x => x.id !== r.id))`.
- 빈 목록: `Empty`로 안내.
- Base UI primitive만, 임의 px/hex 금지. UI 카피 한국어.

(전체 JSX는 property-list 구조를 따른다.)

- [ ] **Step 4: 정적검증·빌드·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "src/app/(dashboard)/dashboard/customers/page.tsx" "src/app/(dashboard)/dashboard/customers/customer-list.tsx"
git commit -m "feat(customer): 고객 목록·검색·유형필터·삭제"
```

---

## Task 5: 신규/수정 폼

**Files:**
- Create: `src/app/(dashboard)/dashboard/customers/customer-form.tsx`, `src/app/(dashboard)/dashboard/customers/new/page.tsx`, `src/app/(dashboard)/dashboard/customers/[id]/page.tsx`

**Interfaces:**
- Consumes: `createCustomer`/`updateCustomer`/`getCustomer`/`customerDraftFromProperty` (T3), `CUSTOMER_TYPES`/`PARTY_TYPES`/`GENDERS` (T2), `CustomerRow` 타입.

- [ ] **Step 1: 기존 폼 패턴 확인**

Read: `src/app/(dashboard)/dashboard/properties/property-form.tsx`(라벨·간격·전화 포맷·저장 흐름), `src/components/ui/`의 `input`·`label`·`textarea`·`button`·`badge`·`radio-group` 사용법.

- [ ] **Step 2: customer-form.tsx (클라)**

요구사항(필드 7 + 유형):
- props `{ customer?: CustomerRow; draft?: { name: string; phone: string; propertyId: string; propertyLabel: string } }`. 둘 다 없으면 신규 빈 폼.
- 상태 초기값: customer 있으면 그 값, 없으면 draft(name/phone/propertyId) 적용, 유형 기본 `["단순방문"]`.
- 필드: 이름(Input, 필수), 전화번호(Input, tel — property-form의 전화 포맷 헬퍼와 동일하게 입력 시 하이픈 포맷), 주소(Input), 이메일(Input type=email), 성별(RadioGroup 남/여/미지정), 메모(Textarea).
- **유형 체크박스(배타 규칙):** PARTY_TYPES 4개 + 단순방문. 클릭 핸들러:
  - 단순방문 클릭 → `setTypes(["단순방문"])`.
  - 당사자 클릭 → 단순방문 제거 후 토글: `const next = types.filter(t => t !== "단순방문"); setTypes(next.includes(t) ? next.filter(x=>x!==t) : [...next, t])`. (모두 해제되면 저장 시 서버가 단순방문으로 보정)
  - 표시: 선택된 유형 강조(Badge/Toggle 스타일).
- draft가 있으면 상단에 "출처 매물: {propertyLabel}" 표기, `propertyId`는 hidden으로 저장에 포함.
- 저장: 신규면 `createCustomer({...})`, 수정이면 `updateCustomer(customer.id, {...})` → `router.push("/dashboard/customers")` + `router.refresh()`. 에러는 인라인 표시. 이름 빈 값이면 제출 막기.
- 취소: `router.back()` 또는 목록 링크.

- [ ] **Step 3: new/page.tsx (서버)**

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { customerDraftFromProperty } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { propertyId } = await searchParams;
  const draft = propertyId ? await customerDraftFromProperty(propertyId) : null;
  return <CustomerForm draft={draft ?? undefined} />;
}
```

- [ ] **Step 4: [id]/page.tsx (서버)**

```tsx
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return <CustomerForm customer={customer} />;
}
```

- [ ] **Step 5: 정적검증·빌드·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/customers" && pnpm build`
Expected: 0/0, 빌드 성공(서버→클라 폼에 함수/비직렬화 값 전달 없음 — RSC 안전).
```bash
git add "src/app/(dashboard)/dashboard/customers/customer-form.tsx" "src/app/(dashboard)/dashboard/customers/new/page.tsx" "src/app/(dashboard)/dashboard/customers/[id]/page.tsx"
git commit -m "feat(customer): 신규/수정 폼(유형 배타·성별·프리필)"
```

---

## Task 6: 매물에서 "고객으로 등록"

**Files:**
- Modify: 매물 상세/편집 화면(`src/app/(dashboard)/dashboard/properties/[id]/...` 또는 `property-form.tsx`)

**Interfaces:**
- Consumes: 신규 폼 프리필 라우트 `/dashboard/customers/new?propertyId=<id>` (T5).

- [ ] **Step 1: 버튼 위치 확인**

Read: `src/app/(dashboard)/dashboard/properties/[id]/page.tsx`와 거기서 렌더하는 컴포넌트(매물 상세/편집). 고객명·전화가 보이는 영역 인근, 또는 상단 액션 영역에 버튼을 둔다.

- [ ] **Step 2: 버튼 추가**

해당 매물의 `id`를 가진 곳에 링크 버튼 추가(`buttonVariants`/`Button asChild` + `Link`, 기존 버튼 스타일 따름):
```tsx
import Link from "next/link";
// ...
<Link href={`/dashboard/customers/new?propertyId=${propertyId}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
  고객으로 등록
</Link>
```
(`propertyId`는 그 화면이 이미 가진 매물 id 변수명으로 교체. `buttonVariants`는 `@/components/ui/button`.)

- [ ] **Step 3: 정적검증·빌드·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "<수정한 파일>" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "<수정한 파일>"
git commit -m "feat(customer): 매물 상세에 고객으로 등록 버튼"
```

---

## 마감 (전체 통합 후)

- [ ] `pnpm exec vitest run`(전체 그린)·`pnpm build` 확인.
- [ ] README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태에 기능 요약 1줄(CLAUDE.md §5).
- [ ] ⚠️ 머지 전 라이브 1회: 신규(빈/매물추출)·수정·삭제·유형 배타·검색/필터 렌더 확인.
- [ ] spec·plan 포함 commit, push는 사용자 요청 시.
