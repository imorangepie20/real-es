# 매물타입 전체 수집 설계 (단지형 + 비단지형)

**작성:** 2026-06-24
**선행:** [2026-06-23-stage-2-collection-design.md](2026-06-23-stage-2-collection-design.md) (동 드릴다운 + 단지/매물 수집 기반)

## 1. 목표

매물 수집을 **거래유형 + 매물유형(부동산 종류) 선택** 기반으로 확장한다. 현재는 아파트(단지) 한 가지 흐름만 있으나, 스펙([project_structure.md](../../project_structure.md) §매물 타입)의 14종 매물유형을 전부 지원한다. 매물유형에 따라 **단지형/비단지형 두 수집 모드**로 분기한다.

## 2. 배경 — 현재 상태

- 수집 계층 `src/lib/naver/`: `fetchRegionComplexes`(GET `complex/region`) → 단지 목록, `fetchArticles`(POST `complex/article/list`) → 단지별 매물. 파서 `parseRegionComplexes`/`parseArticles`, 캐시 `upsertComplexes`/`upsertArticles`.
- 스키마: `Complex`(complexNumber·type·…), `Article`(complexId **NOT NULL**·tradeType·price·…). Article에 realEstateType/좌표 컬럼 없음.
- UI `/dashboard/naver`: 거래유형 라디오(매매/전세/월세) → 동 선택 → 단지목록 → 단지선택 → 카카오지도 + 매물 그리드 → 엑셀.
- 거래유형 단일 소스 `trade-types.ts`(매매 A1/전세 B1/월세 B2 + 단기임대 B3 추가됨).

## 3. 핵심 발견 — boundingBox 의미 (라이브 검증)

`complex/boundedComplexes`·`article/boundedArticles`는 `boundingBox`(지도 좌표 박스)를 요구한다. 우리 DB에는 동 **중심좌표만** 있고 박스가 없다. 박스 처리 방식을 라이브 probe로 확정했다(영통동 4111710500, 상가 D02):

| 박스 | totalCount |
|---|---|
| 동 크기(±0.03°) | 202 |
| 동 훨씬 초과(±0.2°) | **202** (동일) |
| 동보다 작음(±0.005°) | 137 (잘림) |

**결론:** `filter.legalDivisionNumbers`가 **권위적 필터**다. 박스를 크게 줘도 이웃 동이 섞이지 않고, 작게 주면 잘린다. → **박스는 동을 덮을 만큼 넉넉히(동 중심 ± 0.3°)만 주면 된다.** VWorld 재시드·박스 컬럼 불필요 — 기존 `LegalDivision.naverCode` + 중심좌표(lat/lng)로 충분.

(`legalDivision/subInfoList`는 동 목록 + 중심좌표만 주고 박스는 없음 → 사용하지 않음. 우리 VWorld LegalDivision으로 대체 가능.)

## 4. 아키텍처 — 2가지 수집 모드

매물유형 코드 첫 글자로 분기한다(`A*` = 단지형).

### 단지형 (A01 아파트 · A02 오피스텔 · A04 재건축)
1. `complex/boundedComplexes`(POST) → 동 단지 목록
2. 사용자가 단지 선택
3. `complex/article/list`(POST, complexNumber) → 단지 매물 *(기존 흐름)*

### 비단지형 (C·D·E 전부: 빌라/원룸/단독/전원/상가주택/상가/토지/사무실/건물/공장창고/지산)
1. `article/boundedArticles`(POST) → 동 매물 직접 목록(커서 페이징)
2. 매물 그리드 직접 표시 (단지 단계 없음)

### 공통 요청 골격 (POST body)
```jsonc
// boundedComplexes / boundedArticles 공통
{
  "filter": {
    "tradeTypes": ["A1"],            // 거래유형 (단일선택이지만 배열)
    "realEstateTypes": ["A01"],      // 매물유형 (단일선택이지만 배열)
    "hasArticle": true,
    "legalDivisionNumbers": ["4111710500"],  // naverCode (권위적 필터)
    "legalDivisionType": "EUP",
    // 나머지 필터 필드는 빈 배열/false 고정 (기본 정보만)
  },
  "boundingBox": { "left": cx-0.3, "right": cx+0.3, "top": cy+0.3, "bottom": cy-0.3 },
  "precision": 14,
  "userChannelType": "PC",
  // 단지: "complexPagingRequest": { "size":30, "complexSortType":"POPULARITY_DESC", "lastInfo":[] }
  // 매물: "articlePagingRequest": { "size":30, "articleSortType":"RANKING_DESC", "lastInfo":[] }
}
```
응답: `result.list` + `result.hasNextPage` + `result.lastInfo`(커서). 페이징은 기존 매물 루프와 동일 패턴.

