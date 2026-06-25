# 계약 진행 워크플로 + 서류 체크리스트 + 양식 인쇄 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매물 상태를 `진행→계약진행→계약완료`로 확장하고, 계약진행 시 (매물유형×거래유형) 기반 서류 체크리스트·핵심 계약필드 입력·양식 인쇄를 제공하며, 충족 시 사용자가 계약완료로 전환한다.

**Architecture:** 체크리스트·양식 항목은 순수 모듈(`contract-checklist.ts`/`contract-forms.ts`)에서 byCross 합성으로 동적 생성(저장 안 함). 체크 상태만 `Property.contractChecklist`(JSON)에 저장. 서버 액션이 진행률·완료 게이트를 재검증. 전용 계약 페이지 + 브라우저 인쇄 페이지로 UI 구성.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6/PostgreSQL, Tailwind v4, Base UI(`@base-ui/react`), vitest, pnpm. 설계 출처: [docs/superpowers/specs/2026-06-25-contract-workflow-design.md](../specs/2026-06-25-contract-workflow-design.md).

## Global Constraints

- 응답·UI 카피·주석 **한국어**. 코드 식별자는 영문.
- 템플릿 우선: `src/components/ui/` 프리미티브 재사용. 임의 px/hex 금지, Tailwind 토큰 사용.
- 단일 소스: 상태값(`fields.ts STATUS_OPTIONS`)·체크 항목·양식·매물군 코드(`GROUPS`)는 각 1곳 정의.
- 서버 액션 규약: `"use server"`, `requireUser()`, `where:{userId}` 스코프, `revalidatePath`.
- money 필드는 Prisma `BigInt?`(서버)↔`string`(클라). 신규 `rentPrice`도 money.
- 비공식·실무보조 고지를 계약 페이지 상단·체크리스트·인쇄 양식 3곳에 노출.
- 검증 명령: 단위 `pnpm exec vitest run <file>`, 타입 `pnpm exec tsc --noEmit`, 린트 `pnpm exec eslint <files>`, 앱 `bash scripts/run-prod.sh`(또는 `pnpm dev`).
- 매물유형 코드: A01아파트·A02오피스텔·A04재건축·C02빌라·C01원룸·C03단독다가구·C04전원·D01사무실·D02상가·D03건물·D05상가주택·E02공장창고·E03토지·E04지산. 거래유형: A1매매·B1전세·B2월세·B3단기.

---

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `prisma/schema.prisma` | Property에 `rentPrice`·`contractChecklist` 추가, status 주석 | 1 |
| `src/lib/properties/fields.ts` | STATUS_OPTIONS에 계약진행, 금액군에 rentPrice | 1 |
| `src/lib/properties/contract-checklist.ts` | PARTIES·GROUPS·항목 사전·resolveChecklist·requiredFieldKeys·contractProgress (순수) | 2 |
| `src/lib/properties/contract-checklist.test.ts` | 교차/필드/게이트/진행률 테스트 | 2 |
| `src/lib/properties/contract-forms.ts` | 양식 정의·formsFor·슬롯 매핑 (순수) | 3 |
| `src/lib/properties/contract-forms.test.ts` | applies·매핑 테스트 | 3 |
| `src/app/(dashboard)/dashboard/properties/actions.ts` | `requireUser`·`toRow` export(재사용) | 4 |
| `src/app/(dashboard)/dashboard/properties/contract-actions.ts` | getContractData·toggleChecklistItem·startContract·completeContract | 4 |
| `.../properties/[id]/contract/page.tsx` | 계약 페이지(서버) | 5 |
| `.../properties/[id]/contract/contract-client.tsx` | 체크·필드입력·완료(클라) | 5 |
| `.../properties/[id]/contract/print/[formId]/page.tsx` | 양식 인쇄(스코프) | 6 |
| `.../properties/[id]/contract/print/print-button.tsx` | window.print 버튼(클라) | 6 |
| `.../properties/property-list.tsx` | 일괄 "계약진행 전환", "계약" 링크 컬럼 | 7 |

---

## Task 1: 데이터 모델 (스키마 + 필드 단일소스)

**Files:**
- Modify: `prisma/schema.prisma` (Property 모델)
- Modify: `src/lib/properties/fields.ts:9-12, 33-35`

**Interfaces:**
- Produces: `Property.rentPrice: BigInt?`, `Property.contractChecklist: Json?`. `STATUS_OPTIONS`에 `{value:"계약진행"}`. `PROPERTY_FIELDS`에 `{key:"rentPrice"}`(money).

- [ ] **Step 1: schema에 컬럼 추가**

`prisma/schema.prisma`의 `Property` 모델에서 `status` 줄 주석을 갱신하고, money 필드 근처에 2개 컬럼 추가:
```prisma
  status            String   @default("진행") // 진행 | 계약진행 | 계약완료
  ...
  rentPrice         BigInt?
  contractChecklist Json?
```
(정확한 위치: 기존 `price BigInt?` 다음 줄에 `rentPrice BigInt?`, 모델 끝 `updatedAt` 앞에 `contractChecklist Json?`.)

- [ ] **Step 2: 마이그레이션 생성·적용**

Run: `pnpm exec prisma migrate dev --name add_contract_workflow`
Expected: `Applied migration ...add_contract_workflow`, `prisma generate` 자동 실행. `migrations/`에 `ALTER TABLE "Property" ADD COLUMN "rentPrice" BIGINT, ADD COLUMN "contractChecklist" JSONB;` 류 SQL 생성.

- [ ] **Step 3: fields.ts에 상태·필드 추가**

