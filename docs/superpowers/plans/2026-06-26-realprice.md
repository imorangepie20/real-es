# 부동산 실거래가 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거래유형·매물유형·지역(시군구)·기간 선택 시 국토부 실거래 API로 자료를 받아 지도·그리드·통계로 보여주는 `/dashboard/realprice` 페이지를 만든다.

**Architecture:** 순수 데이터 계층(`src/lib/realprice/`: 엔드포인트 레지스트리·정규화·통계) + 서버 fetch(키·월루프·DB 캐시) + 서버 액션 + 클라 뷰(필터·지도·통계·그리드). 좌표 없는 응답 → 동 집계(LegalDivision 좌표) + 단지 지오코딩(VWorld/GeocodeCache).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6/PostgreSQL, Tailwind v4, Base UI, `fast-xml-parser`, vitest, pnpm. 설계: [docs/superpowers/specs/2026-06-26-realprice-design.md](../specs/2026-06-26-realprice-design.md).

## Global Constraints

- 응답·UI 카피·주석 **한국어**, 식별자 영문. 템플릿/기존 패턴 우선, 임의 px/hex 금지.
- **`PUBLIC_DATA_API_KEY`(서버 전용)** — 클라 번들·로그·커밋·git에 절대 노출 금지. 호출은 서버에서만.
- 실거래 전용 유형/엔드포인트는 `realprice/endpoints.ts` 단일 정의. money는 만원(API)→원 정규화.
- DB 변경은 **비파괴 마이그레이션**. `db.property`처럼 `db` 싱글톤(`@/lib/db`) 사용. 보호 라우트는 `requireUser()`(`@/lib/auth/current-user` 또는 properties/actions 패턴).
- 검증: 순수 `pnpm exec vitest run <file>`, 타입 `pnpm exec tsc --noEmit`, 린트 `pnpm exec eslint <files>`, 빌드 `pnpm build`. **실 API end-to-end는 한국 prod 서버에서만**(샌드박스 403).
- ⛔ 서브에이전트: `git restore/checkout/clean/stash/reset` 금지, `git add`는 명시 파일만, `docs/project_structure.md`·`매물_샘플_*.xlsx`·`.env`·README/PROJECT_GUIDE 손대지 말 것(README/GUIDE는 컨트롤러가 마감에 일괄).

---

## File Structure

| 파일 | 책임 | 태스크 |
|---|---|---|
| `prisma/schema.prisma` + 마이그레이션 | `RealTxCache`·`GeocodeCache` | 1 |
| `package.json` | `fast-xml-parser` 의존 | 1 |
| `src/lib/nav.ts` | "실거래가" 메뉴 | 1 |
| `src/lib/realprice/types.ts` | `RealTxRecord`·`RealTradeKind`·`RealStats` | 2 |
| `src/lib/realprice/endpoints.ts` (+test) | 엔드포인트·필드맵·유형목록 단일소스 | 2 |
| `src/lib/realprice/normalize.ts` (+test) | 응답 파싱(XML/JSON)·유형별 정규화 | 3 |
| `src/lib/realprice/stats.ts` (+test) | 통계 계산 | 4 |
| `src/lib/realprice/fetch.ts` (+test) | recentMonths(순수)+서버 호출·캐시 | 5 |
| `src/lib/realprice/geocode.ts` | VWorld 지오코딩·GeocodeCache | 6 |
| `.../dashboard/realprice/actions.ts` | `loadRealPrice`·동집계 | 6 |
| `.../dashboard/realprice/page.tsx`·`realprice-view.tsx` | 페이지·필터·그리드·엑셀 | 7 |
| `.../dashboard/realprice/stats-panel.tsx` | 통계 카드·차트·면적분포 | 8 |
| `.../dashboard/realprice/realprice-map.tsx` | 동집계→단지 지도 | 9 |
| `src/app/api/realprice/export/route.ts` | 엑셀 다운로드 | 7 |

---

## Task 1: 스키마·의존성·메뉴

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/nav.ts`
- Run: pnpm add

**Interfaces:**
- Produces: `RealTxCache`·`GeocodeCache` 모델, `fast-xml-parser` 사용 가능, nav "실거래가" 항목.

- [ ] **Step 1: 의존성 추가**

Run: `pnpm add fast-xml-parser`
Expected: `package.json` dependencies에 `fast-xml-parser` 추가.

- [ ] **Step 2: schema에 캐시 모델 추가**

`prisma/schema.prisma` 끝에 추가:
```prisma
model RealTxCache {
  id           String   @id @default(cuid())
  lawdCd       String
  dealYmd      String
  propertyType String
  kind         String
  records      Json
  totalCount   Int      @default(0)
  fetchedAt    DateTime @default(now())

  @@unique([lawdCd, dealYmd, propertyType, kind])
}

model GeocodeCache {
  id        String   @id @default(cuid())
  query     String   @unique
  lat       Float?
  lng       Float?
  fetchedAt DateTime @default(now())
}
```

- [ ] **Step 3: 마이그레이션**

Run: `pnpm exec prisma migrate dev --name add_realprice_cache`
Expected: `ADD ... CREATE TABLE "RealTxCache" / "GeocodeCache"` 적용, prisma generate.

- [ ] **Step 4: nav 메뉴 추가**

`src/lib/nav.ts`를 Read해 기존 항목 형식 확인 후, "매물 관리" 그룹/항목 인근에 동일 형식으로 추가(예시 — 실제 타입/아이콘은 기존 패턴 따름):
```ts
  { title: "실거래가", url: "/dashboard/realprice", icon: TrendingUp },
