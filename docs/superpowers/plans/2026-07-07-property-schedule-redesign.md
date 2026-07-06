# 매물 거래 일정 재구성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매물 폼의 "일정" 그룹을 실거래 흐름(계약→중도금→잔금→입주)으로 재구성하고 대금(계약금·중도금·잔금 금액)과 임대차 만기일을 추가, 거래유형별 조건 노출·계약서 자동기입까지 연동한다.

**Architecture:** `fields.ts` 평면 키 단일 소스에 필드 5개(money 4 + date 1)를 추가하고 일정 그룹을 재배열한다. 폼·그리드·엑셀·저장(actions의 MONEY 세트)은 단일 소스에서 자동 파생되고, 캘린더(`property-events.ts`)와 계약서(`contract-forms.ts`·`contract-document.tsx`)만 수동 연동한다.

**Tech Stack:** Next.js 16 + Prisma 6 + vitest. 스펙: [docs/superpowers/specs/2026-07-07-property-schedule-redesign-design.md](../specs/2026-07-07-property-schedule-redesign-design.md)

## Global Constraints

- 사용자 응답·문서는 한국어 (CLAUDE.md).
- **태스크 중간 git commit 금지** — CLAUDE.md §5에 따라 마지막에 문서 갱신 후 commit 초안을 사용자 승인받아 일괄 커밋 (Task 8). push는 사용자가 명시 지시할 때만.
- 금액 규약: 폼 입력·표시는 **만원**, DB 저장은 **원(BigInt)**. 변환은 `actions.ts` `toData`(×10000)·폼 init(÷10000)이 MONEY 세트(=`type:"money"` 필드) 기준으로 자동 처리 — 새 money 필드는 자동 편입.
- 날짜 규약: `YYYYMMDD` 문자열(String? 컬럼).
- 거래유형 코드: 매매 `A1`, 전세 `B1`, 월세 `B2`, 단기임대 `B3` (`src/lib/naver/trade-types.ts`).
- 이 서버는 운영 서버 — `prisma migrate dev`는 즉시 라이브 DB 반영(비파괴 컬럼 추가만이므로 안전). 웹 반영은 사용자가 `run-prod.sh`로.
- 기존 날짜 필드 7개의 key는 변경 금지(데이터 보존): contractHopeDate·contractDate·moveInHopeDate·moveInDate·interim1Date·interim2Date·balanceDate.

---

### Task 1: Prisma 스키마 — 대금 4종·만기일 컬럼 추가

**Files:**
- Modify: `prisma/schema.prisma` (Property 모델, 151~157행 일정 필드 블록 아래)

**Interfaces:**
- Produces: Property 컬럼 `downPayment/interim1Amount/interim2Amount/balanceAmount BigInt?`, `leaseEndDate String?` — 이후 모든 태스크가 이 키 이름을 사용.

- [ ] **Step 1: 스키마 수정**

`prisma/schema.prisma`의 Property 모델에서 아래 블록을

```prisma
  contractHopeDate String?
  contractDate     String?
  moveInHopeDate   String?
  moveInDate       String?
  interim1Date     String?
  interim2Date     String?
  balanceDate      String?
```

다음으로 교체(뒤에 5줄 추가):

```prisma
  contractHopeDate String?
  contractDate     String?
  moveInHopeDate   String?
  moveInDate       String?
  interim1Date     String?
  interim2Date     String?
  balanceDate      String?
  downPayment      BigInt? // 계약금(원)
  interim1Amount   BigInt? // 중도금1(원)
  interim2Amount   BigInt? // 중도금2(원)
  balanceAmount    BigInt? // 잔금(원)
  leaseEndDate     String? // 임대차 만기일(YYYYMMDD)
```

- [ ] **Step 2: 마이그레이션 실행**

Run: `cd /opt/real-es && pnpm prisma migrate dev --name add_payment_schedule`
Expected: `Your database is now in sync with your schema.` + 새 마이그레이션 폴더 `prisma/migrations/*_add_payment_schedule/` 생성 (ALTER TABLE ADD COLUMN 5건)