`STATUS_OPTIONS`(line 9-12)를 교체:
```ts
export const STATUS_OPTIONS: FieldOption[] = [
  { value: "진행", label: "진행" },
  { value: "계약진행", label: "계약진행" },
  { value: "계약완료", label: "계약완료" },
];
```
`PROPERTY_FIELDS`의 금액 그룹(`price` 다음 줄)에 추가:
```ts
  { key: "rentPrice", label: "월세", group: "금액", type: "money" },
```

- [ ] **Step 4: 타입·빌드 검증**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음(rentPrice가 money라 actions.ts의 MONEY Set·toData/toRow가 자동 처리).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/properties/fields.ts
git commit -m "feat(property): 계약진행 상태·월세 필드·체크리스트 컬럼 추가"
```

---

## Task 2: 체크리스트 순수 로직 (TDD)

**Files:**
- Create: `src/lib/properties/contract-checklist.ts`
- Test: `src/lib/properties/contract-checklist.test.ts`

**Interfaces:**
- Produces:
  - `type ChecklistItem = { id: string; label: string; party: string; kind: "서류"|"처리"|"신고"; required: boolean }`
  - `PARTIES: {value:string;label:string}[]`, `PARTY_LABEL: Record<string,string>`
  - `GROUPS: { RESI:string[]; RESI_SINGLE:string[]; COMMERCIAL:string[]; LAND:string[]; FACTORY:string[] }`
  - `resolveChecklist(realEstateType: string, tradeType: string): ChecklistItem[]`
  - `requiredFieldKeys(tradeType: string): string[]`
  - `contractProgress(realEstateType: string, tradeType: string, checked: Record<string,string>, property: Record<string,unknown>): { done: number; total: number; complete: boolean }`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/properties/contract-checklist.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveChecklist, requiredFieldKeys, contractProgress } from "./contract-checklist";

const ids = (g: string, t: string) => resolveChecklist(g, t).map((i) => i.id);

describe("resolveChecklist 교차", () => {
  it("아파트 전세(A01×B1): 전입·확정일자·선순위·보증보험 포함, 사업자등록 미포함", () => {
    const r = ids("A01", "B1");
    expect(r).toEqual(expect.arrayContaining(["ACT_MOVE_IN", "ACT_FIXED_DATE", "ACT_SENIOR_LIEN", "ACT_DEPOSIT_GUARANTEE"]));
    expect(r).not.toContain("ACT_BIZ_REG");
  });
  it("상가 월세(D02×B2): 사업자등록·세무서확정일자 포함, 전입신고·선순위 미포함", () => {
    const r = ids("D02", "B2");
    expect(r).toEqual(expect.arrayContaining(["ACT_BIZ_REG", "ACT_TAX_FIXED_DATE"]));
    expect(r).not.toContain("ACT_MOVE_IN");
    expect(r).not.toContain("ACT_SENIOR_LIEN");
  });
  it("상가 전세(D02×B1): 보증보험 미포함(주거 한정)", () => {
    expect(ids("D02", "B1")).not.toContain("ACT_DEPOSIT_GUARANTEE");
  });
  it("토지 매매(E03×A1): 농취증·토허 포함", () => {
    expect(ids("E03", "A1")).toEqual(expect.arrayContaining(["ACT_FARMLAND_CERT", "ACT_LUT_PERMIT"]));
  });
  it("매매(A1): 등기권리증·소유권이전·거래신고 포함", () => {
    expect(ids("A01", "A1")).toEqual(expect.arrayContaining(["DOC_TITLE_DEED", "ACT_OWNERSHIP", "FILE_TX_REPORT"]));
  });
  it("임대(B1/B2): 임대인 납세증명 포함, B3·공장은 공통 위주", () => {
    expect(ids("A01", "B2")).toContain("DOC_TAX_CLEARANCE");
    expect(ids("A01", "B3")).not.toContain("ACT_MOVE_IN");
    expect(ids("E02", "A1")).not.toContain("ACT_BIZ_REG"); // 공장 전용항목 0
  });
  it("공통 5종은 항상 포함", () => {
    expect(ids("A01", "B3")).toEqual(expect.arrayContaining(["DOC_ID", "DOC_REGISTER", "DOC_BLDG_LEDGER", "DOC_CONTRACT", "DOC_CONFIRM"]));
  });
});

describe("requiredFieldKeys", () => {
  it("매매=거래금액, 전세=보증금, 월세=보증금+월세, 단기=공통만", () => {
    expect(requiredFieldKeys("A1")).toEqual(["customerName", "contractDate", "balanceDate", "dealAmount"]);
    expect(requiredFieldKeys("B1")).toContain("price");
    expect(requiredFieldKeys("B2")).toEqual(expect.arrayContaining(["price", "rentPrice"]));
    expect(requiredFieldKeys("B3")).toEqual(["customerName", "contractDate", "balanceDate"]);
  });
});

describe("contractProgress 게이트", () => {
  const full = { customerName: "홍길동", contractDate: "20260701", balanceDate: "20260801", dealAmount: "500000000" };
  it("required 항목·필드 전부 충족 시 complete", () => {
    const items = resolveChecklist("A01", "A1").filter((i) => i.required);
    const checked = Object.fromEntries(items.map((i) => [i.id, "2026-07-01T00:00:00Z"]));
    const p = contractProgress("A01", "A1", checked, full);
    expect(p.done).toBe(p.total);
    expect(p.complete).toBe(true);
  });
  it("필드 하나 비면 미완", () => {
    const items = resolveChecklist("A01", "A1").filter((i) => i.required);
    const checked = Object.fromEntries(items.map((i) => [i.id, "x"]));
    const p = contractProgress("A01", "A1", checked, { ...full, balanceDate: "" });
    expect(p.complete).toBe(false);
    expect(p.done).toBe(p.total - 1);
  });
  it("required 아닌 항목(신고)은 게이트에 미반영", () => {
    const checkedReqOnly = Object.fromEntries(
      resolveChecklist("A01", "A1").filter((i) => i.required).map((i) => [i.id, "x"]),
    );
    expect(contractProgress("A01", "A1", checkedReqOnly, full).complete).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/properties/contract-checklist.test.ts`
