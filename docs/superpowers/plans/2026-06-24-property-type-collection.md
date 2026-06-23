# 매물타입 전체 수집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매물 수집을 거래유형 + 매물유형(14종) 선택 기반으로 확장하고, 매물유형에 따라 단지형(`boundedComplexes`)/비단지형(`boundedArticles`) 두 수집 모드로 분기한다.

**Architecture:** 네이버 front-api의 bounded 엔드포인트(`complex/boundedComplexes`, `article/boundedArticles`)를 쓴다. 두 호출 모두 `filter.legalDivisionNumbers`(권위적 필터) + `boundingBox`(동 중심 ±0.3°)를 보낸다. 박스는 동 중심좌표로 충분(라이브 검증). 단지형 매물은 기존 `complex/article/list` 유지. 매물유형 코드 첫 글자 `A*` = 단지형, 나머지 = 비단지형.

**Tech Stack:** Next.js 16, Prisma 6(PostgreSQL), Playwright(헤드리스 워밍 세션), vitest, exceljs, shadcn/Base UI, pnpm. 포트 3001, 터널 접속은 production 모드.

**설계 문서:** [docs/superpowers/specs/2026-06-24-property-type-collection-design.md](../specs/2026-06-24-property-type-collection-design.md)
**API 샘플(픽스처 출처, 쿠키 포함·미커밋):** `docs/web_api_sample.md`

## Global Constraints

- **하드코딩 금지**: 거래유형·매물유형 코드/라벨은 단일 소스(`src/lib/naver/trade-types.ts`, `src/lib/naver/property-types.ts`)에서만 정의하고 import한다.
- **네이버 민감(anti-bot)**: 워밍 세션 1회 재사용, 요청 간 2.5s 페이싱, 브라우저 동일 헤더(`BROWSER_HEADERS`) 필수. 디버깅도 최소 호출.
- **인증 가드**: 모든 서버 액션·export 라우트는 `requireUser()`/`getCurrentUser()`로 보호.
- **BigInt**: 가격은 `BigInt(x)`로 생성(리터럴 `123n` 금지 — tsconfig ES2017).
- **bbox**: `boundingBox`는 동 중심 ± 0.3°, `filter.legalDivisionNumbers:[naverCode]` + `legalDivisionType:"EUP"`가 실제 필터.
- **§6 템플릿 우선 UI**: 새 UI는 `src/components/ui|dashboards|pages|apps` 기존 컴포넌트를 먼저 재사용. 프리미티브 자작 금지.
- **문서**: 작업 종료 시 README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태 갱신(CLAUDE.md §5).

---

## Task 1: 거래유형 단기임대 + 매물유형 단일 소스 상수

**Files:**
- Modify: `src/lib/naver/trade-types.ts` (이미 작업트리에 B3 추가됨 — 커밋만)
- Create: `src/lib/naver/property-types.ts`
- Test: `src/lib/naver/property-types.test.ts`

**Interfaces:**
- Produces: `PROPERTY_OPTIONS: {value,label,mode}[]`, `PROPERTY_LABEL: Record<string,string>`, `DEFAULT_PROPERTY: string`, `propertyMode(code): "complex"|"article"`. `trade-types.ts`는 `TRADE_OPTIONS`에 `{value:"B3",label:"단기임대"}` 포함.

- [ ] **Step 1: property-types 단위 테스트 작성 (실패)**

`src/lib/naver/property-types.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { PROPERTY_OPTIONS, PROPERTY_LABEL, DEFAULT_PROPERTY, propertyMode } from "./property-types";

describe("property-types", () => {
  it("14종 매물유형 + 단지형/비단지형 모드", () => {
    expect(PROPERTY_OPTIONS).toHaveLength(14);
    expect(DEFAULT_PROPERTY).toBe("A01");
    expect(PROPERTY_LABEL.A01).toBe("아파트");
    expect(PROPERTY_LABEL.D02).toBe("상가");
  });

  it("A* = 단지형, 나머지 = 비단지형", () => {
    expect(propertyMode("A01")).toBe("complex");
    expect(propertyMode("A02")).toBe("complex");
    expect(propertyMode("A04")).toBe("complex");
    expect(propertyMode("C02")).toBe("article");
    expect(propertyMode("D02")).toBe("article");
    expect(propertyMode("E03")).toBe("article");
    expect(propertyMode("ZZZ")).toBe("article"); // 미지정은 비단지형 기본
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/naver/property-types.test.ts`
Expected: FAIL ("Cannot find module './property-types'")

- [ ] **Step 3: property-types.ts 구현**

`src/lib/naver/property-types.ts`:
```ts
// 매물유형(부동산 종류) 단일 정의 — 하드코딩 금지. 네이버 realEstateType 코드.
// 코드 첫 글자 A = 단지형(complex), 나머지 = 비단지형(article).

export type PropertyOption = { value: string; label: string; mode: "complex" | "article" };

export const PROPERTY_OPTIONS: PropertyOption[] = [
  { value: "A01", label: "아파트", mode: "complex" },
  { value: "A02", label: "오피스텔", mode: "complex" },
  { value: "A04", label: "재건축", mode: "complex" },
  { value: "C02", label: "빌라", mode: "article" },
  { value: "C01", label: "원룸", mode: "article" },
  { value: "C03", label: "단독/다가구", mode: "article" },
  { value: "C04", label: "전원주택", mode: "article" },
  { value: "D05", label: "상가주택", mode: "article" },
  { value: "D02", label: "상가", mode: "article" },
  { value: "E03", label: "토지", mode: "article" },
  { value: "D01", label: "사무실", mode: "article" },
  { value: "D03", label: "건물", mode: "article" },
  { value: "E02", label: "공장/창고", mode: "article" },
  { value: "E04", label: "지식산업센터", mode: "article" },
];

export const PROPERTY_LABEL: Record<string, string> = Object.fromEntries(
  PROPERTY_OPTIONS.map((o) => [o.value, o.label]),
);

export const DEFAULT_PROPERTY = PROPERTY_OPTIONS[0].value; // A01

export function propertyMode(code: string): "complex" | "article" {
  return PROPERTY_OPTIONS.find((o) => o.value === code)?.mode ?? "article";
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/naver/property-types.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/naver/trade-types.ts src/lib/naver/property-types.ts src/lib/naver/property-types.test.ts
git commit -m "feat(naver): 거래유형 단기임대(B3) + 매물유형 14종 단일 소스(property-types)"
```

---

