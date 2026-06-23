# 단계 3: 매물 수집 페이지 (UI) — 설계

- 작성일: 2026-06-23
- 상태: 설계 확정 → 구현
- 선행: 단계 2(스크래퍼 모듈 `src/lib/naver/`, `LegalDivision`/`Complex`/`Article`) 완료
- 흐름: **동 선택 → 단지 목록 → 단지 선택 → 카카오지도 + 매물 그리드 → 엑셀 다운로드**

## 1. 페이지

- 경로: `/dashboard/naver` (`(dashboard)` 그룹 — 인증 보호됨)
- 한 페이지에서 단계적 노출(동 선택 → 단지 → 매물).

## 2. 화면 구성

1. **동 선택**: 시도 → 시군구 → 읍면동 cascading select. 데이터는 우리 `LegalDivision`(서버에서 조회). 읍면동 선택 → `naverCode`(eupLegalDivisionNumber).
2. **단지 목록**: 서버 액션 `collectComplexes(naverCode)` → `listComplexesByRegion` → 단지 리스트(단지명·세대수·매매/전세/월세 수). 항목 클릭 → 단지 선택.
3. **선택 단지 상세** (좌우 분할):
   - **카카오지도**: 단지 위치 마커. 좌표는 매물 `address.coordinates`(수집 시 `Complex.lat/lng`에 저장).
   - **매물 그리드**(@tanstack data-table, 템플릿 내장): 거래유형·가격·전용/공급면적·층·동·중개사·확인일. 거래유형 필터(전체/매매/전세/월세).
   - **[엑셀 다운로드]** 버튼.

## 3. 데이터 / 수집 (네이버 민감 → 보수적)

- **캐시 우선**: `Complex`/`Article`에 있으면 즉시 표시. **[갱신]** 버튼으로 재수집.
- 수집은 **서버 액션**이 `src/lib/naver`(헤드리스, 수 초) 호출 → 로딩 상태 표시.
- **`getComplexArticles` 보완**: `tradeTypes: []`(빈 배열) = 전체 거래유형(매매+전세+월세) 지원. (검증: 빈 배열 → totalCount 236)
- **`Complex.lat/lng` 추가**: 매물 수집 시 첫 매물 좌표로 채움(지도용).
- tradeType 표시 매핑: A1 매매 / B1 전세 / B2 월세 / 기타는 코드 표기.

## 4. 카카오지도

- 클라이언트 컴포넌트 + Kakao Maps JS SDK(스크립트 로드). 키 `KAKAO_MAP_KEY`는 **서버 컴포넌트에서 읽어 prop으로 전달**(NEXT_PUBLIC 리네임 불필요; JS SDK 특성상 브라우저 노출은 불가피, 도메인 제한으로 보호).
- 단지 위치(`Complex.lat/lng`)에 마커 1개. 좌표 없으면 동 좌표(`LegalDivision.lng/lat`)로 센터.

## 5. 엑셀 다운로드

- 라이브러리: `exceljs`.
- 라우트 핸들러 `GET /api/naver/export?complexNumber=&tradeTypes=` → 해당 단지 매물을 xlsx로 생성, `Content-Disposition: attachment`로 다운로드.
- 컬럼: 단지명 · 거래유형 · 가격(원) · 전용면적 · 공급면적 · 층 · 동 · 중개사 · 확인일.
- 데이터 출처: DB 캐시(`Article`). (필요 시 raw에서 확인일 등 보강)

## 6. 컴포넌트 / 파일 (격리)

- `src/app/(dashboard)/naver/page.tsx` — 서버 컴포넌트(시도 목록 + KAKAO 키 prop)
- `src/app/(dashboard)/naver/region-picker.tsx` — 동 cascading select (client)
- `src/app/(dashboard)/naver/complex-list.tsx` — 단지 목록 (client)
- `src/app/(dashboard)/naver/complex-detail.tsx` — 지도 + 매물 그리드 + 엑셀 버튼 (client)
- `src/app/(dashboard)/naver/kakao-map.tsx` — 카카오지도 (client)
- `src/app/(dashboard)/naver/actions.ts` — 서버 액션(동 목록 조회, 단지/매물 수집)
- `src/app/api/naver/export/route.ts` — 엑셀 export
- `src/lib/naver/` 보완: `getComplexArticles` 전체 tradeTypes, `Complex.lat/lng`

## 7. 테스트

- 엑셀 생성(파서→행 변환) 단위테스트(vitest, 픽스처).
- 페이지 E2E(인증된 storageState): 동 선택 → 단지(캐시) → 그리드 표시 → 엑셀 버튼 존재. (라이브 수집은 네이버 민감·flaky라 E2E 제외, 캐시 데이터로.)

## 8. 신규 의존성

- `exceljs` (엑셀). Kakao Maps는 SDK 스크립트(npm 불필요).

## 9. 범위 외 (후속)

- 관심매물(`Watchlist`, 단계 4). 매물 사진/상세. 지도에 매물 다중 마커. 자동 갱신.