Expected: FAIL — "Failed to resolve import './contract-checklist'".

- [ ] **Step 3: 모듈 구현**

`src/lib/properties/contract-checklist.ts`:
```ts
// 계약 서류 체크리스트 단일 소스 — (매물유형×거래유형) byCross 합성. 저장 안 함.
export type ChecklistItem = { id: string; label: string; party: string; kind: "서류" | "처리" | "신고"; required: boolean };

export const PARTIES = [
  { value: "common", label: "공통" },
  { value: "seller", label: "매도인" },
  { value: "buyer", label: "매수인" },
  { value: "landlord", label: "임대인" },
  { value: "tenant", label: "임차인" },
  { value: "agent", label: "중개" },
];
export const PARTY_LABEL: Record<string, string> = Object.fromEntries(PARTIES.map((p) => [p.value, p.label]));

export const GROUPS = {
  RESI: ["A01", "A02", "A04", "C02", "C01"],
  RESI_SINGLE: ["C03", "C04"],
  COMMERCIAL: ["D01", "D02", "D03", "D05"],
  LAND: ["E03"],
  FACTORY: ["E02", "E04"],
};
const RESIDENTIAL = [...GROUPS.RESI, ...GROUPS.RESI_SINGLE];

const ITEMS: ChecklistItem[] = [
  { id: "DOC_ID", label: "신분증", party: "common", kind: "서류", required: true },
  { id: "DOC_REGISTER", label: "등기사항전부증명서", party: "agent", kind: "서류", required: true },
  { id: "DOC_BLDG_LEDGER", label: "건축물대장", party: "agent", kind: "서류", required: true },
  { id: "DOC_CONTRACT", label: "계약서", party: "agent", kind: "서류", required: true },
  { id: "DOC_CONFIRM", label: "중개대상물 확인·설명서", party: "agent", kind: "서류", required: true },
  { id: "DOC_TITLE_DEED", label: "등기권리증", party: "seller", kind: "서류", required: true },
  { id: "DOC_SEAL_SALE", label: "매도용 인감증명서", party: "seller", kind: "서류", required: true },
  { id: "ACT_OWNERSHIP", label: "소유권이전등기", party: "buyer", kind: "처리", required: true },
  { id: "FILE_TX_REPORT", label: "부동산거래신고(계약+30일)", party: "agent", kind: "신고", required: false },
  { id: "TAX_ACQUISITION", label: "취득세 신고·납부", party: "buyer", kind: "신고", required: false },
  { id: "DOC_TAX_CLEARANCE", label: "임대인 납세증명서·미납국세 확인", party: "landlord", kind: "서류", required: false },
  { id: "ACT_SENIOR_LIEN", label: "선순위 권리·전입세대 점검", party: "agent", kind: "처리", required: true },
  { id: "ACT_MOVE_IN", label: "전입신고", party: "tenant", kind: "처리", required: true },
  { id: "ACT_FIXED_DATE", label: "확정일자", party: "tenant", kind: "처리", required: true },
  { id: "ACT_DEPOSIT_GUARANTEE", label: "전세보증금반환보증", party: "tenant", kind: "처리", required: false },
  { id: "FILE_LEASE_REPORT", label: "주택임대차신고(30일)", party: "common", kind: "신고", required: false },
  { id: "ACT_BIZ_REG", label: "사업자등록", party: "tenant", kind: "처리", required: true },
  { id: "ACT_TAX_FIXED_DATE", label: "세무서 확정일자", party: "tenant", kind: "처리", required: true },
  { id: "ACT_FARMLAND_CERT", label: "농지취득자격증명", party: "buyer", kind: "처리", required: false },
  { id: "ACT_LUT_PERMIT", label: "토지거래허가", party: "buyer", kind: "처리", required: false },
];
const BY_ID: Record<string, ChecklistItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

function itemIds(realEstateType: string, tradeType: string): string[] {
  const g = realEstateType;
  const t = tradeType;
  const set = new Set<string>(["DOC_ID", "DOC_REGISTER", "DOC_BLDG_LEDGER", "DOC_CONTRACT", "DOC_CONFIRM"]); // 공통
  const isResi = RESIDENTIAL.includes(g);
  const isComm = GROUPS.COMMERCIAL.includes(g);
  // byDealType
  if (t === "A1") ["DOC_TITLE_DEED", "DOC_SEAL_SALE", "ACT_OWNERSHIP", "FILE_TX_REPORT", "TAX_ACQUISITION"].forEach((x) => set.add(x));
  if (t === "B1" || t === "B2") ["FILE_LEASE_REPORT", "DOC_TAX_CLEARANCE"].forEach((x) => set.add(x));
  // B3 → 분기 없음(의도)
  // byPropertyGroup
  if (GROUPS.LAND.includes(g)) ["ACT_FARMLAND_CERT", "ACT_LUT_PERMIT"].forEach((x) => set.add(x));
  // FACTORY → 분기 없음(MVP)
  // byCross (매물군 × 거래유형)
  if (isResi && (t === "B1" || t === "B2")) ["ACT_MOVE_IN", "ACT_FIXED_DATE", "ACT_SENIOR_LIEN"].forEach((x) => set.add(x));
  if (isResi && t === "B1") set.add("ACT_DEPOSIT_GUARANTEE");
  if (isComm && (t === "B1" || t === "B2")) ["ACT_BIZ_REG", "ACT_TAX_FIXED_DATE"].forEach((x) => set.add(x));
  return [...set];
}

export function resolveChecklist(realEstateType: string, tradeType: string): ChecklistItem[] {
  return itemIds(realEstateType, tradeType).map((id) => BY_ID[id]).filter(Boolean);
}

export function requiredFieldKeys(tradeType: string): string[] {
  const base = ["customerName", "contractDate", "balanceDate"];
  if (tradeType === "A1") return [...base, "dealAmount"];
  if (tradeType === "B1") return [...base, "price"];
  if (tradeType === "B2") return [...base, "price", "rentPrice"];
  return base;
}

const filled = (v: unknown) => v != null && v !== "";

export function contractProgress(
  realEstateType: string,
  tradeType: string,
  checked: Record<string, string>,
  property: Record<string, unknown>,
): { done: number; total: number; complete: boolean } {
  const reqItems = resolveChecklist(realEstateType, tradeType).filter((i) => i.required);
  const fieldKeys = requiredFieldKeys(tradeType);
  const doneItems = reqItems.filter((i) => !!checked[i.id]).length;
  const doneFields = fieldKeys.filter((k) => filled(property[k])).length;
  const done = doneItems + doneFields;
  const total = reqItems.length + fieldKeys.length;
  return { done, total, complete: total > 0 && done === total };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/properties/contract-checklist.test.ts`