```
(아이콘은 기존 import된 lucide 아이콘 중 적절한 것. 없으면 기존 사용 아이콘 재사용.)

- [ ] **Step 5: 검증·커밋**

Run: `pnpm exec tsc --noEmit`
Expected: 에러 없음.
```bash
git add prisma/schema.prisma prisma/migrations package.json pnpm-lock.yaml src/lib/nav.ts
git commit -m "feat(realprice): 캐시 모델·fast-xml-parser·메뉴 추가"
```

---

## Task 2: 엔드포인트 레지스트리·타입 (TDD)

**Files:**
- Create: `src/lib/realprice/types.ts`, `src/lib/realprice/endpoints.ts`, `src/lib/realprice/endpoints.test.ts`

**Interfaces:**
- Produces:
  - `type RealTradeKind = "sale" | "rent"`
  - `type RealTxRecord = { propertyType: string; kind: RealTradeKind; name: string; umdNm: string; jibun: string; roadNm?: string; area: number | null; dealAmount?: number | null; deposit?: number | null; monthlyRent?: number | null; floor?: number | null; buildYear?: number | null; dealDate: string; isRenewal?: boolean; preDeposit?: number | null; preMonthlyRent?: number | null; isCanceled?: boolean }`
  - `type RealEndpoint = { service: string; areaKind: "전용" | "연" | "대지" | "토지" | "건물"; nameField: string; fieldMap: Record<string, keyof RealTxRecord> }`
  - `REALPRICE_PROPERTY_TYPES: { value: string; label: string; sale: boolean; rent: boolean }[]`
  - `endpointFor(propertyType: string, kind: RealTradeKind): RealEndpoint | null`
  - `operationUrl(service: string): string` (= `https://apis.data.go.kr/1613000/${service}/get${service}`)

- [ ] **Step 1: 실패 테스트**

`src/lib/realprice/endpoints.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { endpointFor, REALPRICE_PROPERTY_TYPES, operationUrl } from "./endpoints";

describe("endpointFor", () => {
  it("아파트 매매/전월세 둘 다 지원", () => {
    expect(endpointFor("apt", "sale")?.service).toBe("RTMSDataSvcAptTradeDev");
    expect(endpointFor("apt", "rent")?.service).toBe("RTMSDataSvcAptRent");
  });
  it("토지·상업업무용은 매매만(전월세 null)", () => {
    expect(endpointFor("land", "sale")?.service).toBe("RTMSDataSvcLandTrade");
    expect(endpointFor("land", "rent")).toBeNull();
    expect(endpointFor("nrg", "rent")).toBeNull();
  });
  it("아파트 전월세 fieldMap이 deposit·monthlyRent·aptNm 매핑", () => {
    const fm = endpointFor("apt", "rent")!.fieldMap;
    expect(fm.deposit).toBe("deposit");
    expect(fm.aptNm).toBe("name");
    expect(fm.monthlyRent).toBe("monthlyRent");
  });
  it("토지는 거래면적·지목, 단지명/층 없음", () => {
    const e = endpointFor("land", "sale")!;
    expect(e.areaKind).toBe("토지");
    expect(e.nameField).toBe("jimok");
  });
});

describe("REALPRICE_PROPERTY_TYPES", () => {
  it("6종, 토지·상업용은 rent=false", () => {
    expect(REALPRICE_PROPERTY_TYPES).toHaveLength(6);
    const land = REALPRICE_PROPERTY_TYPES.find((t) => t.value === "land")!;
    expect(land.rent).toBe(false);
  });
});

describe("operationUrl", () => {
  it("service로 풀 URL 생성", () => {
    expect(operationUrl("RTMSDataSvcAptRent")).toBe("https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/realprice/endpoints.test.ts`
Expected: FAIL (import 해결 실패).

- [ ] **Step 3: types.ts**

```ts
// 실거래 정규화 타입.
export type RealTradeKind = "sale" | "rent"; // 매매 / 전월세

export type RealTxRecord = {
  propertyType: string;
  kind: RealTradeKind;
  name: string;          // 단지명(없으면 주택유형/지목)
  umdNm: string;         // 법정동
  jibun: string;
  roadNm?: string;
  area: number | null;   // ㎡
  dealAmount?: number | null;   // 매매(원)
  deposit?: number | null;      // 임대 보증금(원)
  monthlyRent?: number | null;  // 임대 월세(원)
  floor?: number | null;
  buildYear?: number | null;
  dealDate: string;      // YYYYMMDD
  isRenewal?: boolean;   // 임대 갱신
  preDeposit?: number | null;
  preMonthlyRent?: number | null;
  isCanceled?: boolean;  // 매매 해제거래
};

export type RealStats = {
  count: number;
  avgPrice: number | null;     // 매매=dealAmount / 임대=deposit (원)
  medianPrice: number | null;
  avgPerArea: number | null;   // ㎡당 평균(원)
  byArea: { label: string; count: number }[];
  byMonth: { ym: string; count: number; avgPrice: number | null }[];
  canceledRatio?: number;      // 매매
  jeonseRatio?: number;        // 임대(전세 비중)
  renewalRatio?: number;       // 임대(갱신 비중)
  avgRentIncrease?: number | null; // 임대 갱신 인상률(%)
};
```

- [ ] **Step 4: endpoints.ts**