## Task 2: Prisma 스키마 — Article 매물유형/비단지형 지원

**Files:**
- Modify: `prisma/schema.prisma` (Article 모델 73-90행)
- Test: `src/lib/naver/schema.test.ts` (마이그레이션 후 비단지형 article 저장 검증)

**Interfaces:**
- Produces: `Article.complexId` nullable, 신규 컬럼 `realEstateType?`·`regionCode?`·`dong?`·`lat?`·`lng?`. `@@index([regionCode])`.

- [ ] **Step 1: schema.prisma의 Article 모델 교체**

`prisma/schema.prisma` 74-90행을 다음으로 교체:
```prisma
// 매물 (네이버 수집 캐시, 전역 공유) — 기본 정보만
model Article {
  id             String   @id @default(cuid())
  articleNumber  String   @unique
  complexId      String?  // 단지형만 — 비단지형은 null
  complex        Complex? @relation(fields: [complexId], references: [id], onDelete: Cascade)
  realEstateType String?  // A01/A02/C02/D02/... 매물유형
  regionCode     String?  // 비단지형 매물의 동(naverCode)
  tradeType      String   // A1 매매 / B1 전세 / B2 월세 / B3 단기임대
  price          BigInt?  // 거래금액(원): 매매가 또는 보증금
  rentPrice      BigInt?  // 월세
  areaExclusive  Float?   // 전용면적
  areaSupply     Float?   // 공급면적
  floor          String?  // "2/23"
  dong           String?  // 동/호
  realtorName    String?
  lat            Float?
  lng            Float?
  raw            Json?
  fetchedAt      DateTime @default(now())

  @@index([complexId])
  @@index([regionCode])
}
```

- [ ] **Step 2: 마이그레이션 생성·적용**

Run: `pnpm prisma migrate dev --name add_property_type`
Expected: 마이그레이션 생성, `Article.complexId` nullable + 신규 컬럼 추가, Prisma Client 재생성. 에러 없음.

- [ ] **Step 3: 비단지형 저장 검증 테스트 작성**

`src/lib/naver/schema.test.ts`:
```ts
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

const NUM = "TEST-PROP-1";

describe("Article 비단지형 저장", () => {
  afterAll(async () => {
    await db.article.deleteMany({ where: { articleNumber: NUM } });
  });

  it("complexId 없이(비단지형) realEstateType/regionCode로 저장", async () => {
    await db.article.upsert({
      where: { articleNumber: NUM },
      create: { articleNumber: NUM, complexId: null, regionCode: "4111710500", realEstateType: "D02", tradeType: "A1", price: BigInt(890000000), lat: 37.25, lng: 127.07 },
      update: {},
    });
    const a = await db.article.findUnique({ where: { articleNumber: NUM } });
    expect(a?.complexId).toBeNull();
    expect(a?.regionCode).toBe("4111710500");
    expect(a?.realEstateType).toBe("D02");
  });
});
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/naver/schema.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/naver/schema.test.ts
git commit -m "feat(db): Article 매물유형/비단지형 지원(complexId nullable + realEstateType/regionCode/dong/좌표)"
```

---

## Task 3: 타입 + 파서 (parseBoundedComplexes + parseArticles realEstateType)

**Files:**
- Modify: `src/lib/naver/types.ts`
- Modify: `src/lib/naver/parse.ts`
- Modify: `src/lib/naver/parse.test.ts`
- Create: `src/lib/naver/__fixtures__/boundedComplexes.json`, `src/lib/naver/__fixtures__/boundedArticles.json`
- Delete: `src/lib/naver/__fixtures__/region.json` (complex/region 폐기)

**Interfaces:**
- Consumes: `NaverComplex`(Task와 무관, 확장), `NaverArticle`.
- Produces: `parseBoundedComplexes(json): RegionComplexesResult`(+lastInfo), `parseArticles(json, complexNumber): ArticlesResult`(article에 realEstateType 추가). `parseRegionComplexes` 제거. `NaverComplex`에 `lat/lng`, `NaverArticle`에 `realEstateType` 추가. `RegionComplexesResult`에 `lastInfo: unknown[]` 추가.

- [ ] **Step 1: 픽스처 생성**

`docs/web_api_sample.md`에서 응답 JSON을 추출해 픽스처 2개를 만든다.

`src/lib/naver/__fixtures__/boundedComplexes.json` — `complex/boundedComplexes` 응답(샘플의 21-89행 구조). 최소 단지 1건 포함, `result.list[0].complex.complexInfo`에 `complexNumber:"12045"`, `name:"벽적골8단지두산,우성,한신"`, `type:"A01"`, `totalHouseholdNumber:1842`, `useApprovalDate:"19971216"`, `address.coordinates:{xCoordinate:127.059237,yCoordinate:37.2477}`, `articleCountInfoDto:{dealCount:118,leaseDepositCount:2,leaseMonthlyCount:14,leaseShortTerm:3}`, 그리고 `result.hasNextPage:true`, `result.totalCount:40`, `result.lastInfo:[1,"1812"]`.

`src/lib/naver/__fixtures__/boundedArticles.json` — `article/boundedArticles` 응답(샘플 617-709행, 상가 D02). `result.list[0].representativeArticleInfo`에 `articleNumber:"2633824750"`, `tradeType:"A1"`, `realEstateType:"D02"`, `spaceInfo:{exclusiveSpace:54,supplySpace:100}`, `articleDetail:{floorInfo:"1/10"}`, `brokerInfo:{brokerageName:"영통역IPARK부동산중개사무소"}`, `address:{sector:"영통동",coordinates:{xCoordinate:127.0750347,yCoordinate:37.2544778}}`, `priceInfo:{dealPrice:890000000,rentPrice:0}`, 그리고 `result.hasNextPage:true`, `result.totalCount:184`, `result.lastInfo:[1,920.6334302063394,"2632698513"]`.

- [ ] **Step 2: types.ts 확장**