Expected: PASS (모든 it 통과).

- [ ] **Step 5: Commit**

```bash
git add src/lib/properties/contract-checklist.ts src/lib/properties/contract-checklist.test.ts
git commit -m "feat(property): 계약 체크리스트 byCross 합성 로직(순수)+테스트"
```

---

## Task 3: 양식 정의 순수 로직 (TDD)

**Files:**
- Create: `src/lib/properties/contract-forms.ts`
- Test: `src/lib/properties/contract-forms.test.ts`

**Interfaces:**
- Consumes: `GROUPS` from `./contract-checklist`.
- Produces:
  - `type FormFieldSlot = { slot: string; sourceKey?: string }`
  - `type ContractForm = { id: string; label: string; applies: (g: string, t: string) => boolean; slots: FormFieldSlot[] }`
  - `CONTRACT_FORMS: ContractForm[]`, `FORM_BY_ID: Record<string, ContractForm>`, `formsFor(g: string, t: string): ContractForm[]`

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/properties/contract-forms.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formsFor, FORM_BY_ID } from "./contract-forms";

const fids = (g: string, t: string) => formsFor(g, t).map((f) => f.id);

describe("formsFor", () => {
  it("아파트 매매: 매매계약서·주거확인설명서·영수증·위임장, 임대차계약서 미포함", () => {
    const r = fids("A01", "A1");
    expect(r).toEqual(expect.arrayContaining(["sale_contract", "confirm_residential", "receipt", "power_of_attorney"]));
    expect(r).not.toContain("lease_contract");
    expect(r).not.toContain("confirm_nonresidential");
  });
  it("상가 월세: 임대차계약서·비주거확인설명서, 매매계약서·주거확인설명서 미포함", () => {
    const r = fids("D02", "B2");
    expect(r).toEqual(expect.arrayContaining(["lease_contract", "confirm_nonresidential"]));
    expect(r).not.toContain("sale_contract");
    expect(r).not.toContain("confirm_residential");
  });
  it("토지 매매: 비주거 확인설명서", () => {
    expect(fids("E03", "A1")).toContain("confirm_nonresidential");
  });
});