```ts
import type { RealTradeKind, RealTxRecord } from "./types";

export type RealEndpoint = {
  service: string;
  areaKind: "전용" | "연" | "대지" | "토지" | "건물";
  nameField: string;                                  // 레코드 name 으로 쓸 원본 필드
  fieldMap: Record<string, keyof RealTxRecord>;        // 원본필드 → RealTxRecord 키
};

export const REALPRICE_PROPERTY_TYPES: { value: string; label: string; sale: boolean; rent: boolean }[] = [
  { value: "apt", label: "아파트", sale: true, rent: true },
  { value: "offi", label: "오피스텔", sale: true, rent: true },
  { value: "rh", label: "연립다세대", sale: true, rent: true },
  { value: "sh", label: "단독/다가구", sale: true, rent: true },
  { value: "land", label: "토지", sale: true, rent: false },
  { value: "nrg", label: "상업업무용", sale: true, rent: false },
];

// 공통 매매 필드 + 유형별 단지명/면적 필드. (아파트 전월세는 공개 스펙 확정, 그 외는 data.go.kr 문서 기준 — 첫 라이브에서 검증)
const DATE = { dealYear: "dealDate", dealMonth: "dealDate", dealDay: "dealDate" } as const; // dealDate는 normalize에서 조립
const ENDPOINTS: Record<string, { sale?: Omit<RealEndpoint, "service"> & { service: string }; rent?: Omit<RealEndpoint, "service"> & { service: string } }> = {
  apt: {
    sale: { service: "RTMSDataSvcAptTradeDev", areaKind: "전용", nameField: "aptNm",
      fieldMap: { aptNm: "name", umdNm: "umdNm", jibun: "jibun", roadNm: "roadNm", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", cdealType: "isCanceled", ...DATE } },
    rent: { service: "RTMSDataSvcAptRent", areaKind: "전용", nameField: "aptNm",
      fieldMap: { aptNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", contractType: "isRenewal", preDeposit: "preDeposit", preMonthlyRent: "preMonthlyRent", ...DATE } },
  },
  offi: {
    sale: { service: "RTMSDataSvcOffiTrade", areaKind: "전용", nameField: "offiNm",
      fieldMap: { offiNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcOffiRent", areaKind: "전용", nameField: "offiNm",
      fieldMap: { offiNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", ...DATE } },
  },
  rh: {
    sale: { service: "RTMSDataSvcRHTrade", areaKind: "전용", nameField: "mhouseNm",
      fieldMap: { mhouseNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", dealAmount: "dealAmount", floor: "floor", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcRHRent", areaKind: "전용", nameField: "mhouseNm",
      fieldMap: { mhouseNm: "name", umdNm: "umdNm", jibun: "jibun", excluUseAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", floor: "floor", buildYear: "buildYear", ...DATE } },
  },
  sh: {
    sale: { service: "RTMSDataSvcSHTrade", areaKind: "연", nameField: "houseType",
      fieldMap: { houseType: "name", umdNm: "umdNm", jibun: "jibun", totalFloorAr: "area", dealAmount: "dealAmount", buildYear: "buildYear", ...DATE } },
    rent: { service: "RTMSDataSvcSHRent", areaKind: "연", nameField: "houseType",
      fieldMap: { houseType: "name", umdNm: "umdNm", totalFloorAr: "area", deposit: "deposit", monthlyRent: "monthlyRent", buildYear: "buildYear", contractType: "isRenewal", ...DATE } },
  },
  land: {
    sale: { service: "RTMSDataSvcLandTrade", areaKind: "토지", nameField: "jimok",
      fieldMap: { jimok: "name", umdNm: "umdNm", jibun: "jibun", dealArea: "area", dealAmount: "dealAmount", ...DATE } },
  },
  nrg: {
    sale: { service: "RTMSDataSvcNrgTrade", areaKind: "건물", nameField: "buildingType",
      fieldMap: { buildingType: "name", umdNm: "umdNm", jibun: "jibun", buildingAr: "area", dealAmount: "dealAmount", buildYear: "buildYear", floor: "floor", ...DATE } },
  },
};

export function endpointFor(propertyType: string, kind: RealTradeKind): RealEndpoint | null {
  const e = ENDPOINTS[propertyType]?.[kind];
  return e ? { service: e.service, areaKind: e.areaKind, nameField: e.nameField, fieldMap: e.fieldMap } : null;
}

export function operationUrl(service: string): string {
  return `https://apis.data.go.kr/1613000/${service}/get${service}`;
}
```

- [ ] **Step 5: 통과 확인·커밋**

Run: `pnpm exec vitest run src/lib/realprice/endpoints.test.ts`
Expected: PASS.
```bash
git add src/lib/realprice/types.ts src/lib/realprice/endpoints.ts src/lib/realprice/endpoints.test.ts
git commit -m "feat(realprice): 엔드포인트 레지스트리·정규화 타입(순수)+테스트"
```

---

## Task 3: 응답 파싱·정규화 (TDD)

**Files:**
- Create: `src/lib/realprice/normalize.ts`, `src/lib/realprice/normalize.test.ts`

**Interfaces:**
- Consumes: `endpointFor`, `RealTxRecord`, `RealTradeKind` (Task 2).
- Produces:
  - `parseResponse(body: string): { resultCode: string; items: Record<string, string>[]; totalCount: number }`
  - `normalizeItems(items: Record<string, string>[], propertyType: string, kind: RealTradeKind): RealTxRecord[]`

- [ ] **Step 1: 실패 테스트**

`src/lib/realprice/normalize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseResponse, normalizeItems } from "./normalize";

const aptRentXml = `<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
<body><items>
<item><aptNm>개포자이</aptNm><umdNm>개포동</umdNm><jibun>12-2</jibun><excluUseAr>84.97</excluUseAr>
<dealYear>2026</dealYear><dealMonth>5</dealMonth><dealDay>3</dealDay>
<deposit>120,000</deposit><monthlyRent>0</monthlyRent><floor>10</floor><buildYear>2004</buildYear>
<contractType>갱신</contractType><preDeposit>100,000</preDeposit><preMonthlyRent>0</preMonthlyRent></item>
</items><totalCount>1</totalCount><numOfRows>10</numOfRows><pageNo>1</pageNo></body></response>`;