`src/lib/naver/types.ts`의 `NaverComplex`에 좌표, `NaverArticle`에 realEstateType, `RegionComplexesResult`에 lastInfo 추가:
```ts
export type NaverComplex = {
  complexNumber: string;
  name: string;
  type: string;
  totalHouseholds: number | null;
  approvalDate: string | null;
  dealCount: number;
  leaseDepositCount: number;
  leaseMonthlyCount: number;
  lat: number | null;
  lng: number | null;
};

export type NaverArticle = {
  articleNumber: string;
  complexNumber: string;
  realEstateType: string;
  tradeType: string;
  price: number | null;
  rentPrice: number | null;
  areaExclusive: number | null;
  areaSupply: number | null;
  floor: string | null;
  realtorName: string | null;
  dong: string | null;
  lng: number | null;
  lat: number | null;
};

export type RegionComplexesResult = {
  complexes: NaverComplex[];
  lastInfo: unknown[];
  hasNextPage: boolean;
  totalCount: number;
};

export type ArticlesResult = {
  articles: NaverArticle[];
  lastInfo: unknown[];
  hasNextPage: boolean;
  totalCount: number;
};
```

- [ ] **Step 3: parse.test.ts 교체 (실패 상태로)**

`src/lib/naver/parse.test.ts` 전체 교체:
```ts
import { describe, expect, it } from "vitest";

import { parseBoundedComplexes, parseArticles } from "./parse";
import boundedComplexesFixture from "./__fixtures__/boundedComplexes.json";
import boundedArticlesFixture from "./__fixtures__/boundedArticles.json";
import articlesFixture from "./__fixtures__/articles.json";

describe("parseBoundedComplexes", () => {
  const { complexes, hasNextPage, totalCount, lastInfo } = parseBoundedComplexes(boundedComplexesFixture);

  it("maps complex basic info + 좌표", () => {
    expect(complexes[0]).toEqual({
      complexNumber: "12045",
      name: "벽적골8단지두산,우성,한신",
      type: "A01",
      totalHouseholds: 1842,
      approvalDate: "19971216",
      dealCount: 118,
      leaseDepositCount: 2,
      leaseMonthlyCount: 14,
      lat: 37.2477,
      lng: 127.059237,
    });
  });

  it("carries pagination cursor", () => {
    expect(hasNextPage).toBe(true);
    expect(totalCount).toBe(40);
    expect(lastInfo).toEqual([1, "1812"]);
  });
});

describe("parseArticles", () => {
  it("단지형(complex/article/list)에서 realEstateType 추출", () => {
    const { articles } = parseArticles(articlesFixture, "2712");
    expect(articles[0].realEstateType).toBe("A01");
    expect(articles[0].complexNumber).toBe("2712");
    expect(articles[0].price).toBe(690000000);
  });

  it("비단지형(boundedArticles)도 같은 파서로 처리(realEstateType=D02)", () => {
    const { articles, totalCount } = parseArticles(boundedArticlesFixture, "");
    expect(articles[0]).toEqual({
      articleNumber: "2633824750",
      complexNumber: "",
      realEstateType: "D02",
      tradeType: "A1",
      price: 890000000,
      rentPrice: 0,
      areaExclusive: 54,
      areaSupply: 100,
      floor: "1/10",
      realtorName: "영통역IPARK부동산중개사무소",
      dong: null,
      lng: 127.0750347,
      lat: 37.2544778,
    });
    expect(totalCount).toBe(184);
  });
});
```
(주: `articles.json` 픽스처는 이미 `realEstateType:"A01"`을 포함한다 — 실응답에서 캡처됨.)

- [ ] **Step 4: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/naver/parse.test.ts`
Expected: FAIL (`parseBoundedComplexes` 미정의, `realEstateType` 없음)

- [ ] **Step 5: parse.ts 교체**

`src/lib/naver/parse.ts` 전체 교체:
```ts
// 네이버 응답 → 정규화 (순수 함수, 픽스처 단위테스트 대상)
import type {
  ArticlesResult,
  NaverArticle,
  NaverComplex,
  RegionComplexesResult,
} from "./types";

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** complex/boundedComplexes 응답 → 단지 목록 (동 + realEstateType 필터) */
export function parseBoundedComplexes(json: unknown): RegionComplexesResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.list as unknown[]) ?? [];

  const complexes: NaverComplex[] = list.map((row) => {
    const c = (row as { complex?: Record<string, unknown> }).complex ?? {};
    const ci = (c.complexInfo as Record<string, unknown>) ?? {};
    const ac = (c.articleCountInfoDto as Record<string, unknown>) ?? {};
    const coords = ((ci.address as Record<string, unknown>)?.coordinates as Record<string, unknown>) ?? {};
    return {
      complexNumber: String(ci.complexNumber),
      name: String(ci.name),
      type: String(ci.type),
      totalHouseholds: num(ci.totalHouseholdNumber),
      approvalDate: ci.useApprovalDate ? String(ci.useApprovalDate) : null,
      dealCount: num(ac.dealCount) ?? 0,
      leaseDepositCount: num(ac.leaseDepositCount) ?? 0,
      leaseMonthlyCount: num(ac.leaseMonthlyCount) ?? 0,
      lat: num(coords.yCoordinate),
      lng: num(coords.xCoordinate),
    };
  });

  return {
    complexes,
    lastInfo: (result.lastInfo as unknown[]) ?? [],
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: num(result.totalCount) ?? complexes.length,
  };
}