## 5. 타입 분류 — 단일 소스 상수

### `src/lib/naver/trade-types.ts` (기존, 단기임대 포함)
매매 A1 / 전세 B1 / 월세 B2 / 단기임대 B3. `TRADE_OPTIONS`·`TRADE_LABEL`·`DEFAULT_TRADE`.

### `src/lib/naver/property-types.ts` (신규)
```ts
export type PropertyOption = { value: string; label: string; mode: "complex" | "article" };
export const PROPERTY_OPTIONS: PropertyOption[] = [
  { value: "A01", label: "아파트",      mode: "complex" },
  { value: "A02", label: "오피스텔",    mode: "complex" },
  { value: "A04", label: "재건축",      mode: "complex" },
  { value: "C02", label: "빌라",        mode: "article" },
  { value: "C01", label: "원룸",        mode: "article" },
  { value: "C03", label: "단독/다가구", mode: "article" },
  { value: "C04", label: "전원주택",    mode: "article" },
  { value: "D05", label: "상가주택",    mode: "article" },
  { value: "D02", label: "상가",        mode: "article" },
  { value: "E03", label: "토지",        mode: "article" },
  { value: "D01", label: "사무실",      mode: "article" },
  { value: "D03", label: "건물",        mode: "article" },
  { value: "E02", label: "공장/창고",   mode: "article" },
  { value: "E04", label: "지식산업센터", mode: "article" },
];
export const PROPERTY_LABEL = Object.fromEntries(PROPERTY_OPTIONS.map(o => [o.value, o.label]));
export const DEFAULT_PROPERTY = PROPERTY_OPTIONS[0].value; // A01
export const propertyMode = (code: string) => PROPERTY_OPTIONS.find(o => o.value === code)?.mode ?? "article";
```

## 6. 수집 계층 변경 (`src/lib/naver/`)

- **fetch.ts**
  - `fetchBoundedComplexes(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo })` — POST `complex/boundedComplexes`, 박스 = center ± 0.3.
  - `fetchBoundedArticles(ctx, naverCode, { realEstateTypes, tradeTypes, center, lastInfo })` — POST `article/boundedArticles`.
  - 박스 빌더 헬퍼 `boxAround(center, d=0.3)`.
  - 기존 `fetchRegionComplexes`(GET complex/region)는 **제거**(boundedComplexes로 교체). `fetchArticles`(complex/article/list)는 유지.
- **parse.ts**
  - `parseBoundedComplexes(json)` 신규 — 응답 nesting: `list[].complex.{complexInfo, articleCountInfoDto}`. 좌표 `complexInfo.address.coordinates`. (`articleCountInfoDto`는 dealCount/leaseDepositCount/leaseMonthlyCount/leaseShortTerm.)
  - 매물 파서는 **기존 `parseArticles` 재사용** — boundedArticles도 `representativeArticleInfo` 동일 형태. realEstateType 추출 추가(`a.realEstateType`).
  - 기존 `parseRegionComplexes` 제거.
- **index.ts**
  - `listComplexesByRegion(naverCode, { realEstateTypes, tradeTypes, center })` — boundedComplexes 기반으로 교체.
  - `getRegionArticles(naverCode, { realEstateTypes, tradeTypes, center })` 신규 — boundedArticles 페이징 수집(비단지형).
  - `getComplexArticles(complexNumber, { tradeTypes })` 유지(단지형 단지매물).

## 7. 데이터 모델 — Prisma 마이그레이션

