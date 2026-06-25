# 부동산 실거래가 페이지 설계 (공공데이터포털 국토부 실거래 API)

**작성일:** 2026-06-26
**상태:** 설계 검토 대기

## 목표

거래유형·매물유형·지역(시군구)·기간을 선택하면 국토교통부 실거래 API로 실거래 자료를 받아 **지도 + 그리드 + 주요 통계지표**로 보여주는 페이지(`/dashboard/realprice`).

## 아키텍처 개요

- 데이터 계층 `src/lib/realprice/`: 엔드포인트 레지스트리(유형×거래 → service/operation/fieldMap) + 서버 fetch(XML·JSON 파싱→정규화) + 통계(순수) + DB 캐시.
- 서버 액션이 (시군구·기간)에 대해 월별로 API 호출(캐시 우선) → 정규화 레코드 + 통계 + 동별 집계 반환.
- UI: 상단 필터바 + 좌(또는 상) 지도(Kakao) + 통계 패널 + 하단 그리드. 기존 `region-picker`·`kakao-map`·그리드·엑셀·차트 패턴 재사용.
- 좌표 없음 → 지도는 **동 집계 마커(LegalDivision 좌표)** + 줌인 시 **단지 지오코딩 마커(VWorld, GeocodeCache)**.

## Global Constraints

- 응답·UI 카피·주석 **한국어**, 식별자 영문. 템플릿 우선(`src/components/ui/`·기존 패턴 재사용), 임의 px/hex 금지.
- 거래유형/매물유형은 가능한 한 기존 단일소스(`@/lib/naver/trade-types`·`property-types`) 재사용. 실거래 전용 매핑은 `realprice/endpoints.ts` 단일 정의.
- **API 키 `PUBLIC_DATA_API_KEY`는 서버 전용**(`.env`, gitignore). 절대 클라이언트 번들·로그·커밋에 노출 금지. 호출은 서버(액션/route)에서만.
- money류는 만원 단위(API) → 원 단위 정규화. Prisma 캐시는 JSON.
- ⚠️ 본 샌드박스(해외 IP)는 data.go.kr이 **403(지오/WAF)** 라 라이브 호출 불가 — 정규화·통계는 **픽스처 단위테스트**로 검증, 실 API는 사용자 한국 서버에서 검증.

---

## 1. 엔드포인트 레지스트리 — `src/lib/realprice/endpoints.ts`

베이스 `https://apis.data.go.kr/1613000/`. 공통 파라미터 `serviceKey`·`LAWD_CD`(시군구 5자리)·`DEAL_YMD`(YYYYMM)·`pageNo`·`numOfRows`. 응답 `{ header{resultCode,resultMsg}, body{items:{item:[]}, totalCount, numOfRows, pageNo} }`.

실거래 제공 조합(10종, 단기임대 없음·토지/상업용은 매매만):

| 매물유형 | 매매 service | 전월세 service |
|---|---|---|
| 아파트 | `RTMSDataSvcAptTradeDev` | `RTMSDataSvcAptRent` |
| 오피스텔 | `RTMSDataSvcOffiTrade` | `RTMSDataSvcOffiRent` |
| 연립다세대 | `RTMSDataSvcRHTrade` | `RTMSDataSvcRHRent` |
| 단독/다가구 | `RTMSDataSvcSHTrade` | `RTMSDataSvcSHRent` |
| 토지 | `RTMSDataSvcLandTrade` | — |
| 상업업무용 | `RTMSDataSvcNrgTrade` | — |

각 엔드포인트는 필드명이 다르므로 `fieldMap`으로 공통 키에 매핑:
- 아파트 전월세(확정 필드): `aptNm`(단지명)·`umdNm`(법정동)·`jibun`·`excluUseAr`(전용면적)·`dealYear/Month/Day`·`deposit`(보증금)·`monthlyRent`(월세)·`floor`·`buildYear`·`contractType`(신규/갱신)·`useRRRight`(갱신요구권)·`preDeposit`/`preMonthlyRent`(종전 금액).
- 매매(아파트 등): `aptNm`/`offiNm`/`mhouseNm`(단지명)·`excluUseAr`·`dealAmount`(거래금액)·`floor`·`buildYear`·`umdNm`·`jibun`·(Dev) `roadNm`·`dealingGbn`·`cdealType`(해제여부).
- 단독/다가구: 단지명 없음, `houseType`(주택유형)·`totalFloorAr`/`plottageAr`(연/대지면적). 토지: `jimok`(지목)·`dealArea`(거래면적), 단지명·층 없음. 상업업무용: `buildingType`·`buildingAr`/`plottageAr`.