describe("parseResponse", () => {
  it("XML에서 resultCode·items·totalCount 추출", () => {
    const r = parseResponse(aptRentXml);
    expect(r.resultCode).toBe("000");
    expect(r.totalCount).toBe(1);
    expect(r.items[0].aptNm).toBe("개포자이");
  });
  it("item 1건일 때도 배열로", () => {
    expect(Array.isArray(parseResponse(aptRentXml).items)).toBe(true);
  });
  it("JSON 응답도 파싱", () => {
    const json = JSON.stringify({ response: { header: { resultCode: "000" }, body: { items: { item: { aptNm: "A", deposit: "1,000" } }, totalCount: 1 } } });
    const r = parseResponse(json);
    expect(r.resultCode).toBe("000");
    expect(r.items[0].aptNm).toBe("A");
  });
});

describe("normalizeItems 아파트 전월세", () => {
  const recs = normalizeItems(parseResponse(aptRentXml).items, "apt", "rent");
  it("만원→원·전세 분기·날짜 조립·갱신 플래그", () => {
    const r = recs[0];
    expect(r.name).toBe("개포자이");
    expect(r.deposit).toBe(1_200_000_000);  // 120,000만원 → 원
    expect(r.monthlyRent).toBe(0);
    expect(r.dealDate).toBe("20260503");
    expect(r.area).toBeCloseTo(84.97);
    expect(r.isRenewal).toBe(true);
    expect(r.preDeposit).toBe(1_000_000_000);
    expect(r.kind).toBe("rent");
  });
});