/** article/list · article/boundedArticles 응답 → 매물 목록 (대표 매물 기준, 기본 정보만) */
export function parseArticles(json: unknown, complexNumber: string): ArticlesResult {
  const result = (json as { result?: Record<string, unknown> })?.result ?? {};
  const list = (result.list as unknown[]) ?? [];

  const articles: NaverArticle[] = list.map((row) => {
    const a = (row as { representativeArticleInfo: Record<string, unknown> })
      .representativeArticleInfo;
    const space = (a.spaceInfo as Record<string, unknown>) ?? {};
    const detail = (a.articleDetail as Record<string, unknown>) ?? {};
    const broker = (a.brokerInfo as Record<string, unknown>) ?? {};
    const price = (a.priceInfo as Record<string, unknown>) ?? {};

    const deal = num(price.dealPrice);
    const warranty = num(price.warrantyPrice);
    const coords = ((a.address as Record<string, unknown>)?.coordinates as Record<string, unknown>) ?? {};
    return {
      articleNumber: String(a.articleNumber),
      complexNumber,
      realEstateType: String(a.realEstateType),
      tradeType: String(a.tradeType),
      price: deal || warranty || null,
      rentPrice: num(price.rentPrice),
      areaExclusive: num(space.exclusiveSpace),
      areaSupply: num(space.supplySpace),
      floor: detail.floorInfo ? String(detail.floorInfo) : null,
      realtorName: broker.brokerageName ? String(broker.brokerageName) : null,
      dong: a.dongName ? String(a.dongName) : null,
      lng: num(coords.xCoordinate),
      lat: num(coords.yCoordinate),
    };
  });

  return {
    articles,
    lastInfo: (result.lastInfo as unknown[]) ?? [],
    hasNextPage: Boolean(result.hasNextPage),
    totalCount: num(result.totalCount) ?? articles.length,
  };
}
```

- [ ] **Step 6: region.json 픽스처 삭제**

Run: `git rm src/lib/naver/__fixtures__/region.json`

- [ ] **Step 7: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/naver/parse.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 8: 커밋**

```bash
git add src/lib/naver/types.ts src/lib/naver/parse.ts src/lib/naver/parse.test.ts src/lib/naver/__fixtures__
git commit -m "feat(naver): parseBoundedComplexes + parseArticles realEstateType (complex/region 폐기)"
```

---

## Task 4: fetch — bounded 엔드포인트

**Files:**
- Modify: `src/lib/naver/fetch.ts`
- Test: `src/lib/naver/box.test.ts` (boxAround 순수 함수)

**Interfaces:**
- Consumes: `DEFAULT_TRADE`(trade-types), `BROWSER_HEADERS`·`request`·`BASE`(fetch.ts 내부).
- Produces: `boxAround(center, d?)`, `fetchBoundedComplexes(ctx, naverCode, opts)`, `fetchBoundedArticles(ctx, naverCode, opts)`. `opts = { realEstateTypes: string[]; tradeTypes?: string[]; center: {lat:number;lng:number}; lastInfo?: unknown[] }`. `fetchRegionComplexes` 제거.

- [ ] **Step 1: boxAround 테스트 작성 (실패)**

`src/lib/naver/box.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { boxAround } from "./fetch";