```ts
export type RealTradeKind = "sale" | "rent"; // 매매 / 전월세
export type RealEndpoint = { service: string; fieldMap: Record<string, keyof RealTxRecord | null>; areaKind: "전용"|"대지"|"건물"|"토지" };
export function endpointFor(propertyType: string, kind: RealTradeKind): RealEndpoint | null; // 미지원 조합은 null
export const REALPRICE_PROPERTY_TYPES: { value: string; label: string; sale: boolean; rent: boolean }[];
```

## 2. 정규화 레코드 — `src/lib/realprice/types.ts`

```ts
export type RealTxRecord = {
  propertyType: string; kind: RealTradeKind;
  name: string;            // 단지명(없으면 주택유형/지목)
  umdNm: string; jibun: string; roadNm?: string;
  area: number | null;     // ㎡ (전용/대지/거래면적 — endpoint.areaKind)
  dealAmount?: number | null;   // 매매 (원)
  deposit?: number | null; monthlyRent?: number | null; // 임대 (원)
  floor?: number | null; buildYear?: number | null;
  dealDate: string;        // YYYYMMDD
  contractType?: string; isRenewal?: boolean; preDeposit?: number | null; preMonthlyRent?: number | null; // 임대 부가
  isCanceled?: boolean;    // 매매 해제거래
};
```
거래유형 매핑: 매매=sale 엔드포인트. **전세/월세는 rent 엔드포인트 1회 호출 후 `monthlyRent>0`로 분기**(전세=0). 금액은 만원→원 변환.

## 3. fetch — `src/lib/realprice/fetch.ts` (서버)

`fetchRealTransactions({ lawdCd, propertyType, kind, months })`:
- months(최근 N개월) 각각 `DEAL_YMD`로 호출(`numOfRows` 크게, `totalCount` 보고 페이지 루프).
- 응답이 XML이면 `fast-xml-parser`, JSON이면 `JSON.parse`(선두 문자 `<`/`{` 판별). `header.resultCode !== "000"`이면 해당 월 실패로 기록하고 계속(부분 성공).
- 유형별 `fieldMap`으로 정규화 → `RealTxRecord[]`. **캐시 우선**(§6): (lawdCd,ymd,propertyType,kind) 캐시 hit면 API 생략.
- 키는 `process.env.PUBLIC_DATA_API_KEY`, `serviceKey`는 URL 인코딩(디코딩 키 대비 `--data-urlencode` 상당 처리).

## 4. 통계 — `src/lib/realprice/stats.ts` (순수·테스트)

`computeStats(records)`:
- 공통: 거래건수, 평균/중위 거래금액(매매=dealAmount / 임대=deposit), **㎡당 평균가**(금액/area, area 있는 유형만), 면적대별 건수(~60/85/135㎡ 등 구간), **월별 추이**(건수·평균가).
- 매매: 해제거래 비중(isCanceled).
- 임대: 전세/월세 비중, 신규/갱신 비중(contractType), **평균 임대료 인상률**(preDeposit·preMonthlyRent 있는 갱신건의 (현재-종전)/종전).

## 5. 서버 액션 — `src/app/(dashboard)/dashboard/realprice/actions.ts`

`loadRealPrice(filters)` → `{ records, stats, byDong:{ umdNm, count, avg }[], failedMonths }`. `requireUser()`(보호 라우트). 동별 집계는 `LegalDivision`(시군구 하위 동) 좌표와 조인해 지도용 좌표 부여.

## 6. 스키마/캐시 (Prisma, 비파괴 마이그레이션)