describe("normalizeItems 매매 해제거래", () => {
  const saleXml = `<response><header><resultCode>000</resultCode></header><body><items>
  <item><aptNm>X</aptNm><umdNm>역삼동</umdNm><jibun>1</jibun><excluUseAr>59.9</excluUseAr>
  <dealAmount>250,000</dealAmount><dealYear>2026</dealYear><dealMonth>4</dealMonth><dealDay>1</dealDay>
  <floor>5</floor><buildYear>2010</buildYear><cdealType>O</cdealType></item>
  </items><totalCount>1</totalCount></body></response>`;
  it("dealAmount 원 변환·해제거래 플래그", () => {
    const r = normalizeItems(parseResponse(saleXml).items, "apt", "sale")[0];
    expect(r.dealAmount).toBe(2_500_000_000);
    expect(r.isCanceled).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/realprice/normalize.test.ts`
Expected: FAIL.

- [ ] **Step 3: normalize.ts**

```ts
import { XMLParser } from "fast-xml-parser";
import { endpointFor } from "./endpoints";
import type { RealTradeKind, RealTxRecord } from "./types";

const xml = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });

function toArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

export function parseResponse(body: string): { resultCode: string; items: Record<string, string>[]; totalCount: number } {
  const obj = body.trimStart().startsWith("<") ? xml.parse(body) : JSON.parse(body);
  const res = obj.response ?? obj;
  const header = res.header ?? {};
  const b = res.body ?? {};
  const items = toArray<Record<string, string>>(b.items?.item);
  return { resultCode: String(header.resultCode ?? ""), items, totalCount: Number(b.totalCount ?? items.length) };
}

const num = (s: string | undefined): number | null => {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const manwon = (s: string | undefined): number | null => { const n = num(s); return n == null ? null : n * 10000; };

export function normalizeItems(items: Record<string, string>[], propertyType: string, kind: RealTradeKind): RealTxRecord[] {
  const ep = endpointFor(propertyType, kind);
  if (!ep) return [];
  return items.map((it) => {
    const r: RealTxRecord = { propertyType, kind, name: "", umdNm: "", jibun: "", area: null, dealDate: "" };
    r.name = String(it[ep.nameField] ?? "").trim();
    r.umdNm = String(it.umdNm ?? "").trim();
    r.jibun = String(it.jibun ?? "").trim();
    if (it.roadNm) r.roadNm = String(it.roadNm).trim();
    // 면적
    const areaField = Object.keys(ep.fieldMap).find((k) => ep.fieldMap[k] === "area");
    if (areaField) r.area = num(it[areaField]);
    // 금액
    if (kind === "sale") { r.dealAmount = manwon(it.dealAmount); r.isCanceled = String(it.cdealType ?? "").trim() === "O"; }
    else { r.deposit = manwon(it.deposit); r.monthlyRent = manwon(it.monthlyRent); }
    if (it.floor != null) r.floor = num(it.floor) == null ? null : Math.trunc(num(it.floor)!);
    if (it.buildYear != null) r.buildYear = num(it.buildYear) == null ? null : Math.trunc(num(it.buildYear)!);
    // 날짜
    const y = String(it.dealYear ?? "").padStart(4, "0");
    const m = String(it.dealMonth ?? "").padStart(2, "0");
    const d = String(it.dealDay ?? "").padStart(2, "0");
    r.dealDate = y.length === 4 ? `${y}${m}${d}` : "";
    // 임대 부가
    if (kind === "rent") {
      r.isRenewal = String(it.contractType ?? "").trim() === "갱신";
      r.preDeposit = manwon(it.preDeposit);
      r.preMonthlyRent = manwon(it.preMonthlyRent);
    }
    return r;
  });
}
```

- [ ] **Step 4: 통과 확인·커밋**

Run: `pnpm exec vitest run src/lib/realprice/normalize.test.ts`
Expected: PASS.
```bash
git add src/lib/realprice/normalize.ts src/lib/realprice/normalize.test.ts
git commit -m "feat(realprice): 응답 파싱(XML/JSON)·유형별 정규화(순수)+테스트"
```

---

## Task 4: 통계 (TDD)

**Files:**
- Create: `src/lib/realprice/stats.ts`, `src/lib/realprice/stats.test.ts`

**Interfaces:**
- Consumes: `RealTxRecord`, `RealStats` (Task 2).
- Produces: `computeStats(records: RealTxRecord[]): RealStats`

- [ ] **Step 1: 실패 테스트**

`src/lib/realprice/stats.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";
import type { RealTxRecord } from "./types";

const sale = (amt: number, area: number, ym: string, canceled = false): RealTxRecord => ({
  propertyType: "apt", kind: "sale", name: "A", umdNm: "역삼동", jibun: "1", area, dealAmount: amt, dealDate: `${ym}15`, isCanceled: canceled,
});

describe("computeStats 매매", () => {
  const recs = [sale(1_000_000_000, 50, "202604"), sale(2_000_000_000, 100, "202605"), sale(3_000_000_000, 100, "202605", true)];
  const s = computeStats(recs);
  it("건수·평균·중위·㎡당·월별·해제비중", () => {
    expect(s.count).toBe(3);
    expect(s.avgPrice).toBe(2_000_000_000);
    expect(s.medianPrice).toBe(2_000_000_000);
    expect(s.avgPerArea).toBeGreaterThan(0);
    expect(s.byMonth.find((m) => m.ym === "202605")!.count).toBe(2);
    expect(s.canceledRatio).toBeCloseTo(1 / 3);
  });
});

describe("computeStats 임대(전세/월세·갱신 인상률)", () => {
  const rent = (dep: number, mon: number, ren = false, pre?: number): RealTxRecord => ({
    propertyType: "apt", kind: "rent", name: "A", umdNm: "역삼동", jibun: "1", area: 84, deposit: dep, monthlyRent: mon, dealDate: "20260515", isRenewal: ren, preDeposit: pre ?? null,
  });
  const s = computeStats([rent(1_000_000_000, 0), rent(500_000_000, 1_000_000), rent(1_100_000_000, 0, true, 1_000_000_000)]);
  it("전세비중·갱신비중·인상률", () => {
    expect(s.jeonseRatio).toBeCloseTo(2 / 3);
    expect(s.renewalRatio).toBeCloseTo(1 / 3);
    expect(s.avgRentIncrease).toBeCloseTo(10); // (11억-10억)/10억 = 10%
  });
});

describe("빈 입력", () => {
  it("count 0·평균 null", () => {
    const s = computeStats([]);
    expect(s.count).toBe(0);
    expect(s.avgPrice).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/realprice/stats.test.ts`
Expected: FAIL.

- [ ] **Step 3: stats.ts**

```ts
import type { RealStats, RealTxRecord } from "./types";

const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const AREA_BANDS = [
  { label: "~60㎡", max: 60 }, { label: "60~85㎡", max: 85 }, { label: "85~135㎡", max: 135 }, { label: "135㎡~", max: Infinity },
];

export function computeStats(records: RealTxRecord[]): RealStats {
  const prices = records.map(price).filter((v): v is number => v != null);
  const perArea = records.map((r) => { const p = price(r); return p != null && r.area ? p / r.area : null; }).filter((v): v is number => v != null);
  const byArea = AREA_BANDS.map((b, i) => ({
    label: b.label,
    count: records.filter((r) => r.area != null && r.area < b.max && (i === 0 || r.area >= AREA_BANDS[i - 1].max)).length,
  }));
  const months = [...new Set(records.map((r) => r.dealDate.slice(0, 6)).filter(Boolean))].sort();
  const byMonth = months.map((ym) => {
    const rs = records.filter((r) => r.dealDate.startsWith(ym));
    return { ym, count: rs.length, avgPrice: mean(rs.map(price).filter((v): v is number => v != null)) };
  });

  const stats: RealStats = {
    count: records.length, avgPrice: mean(prices), medianPrice: median(prices), avgPerArea: mean(perArea), byArea, byMonth,
  };
  if (records.length && records[0].kind === "sale") {
    stats.canceledRatio = records.filter((r) => r.isCanceled).length / records.length;
  }
  if (records.length && records[0].kind === "rent") {
    stats.jeonseRatio = records.filter((r) => (r.monthlyRent ?? 0) === 0).length / records.length;
    stats.renewalRatio = records.filter((r) => r.isRenewal).length / records.length;
    const incs = records
      .filter((r) => r.isRenewal && r.preDeposit && r.deposit)
      .map((r) => ((r.deposit! - r.preDeposit!) / r.preDeposit!) * 100);
    stats.avgRentIncrease = mean(incs);
  }
  return stats;
}
```

- [ ] **Step 4: 통과 확인·커밋**

Run: `pnpm exec vitest run src/lib/realprice/stats.test.ts`
Expected: PASS.
```bash
git add src/lib/realprice/stats.ts src/lib/realprice/stats.test.ts
git commit -m "feat(realprice): 실거래 통계 계산(순수)+테스트"
```

---

## Task 5: fetch·캐시 (recentMonths TDD + 서버 호출)

**Files:**
- Create: `src/lib/realprice/fetch.ts`, `src/lib/realprice/fetch.test.ts`

**Interfaces:**
- Consumes: `endpointFor`/`operationUrl` (T2), `parseResponse`/`normalizeItems` (T3), `db`(`@/lib/db`), `RealTxRecord`/`RealTradeKind`.
- Produces:
  - `recentMonths(n: number, fromYmd: string): string[]` (예: `recentMonths(3, "202606")` → `["202604","202605","202606"]`)
  - `fetchRealTransactions(args: { lawdCd: string; propertyType: string; kind: RealTradeKind; months: string[] }): Promise<{ records: RealTxRecord[]; failedMonths: string[] }>`

- [ ] **Step 1: 실패 테스트(순수 recentMonths만)**

`src/lib/realprice/fetch.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { recentMonths } from "./fetch";

describe("recentMonths", () => {
  it("최근 N개월 YYYYMM 오름차순", () => {
    expect(recentMonths(3, "202606")).toEqual(["202604", "202605", "202606"]);
  });
  it("연 경계 처리", () => {
    expect(recentMonths(3, "202602")).toEqual(["202512", "202601", "202602"]);
  });
});
```
(서버 호출 `fetchRealTransactions`는 네트워크·DB 의존 → 단위테스트 없이 tsc/build로 검증. 순수 `recentMonths`만 TDD.)

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/realprice/fetch.test.ts`
Expected: FAIL.

- [ ] **Step 3: fetch.ts**

```ts
import { db } from "@/lib/db";
import { endpointFor, operationUrl } from "./endpoints";
import { parseResponse, normalizeItems } from "./normalize";
import type { RealTradeKind, RealTxRecord } from "./types";

export function recentMonths(n: number, fromYmd: string): string[] {
  const y = Number(fromYmd.slice(0, 4)); const m = Number(fromYmd.slice(4, 6));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const FRESH_MS = 24 * 60 * 60 * 1000; // 당월·전월 캐시 TTL

async function fetchMonth(lawdCd: string, dealYmd: string, propertyType: string, kind: RealTradeKind, currentYmd: string): Promise<RealTxRecord[] | null> {
  const ep = endpointFor(propertyType, kind);
  if (!ep) return [];
  const cached = await db.realTxCache.findUnique({ where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } } });
  const recent = dealYmd >= recentMonths(2, currentYmd)[0]; // 당월·전월만 TTL
  if (cached && (!recent || Date.now() - cached.fetchedAt.getTime() < FRESH_MS)) {
    return cached.records as unknown as RealTxRecord[];
  }
  const key = process.env.PUBLIC_DATA_API_KEY ?? "";
  const url = new URL(operationUrl(ep.service));
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("LAWD_CD", lawdCd);
  url.searchParams.set("DEAL_YMD", dealYmd);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");
  let res: Response;
  try { res = await fetch(url, { cache: "no-store" }); } catch { return null; }
  if (!res.ok) return null;
  const parsed = parseResponse(await res.text());
  if (parsed.resultCode && parsed.resultCode !== "000") return null;
  const records = normalizeItems(parsed.items, propertyType, kind);
  await db.realTxCache.upsert({
    where: { lawdCd_dealYmd_propertyType_kind: { lawdCd, dealYmd, propertyType, kind } },
    create: { lawdCd, dealYmd, propertyType, kind, records: records as unknown as object, totalCount: parsed.totalCount },
    update: { records: records as unknown as object, totalCount: parsed.totalCount, fetchedAt: new Date() },
  });
  return records;
}

export async function fetchRealTransactions(args: { lawdCd: string; propertyType: string; kind: RealTradeKind; months: string[] }): Promise<{ records: RealTxRecord[]; failedMonths: string[] }> {
  const now = new Date();
  const currentYmd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const records: RealTxRecord[] = [];
  const failedMonths: string[] = [];
  for (const ymd of args.months) {
    const r = await fetchMonth(args.lawdCd, ymd, args.propertyType, args.kind, currentYmd);
    if (r == null) failedMonths.push(ymd); else records.push(...r);
  }
  return { records, failedMonths };
}
```

- [ ] **Step 4: 통과·정적검증·커밋**

Run: `pnpm exec vitest run src/lib/realprice/fetch.test.ts && pnpm exec tsc --noEmit`
Expected: vitest PASS, tsc 0. (Prisma 복합 unique 키 이름 `lawdCd_dealYmd_propertyType_kind`는 generate된 클라이언트와 일치 — 불일치 시 tsc가 잡음.)
```bash
git add src/lib/realprice/fetch.ts src/lib/realprice/fetch.test.ts
git commit -m "feat(realprice): 월별 API 호출·DB 캐시·recentMonths(+test)"
```

---

## Task 6: 지오코딩·서버 액션

**Files:**
- Create: `src/lib/realprice/geocode.ts`, `src/app/(dashboard)/dashboard/realprice/actions.ts`

**Interfaces:**
- Consumes: `fetchRealTransactions`/`recentMonths` (T5), `computeStats` (T4), `db`, VWORLD_API_KEY, `LegalDivision`(법정동+좌표), `RealTxRecord`/`RealStats`.
- Produces:
  - `geocode(query: string): Promise<{ lat: number; lng: number } | null>` (GeocodeCache 우선)
  - `loadRealPrice(filters: { lawdCd: string; propertyType: string; kind: RealTradeKind; months: number }): Promise<{ records: RealTxRecord[]; stats: RealStats; byDong: { umdNm: string; count: number; avg: number | null; lat: number | null; lng: number | null }[]; failedMonths: string[] }>`

- [ ] **Step 1: geocode.ts (VWorld + 캐시)**

`src/lib/naver/` 내 기존 VWorld 호출 방식을 Read해 동일 패턴으로 작성. 없으면:
```ts
import { db } from "@/lib/db";

export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const c = await db.geocodeCache.findUnique({ where: { query } });
  if (c) return c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
  const key = process.env.VWORLD_API_KEY ?? "";
  const url = new URL("https://api.vworld.kr/req/address");
  url.searchParams.set("service", "address"); url.searchParams.set("request", "getcoord");
  url.searchParams.set("type", "road"); url.searchParams.set("address", query);
  url.searchParams.set("key", key); url.searchParams.set("format", "json");
  let lat: number | null = null, lng: number | null = null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json();
    const p = j?.response?.result?.point;
    if (p) { lat = Number(p.y); lng = Number(p.x); }
  } catch { /* 실패 시 null 캐시 */ }
  await db.geocodeCache.upsert({ where: { query }, create: { query, lat, lng }, update: { lat, lng, fetchedAt: new Date() } });
  return lat != null && lng != null ? { lat, lng } : null;
}
```
(VWorld 응답 키는 기존 seed-legal-divisions 스크립트에서 검증된 형식을 따른다. road 실패 시 parcel 재시도는 후속.)

- [ ] **Step 2: actions.ts**

```ts
"use server";
import { db } from "@/lib/db";
import { fetchRealTransactions, recentMonths } from "@/lib/realprice/fetch";
import { computeStats } from "@/lib/realprice/stats";
import type { RealTradeKind, RealStats, RealTxRecord } from "@/lib/realprice/types";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function loadRealPrice(filters: { lawdCd: string; propertyType: string; kind: RealTradeKind; months: number }): Promise<{
  records: RealTxRecord[]; stats: RealStats; byDong: { umdNm: string; count: number; avg: number | null; lat: number | null; lng: number | null }[]; failedMonths: string[];
}> {
  if (!(await getCurrentUser())) throw new Error("인증이 필요합니다");
  const now = new Date();
  const currentYmd = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const months = recentMonths(filters.months, currentYmd);
  const { records, failedMonths } = await fetchRealTransactions({ lawdCd: filters.lawdCd, propertyType: filters.propertyType, kind: filters.kind, months });

  // 동별 집계 + LegalDivision 좌표
  const dongs = [...new Set(records.map((r) => r.umdNm).filter(Boolean))];
  const divisions = await db.legalDivision.findMany({ where: { naverCode: { startsWith: filters.lawdCd } } });
  const coordByName = new Map(divisions.map((d) => [d.name.split(" ").pop() ?? d.name, d]));
  const price = (r: RealTxRecord) => (r.kind === "sale" ? r.dealAmount : r.deposit) ?? null;
  const byDong = dongs.map((umdNm) => {
    const rs = records.filter((r) => r.umdNm === umdNm);
    const ps = rs.map(price).filter((v): v is number => v != null);
    const d = coordByName.get(umdNm) as { lat?: number | null; lng?: number | null } | undefined;
    return { umdNm, count: rs.length, avg: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null, lat: d?.lat ?? null, lng: d?.lng ?? null };
  });

  return { records, stats: computeStats(records), byDong, failedMonths };
}
```
(주의: `LegalDivision`의 실제 필드명 — 좌표 컬럼·`name`·`naverCode`/`emd_cd` — 을 schema.prisma에서 Read해 정확히 맞춘다. 위 `naverCode startsWith lawdCd`·`lat/lng`는 실제 컬럼명으로 교체.)

- [ ] **Step 3: 정적검증·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/lib/realprice/geocode.ts" "src/app/(dashboard)/dashboard/realprice/actions.ts"`
Expected: 0/0.
```bash
git add src/lib/realprice/geocode.ts "src/app/(dashboard)/dashboard/realprice/actions.ts"
git commit -m "feat(realprice): VWorld 지오코딩 캐시·loadRealPrice 서버액션·동집계"
```

---

## Task 7: 페이지·필터·그리드·엑셀

**Files:**
- Create: `.../dashboard/realprice/page.tsx`, `.../realprice/realprice-view.tsx`, `src/app/api/realprice/export/route.ts`

**Interfaces:**
- Consumes: `loadRealPrice` (T6), `REALPRICE_PROPERTY_TYPES` (T2), `region-picker.tsx`(기존), `RealTxRecord`/`RealStats`.
- Produces: 라우트 `/dashboard/realprice`, export route.

- [ ] **Step 1: 기존 패턴 확인**

Read: `src/app/(dashboard)/dashboard/naver/region-picker.tsx`(지역 선택 — 시군구까지 노출/선택하는 prop 확인), `naver/collection-view.tsx`(필터바·그리드 구성), 기존 엑셀 export route 1개(`api/naver/.../export`)와 `Card`/`Table`/`Select` 사용법.

- [ ] **Step 2: page.tsx (서버, 보호)**

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { RealpriceView } from "./realprice-view";

export default async function RealpricePage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <RealpriceView />;
}
```

- [ ] **Step 3: realprice-view.tsx (클라 — 필터·그리드)**

`naver/collection-view.tsx`의 필터바·그리드 구조를 미러링하되 데이터는 `loadRealPrice`. 구성:
- 상태: `kind`("sale"|"전세"|"월세" — UI는 매매/전세/월세, 서버 kind는 매매=sale, 전세·월세=rent), `propertyType`, `lawdCd`(region-picker에서), `months`(3/6/12), `data`/`loading`.
- 거래유형이 전세/월세면 `REALPRICE_PROPERTY_TYPES.filter(t=>t.rent)`만, 매매면 `t.sale`. 미지원 유형 비활성.
- 조회 시 `loadRealPrice({ lawdCd, propertyType, kind: uiKind==="매매"?"sale":"rent", months })`. 결과를 전세/월세 UI면 `records.filter(monthlyRent===0?전세:월세)`로 클라 분기.
- 그리드: `Table`로 records(단지·법정동·면적·금액(매매가 or 보증금/월세)·층·건축년도·계약일), 20개 페이징·열 정렬(기존 패턴). 상단 `<StatsPanel stats=.../>`(Task 8)·`<RealpriceMap byDong records .../>`(Task 9) 자리(이번 태스크는 placeholder div, 다음 태스크에서 채움).
- "엑셀" 버튼 → `/api/realprice/export?…`(현재 필터/레코드 반영). 빈 결과·`failedMonths` 안내.

(전체 JSX는 collection-view 패턴을 따른다. Base UI `Select`/`Card`/`Table`/`Button` 사용, 임의값 금지.)

- [ ] **Step 4: export route**

기존 `api/naver/.../export/route.ts`를 Read해 동일 구조로 `api/realprice/export/route.ts` 작성 — `requireUser`/userId 불필요(공공데이터)지만 `getCurrentUser` 가드, 쿼리(lawdCd·type·kind·months)로 `loadRealPrice` 재호출 후 exceljs로 records 워크북 생성·타임스탬프 파일명. exceljs는 서버 전용.

- [ ] **Step 5: 정적검증·빌드·커밋**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/realprice" "src/app/api/realprice" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "src/app/(dashboard)/dashboard/realprice/page.tsx" "src/app/(dashboard)/dashboard/realprice/realprice-view.tsx" "src/app/api/realprice/export/route.ts"
git commit -m "feat(realprice): 페이지·필터·그리드·엑셀 다운로드"
```

---

## Task 8: 통계 패널·차트

**Files:**
- Create: `.../dashboard/realprice/stats-panel.tsx`
- Modify: `.../realprice/realprice-view.tsx` (StatsPanel 마운트)

**Interfaces:**
- Consumes: `RealStats` (T2), 템플릿 차트 컴포넌트.

- [ ] **Step 1: 차트 컴포넌트 확인**

Read: `src/components/` 내 기존 차트(예: `components/ui/chart` 또는 dashboards의 recharts 래퍼) 사용법 1개.

- [ ] **Step 2: stats-panel.tsx**

`RealStats`를 받아: 상단 카드 4개(거래건수·평균가·중위가·㎡당 평균가, 원→억 표시), 월별 추이 차트(byMonth: 건수 막대 + 평균가 선), 면적대 분포(byArea), (매매)해제비중/(임대)전세·갱신 비중·인상률 배지. 기존 차트 래퍼 재사용, 임의 색 금지(토큰).

- [ ] **Step 3: 마운트·검증·커밋**

`realprice-view.tsx`의 placeholder를 `<StatsPanel stats={data.stats} />`로 교체.
Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/realprice/stats-panel.tsx" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "src/app/(dashboard)/dashboard/realprice/stats-panel.tsx" "src/app/(dashboard)/dashboard/realprice/realprice-view.tsx"
git commit -m "feat(realprice): 통계 카드·월별 추이 차트·면적분포 패널"
```

---

## Task 9: 지도 (동 집계 → 단지 지오코딩)

**Files:**
- Create: `.../dashboard/realprice/realprice-map.tsx`
- Modify: `.../realprice/realprice-view.tsx` (Map 마운트), `.../realprice/actions.ts` (단지 지오코딩 액션 추가)

**Interfaces:**
- Consumes: `kakao-map.tsx`(기존 markers/clusters API), `byDong`(T6), `geocode`(T6), records.
- Produces: `loadComplexPoints(records, lawdName)` 액션(고유 단지 → 좌표) — 줌인 시 호출.

- [ ] **Step 1: KakaoMap API 확인**

Read: `src/app/(dashboard)/dashboard/naver/kakao-map.tsx` — `markers`/`clusters`/`onSelect`/`center`/`zoom` prop 시그니처.

- [ ] **Step 2: 단지 지오코딩 액션**

`actions.ts`에 추가:
```ts
export async function loadComplexPoints(items: { name: string; umdNm: string; count: number; avg: number | null }[], cityDivision: string): Promise<{ key: string; lat: number; lng: number; count: number; avg: number | null }[]> {
  if (!(await getCurrentUser())) throw new Error("인증이 필요합니다");
  const out: { key: string; lat: number; lng: number; count: number; avg: number | null }[] = [];
  for (const it of items.slice(0, 200)) { // 상한
    const g = await geocode(`${cityDivision} ${it.umdNm} ${it.name}`);
    if (g) out.push({ key: `${it.umdNm}/${it.name}`, lat: g.lat, lng: g.lng, count: it.count, avg: it.avg });
  }
  return out;
}
```
(`geocode` import 추가.)

- [ ] **Step 3: realprice-map.tsx**

`KakaoMap` 래핑: zoom < 임계 → `byDong` 좌표에 동 마커(건수·평균가 라벨); zoom ≥ 임계 → `loadComplexPoints`로 받은 단지 포인트 마커. 마커 클릭 → `onSelect`로 상위에 동/단지 전달(그리드 필터). 동 단위 집계는 records를 단지별로 묶어 `loadComplexPoints` 입력 생성.

- [ ] **Step 4: 마운트·검증·커밋**

`realprice-view.tsx` placeholder를 `<RealpriceMap byDong={data.byDong} records={data.records} ... />`로 교체.
Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/(dashboard)/dashboard/realprice/realprice-map.tsx" && pnpm build`
Expected: 0/0, 빌드 성공.
```bash
git add "src/app/(dashboard)/dashboard/realprice/realprice-map.tsx" "src/app/(dashboard)/dashboard/realprice/realprice-view.tsx" "src/app/(dashboard)/dashboard/realprice/actions.ts"
git commit -m "feat(realprice): 지도(동 집계 마커→단지 지오코딩 마커)"
```

---

## 마감 (전체 통합 후)

- [ ] `pnpm exec vitest run`(전체 그린)·`pnpm build` 확인.
- [ ] README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태에 기능 요약 1줄(CLAUDE.md §5).
- [ ] ⚠️ **실 API end-to-end·지도·지오코딩은 한국 prod 서버에서 검증**(샌드박스 403). 필드명(아파트 전월세 외)·VWorld/Kakao 응답·일일 호출한도를 첫 라이브에서 확인.
- [ ] spec·plan 포함 commit, push는 사용자 요청 시.