describe("boxAround", () => {
  it("동 중심 ±0.3° 박스", () => {
    expect(boxAround({ lat: 37.2566, lng: 127.0738 })).toEqual({
      left: 126.7738,
      right: 127.3738,
      top: 37.5566,
      bottom: 36.9566,
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/naver/box.test.ts`
Expected: FAIL (`boxAround` 미export)

- [ ] **Step 3: fetch.ts 수정**

`src/lib/naver/fetch.ts` 상단 import에 `DEFAULT_TRADE`가 이미 있다. `fetchRegionComplexes`(68-76행)를 삭제하고 다음을 추가:
```ts
/** 동 중심좌표 → boundingBox (±0.3°면 동을 덮음; legalDivisionNumbers가 실제 필터) */
export function boxAround(center: { lat: number; lng: number }, d = 0.3) {
  return { left: center.lng - d, right: center.lng + d, top: center.lat + d, bottom: center.lat - d };
}

const COMMON_FILTER = {
  roomCount: [], bathRoomCount: [], optionTypes: [], oneRoomShapeTypes: [], moveInTypes: [],
  filtersExclusiveSpace: false, floorTypes: [], directionTypes: [], hasArticlePhoto: false,
  isAuthorizedByOwner: false, parkingTypes: [], entranceTypes: [], hasArticle: true,
};

type BoundedOpts = {
  realEstateTypes: string[];
  tradeTypes?: string[];
  center: { lat: number; lng: number };
  lastInfo?: unknown[];
};

/** 동 + 매물유형 → 단지 목록 원본 JSON (POST boundedComplexes) */
export function fetchBoundedComplexes(
  ctx: BrowserContext,
  naverCode: string,
  { realEstateTypes, tradeTypes = [DEFAULT_TRADE], center, lastInfo = [] }: BoundedOpts,
): Promise<unknown> {
  return request("complex/boundedComplexes", () =>
    ctx.request.post(`${BASE}/complex/boundedComplexes`, {
      headers: { ...BROWSER_HEADERS, "content-type": "application/json" },
      data: {
        filter: { tradeTypes, realEstateTypes, ...COMMON_FILTER, legalDivisionNumbers: [naverCode], legalDivisionType: "EUP" },
        boundingBox: boxAround(center),
        precision: 14, userChannelType: "PC",
        complexPagingRequest: { size: 30, complexSortType: "POPULARITY_DESC", lastInfo },
      },
    }),
  );
}

/** 동 + 매물유형 → 매물 목록 원본 JSON (POST boundedArticles, 비단지형) */
export function fetchBoundedArticles(
  ctx: BrowserContext,
  naverCode: string,
  { realEstateTypes, tradeTypes = [DEFAULT_TRADE], center, lastInfo = [] }: BoundedOpts,
): Promise<unknown> {
  return request("article/boundedArticles", () =>
    ctx.request.post(`${BASE}/article/boundedArticles`, {
      headers: { ...BROWSER_HEADERS, "content-type": "application/json" },
      data: {
        filter: { tradeTypes, realEstateTypes, ...COMMON_FILTER, legalDivisionNumbers: [naverCode], legalDivisionType: "EUP" },
        boundingBox: boxAround(center),
        precision: 14, userChannelType: "PC",
        articlePagingRequest: { size: 30, articleSortType: "RANKING_DESC", lastInfo },
      },
    }),
  );
}
```

- [ ] **Step 4: 테스트 통과 + 타입 확인**

Run: `pnpm exec vitest run src/lib/naver/box.test.ts && pnpm exec tsc --noEmit`
Expected: box PASS (1 test). tsc: `fetchRegionComplexes` 참조가 index.ts에 남아 에러 — Task 6에서 해소. **이 시점 tsc 에러는 index.ts의 fetchRegionComplexes/parseRegionComplexes 참조 한정이면 정상**(다음 태스크에서 교체).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/naver/fetch.ts src/lib/naver/box.test.ts
git commit -m "feat(naver): fetchBoundedComplexes/fetchBoundedArticles + boxAround (complex/region GET 폐기)"
```

---

## Task 5: cache — 단지형/비단지형 upsert + 동 중심 조회

**Files:**
- Modify: `src/lib/naver/cache.ts`
- Modify: `src/lib/naver/cache.test.ts`

**Interfaces:**
- Consumes: `NaverComplex`·`NaverArticle`(types), `db`(@/lib/db).
- Produces: `upsertComplexes(complexes, regionCode)`(좌표 저장 추가), `upsertComplexArticles(complexNumber, articles)`(기존 upsertArticles 개명 + realEstateType/dong/좌표 저장), `upsertRegionArticles(regionCode, articles)`(신규, 비단지형), `getRegionCenter(naverCode): Promise<{lat:number;lng:number}>`.

- [ ] **Step 1: cache.test.ts 교체 (실패 상태로)**

`src/lib/naver/cache.test.ts` 전체 교체:
```ts
import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { upsertComplexArticles, upsertRegionArticles } from "./cache";
import type { NaverArticle } from "./types";

const CX = "TEST-CX-1";
const REGION = "9999999900";
const ART_C = "TEST-AR-C";
const ART_R = "TEST-AR-R";

const art = (over: Partial<NaverArticle>): NaverArticle => ({
  articleNumber: "x", complexNumber: "", realEstateType: "A01", tradeType: "A1",
  price: 100, rentPrice: 0, areaExclusive: 84, areaSupply: 109, floor: "2/23",
  realtorName: "중개사", dong: "101", lng: 127, lat: 37, ...over,
});

describe("cache upsert", () => {
  afterAll(async () => {
    await db.article.deleteMany({ where: { articleNumber: { in: [ART_C, ART_R] } } });
    await db.complex.deleteMany({ where: { complexNumber: CX } });
  });

  it("단지형: complex stub 생성 + complexId 연결", async () => {
    await upsertComplexArticles(CX, [art({ articleNumber: ART_C, complexNumber: CX })]);
    const a = await db.article.findUnique({ where: { articleNumber: ART_C } });
    expect(a?.complexId).not.toBeNull();
    expect(a?.realEstateType).toBe("A01");
    expect(a?.dong).toBe("101");
  });

  it("비단지형: complexId null + regionCode/realEstateType 저장", async () => {
    await upsertRegionArticles(REGION, [art({ articleNumber: ART_R, realEstateType: "D02", tradeType: "A1", price: 890000000 })]);
    const a = await db.article.findUnique({ where: { articleNumber: ART_R } });
    expect(a?.complexId).toBeNull();
    expect(a?.regionCode).toBe(REGION);
    expect(a?.realEstateType).toBe("D02");
    expect(a?.price).toBe(BigInt(890000000));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/naver/cache.test.ts`
Expected: FAIL (`upsertComplexArticles`/`upsertRegionArticles` 미정의)

- [ ] **Step 3: cache.ts 교체**

`src/lib/naver/cache.ts` 전체 교체:
```ts
// 수집 결과 → DB 캐시(Complex/Article) upsert. 결정적(네트워크 없음, 픽스처 테스트 대상).
import { db } from "@/lib/db";
import type { NaverArticle, NaverComplex } from "./types";

const big = (v: number | null): bigint | null => (v != null ? BigInt(Math.round(v)) : null);

/** 동 중심좌표 (boundingBox 빌드용) — LegalDivision에서 조회 */
export async function getRegionCenter(naverCode: string): Promise<{ lat: number; lng: number }> {
  const ld = await db.legalDivision.findUnique({ where: { naverCode } });
  if (ld?.lat == null || ld?.lng == null) throw new Error(`동 좌표 없음: ${naverCode}`);
  return { lat: ld.lat, lng: ld.lng };
}

export async function upsertComplexes(complexes: NaverComplex[], regionCode: string): Promise<void> {
  for (const c of complexes) {
    const data = {
      name: c.name,
      type: c.type,
      totalHouseholds: c.totalHouseholds,
      approvalDate: c.approvalDate,
      regionCode,
      lat: c.lat,
      lng: c.lng,
      raw: c as object,
    };
    await db.complex.upsert({
      where: { complexNumber: c.complexNumber },
      create: { complexNumber: c.complexNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
}

function articleData(a: NaverArticle) {
  return {
    realEstateType: a.realEstateType,
    tradeType: a.tradeType,
    price: big(a.price),
    rentPrice: big(a.rentPrice),
    areaExclusive: a.areaExclusive,
    areaSupply: a.areaSupply,
    floor: a.floor,
    dong: a.dong,
    realtorName: a.realtorName,
    lat: a.lat,
    lng: a.lng,
    raw: a as object,
  };
}

/** 단지형: 단지 stub 보장 후 complexId로 연결 */
export async function upsertComplexArticles(complexNumber: string, articles: NaverArticle[]): Promise<number> {
  const complex =
    (await db.complex.findUnique({ where: { complexNumber } })) ??
    (await db.complex.create({ data: { complexNumber, name: `단지 ${complexNumber}` } }));

  const coord = articles.find((a) => a.lat != null && a.lng != null);
  if (coord && complex.lat == null) {
    await db.complex.update({ where: { id: complex.id }, data: { lat: coord.lat, lng: coord.lng } });
  }

  for (const a of articles) {
    const data = { complexId: complex.id, regionCode: null, ...articleData(a) };
    await db.article.upsert({
      where: { articleNumber: a.articleNumber },
      create: { articleNumber: a.articleNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
  return articles.length;
}

/** 비단지형: 단지 없이 동(regionCode) 기준 저장 */
export async function upsertRegionArticles(regionCode: string, articles: NaverArticle[]): Promise<number> {
  for (const a of articles) {
    const data = { complexId: null, regionCode, ...articleData(a) };
    await db.article.upsert({
      where: { articleNumber: a.articleNumber },
      create: { articleNumber: a.articleNumber, ...data },
      update: { ...data, fetchedAt: new Date() },
    });
  }
  return articles.length;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/naver/cache.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/naver/cache.ts src/lib/naver/cache.test.ts
git commit -m "feat(naver): 단지형/비단지형 upsert 분리 + getRegionCenter"
```

---

## Task 6: index — listComplexesByRegion(bounded) + getRegionArticles

**Files:**
- Modify: `src/lib/naver/index.ts`
- Modify: `scripts/collect.ts` (시그니처 변경 반영)

**Interfaces:**
- Consumes: `fetchBoundedComplexes`·`fetchBoundedArticles`·`fetchArticles`·`withNaverSession`(fetch), `parseBoundedComplexes`·`parseArticles`(parse), `upsertComplexes`·`upsertComplexArticles`·`upsertRegionArticles`·`getRegionCenter`(cache).
- Produces: `listComplexesByRegion(naverCode, { realEstateTypes, tradeTypes })`, `getRegionArticles(naverCode, { realEstateTypes, tradeTypes })`, `getComplexArticles(complexNumber, { tradeTypes })`(유지, 내부 upsertComplexArticles 호출).

- [ ] **Step 1: index.ts 교체**

`src/lib/naver/index.ts` 전체 교체:
```ts
// 네이버 수집 스크래퍼 — 공개 인터페이스.
//   listComplexesByRegion(naverCode, opts) — 동 + 매물유형 → 단지 목록 (단지형)
//   getRegionArticles(naverCode, opts)      — 동 + 매물유형 → 매물 목록 (비단지형)
//   getComplexArticles(complexNumber, opts) — 단지 → 매물 목록
import { setTimeout as sleep } from "node:timers/promises";

import { fetchArticles, fetchBoundedArticles, fetchBoundedComplexes, withNaverSession } from "./fetch";
import { parseArticles, parseBoundedComplexes } from "./parse";
import { getRegionCenter, upsertComplexArticles, upsertComplexes, upsertRegionArticles } from "./cache";
import type { NaverArticle, NaverComplex } from "./types";

type RegionOpts = { realEstateTypes: string[]; tradeTypes?: string[]; maxPages?: number };

/** 동 + 매물유형 → 단지 목록 수집 + 캐시 (단지형) */
export async function listComplexesByRegion(
  naverCode: string,
  { realEstateTypes, tradeTypes = [], maxPages = 10 }: RegionOpts,
): Promise<NaverComplex[]> {
  const center = await getRegionCenter(naverCode);
  return withNaverSession(async (ctx) => {
    const all: NaverComplex[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchBoundedComplexes(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo });
      const { complexes, lastInfo: next, hasNextPage } = parseBoundedComplexes(json);
      all.push(...complexes);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500);
    }
    await upsertComplexes(all, naverCode);
    return all;
  });
}

/** 동 + 매물유형 → 매물 목록 직접 수집 + 캐시 (비단지형) */
export async function getRegionArticles(
  naverCode: string,
  { realEstateTypes, tradeTypes = [], maxPages = 20 }: RegionOpts,
): Promise<NaverArticle[]> {
  const center = await getRegionCenter(naverCode);
  return withNaverSession(async (ctx) => {
    const all: NaverArticle[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchBoundedArticles(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo });
      const { articles, lastInfo: next, hasNextPage } = parseArticles(json, "");
      all.push(...articles);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500);
    }
    await upsertRegionArticles(naverCode, all);
    return all;
  });
}

/** 단지번호 → 매물 목록 수집 + 캐시 (커서 페이지네이션, 보수적 페이싱) */
export async function getComplexArticles(
  complexNumber: string,
  { tradeTypes = [], size = 30, maxPages = 5 }: { tradeTypes?: string[]; size?: number; maxPages?: number } = {},
): Promise<NaverArticle[]> {
  return withNaverSession(async (ctx) => {
    const all: NaverArticle[] = [];
    let lastInfo: unknown[] = [];
    for (let p = 0; p < maxPages; p++) {
      const json = await fetchArticles(ctx, complexNumber, { tradeTypes, size, lastInfo });
      const { articles, lastInfo: next, hasNextPage } = parseArticles(json, complexNumber);
      all.push(...articles);
      if (!hasNextPage || !next.length) break;
      lastInfo = next;
      await sleep(2500);
    }
    await upsertComplexArticles(complexNumber, all);
    return all;
  });
}

export type { NaverArticle, NaverComplex } from "./types";
```

- [ ] **Step 2: collect.ts 시그니처 반영**

`scripts/collect.ts`의 `listComplexesByRegion(regionCode)` 호출과 매물 수집부를 매물유형 기반으로 수정. 20-30행 영역을 다음으로 교체:
```ts
  const realEstateType = process.argv[5] ?? "A01";
  const { propertyMode } = await import("@/lib/naver/property-types");

  if (propertyMode(realEstateType) === "complex") {
    console.log(`[동 ${regionCode}] ${realEstateType} 단지 수집...`);
    const complexes = await listComplexesByRegion(regionCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
    console.log(`단지 ${complexes.length}개`);
    for (const c of complexes.slice(0, 10)) {
      console.log(`  ${c.complexNumber} ${c.name} (세대 ${c.totalHouseholds ?? "-"}, 매매 ${c.dealCount}/전세 ${c.leaseDepositCount}/월세 ${c.leaseMonthlyCount})`);
    }
    const target = complexNumber ?? complexes[0]?.complexNumber;
    if (target) {
      console.log(`\n[단지 ${target}] 매물 수집 (${tradeType})...`);
      const articles = await getComplexArticles(target, { tradeTypes: [tradeType] });
      console.log(`매물 ${articles.length}개`);
      for (const a of articles.slice(0, 15)) console.log(`  ${a.articleNumber} ${a.tradeType} ${won(a.price)}원 ${a.floor ?? "-"} ${a.realtorName ?? "-"}`);
    }
  } else {
    console.log(`[동 ${regionCode}] ${realEstateType} 매물 직접 수집 (비단지형, ${tradeType})...`);
    const articles = await getRegionArticles(regionCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
    console.log(`매물 ${articles.length}개`);
    for (const a of articles.slice(0, 15)) console.log(`  ${a.articleNumber} ${a.realEstateType} ${a.tradeType} ${won(a.price)}원 ${a.floor ?? "-"} ${a.realtorName ?? "-"}`);
  }
  process.exit(0);
```
그리고 상단 import에 `getRegionArticles` 추가: `import { getComplexArticles, getRegionArticles, listComplexesByRegion } from "@/lib/naver";`. 기존 단지 출력 루프(22-34행)는 위 블록으로 대체되므로 제거. 사용법 주석(2-4행)도 `[realEstateType=A01]` 추가.

- [ ] **Step 3: 타입체크 + 단위 전체**

Run: `pnpm exec tsc --noEmit && pnpm test:unit`
Expected: tsc PASS(0 에러), 단위 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/naver/index.ts scripts/collect.ts
git commit -m "feat(naver): listComplexesByRegion(bounded) + getRegionArticles(비단지형) + collect 갱신"
```

---

## Task 7: 서버 액션 + 엑셀 + export (매물유형/비단지형)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/naver/actions.ts`
- Modify: `src/lib/naver/excel.ts`, `src/lib/naver/excel.test.ts`
- Modify: `src/app/api/naver/export/route.ts`

**Interfaces:**
- Consumes: `listComplexesByRegion`·`getComplexArticles`·`getRegionArticles`(@/lib/naver), `PROPERTY_LABEL`(property-types), `db`.
- Produces: `loadComplexes(naverCode, realEstateType, tradeType, refresh)`, `loadRegionArticles(naverCode, realEstateType, tradeType, refresh): {articles, lat, lng}[]형`, `loadArticles(complexNumber, tradeTypes, refresh)`(유지). `ArticleRow`에 `realEstateType` 추가.

- [ ] **Step 1: excel.ts에 realEstateType 컬럼 추가**

`src/lib/naver/excel.ts`: `ExcelRow`에 `realEstateType: string` 추가, columns에 매물유형 컬럼 추가, addRow에 매핑. `PROPERTY_LABEL` import. 변경부:
```ts
import { TRADE_LABEL } from "./trade-types";
import { PROPERTY_LABEL } from "./property-types";

export type ExcelRow = {
  complexName: string;
  realEstateType: string;
  tradeType: string;
  price: bigint | null;
  rentPrice: bigint | null;
  areaExclusive: number | null;
  areaSupply: number | null;
  floor: string | null;
  dong: string | null;
  realtorName: string | null;
};
```
columns 배열 맨 앞 `단지명` 다음에 `{ header: "매물유형", key: "realEstateType", width: 10 }` 추가. addRow에 `realEstateType: PROPERTY_LABEL[r.realEstateType] ?? r.realEstateType,` 추가.

- [ ] **Step 2: excel.test.ts 매물유형 컬럼 검증 추가**

`src/lib/naver/excel.test.ts`의 mock row들에 `realEstateType: "A01"`(등) 추가하고, 셀 위치 검증을 컬럼 1개 밀린 것에 맞춘다. 새 검증:
```ts
it("매물유형 라벨 매핑(A01 → 아파트)", () => {
  expect(ws.getRow(2).getCell(2).value).toBe("아파트"); // 매물유형 컬럼
});
```
(기존 거래유형 셀 검증은 getCell(3)으로 이동 — 컬럼이 하나 밀림.)

- [ ] **Step 3: excel 단위 통과 확인**

Run: `pnpm exec vitest run src/lib/naver/excel.test.ts`
Expected: PASS

- [ ] **Step 4: actions.ts 교체**

`src/app/(dashboard)/dashboard/naver/actions.ts`에서 `ArticleRow`에 `realEstateType` 추가, `loadComplexes` 시그니처 변경, `loadRegionArticles` 추가, `toRow` 공용화. 핵심 변경:
```ts
import { getComplexArticles, getRegionArticles, listComplexesByRegion } from "@/lib/naver";

export type ArticleRow = { articleNumber: string; realEstateType: string; tradeType: string; price: string | null; rentPrice: string | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };

type DbArticle = { articleNumber: string; realEstateType: string | null; tradeType: string; price: bigint | null; rentPrice: bigint | null; areaExclusive: number | null; areaSupply: number | null; floor: string | null; dong: string | null; realtorName: string | null };
const toRow = (a: DbArticle): ArticleRow => ({
  articleNumber: a.articleNumber, realEstateType: a.realEstateType ?? "", tradeType: a.tradeType,
  price: a.price?.toString() ?? null, rentPrice: a.rentPrice?.toString() ?? null,
  areaExclusive: a.areaExclusive, areaSupply: a.areaSupply, floor: a.floor, dong: a.dong, realtorName: a.realtorName,
});

export async function loadComplexes(naverCode: string, realEstateType: string, tradeType: string, refresh = false): Promise<ComplexRow[]> {
  await requireUser();
  const readFromDb = async (): Promise<ComplexRow[]> => {
    const rows = await db.complex.findMany({ where: { regionCode: naverCode, type: realEstateType }, orderBy: { totalHouseholds: "desc" } });
    return rows.map((c) => {
      const raw = (c.raw ?? {}) as { dealCount?: number; leaseDepositCount?: number; leaseMonthlyCount?: number };
      return { complexNumber: c.complexNumber, name: c.name, totalHouseholds: c.totalHouseholds, dealCount: raw.dealCount ?? 0, leaseDepositCount: raw.leaseDepositCount ?? 0, leaseMonthlyCount: raw.leaseMonthlyCount ?? 0 };
    });
  };
  if (!refresh) { const cached = await readFromDb(); if (cached.length) return cached; }
  await listComplexesByRegion(naverCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
  return readFromDb();
}

export async function loadRegionArticles(naverCode: string, realEstateType: string, tradeType: string, refresh = false): Promise<{ articles: ArticleRow[] }> {
  await requireUser();
  const readFromDb = async () => {
    const rows = await db.article.findMany({ where: { regionCode: naverCode, realEstateType, tradeType }, orderBy: { fetchedAt: "desc" } });
    return rows.map(toRow);
  };
  if (!refresh) { const cached = await readFromDb(); if (cached.length) return { articles: cached }; }
  await getRegionArticles(naverCode, { realEstateTypes: [realEstateType], tradeTypes: [tradeType] });
  return { articles: await readFromDb() };
}
```
`loadArticles`는 기존대로 두되, 내부 `toRow`를 위 공용 `toRow`로 바꾸고 매핑에 `realEstateType` 포함되도록 정리(기존 inline toRow 제거).

- [ ] **Step 5: export 라우트 일반화**

`src/app/api/naver/export/route.ts`: `complexNumber`(단지형) 또는 `regionCode`+`realEstateType`+`tradeType`(비단지형) 지원. `getCurrentUser()` 가드 유지. 비단지형 분기는 `db.article.findMany({ where: { regionCode, realEstateType, tradeType } })`로 rows 구성, `complexName`은 빈 문자열, `realEstateType`/`dong`은 컬럼에서 직접. ExcelRow에 `realEstateType` 채움. (단지형은 기존 경로 유지하되 `realEstateType: a.realEstateType ?? ""`, `dong: a.dong` 컬럼 사용으로 변경.)

- [ ] **Step 6: 타입체크 + 빌드 + 단위**

Run: `pnpm exec tsc --noEmit && pnpm build 2>&1 | tail -3 && pnpm test:unit`
Expected: tsc 0 에러, build 성공, 단위 전부 PASS.

- [ ] **Step 7: 커밋**

```bash
git add "src/app/(dashboard)/dashboard/naver/actions.ts" src/lib/naver/excel.ts src/lib/naver/excel.test.ts src/app/api/naver/export/route.ts
git commit -m "feat(naver): 매물유형 기반 서버액션(loadComplexes/loadRegionArticles) + 엑셀/export 매물유형"
```

---

## Task 8: UI — 매물유형 선택 + 단지형/비단지형 분기

**Files:**
- Modify: `src/app/(dashboard)/dashboard/naver/collection-view.tsx`
- Modify: `src/app/(dashboard)/dashboard/naver/articles-grid.tsx`
- 참조(재사용): `src/components/ui/select.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/label.tsx`

**Interfaces:**
- Consumes: `TRADE_OPTIONS`·`DEFAULT_TRADE`(trade-types), `PROPERTY_OPTIONS`·`DEFAULT_PROPERTY`·`propertyMode`·`PROPERTY_LABEL`(property-types), `loadComplexes`·`loadRegionArticles`·`loadArticles`(actions).

- [ ] **Step 1: §6 템플릿 컴포넌트 확인**

Run: `sed -n '1,40p' src/components/ui/select.tsx`
Expected: `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` export 확인 (단일선택 드롭다운). 이 API로 매물유형 셀렉터를 만든다(프리미티브 자작 금지).

- [ ] **Step 2: articles-grid.tsx에 매물유형 컬럼 추가**

`src/app/(dashboard)/dashboard/naver/articles-grid.tsx`: `PROPERTY_LABEL` import, 테이블 헤더에 `<TableHead>유형</TableHead>`를 `거래` 앞에 추가, 각 행에 `<TableCell>{PROPERTY_LABEL[a.realEstateType] ?? a.realEstateType}</TableCell>` 추가. export 링크는 props로 받은 `exportHref` 사용(단지형/비단지형이 다른 쿼리를 주입). props에 `exportHref: string` 추가, 기존 `complexNumber` 기반 링크 제거.

- [ ] **Step 3: collection-view.tsx 교체 (매물유형 + 분기)**

`src/app/(dashboard)/dashboard/naver/collection-view.tsx`를 매물유형 Select + mode 분기로 교체. 핵심 구조:
```tsx
"use client"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_TRADE, TRADE_OPTIONS } from "@/lib/naver/trade-types"
import { DEFAULT_PROPERTY, PROPERTY_OPTIONS, propertyMode } from "@/lib/naver/property-types"
import { loadArticles, loadComplexes, loadRegionArticles, type ArticleRow, type ComplexRow, type Region } from "./actions"
import { RegionPicker } from "./region-picker"
import { ComplexList } from "./complex-list"
import { KakaoMap } from "./kakao-map"
import { ArticlesGrid } from "./articles-grid"

export function CollectionView({ sidos, kakaoKey }: { sidos: Region[]; kakaoKey: string }) {
  const [trade, setTrade] = useState(DEFAULT_TRADE)
  const [property, setProperty] = useState(DEFAULT_PROPERTY)
  const [naverCode, setNaverCode] = useState<string | null>(null)
  const [complexes, setComplexes] = useState<ComplexRow[]>([])
  const [loadingC, setLoadingC] = useState(false)
  const [selected, setSelected] = useState<ComplexRow | null>(null)
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [coord, setCoord] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [loadingA, setLoadingA] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mode = propertyMode(property)

  // pick(code): mode가 complex면 loadComplexes, article이면 loadRegionArticles
  // (단지형/비단지형 분기. 비단지형은 단지 단계 생략, 매물 그리드 직접)
  // ... 상세 핸들러 구현 (loadComplexes(code, property, trade) / loadRegionArticles(code, property, trade))
}
```
구현 세부:
- 상단: 거래유형 라디오(TRADE_OPTIONS) + 매물유형 Select(PROPERTY_OPTIONS) → RegionPicker. 거래유형/매물유형 변경 시 동 선택 상태 초기화.
- `pick(code)`(동 선택): `mode==="complex"` → `loadComplexes(code, property, trade)` 후 ComplexList 표시; `mode==="article"` → `loadRegionArticles(code, property, trade)` 후 ArticlesGrid 직접 표시(단지 단계 없음).
- 단지형 단지선택: `loadArticles(complexNumber, [trade])` (기존).
- 엑셀 href: 단지형 `?complexNumber=${selected.complexNumber}`, 비단지형 `?regionCode=${naverCode}&realEstateType=${property}&tradeType=${trade}`.
- 비단지형 지도: 매물 좌표 중 첫 유효 좌표로 KakaoMap 중심(없으면 생략).

- [ ] **Step 4: 빌드 확인**

Run: `pnpm exec tsc --noEmit && pnpm build 2>&1 | tail -3`
Expected: tsc 0 에러, build 성공(라우트 정상).

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(dashboard)/dashboard/naver"
git commit -m "feat(naver): 매물유형 선택 UI + 단지형/비단지형 분기 (§6 템플릿 select 재사용)"
```

---

## Task 9: 라이브 검증 + 문서 + 마무리

**Files:**
- Modify: `README.md`, `docs/PROJECT_GUIDE.md`

- [ ] **Step 1: prod 서버 재기동**

Run: `bash scripts/run-prod.sh > /tmp/reales-prod.log 2>&1 &` 후 `curl -sf http://localhost:3001/login` 200 확인.

- [ ] **Step 2: 라이브 수집 검증 (콘솔, 최소 호출)**

Run(단지형): `pnpm collect 4111710500 "" A1 A02` → 영통동 오피스텔 단지 9개 내외 출력.
Run(비단지형): `pnpm collect 4111710500 "" A1 D02` → 영통동 상가 매물 출력(totalCount ≈ 200대). 에러 없음·섹터 영통동 확인.

- [ ] **Step 3: 터널 UI 스모크**

`/dashboard/naver`(터널)에서 거래유형 라디오 + 매물유형 Select가 보이고, 아파트 선택 시 단지목록, 상가 선택 시 매물 그리드가 직접 뜨는지 확인(헤드리스 스크립트 또는 수동).

- [ ] **Step 4: 문서 갱신 + 단위 전체**

Run: `pnpm test:unit` (전부 PASS).
README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태에 "매물유형 14종(단지형/비단지형) 수집 + UI 분기" 한 줄씩 추가.

- [ ] **Step 5: 커밋**

```bash
git add README.md docs/PROJECT_GUIDE.md
git commit -m "docs: 매물유형 전체 수집 반영 상태 갱신

문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태"
```

---

## 최종 검증 (전체 태스크 후)

- `pnpm exec tsc --noEmit` 0 에러, `pnpm build` 성공, `pnpm test:unit` 전부 PASS.
- 단지형(A01/A02) 단지목록→매물, 비단지형(C/D/E) 매물 직접 — 라이브 각 1건 검증.
- 거래유형 4종(매매/전세/월세/단기임대) + 매물유형 14종 셀렉터 동작.
- 시크릿 미커밋(`web_api_sample.md` 제외), 인증 가드 유지.
