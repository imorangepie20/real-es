# 단계 2: 네이버 수집 스크래퍼 — 설계 (spike 확정본)

- 작성일: 2026-06-23
- 상태: 설계 확정(라이브 spike 기반) → 구현 진행 중
- 상위 스펙: [2026-06-23-naver-collection-design.md](2026-06-23-naver-collection-design.md) — **진입 흐름 교정**: 단지명 키워드 검색 → **동(법정동) 드릴다운** (아래 §1)

## 1. 진입 흐름 교정 (중요)

상위 스펙은 "단지명 검색"을 진입점으로 적었으나, 네이버 fin.land는 **단지명 키워드로 매물을 검색하지 않는다.** 실제 흐름은 **지역(동) 드릴다운**이다.

```
[시도 → 시군구 → 동 선택]   (우리 DB의 법정동 코드)
   → eupLegalDivisionNumber
   → complex/region   → 단지 목록 (단지명·총세대수·사용승인일·매물수)
   → 단지 선택
   → article/list     → 매물 목록 (거래유형·가격·면적·층·중개사)
```

- 단지명 키워드 검색은 **폐기**.
- 상위 스펙 §1의 "행정동 드릴다운(후속)"이 **MVP 진입으로 승격**됨.

## 2. 확정된 엔드포인트 (실제 응답으로 검증)

API 베이스: `https://fin.land.naver.com/front-api/v1`

### complex/region — 동 → 단지 목록
- `GET /complex/region?eupLegalDivisionNumber=<10자리>&size=30&sortType=HOUSEHOLD&page=0`
- 응답: `result.list[].complexInfo { complexNumber, name, type(A01아파트/A02주상복합), totalHouseholdNumber, useApprovalDate }` + `articleCountInfo { dealCount, leaseDepositCount, leaseMonthlyCount }`. `result.hasNextPage`, `totalCount`.

### article/list — 단지 → 매물 목록
- `POST /complex/article/list` (JSON body)
- body: `{ size, complexNumber, tradeTypes:["A1"], pyeongTypes:[], dongNumbers:[], userChannelType:"PC", articleSortType:"RANKING_DESC", lastInfo:[] }`
- tradeTypes: **A1=매매, B1=전세, B2=월세**. realEstateType A01=아파트.
- 응답: `result.list[].representativeArticleInfo { articleNumber, tradeType, spaceInfo{exclusiveSpace,supplySpace}, articleDetail{floorInfo}, brokerInfo{brokerageName}, priceInfo{dealPrice,warrantyPrice,rentPrice}, dongName }`. 중복매물은 `duplicatedArticleInfo.articleInfoList`(MVP는 대표만).
- 페이지네이션: 응답 `result.lastInfo`(커서)를 다음 요청 `lastInfo`로. `hasNextPage`, `totalCount`.

## 3. 법정동 코드 (VWorld 적재)

- `LegalDivision` 테이블에 **시도/시군구/읍면동 + 대표 좌표**를 VWorld Data API로 적재. (`scripts/seed-legal-divisions.mjs`)
- VWorld: `GET https://api.vworld.kr/req/data` (`LT_C_ADSIDO/ADSIGG/ADEMD_INFO`), key=`VWORLD_API_KEY`, **domain=서비스 URL(`https://resm.approid.team`)**, crs=EPSG:4326, geomFilter/attrFilter 필수, `page.total`=페이지 수.
- 적재량: 시도 17 · 시군구 255 · 읍면동 5067 (전부 좌표 보유).
- **코드 매핑(확정)**: 네이버 `eupLegalDivisionNumber`(10) = VWorld `emd_cd`(8) + `"00"`. 예: 정자동 `41111130` → `4111113000`.

## 4. 스크래퍼 모듈 (`src/lib/naver/`)

격리된 단일 책임. 공개 인터페이스만 노출(스펙 §3 원칙 1):
- `listComplexesByRegion(eupLegalDivisionNumber, opts)` → `NaverComplex[]` (수집+캐시)
- `getComplexArticles(complexNumber, { tradeTypes, size, maxPages })` → `NaverArticle[]` (수집+캐시)

내부:
- `fetch.ts` — `withNaverSession`(헤드리스 워밍 → Akamai 쿠키) + `context.request`로 front-api 호출, 429/403/5xx 지수 백오프.
- `parse.ts` — 응답 → 정규화(순수 함수, 픽스처 단위테스트).
- `cache.ts` — `Complex`/`Article` upsert(전역 공유 캐시, price BigInt).

## 5. 수집 방식 / 운영 (스펙 §6) — **검증된 경로**

- **워밍**: 헤드리스로 **홈페이지**를 열어 Akamai 쿠키 확보. 이때 **front-api 요청은 전부 `route.abort`** — 단지상세를 로드하면 front-api를 수십 개 쏴서 불필요한 호출이 생긴다. 수집당 실제 API 호출은 1콜(region) / N콜(article 페이지).
- **요청은 브라우저 동일 헤더 필수**: `sec-ch-ua`·`sec-ch-ua-platform`·`sec-fetch-{dest,mode,site}`·`accept-language`·`priority`·`referer(/map)` + UA를 `sec-ch-ua`와 정렬. 이 헤더가 빠지면 네이버가 **`TOO_MANY_REQUESTS`(429)로 거부** — 이름과 달리 IP 레이트리밋이 아니라 "요청이 덜 브라우저스러움"이다(같은 IP에서 헤더 갖추면 200, bare curl은 429로 확인).
- 그 뒤 워밍된 컨텍스트의 `context.request`로 front-api 호출. 단일 세션 재사용 · 요청 간 지연(2.5s) · 백오프.
- **네이버는 민감(anti-bot)** — 보수적으로. 디버깅 시에도 브라우저 요청을 정확히 복제해 최소 호출로 확인할 것(과도한 probe 금지). 캐싱(TTL)으로 재수집 최소화.

## 6. 테스트

- 파싱·캐싱: 실제 응답 픽스처 기반 결정적 단위테스트(vitest) — 네트워크 없음. (`parse.test.ts`, `cache.test.ts`)
- 라이브 수집: flaky·레이트리밋이라 CI 제외. 수동/별도 검증.

## 7. 데이터 모델 (Prisma)

- `LegalDivision`(code/level/name/fullName/상위코드/naverCode/lng/lat)
- `Complex`(complexNumber@unique/name/type/totalHouseholds/approvalDate/regionCode/raw/fetchedAt)
- `Article`(articleNumber@unique/complexId/tradeType/price BigInt/rentPrice/areaExclusive/areaSupply/floor/realtorName/raw/fetchedAt)
- `Watchlist`는 단계 4.

## 8. 현재 상태 / 남은 일

- ✅ 법정동 VWorld 적재, 파서+캐싱(결정적 테스트), 스크래퍼 모듈, 콘솔 러너(`pnpm collect`).
- ✅ **라이브 end-to-end 검증 완료**: 정자동(4111113000) → 단지 30 + 단지 102614 매매 매물 113건 수집·정규화·캐시(`Complex`/`Article`). 브라우저 헤더 적용 후 200.
- ⬜ 단계 3: 매물 검색 UI(동 선택 → 단지 → @tanstack data-table). 거래유형 B1/전세·B2/월세 실데이터 확인. 캐싱 TTL.