describe("FORM_BY_ID 슬롯", () => {
  it("매매계약서에 매매대금 슬롯(sourceKey=dealAmount) 존재", () => {
    const slots = FORM_BY_ID.sale_contract.slots;
    expect(slots.some((s) => s.sourceKey === "dealAmount")).toBe(true);
  });
  it("임대차계약서에 월세 슬롯(sourceKey=rentPrice) 존재", () => {
    expect(FORM_BY_ID.lease_contract.slots.some((s) => s.sourceKey === "rentPrice")).toBe(true);
  });
  it("상대 당사자 슬롯은 sourceKey 없음(수기란)", () => {
    const slots = FORM_BY_ID.sale_contract.slots;
    expect(slots.some((s) => s.sourceKey === undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/properties/contract-forms.test.ts`
Expected: FAIL — import 해결 실패.

- [ ] **Step 3: 모듈 구현**

`src/lib/properties/contract-forms.ts`:
```ts
// 계약 양식 단일 소스 — 거래/유형별 적용 양식 + 슬롯↔Property 키 매핑(MVP: 보유분만 자동기입).
import { GROUPS } from "./contract-checklist";

export type FormFieldSlot = { slot: string; sourceKey?: string }; // sourceKey 없으면 인쇄물 수기 기입란

export type ContractForm = {
  id: string;
  label: string;
  applies: (realEstateType: string, tradeType: string) => boolean;
  slots: FormFieldSlot[];
};

const RESIDENTIAL = [...GROUPS.RESI, ...GROUPS.RESI_SINGLE];
const NONRESI = [...GROUPS.COMMERCIAL, ...GROUPS.LAND, ...GROUPS.FACTORY];

// 부동산 표시·당사자 공통 슬롯
const PROPERTY_SLOTS: FormFieldSlot[] = [
  { slot: "소재지(단지/건물)", sourceKey: "complexName" },
  { slot: "매물명", sourceKey: "name" },
  { slot: "전용면적", sourceKey: "areaExclusive" },
  { slot: "공급면적", sourceKey: "areaSupply" },
  { slot: "대지면적", sourceKey: "landArea" },
];
const PARTY_SLOTS: FormFieldSlot[] = [
  { slot: "갑(일방) 성명", sourceKey: "customerName" },
  { slot: "갑(일방) 연락처", sourceKey: "customerPhone" },
  { slot: "을(상대) 성명" }, // 수기
  { slot: "을(상대) 주소" }, // 수기
  { slot: "을(상대) 연락처" }, // 수기
];
const SCHEDULE_SLOTS: FormFieldSlot[] = [
  { slot: "계약일", sourceKey: "contractDate" },
  { slot: "중도금일", sourceKey: "interim1Date" },
  { slot: "잔금일", sourceKey: "balanceDate" },
];

export const CONTRACT_FORMS: ContractForm[] = [
  {
    id: "sale_contract",
    label: "부동산 매매계약서",
    applies: (_g, t) => t === "A1",
    slots: [
      ...PROPERTY_SLOTS,
      { slot: "매매대금", sourceKey: "dealAmount" },
      { slot: "계약금(수기)" },
      { slot: "잔금(수기)" },
      ...SCHEDULE_SLOTS,
      ...PARTY_SLOTS,
    ],
  },
  {
    id: "lease_contract",
    label: "부동산 임대차계약서",
    applies: (_g, t) => ["B1", "B2", "B3"].includes(t),
    slots: [
      ...PROPERTY_SLOTS,
      { slot: "보증금", sourceKey: "price" },
      { slot: "월세", sourceKey: "rentPrice" },
      ...SCHEDULE_SLOTS,
      ...PARTY_SLOTS,
    ],
  },
  {
    id: "confirm_residential",
    label: "중개대상물 확인·설명서[주거용]",
    applies: (g) => RESIDENTIAL.includes(g),
    slots: [...PROPERTY_SLOTS, { slot: "난방방식", sourceKey: "heating" }, { slot: "총세대수", sourceKey: "totalHouseholds" }],
  },
  {
    id: "confirm_nonresidential",
    label: "중개대상물 확인·설명서[비주거용]",
    applies: (g) => NONRESI.includes(g),
    slots: [...PROPERTY_SLOTS, { slot: "용도지역(수기)" }, { slot: "이용현황(수기)" }],
  },
  {
    id: "receipt",
    label: "영수증",
    applies: () => true,
    slots: [{ slot: "금액(수기)" }, { slot: "받은 사람", sourceKey: "customerName" }, { slot: "일자", sourceKey: "contractDate" }],
  },
  {
    id: "power_of_attorney",
    label: "위임장",
    applies: () => true,
    slots: [{ slot: "위임인(수기)" }, { slot: "수임인(수기)" }, { slot: "부동산 표시", sourceKey: "complexName" }],
  },
];

export const FORM_BY_ID: Record<string, ContractForm> = Object.fromEntries(CONTRACT_FORMS.map((f) => [f.id, f]));

export function formsFor(realEstateType: string, tradeType: string): ContractForm[] {
  return CONTRACT_FORMS.filter((f) => f.applies(realEstateType, tradeType));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/properties/contract-forms.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/properties/contract-forms.ts src/lib/properties/contract-forms.test.ts
git commit -m "feat(property): 계약 양식 정의·슬롯 매핑(순수)+테스트"
```

---

## Task 4: 서버 액션

**Files:**
- Modify: `src/app/(dashboard)/dashboard/properties/actions.ts` (`requireUser`·`toRow` export)
- Create: `src/app/(dashboard)/dashboard/properties/contract-actions.ts`

**Interfaces:**
- Consumes: `resolveChecklist`, `requiredFieldKeys`, `contractProgress` (Task 2); `requireUser`, `toRow`, `PropertyRow` (actions.ts).
- Produces:
  - `getContractData(id: string): Promise<ContractData | null>` where `ContractData = { property: PropertyRow; checklist: ChecklistItem[]; checked: Record<string,string>; requiredFields: {key:string;label:string;filled:boolean}[]; progress: {done:number;total:number;complete:boolean}; status: string }`
  - `toggleChecklistItem(id: string, itemId: string, checked: boolean): Promise<void>`
  - `startContract(id: string): Promise<void>`
  - `completeContract(id: string): Promise<void>`

- [ ] **Step 1: actions.ts에서 헬퍼 export**

`src/app/(dashboard)/dashboard/properties/actions.ts`에서 두 함수 선언에 `export` 추가:
- line 14: `async function requireUser()` → `export async function requireUser()`
- line 26: `function toRow(` → `export function toRow(`

- [ ] **Step 2: contract-actions.ts 구현**

`src/app/(dashboard)/dashboard/properties/contract-actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { FIELD_BY_KEY } from "@/lib/properties/fields";
import {
  resolveChecklist,
  requiredFieldKeys,
  contractProgress,
  type ChecklistItem,
} from "@/lib/properties/contract-checklist";
import { requireUser, toRow, type PropertyRow } from "./actions";

export type ContractData = {
  property: PropertyRow;
  checklist: ChecklistItem[];
  checked: Record<string, string>;
  requiredFields: { key: string; label: string; filled: boolean }[];
  progress: { done: number; total: number; complete: boolean };
  status: string;
};

const checkedMap = (v: unknown): Record<string, string> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};

export async function getContractData(id: string): Promise<ContractData | null> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) return null;
  const property = toRow(p as unknown as Record<string, unknown>);
  const g = (property.realEstateType as string) ?? "";
  const t = (property.tradeType as string) ?? "";
  const checked = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  const checklist = resolveChecklist(g, t);
  const requiredFields = requiredFieldKeys(t).map((key) => ({
    key,
    label: FIELD_BY_KEY[key]?.label ?? key,
    filled: property[key] != null && property[key] !== "",
  }));
  const progress = contractProgress(g, t, checked, property as Record<string, unknown>);
  return { property, checklist, checked, requiredFields, progress, status: (property.status as string) ?? "진행" };
}

export async function toggleChecklistItem(id: string, itemId: string, checked: boolean): Promise<void> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) throw new Error("매물을 찾을 수 없습니다");
  const g = (p as unknown as { realEstateType: string | null }).realEstateType ?? "";
  const t = (p as unknown as { tradeType: string | null }).tradeType ?? "";
  if (!resolveChecklist(g, t).some((i) => i.id === itemId)) throw new Error("유효하지 않은 항목입니다");
  const cur = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  if (checked) cur[itemId] = new Date().toISOString();
  else delete cur[itemId];
  await db.property.updateMany({ where: { id, userId: user.id }, data: { contractChecklist: cur } });
  revalidatePath(`/dashboard/properties/${id}/contract`);
}

export async function startContract(id: string): Promise<void> {
  const user = await requireUser();
  await db.property.updateMany({ where: { id, userId: user.id }, data: { status: "계약진행" } });
  revalidatePath("/dashboard/properties");
}

export async function completeContract(id: string): Promise<void> {
  const user = await requireUser();
  const p = await db.property.findFirst({ where: { id, userId: user.id } });
  if (!p) throw new Error("매물을 찾을 수 없습니다");
  const property = toRow(p as unknown as Record<string, unknown>);
  const checked = checkedMap((p as unknown as Record<string, unknown>).contractChecklist);
  const prog = contractProgress(
    (property.realEstateType as string) ?? "",
    (property.tradeType as string) ?? "",
    checked,
    property as Record<string, unknown>,
  );
  if (!prog.complete) throw new Error("필수 항목·데이터가 모두 충족되지 않았습니다");
  await db.property.updateMany({ where: { id, userId: user.id }, data: { status: "계약완료" } });
  revalidatePath("/dashboard/properties");
}
```

- [ ] **Step 3: 타입·린트 검증**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/app/\(dashboard\)/dashboard/properties/contract-actions.ts src/app/\(dashboard\)/dashboard/properties/actions.ts`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/actions.ts" "src/app/(dashboard)/dashboard/properties/contract-actions.ts"
git commit -m "feat(property): 계약 서버 액션(데이터 조회·체크 토글·시작·완료 게이트)"
```

---

## Task 5: 계약 페이지 + 클라이언트

**Files:**
- Create: `src/app/(dashboard)/dashboard/properties/[id]/contract/page.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/[id]/contract/contract-client.tsx`

**Interfaces:**
- Consumes: `getContractData`, `toggleChecklistItem`, `completeContract`, `updateProperty` (actions.ts), `formsFor` (Task 3), `PARTY_LABEL` (Task 2), `formMeta`/`SPAN_CLASS`/`FIELD_BY_KEY` (fields.ts), `groupDigits`/`toDateInput`/`fromDateInput` (format.ts).
- Produces: 라우트 `/dashboard/properties/[id]/contract`.

- [ ] **Step 1: 서버 페이지 구현**

`.../[id]/contract/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROPERTY_LABEL } from "@/lib/naver/property-types";
import { TRADE_LABEL } from "@/lib/naver/trade-types";
import { formsFor } from "@/lib/properties/contract-forms";
import { getContractData } from "../../contract-actions";
import { ContractClient } from "./contract-client";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getContractData(id);
  if (!data) notFound();

  const g = (data.property.realEstateType as string) ?? "";
  const t = (data.property.tradeType as string) ?? "";
  const title = (data.property.name as string) || (data.property.complexName as string) || "매물";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        ⚠️ 실무 보조용 체크리스트·양식입니다. 공식·법적 효력을 보장하지 않으며, 구체적 거래는 전문가 확인이 필요합니다.
      </p>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.property.complexName as string} · {PROPERTY_LABEL[g] ?? g} · {TRADE_LABEL[t] ?? t}
            </p>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/dashboard/properties" />}>목록</Button>
        </CardHeader>
        <CardContent className="pt-4">
          {!g || !t ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              먼저 매물유형·거래유형을 설정하세요.{" "}
              <Link href={`/dashboard/properties/${id}/edit`} className="text-primary underline">수정 폼 열기</Link>
            </div>
          ) : (
            <ContractClient id={id} data={data} forms={formsFor(g, t)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 클라이언트 컴포넌트 구현**

`.../[id]/contract/contract-client.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PARTY_LABEL } from "@/lib/properties/contract-checklist";
import { FIELD_BY_KEY, formMeta } from "@/lib/properties/fields";
import { groupDigits, stripDigits, toDateInput, fromDateInput } from "@/lib/properties/format";
import { updateProperty } from "../../actions";
import { toggleChecklistItem, completeContract, type ContractData } from "../../contract-actions";
import type { ContractForm } from "@/lib/properties/contract-forms";

export function ContractClient({ id, data, forms }: { id: string; data: ContractData; forms: ContractForm[] }) {
  const router = useRouter();
  const readOnly = data.status === "계약완료";
  const [checked, setChecked] = useState(data.checked);
  const [fieldFilled, setFieldFilled] = useState<Record<string, boolean>>(
    Object.fromEntries(data.requiredFields.map((f) => [f.key, f.filled])),
  );
  const [busy, setBusy] = useState(false);

  // 진행률은 파생값(state 아님) — 체크·필드 변경 시 즉시 반영
  const reqIds = data.checklist.filter((i) => i.required).map((i) => i.id);
  const doneItems = reqIds.filter((x) => checked[x]).length;
  const doneFields = Object.values(fieldFilled).filter(Boolean).length;
  const total = reqIds.length + data.requiredFields.length;
  const done = doneItems + doneFields;
  const complete = total > 0 && done === total;

  function onToggle(itemId: string, v: boolean) {
    if (readOnly) return;
    const next = { ...checked };
    if (v) next[itemId] = new Date().toISOString(); else delete next[itemId];
    setChecked(next);
    toggleChecklistItem(id, itemId, v).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"));
  }

  async function onComplete() {
    setBusy(true);
    try { await completeContract(id); toast.success("계약완료로 전환했습니다"); router.push("/dashboard/properties"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "완료 처리 실패"); }
    finally { setBusy(false); }
  }

  const groups = ["common", "seller", "buyer", "landlord", "tenant", "agent"];

  return (
    <div className="space-y-6">
      {readOnly && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          계약완료 매물입니다(읽기전용). 수정하려면 목록에서 상태를 하향하세요.
        </p>
      )}

      {/* 진행률 */}
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">진행률</span>
          <span className="tabular-nums text-muted-foreground">{done}/{total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      {/* ① 핵심 계약 데이터 */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">핵심 계약 데이터</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.requiredFields.map((f) => (
            <ContractField key={f.key} id={id} fieldKey={f.key} initial={data.property[f.key]} readOnly={readOnly}
              onFilled={(filled) => setFieldFilled((prev) => ({ ...prev, [f.key]: filled }))} />
          ))}
        </div>
      </section>

      {/* ② 서류 체크리스트 */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">서류 체크리스트</h3>
        {groups.map((party) => {
          const items = data.checklist.filter((i) => i.party === party);
          if (!items.length) return null;
          return (
            <div key={party} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{PARTY_LABEL[party]}</p>
              {items.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!checked[i.id]} onCheckedChange={(c) => onToggle(i.id, c)} disabled={readOnly} />
                  <span className={cn(checked[i.id] && "text-muted-foreground line-through")}>{i.label}</span>
                  {!i.required && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{i.kind === "신고" ? "법정신고" : "참고"}</span>}
                </label>
              ))}
            </div>
          );
        })}
      </section>

      {/* ③ 양식 인쇄 */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">양식 인쇄</h3>
        <div className="flex flex-wrap gap-2">
          {forms.map((f) => (
            <Button key={f.id} size="sm" variant="outline" render={<Link href={`/dashboard/properties/${id}/contract/print/${f.id}`} target="_blank" />}>
              <Printer className="size-3.5" />{f.label}
            </Button>
          ))}
        </div>
      </section>

      {/* 완료 */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {!complete && <span className="text-sm text-muted-foreground">필수 항목·데이터를 모두 채우면 활성화됩니다.</span>}
          <Button onClick={onComplete} disabled={!complete || busy}>계약 완료 처리</Button>
        </div>
      )}
    </div>
  );
}

function ContractField({ id, fieldKey, initial, readOnly, onFilled }: {
  id: string; fieldKey: string; initial: unknown; readOnly: boolean; onFilled: (filled: boolean) => void;
}) {
  const f = FIELD_BY_KEY[fieldKey];
  const meta = formMeta(f);
  const [val, setVal] = useState(initial == null ? "" : String(initial));

  function save(raw: string) {
    onFilled(raw !== "");
    updateProperty(id, { [fieldKey]: raw }).catch((e) => toast.error(e instanceof Error ? e.message : "저장 실패"));
  }
  const display = meta.formInput === "money" ? groupDigits(val) : meta.formInput === "date" ? toDateInput(val) : val;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{f.label}</span>
      {meta.formInput === "date" ? (
        <Input type="date" value={display} disabled={readOnly}
          onChange={(e) => { const v = fromDateInput(e.target.value); setVal(v); save(v); }} />
      ) : (
        <Input value={display} disabled={readOnly} inputMode={meta.formInput === "money" ? "numeric" : undefined}
          onChange={(e) => setVal(meta.formInput === "money" ? stripDigits(e.target.value) : e.target.value)}
          onBlur={(e) => save(meta.formInput === "money" ? stripDigits(e.target.value) : e.target.value)} />
      )}
    </label>
  );
}
```

- [ ] **Step 3: 타입·린트 검증**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/properties/[id]/contract/page.tsx" "src/app/(dashboard)/dashboard/properties/[id]/contract/contract-client.tsx"`
Expected: 에러 없음. (format.ts의 `groupDigits/stripDigits/toDateInput/fromDateInput` 시그니처 확인 — 없으면 해당 헬퍼명에 맞춰 조정.)

- [ ] **Step 4: 앱에서 동작 확인**

Run: `bash scripts/run-prod.sh` (또는 `pnpm dev`), 브라우저에서 매물 1건의 `/dashboard/properties/<id>/contract` 접속.
Expected: 고지 배너·진행률·핵심필드 입력·체크박스 토글(즉시 저장)·양식 버튼·완료 버튼(미충족 시 비활성) 표시. 체크/필드 채우면 진행률 100% → 완료 버튼 활성 → 클릭 시 계약완료 전환·목록 복귀.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/[id]/contract/page.tsx" "src/app/(dashboard)/dashboard/properties/[id]/contract/contract-client.tsx"
git commit -m "feat(property): 매물별 계약 페이지(체크리스트·핵심필드·진행률·완료 게이트)"
```

---

## Task 6: 양식 인쇄 페이지

**Files:**
- Create: `src/app/(dashboard)/dashboard/properties/[id]/contract/print/[formId]/page.tsx`
- Create: `src/app/(dashboard)/dashboard/properties/[id]/contract/print/print-button.tsx`

**Interfaces:**
- Consumes: `getProperty` (actions.ts, userId 스코프), `FORM_BY_ID` (Task 3).
- Produces: 라우트 `/dashboard/properties/[id]/contract/print/[formId]`.

- [ ] **Step 1: 인쇄 버튼(클라) 구현**

`.../print/print-button.tsx`:
```tsx
"use client";
import { Button } from "@/components/ui/button";
export function PrintButton() {
  return (
    <Button size="sm" className="print:hidden" onClick={() => window.print()}>인쇄 / PDF 저장</Button>
  );
}
```

- [ ] **Step 2: 인쇄 페이지 구현(스코프 적용)**

`.../print/[formId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";

import { FORM_BY_ID } from "@/lib/properties/contract-forms";
import { getProperty } from "../../../../actions";
import { PrintButton } from "../print-button";

const fmtMoney = (v: unknown) => (v == null || v === "" ? "" : Number(v).toLocaleString("ko-KR"));
const fmtDate = (v: unknown) => { const s = v == null ? "" : String(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s; };
const MONEY = new Set(["dealAmount", "price", "rentPrice"]);
const DATE = new Set(["contractDate", "interim1Date", "interim2Date", "balanceDate", "moveInDate"]);

export default async function PrintFormPage({ params }: { params: Promise<{ id: string; formId: string }> }) {
  const { id, formId } = await params;
  const form = FORM_BY_ID[formId];
  const property = await getProperty(id); // requireUser + userId 스코프(IDOR 차단)
  if (!form || !property) notFound();

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-[15mm] text-black print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <span className="text-xs text-muted-foreground">실무 보조용 자동기입 양식 — 공식 표준양식 아님</span>
        <PrintButton />
      </div>
      <h1 className="mb-6 text-center text-xl font-bold">{form.label}</h1>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {form.slots.map((s, i) => {
            const raw = s.sourceKey ? property[s.sourceKey] : undefined;
            const val = s.sourceKey ? (MONEY.has(s.sourceKey) ? fmtMoney(raw) : DATE.has(s.sourceKey) ? fmtDate(raw) : (raw ?? "")) : "";
            return (
              <tr key={i} className="border border-gray-400">
                <th className="w-40 border border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">{s.slot}</th>
                <td className="px-3 py-2">{String(val) || <span className="text-gray-400">________________</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-8 text-center text-xs text-gray-500">{form.label} · 자동기입 항목 외에는 직접 기입하세요.</p>
    </div>
  );
}
```

- [ ] **Step 3: 타입·린트 검증**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/properties/[id]/contract/print/[formId]/page.tsx" "src/app/(dashboard)/dashboard/properties/[id]/contract/print/print-button.tsx"`
Expected: 에러 없음. (`getProperty`의 상대 경로 깊이 확인: `[id]/contract/print/[formId]/` → properties까지 `../../../../`.)

- [ ] **Step 4: 앱에서 인쇄 확인**

Run: 앱 구동 후 계약 페이지의 양식 버튼 클릭 → 새 탭에 A4 양식(자동기입+밑줄칸) 표시, "인쇄/PDF 저장" 버튼으로 브라우저 인쇄 미리보기에서 버튼·네비 숨김 확인. 타 사용자 매물 id로 접속 시 404.
Expected: 정상 렌더·인쇄·스코프 차단.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/[id]/contract/print"
git commit -m "feat(property): 계약 양식 브라우저 인쇄 페이지(자동기입·스코프)"
```

---

## Task 7: 목록 연동 (상태 전환·계약 링크)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/properties/property-list.tsx:106-115, 157-168`

**Interfaces:**
- Consumes: `startContract` (Task 4).

- [ ] **Step 1: 일괄 버튼을 "계약진행 전환"으로 변경**

`property-list.tsx` 상단 import에 추가: `import { startContract } from "./contract-actions"`.
선택 액션 영역(line 106-115)의 "계약완료" 버튼을 교체 — `setPropertyStatus([...sel], "계약완료")` 호출을 다음으로:
```tsx
              <Button size="sm" variant="outline" onClick={() => run(() => Promise.all([...sel].map((sid) => startContract(sid))), "계약진행으로 전환했습니다")} disabled={busy}>
                <CircleCheck className="size-3.5" />계약진행
              </Button>
```
(아이콘·`run` 헬퍼는 기존 그대로. `setPropertyStatus` import가 다른 곳에서 안 쓰이면 제거.)

- [ ] **Step 2: "계약" 링크 컬럼 추가**

헤더(line 143 근처) `LIST_COLUMNS` 매핑 뒤 "수정" 헤더 앞에 추가:
```tsx
                  <TableHead className="w-12" aria-label="계약" />
```
바디(line 166 근처) "수정" 셀 앞에 추가:
```tsx
                    <TableCell>
                      {(p.status === "계약진행" || p.status === "계약완료") && (
                        <Link href={`/dashboard/properties/${p.id}/contract`} className="text-xs text-primary underline">계약</Link>
                      )}
                    </TableCell>
```

- [ ] **Step 3: 타입·린트·빌드 검증**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/properties/property-list.tsx" && pnpm build`
Expected: 에러 없음, 빌드 성공.

- [ ] **Step 4: 앱에서 흐름 확인**

Run: 앱 구동 → 매물 선택 후 "계약진행" 버튼 → 상태 계약진행 → 행의 "계약" 링크로 계약 페이지 진입 → 체크·필드 완료 → 계약완료 전환 → 계약완료 뷰에 노출·계약 페이지 읽기전용.
Expected: end-to-end 정상.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/properties/property-list.tsx"
git commit -m "feat(property): 목록 계약진행 전환·계약 페이지 링크"
```

---

## 마감 (전체 통합 후)

- [ ] `pnpm exec vitest run` (전체 단위 테스트 그린), `pnpm build` 성공 확인.
- [ ] [README.md](../../../README.md) §현재 반영 상태 + [docs/PROJECT_GUIDE.md](../../PROJECT_GUIDE.md) §현재 참고 상태에 기능 요약 1줄 추가(CLAUDE.md §5).
- [ ] spec·plan 문서 포함 commit 제안(push는 사용자 요청 시).