```prisma
model Article {
  // ...
  complexId      String?   // 변경: nullable (비단지형은 단지 없음)
  complex        Complex?  @relation(fields: [complexId], references: [id], onDelete: Cascade)
  realEstateType String    // 신규: A01/C02/... 매물유형
  regionCode     String?   // 신규: 비단지형 매물의 동(naverCode) 기준 캐시/조회
  dong           String?   // 신규: 동/호 (parse가 이미 추출)
  lat            Float?     // 신규: 매물 좌표 (비단지형 지도)
  lng            Float?
  // ...
  @@index([complexId])
  @@index([regionCode])
}
```
- `Complex`는 변경 없음(type 이미 보유). boundedComplexes 좌표를 `Complex.lat/lng`에 저장.
- 마이그레이션 이름 `add_property_type`. 기존 캐시 Article은 realEstateType 백필 불가 → 기본값 처리(빈 문자열 대신 NOT NULL이면 마이그레이션에 default ""; 또는 nullable). **결정: realEstateType은 `String?`(nullable)로 두고 신규 수집부터 채운다** — 기존 행 마이그레이션 단순화.

## 8. 서버 액션 + 캐싱

- **actions.ts**
  - `loadComplexes(naverCode, realEstateType, tradeType, refresh)` — 단지형. 캐시 우선(regionCode + type).
  - `loadRegionArticles(naverCode, realEstateType, tradeType, refresh)` — 비단지형. 캐시 우선(regionCode + realEstateType + tradeType).
  - `loadArticles(complexNumber, tradeType, refresh)` — 단지형 단지매물(기존).
  - 전부 `requireUser()` 가드 유지.
- **cache.ts**
  - `upsertArticles`를 일반화: 단지형(complexId 채움) / 비단지형(complexId null, regionCode·realEstateType·lat·lng 채움).
  - `upsertComplexes`에 좌표 저장 추가.

## 9. UI (`/dashboard/naver`) — §6 템플릿 우선

- 상단 컨트롤: **거래유형 라디오**(매매/전세/월세/단기임대) + **매물유형 Select 드롭다운**(14종, 단일선택, 기본 아파트) → 그 아래 **동 선택**(기존 RegionPicker).
- 매물유형이 **단지형**이면: 단지목록(ComplexList) → 단지선택 → 카카오지도 + 단지매물 그리드(기존).
- 매물유형이 **비단지형**이면: 단지 단계 생략, **매물 직접 그리드**(+ 지도에 매물 위치). 그리드는 `dashboards/real-estate`의 테이블/뱃지 패턴 참고.
- 매물 그리드는 `realEstateType` 컬럼/뱃지 추가(매물유형 표시).
- 엑셀 다운로드: 단지형(complexNumber 기준) + 비단지형(regionCode + realEstateType + tradeType 기준) 양쪽 지원.

## 10. 엑셀 export

`/api/naver/export` 일반화: 쿼리 `?complexNumber=` (단지형) **또는** `?regionCode=&realEstateType=&tradeType=` (비단지형). `getCurrentUser()` 가드 유지. realEstateType 컬럼 추가.

## 11. 에러 처리

- 네이버 호출 실패(429/403/5xx) → 기존 백오프 재시도. UI는 기존처럼 에러 메시지 표시.
- 비단지형 매물 0건 → 빈 그리드 + "매물 없음".
- 네이버는 민감(anti-bot) → 보수적 페이싱(요청 간 2.5s), 워밍 세션 재사용.

## 12. 테스트

- **단위(vitest, 픽스처 결정적):** `parseBoundedComplexes`(boundedComplexes 응답 픽스처) / `parseArticles`(boundedArticles 응답 + realEstateType) / 박스 빌더 / property-types 상수. 픽스처는 [web_api_sample.md](../../web_api_sample.md) 응답에서 추출.
- **캐시:** 단지형/비단지형 upsert 분기(합성 번호로 격리, 기존 cache.test 패턴).
- **라이브 검증(수동):** 단지형(아파트) + 비단지형(상가/빌라) 각 1건 동별 수집 → totalCount·섹터 확인.
- 기존 단위 14건 유지(거래유형/엑셀 매핑 등).

## 13. 범위 밖 (YAGNI)

- 매물유형 **복수선택**(네이버는 배열 지원하나 단일선택으로 고정 — 단지형/비단지형 분기가 단일 전제).
- 지도 클러스터(`article/map/articleClusters`·`article/clusteredArticles`)는 지도 핀 전용이라 **목록 수집에 불필요** → 사용 안 함.
- 관심매물(Watchlist)·고급 필터(방수/면적/방향 등)는 다음 단계.