- [ ] **Step 3: 상태 확인**

Run: `pnpm prisma migrate status`
Expected: `Database schema is up to date!`

---

### Task 2: fields.ts — 일정 그룹 재구성 + trades 조건 (TDD)

**Files:**
- Modify: `src/lib/properties/fields.ts` (PropertyField 타입 7행, 일정 그룹 52~59행)
- Test: `src/lib/properties/fields.test.ts`

**Interfaces:**
- Consumes: Task 1의 컬럼 키 이름.
- Produces: `PropertyField.trades?: string[]`(해당 거래유형에서만 폼 노출, 미지정=항상), 일정 그룹 순서·라벨. Task 4(폼)·Task 6(계약서)이 이 키·라벨을 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/properties/fields.test.ts` 파일 끝에 추가:

```ts
describe("일정 그룹 재구성", () => {
  const schedule = PROPERTY_FIELDS.filter((f) => f.group === "일정").map((f) => f.key);
  it("실거래 흐름 순서(협의→계약→중도금→잔금→입주·기간)", () => {
    expect(schedule).toEqual([
      "contractHopeDate", "moveInHopeDate", "contractDate", "downPayment",
      "interim1Amount", "interim1Date", "interim2Amount", "interim2Date",
      "balanceAmount", "balanceDate", "moveInDate", "leaseEndDate",
    ]);
  });
  it("대금 필드는 money 타입", () => {
    for (const k of ["downPayment", "interim1Amount", "interim2Amount", "balanceAmount"])
      expect(FIELD_BY_KEY[k].type).toBe("money");
  });
  it("중도금은 매매 전용, 만기일은 임대차 전용, 나머지는 공통", () => {
    expect(FIELD_BY_KEY.interim1Amount.trades).toEqual(["A1"]);
    expect(FIELD_BY_KEY.interim2Date.trades).toEqual(["A1"]);
    expect(FIELD_BY_KEY.leaseEndDate.trades).toEqual(["B1", "B2", "B3"]);
    expect(FIELD_BY_KEY.contractDate.trades).toBeUndefined();
    expect(FIELD_BY_KEY.downPayment.trades).toBeUndefined();
  });
  it("중도금 날짜 라벨은 금액과 구분(중도금1일)", () => {
    expect(FIELD_BY_KEY.interim1Date.label).toBe("중도금1일");
    expect(FIELD_BY_KEY.interim1Amount.label).toBe("중도금1");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test:unit src/lib/properties/fields.test.ts`
Expected: FAIL — `FIELD_BY_KEY.downPayment`가 undefined (새 키 미존재)

- [ ] **Step 3: fields.ts 구현**

7행 `PropertyField` 타입에 `trades` 추가:

```ts
export type PropertyField = { key: string; label: string; group: string; type: FieldType; options?: FieldOption[]; trades?: string[] };
```

52~59행 `// 일정` 블록 전체를 교체:

```ts
  // 일정 — 실거래 흐름 순서: 협의(희망) → 계약 → 중도금(매매만) → 잔금 → 입주·기간
  { key: "contractHopeDate", label: "계약희망일", group: "일정", type: "date" },
  { key: "moveInHopeDate", label: "입주희망일", group: "일정", type: "date" },
  { key: "contractDate", label: "계약일", group: "일정", type: "date" },
  { key: "downPayment", label: "계약금", group: "일정", type: "money" },
  { key: "interim1Amount", label: "중도금1", group: "일정", type: "money", trades: ["A1"] },
  { key: "interim1Date", label: "중도금1일", group: "일정", type: "date", trades: ["A1"] },
  { key: "interim2Amount", label: "중도금2", group: "일정", type: "money", trades: ["A1"] },
  { key: "interim2Date", label: "중도금2일", group: "일정", type: "date", trades: ["A1"] },
  { key: "balanceAmount", label: "잔금", group: "일정", type: "money" },
  { key: "balanceDate", label: "잔금일", group: "일정", type: "date" },
  { key: "moveInDate", label: "입주일", group: "일정", type: "date" },
  { key: "leaseEndDate", label: "만기일", group: "일정", type: "date", trades: ["B1", "B2", "B3"] },
```

(FORM_OVERRIDE 추가 불필요 — money는 formMeta에서 단위 "만원"·span 3 자동. `toRow`·`toData`·엑셀 매칭은 PROPERTY_FIELDS에서 자동 파생.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test:unit src/lib/properties/fields.test.ts`
Expected: PASS (기존 "key는 유일" 테스트 포함 전부)

---

### Task 3: 합계 검사 헬퍼 payment-sum.ts (TDD)

**Files:**
- Create: `src/lib/properties/payment-sum.ts`
- Test: `src/lib/properties/payment-sum.test.ts`

**Interfaces:**
- Produces: `paymentMismatch(values: Record<string, string>): { sum: number; price: number } | null` — 인자는 폼 상태(만원 단위 숫자 문자열), 불일치 시 만원 단위 합계·가격 반환, 검사 불가/일치 시 null. Task 4가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/properties/payment-sum.test.ts` 생성:

```ts
import { describe, it, expect } from "vitest";
import { paymentMismatch } from "./payment-sum";

describe("paymentMismatch (값은 만원 단위 문자열)", () => {
  it("합계 ≠ 가격이면 불일치 반환", () => {
    expect(paymentMismatch({ price: "85000", downPayment: "8000", interim1Amount: "20000", balanceAmount: "50000" }))
      .toEqual({ sum: 78000, price: 85000 });
  });
  it("합계 = 가격이면 null (중도금 2건 포함)", () => {
    expect(paymentMismatch({ price: "85000", downPayment: "8500", interim1Amount: "20000", interim2Amount: "6500", balanceAmount: "50000" }))
      .toBeNull();
  });
  it("중도금 없이 계약금+잔금=가격도 정상(null)", () => {
    expect(paymentMismatch({ price: "50000", downPayment: "5000", balanceAmount: "45000" })).toBeNull();
  });
  it("계약금·잔금·가격 중 하나라도 없으면 검사 안 함(null)", () => {
    expect(paymentMismatch({ price: "50000", downPayment: "5000" })).toBeNull();
    expect(paymentMismatch({ price: "", downPayment: "5000", balanceAmount: "45000" })).toBeNull();
    expect(paymentMismatch({ downPayment: "5000", balanceAmount: "45000" })).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test:unit src/lib/properties/payment-sum.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/properties/payment-sum.ts` 생성:

```ts
// 매매 대금 합계 검사 — 계약금·잔금·가격이 모두 입력된 경우에만. 값은 폼 상태(만원 단위 문자열).
export function paymentMismatch(values: Record<string, string>): { sum: number; price: number } | null {
  const n = (s: string | undefined): number | null => {
    if (s == null || s.trim() === "") return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };
  const down = n(values.downPayment);
  const balance = n(values.balanceAmount);
  const price = n(values.price);
  if (down == null || balance == null || price == null) return null;
  const sum = down + (n(values.interim1Amount) ?? 0) + (n(values.interim2Amount) ?? 0) + balance;
  return sum === price ? null : { sum, price };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test:unit src/lib/properties/payment-sum.test.ts`
Expected: PASS 4건

---

### Task 4: property-form.tsx — 거래유형 조건 노출 + 합계 안내 + RENTAL B3

**Files:**
- Modify: `src/app/(dashboard)/properties/property-form.tsx` (19행 RENTAL, 34행 부근, 59~79행 그룹 렌더)

**Interfaces:**
- Consumes: `PropertyField.trades`(Task 2), `paymentMismatch`(Task 3), 기존 `groupDigits`(`@/lib/properties/format`).

- [ ] **Step 1: RENTAL에 B3 포함**

19행 교체:

```ts
const RENTAL = new Set(["B1", "B2", "B3"]) // 전세·월세·단기임대 → price를 "보증금"으로
```

- [ ] **Step 2: import 추가**

17행 부근 import에 추가:

```ts
import { paymentMismatch } from "@/lib/properties/payment-sum"
```

- [ ] **Step 3: trades 필터 + 합계 계산 적용**

34행 `const isRental = ...` 아래에 추가:

```ts
  const mismatch = values.tradeType === "A1" ? paymentMismatch(values) : null
```

60행 그룹 필드 필터를 교체:

```ts
            const fields = PROPERTY_FIELDS.filter((f) =>
              f.group === group && !formMeta(f).formHidden &&
              (!f.trades || !values.tradeType || f.trades.includes(values.tradeType)))
```

- [ ] **Step 4: 일정 그룹 하단 합계 안내**

그룹 렌더의 `</div>`(grid 닫힘, 76행) 바로 뒤·`</FieldSet>` 앞에 추가:

```tsx
                {group === "일정" && mismatch ? (
                  <p className="text-sm text-muted-foreground">
                    대금 합계 {groupDigits(String(mismatch.sum))}만원 — 가격 {groupDigits(String(mismatch.price))}만원과 다릅니다.
                  </p>
                ) : null}
```

- [ ] **Step 5: 타입·린트 확인**

Run: `pnpm lint 2>&1 | tail -5`
Expected: 에러 없음 (경고 무시)

---

### Task 5: 캘린더 파생 일정에 만기일 추가 (TDD)

**Files:**
- Modify: `src/lib/calendar/property-events.ts` (PROPERTY_DATE_FIELDS, 5~13행)
- Modify: `src/app/(dashboard)/calendar/actions.ts` (property select, 66~71행)
- Test: `src/lib/calendar/property-events.test.ts` (21~24행 기존 테스트 수정)

**Interfaces:**
- Consumes: `leaseEndDate` 컬럼(Task 1).
- Produces: 캘린더에 "{매물명} 만기일" 파생 항목.

- [ ] **Step 1: 기존 테스트를 8종으로 수정 (실패 유도)**

`property-events.test.ts` 21~24행 `it("PROPERTY_DATE_FIELDS 7종...")` 블록을 교체:

```ts
  it("PROPERTY_DATE_FIELDS 8종(사용승인일 제외, 만기일 포함)", () => {
    expect(PROPERTY_DATE_FIELDS).toHaveLength(8);
    expect(PROPERTY_DATE_FIELDS.map((f) => f.key)).toContain("leaseEndDate");
    expect(PROPERTY_DATE_FIELDS.map((f) => f.key)).not.toContain("approvalDate");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test:unit src/lib/calendar/property-events.test.ts`
Expected: FAIL — length 7 ≠ 8

- [ ] **Step 3: 구현**

`property-events.ts` PROPERTY_DATE_FIELDS의 `{ key: "moveInDate", label: "입주일" },` 뒤에 추가:

```ts
  { key: "leaseEndDate", label: "만기일" },
```

`calendar/actions.ts` 68~69행 select에 `leaseEndDate: true,` 추가:

```ts
      contractHopeDate: true, contractDate: true, interim1Date: true, interim2Date: true,
      balanceDate: true, moveInHopeDate: true, moveInDate: true, leaseEndDate: true,
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test:unit src/lib/calendar/property-events.test.ts`
Expected: PASS

---

### Task 6: 계약서 자동기입 — 슬롯 + 인쇄 문서 (TDD)

**Files:**
- Modify: `src/lib/properties/contract-forms.ts` (sale_contract 46~47행, lease_contract 56~62행)
- Modify: `src/app/(dashboard)/properties/[id]/contract/print/contract-document.tsx` (SaleAmount 73~84행, LeaseAmount 86~99행, LeaseContract 존속기간 조문 192행)
- Test: `src/lib/properties/contract-forms.test.ts`

**Interfaces:**
- Consumes: Task 1 컬럼(원 단위 BigInt — 인쇄 페이지에는 `toRow` 직렬화로 string 도달, 기존 `won()` 헬퍼가 그대로 처리).

- [ ] **Step 1: 실패하는 테스트 작성**

`contract-forms.test.ts`의 `describe("FORM_BY_ID 슬롯")` 안에 추가:

```ts
  it("매매계약서 계약금·중도금·잔금 자동기입 슬롯", () => {
    const keys = FORM_BY_ID.sale_contract.slots.map((s) => s.sourceKey);
    expect(keys).toContain("downPayment");
    expect(keys).toContain("interim1Amount");
    expect(keys).toContain("balanceAmount");
  });
  it("임대차계약서 계약금·잔금·만기일 슬롯", () => {
    const keys = FORM_BY_ID.lease_contract.slots.map((s) => s.sourceKey);
    expect(keys).toContain("downPayment");
    expect(keys).toContain("balanceAmount");
    expect(keys).toContain("leaseEndDate");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test:unit src/lib/properties/contract-forms.test.ts`
Expected: FAIL 2건

- [ ] **Step 3: contract-forms.ts 슬롯 교체**

sale_contract slots(43~50행)에서 `{ slot: "계약금(수기)" }, { slot: "잔금(수기)" },`를 교체:

```ts
      { slot: "계약금", sourceKey: "downPayment" },
      { slot: "중도금", sourceKey: "interim1Amount" },
      { slot: "잔금", sourceKey: "balanceAmount" },
```

lease_contract slots(56~62행)에서 `{ slot: "보증금", sourceKey: "price" },` 뒤에 추가:

```ts
      { slot: "계약금", sourceKey: "downPayment" },
      { slot: "잔금", sourceKey: "balanceAmount" },
      { slot: "만기일", sourceKey: "leaseEndDate" },
```

(기존 "상대 당사자 수기란" 테스트는 PARTY_SLOTS의 수기 슬롯으로 계속 통과.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test:unit src/lib/properties/contract-forms.test.ts`
Expected: PASS 전건

- [ ] **Step 5: 인쇄 문서 자동기입**

`contract-document.tsx` SaleAmount(73~84행) 교체:

```tsx
function SaleAmount({ p }: { p: P }) {
  const hasInterim2 = Boolean(p.interim2Amount || p.interim2Date);
  return (
    <table className="w-full border-collapse border border-black">
      <tbody>
        <AmountRow label="매매대금" amount={won(p.price)} note="아래 지불방법에 따라 지불한다." />
        <AmountRow label="계약금" amount={won(p.downPayment)} note="계약 체결 시 지불하고 영수함." />
        <AmountRow label={hasInterim2 ? "중도금(1차)" : "중도금"} amount={won(p.interim1Amount)} note={<>지불일&nbsp;<Fill value={ymd(p.interim1Date)} w="55%" /></>} />
        {hasInterim2 ? (
          <AmountRow label="중도금(2차)" amount={won(p.interim2Amount)} note={<>지불일&nbsp;<Fill value={ymd(p.interim2Date)} w="55%" /></>} />
        ) : null}
        <AmountRow label="잔 금" amount={won(p.balanceAmount)} note={<>지불일&nbsp;<Fill value={ymd(p.balanceDate)} w="55%" /></>} />
      </tbody>
    </table>
  );
}
```

LeaseAmount(86~99행)에서 계약금·잔금 행 교체:

```tsx
        <AmountRow label="계약금" amount={won(p.downPayment)} note="계약 체결 시 지불하고 영수함." />
        <AmountRow label="잔 금" amount={won(p.balanceAmount)} note={<>지불일&nbsp;<Fill value={ymd(p.balanceDate)} w="55%" /></>} />
```

LeaseContract 존속기간 조문(192행)을 만기일 자동기입으로 교체:

```ts
    ["존속기간", `임대인은 위 부동산을 임대차 목적대로 사용·수익할 수 있는 상태로 인도하며, 임대차 기간은 인도일로부터 ${p.leaseEndDate ? ymd(p.leaseEndDate) : "___"} 까지로 한다.`],
```

- [ ] **Step 6: 린트 확인**

Run: `pnpm lint 2>&1 | tail -5`
Expected: 에러 없음

---

### Task 7: 통합 검증 — 단위 전체 + 빌드 + 브라우저 E2E

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 단위 테스트 전체**

Run: `pnpm test:unit`
Expected: 전 스위트 PASS (fields·payment-sum·property-events·contract-forms 포함)

- [ ] **Step 2: 프로덕션 빌드**

Run: `pnpm build 2>&1 | tail -10`
Expected: 빌드 성공(타입 에러 없음)

- [ ] **Step 3: dev 서버 + Playwright 수동 E2E**

Run: `nohup pnpm exec next dev -p 3003 > /tmp/dev3003.log 2>&1 &` 후 Playwright MCP로 `http://localhost:3003/properties/new` 접속(로그인 필요 시 기존 계정), 확인 항목:

1. 거래유형 **매매** 선택 → 일정 그룹에 중도금1·중도금1일·중도금2·중도금2일 **표시**, 만기일 **숨김**
2. 거래유형 **전세** 선택 → 중도금 4필드 **숨김**, 만기일 **표시**
3. 매매에서 가격 85000 / 계약금 8000 / 잔금 50000 입력 → "대금 합계 58,000만원 — 가격 85,000만원과 다릅니다" 안내 표시, 중도금1 20000·중도금2 7000 추가 입력 → 안내 사라짐
4. 저장 → 목록 → 재편집 진입 → 계약금·중도금·잔금·만기일 값 왕복 확인
5. 해당 매물 계약서 인쇄 미리보기(`/properties/[id]/contract/print?form=sale_contract`) → 계약금·중도금·잔금 금액 자동기입 확인
6. 캘린더(`/calendar`)에서 전세 매물의 만기일 파생 항목 표시 확인

- [ ] **Step 4: dev 서버 종료**

Run: `kill $(ss -ltnp 2>/dev/null | grep ":3003 " | grep -oP 'pid=\K[0-9]+' | head -1)`

---

### Task 8: 마무리 — 문서 갱신 + commit 제안 (메인 세션 전용, 사용자 승인 필요)

**Files:**
- Modify: `README.md` §현재 반영 상태
- Modify: `docs/PROJECT_GUIDE.md` §현재 참고 상태

- [ ] **Step 1: 문서 갱신**

README §현재 반영 상태 끝에 추가(한두 줄): 매물 일정 그룹을 실거래 흐름으로 재구성 — 대금(계약금·중도금1/2·잔금 금액)·임대차 만기일 추가, 거래유형별 조건 노출(중도금=매매만·만기일=임대차만), 매매 대금 합계 안내, 계약서 인쇄 계약금·중도금·잔금·만기일 자동기입, 캘린더 만기일 파생. ⚠️ 엑셀 헤더 "중도금1"은 이제 금액(날짜는 "중도금1일").

PROJECT_GUIDE §현재 참고 상태 끝에 대응 항목 추가(스키마 컬럼명·trades 속성·paymentMismatch 헬퍼 언급).

- [ ] **Step 2: git status 확인 + commit 초안 제시**

Run: `git status --short`
변경 파일이 계획 범위(schema.prisma·migrations·fields·payment-sum·property-form·property-events·calendar actions·contract-forms·contract-document·테스트·문서)인지 확인. commit 초안을 사용자에게 제시하고 **"이대로 commit 할까요?"** 승인 대기. 메시지 끝에 `문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태` 필수.

- [ ] **Step 3: 반영 안내**

commit 후 웹 반영은 사용자가 `run-prod.sh` 재기동(또는 지시 시 실행). push는 명시 지시가 있을 때만.