```prisma
model RealTxCache {  // 실거래 응답 캐시(API 일일한도 절감)
  id String @id @default(cuid())
  lawdCd String; dealYmd String; propertyType String; kind String
  records Json; totalCount Int; fetchedAt DateTime @default(now())
  @@unique([lawdCd, dealYmd, propertyType, kind])
}
model GeocodeCache { // 단지 좌표 영구 캐시(VWorld 지오코딩)
  id String @id @default(cuid())
  query String @unique; lat Float?; lng Float?; fetchedAt DateTime @default(now())
}
```
TTL: 과거 월은 영구(확정), **당월·전월은 24h 후 재조회**(추가 신고분 반영).

## 7. UI — `src/app/(dashboard)/dashboard/realprice/`

- `page.tsx`(서버, 보호) + `realprice-view.tsx`(클라). nav.ts에 "실거래가" 추가.
- **필터바**: 거래유형(매매/전세/월세)·매물유형(`REALPRICE_PROPERTY_TYPES`, 거래유형에 따라 미지원 유형 비활성)·지역(`region-picker` 시군구)·기간(3/6/12개월). 조회 버튼.
- **지도**(`kakao-map` 재사용): 줌 아웃=동 집계 마커(`byDong` 좌표, 건수·평균가 라벨), 줌인 임계 이상=단지 마커(고유 단지 지오코딩→GeocodeCache). 마커 클릭→그리드 필터.
- **통계 패널**: 카드(건수·평균/중위·㎡당) + 월별 추이 차트(템플릿 차트) + 면적대 분포.
- **그리드**: 레코드 표(단지·법정동·면적·금액·층·건축년도·계약일), 클라 페이징·정렬, 엑셀 다운로드(exceljs 서버 패턴).

## 8. 에러 처리

- API 일일 호출한도 초과(`resultCode` 22 등)·키 오류(30) → 사용자 안내. 빈 결과(거래 없음) → 안내 + 빈 상태.
- 부분 성공: 일부 월 실패 시 `failedMonths` 표시하고 나머지 표시.
- 미지원 조합(예: 토지 전월세) → 필터에서 차단.
- 지오코딩 실패 단지 → 동 마커로 폴백.

## 9. 테스트 (vitest, 픽스처 결정적)

- `endpoints`: 조합별 endpointFor 매핑·미지원 null·fieldMap 키.
- `parse/normalize`: 유형별 응답 픽스처(아파트 전월세 확정 필드 포함) → RealTxRecord 정규화(만원→원·전세/월세 분기·면적 종류).
- `stats`: 평균/중위/㎡당·면적대·월별추이·갱신율·인상률(고정 입력→기대값).
- 지도·그리드·실 API 연동은 라이브(한국 서버) 검증.

## 10. 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/realprice/endpoints.ts` (+test) | 엔드포인트·필드맵 단일소스 |
| `src/lib/realprice/types.ts` | RealTxRecord 등 타입 |
| `src/lib/realprice/normalize.ts` (+test) | 응답 파싱·유형별 정규화(순수) |
| `src/lib/realprice/fetch.ts` | 서버 호출(키·월루프·캐시·XML/JSON) |
| `src/lib/realprice/stats.ts` (+test) | 통계 계산(순수) |
| `.../dashboard/realprice/actions.ts` | loadRealPrice 서버 액션·동집계·지오코딩 |
| `.../dashboard/realprice/page.tsx`·`realprice-view.tsx` | 페이지·필터·지도·통계·그리드 |
| `prisma/schema.prisma` + 마이그레이션 | RealTxCache·GeocodeCache |
| `src/lib/nav.ts` | "실거래가" 메뉴 |
| `package.json` | `fast-xml-parser` 의존 추가 |

## 11. 범위 / 단계 (writing-plans 분해 가이드)

1. 데이터계층(endpoints·types·normalize+test) → 2. fetch+캐시·서버액션 → 3. 필터바+그리드+엑셀 → 4. 통계 패널+차트 → 5. 지도(동집계→단지 지오코딩). 각 단계 독립 검증(픽스처/정적), 라이브는 한국 서버.

## 12. 검증 한계 (재확인)

샌드박스 403으로 실 API 응답을 직접 못 받음 → 정규화/통계/엔드포인트는 픽스처·단위테스트로 보장, end-to-end(지도·실데이터)는 prod(한국) 재빌드 후 사용자 검증. 픽스처는 공개 스펙(아파트 전월세 확정 필드 등) 기반으로 작성.
