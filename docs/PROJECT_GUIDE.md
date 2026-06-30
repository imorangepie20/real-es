# Project Guide

real-es 프로젝트의 공통 방향 가이드. 새 세션은 추측으로 구조를 바꾸지 말고 이 문서부터 읽는다.

## 1. 프로젝트 한 줄 요약

> TBD

## 2. 현재 확정된 큰 방향

> TBD

## 3. 왜 이렇게 정했는가

> TBD

## 4. 현재 소스 구조 이해

- `src/app/` — `(auth)`(로그인·가입)·`(dashboard)`(서버 가드 보호) 라우트 그룹 + `api/`(health, naver export). 매물 수집 화면은 `(dashboard)/dashboard/naver/`.
- `src/lib/` — `auth/`(세션·비번·쿠키), `db.ts`(Prisma 싱글톤), `naver/`(수집 fetch·parse·cache + `trade-types.ts` 거래유형 단일 소스), `nav.ts`(메뉴 단일 소스), `data.ts`(템플릿 mock).
- `prisma/` — schema + 마이그레이션(Agency·User·Session·LegalDivision·Complex·Article).
- `scripts/` — `seed-legal-divisions`(VWorld 법정동 적재)·`collect`(콘솔 수집)·`run-prod`(터널 prod 기동).
- 단계별 **사용자 가시 변경**은 [README.md](../README.md) §"현재 반영 상태", **방향·결정 요약**은 아래 §8에 적는다.

## 5. 각 영역의 책임

> TBD

## 6. 새 세션이 시작되면 먼저 볼 문서

아래 순서대로 보면 현재 문맥을 가장 빨리 따라올 수 있습니다.

1. [README.md](../README.md)
2. [PROJECT_GUIDE.md](PROJECT_GUIDE.md)
3. [CLAUDE.md](../CLAUDE.md)

(콘텐츠 문서가 늘어나면 여기에 추가한다.)

## 7. 앞으로 문서를 갱신하는 규칙

- 기술 스택이 바뀌면 스택 문서를 먼저 수정한다.
- 구조 결정이 바뀌면 `docs/decisions/`에 ADR을 추가하거나 수정한다.
- 새 세션이 꼭 알아야 할 공통 방향이 바뀌면 이 `PROJECT_GUIDE.md`를 갱신한다.
- 루트 구조가 바뀌면 `README.md`도 함께 수정한다.

## 8. 현재 참고 상태

- **스택 확정**: `SDTPL_ADM`(shadcn UI Kit 클론) 템플릿을 베이스로 인입 완료 — Next.js 16 + React 19 + Tailwind v4 + shadcn/ui(Base UI) + pnpm. 빌드·기동 검증 통과. 백엔드(PostgreSQL/Prisma)·네이버 매물 수집은 단계 0~3로 적용 완료, Tauri 데스크탑만 예정.
- **메뉴 단일 소스**: `src/lib/nav.ts` 한 곳이 사이드바 + ⌘K 팔레트를 구동 — 스펙(§제품)의 메뉴 구조를 여기에 매핑한다.
- **데이터 출처**: 네이버 수집(Complex/Article)은 **DB 실데이터**로 `/dashboard/naver`에 표시. 템플릿 대시보드(`/dashboard/*`)는 아직 mock(`src/lib/data.ts`) — 해당 화면을 실데이터로 붙일 때 교체한다.
- **배포**: `https://resm.approid.team` (Cloudflare 터널로 로컬 dev/prod 서버를 노출 예정).
- 제품 스펙은 [project_structure.md](project_structure.md) 참고 — 세부는 진행하며 사용자와 상의해 채운다.
- **백엔드 단계 0 완료**: 기존 `mrms-pg`의 `real_es` DB(호스트 5433)에 Prisma 6 연결 — `Agency`(테넌트 루트) 모델 + 첫 마이그레이션, `src/lib/db.ts` 싱글톤, `GET /api/health` DB ping(e2e 통과), 앱 포트 3001. 다음 단계 1(인증)은 이 `Agency` 위에 `User`/`Session`을 얹는다. 계획·진행: [superpowers/plans/2026-06-23-stage-0-db-prisma.md](superpowers/plans/2026-06-23-stage-0-db-prisma.md).
- **인증 단계 1 완료**: `src/lib/auth/`(password·session·cookies·current-user) + `(auth)/actions.ts` 서버 액션. 회원가입이 Agency+admin User 생성, 세션은 opaque 토큰+DB tokenHash(30일). 보호는 `(dashboard)/layout.tsx` 가드, 인증 페이지는 `(auth)/layout.tsx`에서 로그인 시 리다이렉트. 기존 템플릿 e2e는 Playwright storageState 픽스처로 인증해 통과. 다음 단계 2(스크래퍼)는 이 인증/테넌트 위에서 진행. 설계: [superpowers/specs/2026-06-23-stage-1-auth-design.md](superpowers/specs/2026-06-23-stage-1-auth-design.md) · 계획: [superpowers/plans/2026-06-23-stage-1-auth.md](superpowers/plans/2026-06-23-stage-1-auth.md).
- **네이버 수집 단계 2(진행)**: 검색 = **동 드릴다운**(`complex/region` 단지목록 + `article/list` 매물). 단지명 키워드 검색은 폐기. 법정동 코드는 VWorld로 `LegalDivision`에 적재(`naverCode = emd_cd + "00"` = 네이버 `eupLegalDivisionNumber`). 스크래퍼는 `src/lib/naver/`(fetch: 헤드리스 홈 워밍+front-api abort+`context.request` / parse / cache). **라이브 검증 완료**(`pnpm collect 4111113000 102614`). **브라우저 동일 헤더 필수**(sec-ch-ua·sec-fetch-*·accept-language 없으면 429 — IP 레이트리밋 아님). 네이버 민감(anti-bot) — 보수적 페이싱·캐싱, 디버깅도 최소 호출. VWorld는 `VWORLD_API_KEY` + 서비스 URL `https://resm.approid.team`. 확정 설계: [superpowers/specs/2026-06-23-stage-2-collection-design.md](superpowers/specs/2026-06-23-stage-2-collection-design.md).
- 매물 수집 단계 3(UI): `/dashboard/naver` — 동 선택→단지 목록→단지 선택→카카오지도+매물 그리드→엑셀 다운로드(exceljs). 캐시 우선 수집, KAKAO_MAP_KEY(서버→prop).
- 터널 운영(prod)·거래유형 UI: 원격 dev라 터널(`resm.approid.team`) 접속은 **production 모드 필수** — `bash scripts/run-prod.sh`(종료→prisma generate→build→`next start -p 3001`). `next dev`는 cross-origin 서버액션이 막혀 동 드릴다운이 실패하므로 `next.config.ts`에 `serverActions.allowedOrigins`·`allowedDevOrigins`=["resm.approid.team"] 추가. 매물 그리드의 거래유형 선택은 **지역 선택 위 라디오 단일선택**(매매/전세/월세)으로 이동, 거래유형 코드·라벨은 단일 소스 `src/lib/naver/trade-types.ts`로 통합(하드코딩 금지).
- **매물유형 전체 수집 단계 4**: 매물유형 14종 → 코드 `A*`(아파트·오피스텔·재건축)는 **단지형**(`complex/boundedComplexes`→단지→`complex/article/list`), 나머지(C·D·E)는 **비단지형**(`article/boundedArticles` 동별 매물 직접). 두 bounded 호출 공통 `filter.legalDivisionNumbers:[naverCode]`(실필터, 라이브 검증) + `boundingBox`=동 중심 ±0.3°(VWorld 재시드 불필요). 거래유형 단기임대(B3) 추가. 거래·매물유형 단일 소스 `trade-types.ts`/`property-types.ts`. `Article.complexId` nullable + realEstateType/regionCode/dong/좌표 컬럼. 라이브 검증(영통동: 오피스텔 9단지 / 상가 208매물). 설계: [superpowers/specs/2026-06-24-property-type-collection-design.md](superpowers/specs/2026-06-24-property-type-collection-design.md).
- 매물유형 표시 수정: 셀렉트 트리거가 코드(A01) 대신 라벨(아파트) 표시. Base UI `SelectValue`는 선택 value를 렌더하므로 `PROPERTY_LABEL[property]`를 children으로 전달(템플릿 StatusVariant 패턴).
- 매물 검색 페이지 단계 ①(레이아웃, 설계 [superpowers/specs/2026-06-24-naver-search-page-design.md](superpowers/specs/2026-06-24-naver-search-page-design.md)): 검색 바 Card + 선택 요약 Badge + 단지형 단지목록(좁은 스크롤)·지도 우측·매물 하단 풀너비 + 로딩 Skeleton/빈 상태 Empty. 데이터 흐름 불변, 시각·구성만 템플릿 기반으로 완성. 다음 ②지도(단지 마커+비단지 클러스터, 신규 스크레이퍼)→③표 필터→④엑셀 필드선택.
- 카카오 지도 키 정정: page.tsx의 env 변수명을 `.env`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 맞춤(기존 `KAKAO_MAP_KEY` 미스매치로 지도 미표시). 키는 .env 보관(gitignore).
- 매물 목록 페이징: 매물 표 20개씩 클라이언트 페이징(이전/다음, 새 검색·갱신 시 1페이지). TanStack 도입 전 경량 구현 — 단계 ③에서 검색·필터·정렬과 통합 예정.
- 매물 검색 ②(단지 마커): 단지형 지도가 단지 전체 마커 + bounds 자동 맞춤, 마커 클릭=단지 선택(목록·표 연동), 선택 시 panTo. KakaoMap을 `markers[]`+`selectedKey`+`onSelect` API로 일반화. parse/cache는 이미 단지 좌표 저장 → `ComplexRow`에 노출만. 비단지형은 `article/map/articleClusters`(원 안 숫자) 신규 스크레이퍼로 별도.
- 매물명 필드: **매물명 = 단지명 + 동명**. parse가 단지명(`articleName ?? complexName`)을 `NaverArticle.name`→`raw`에 저장, `toRow`에서 `dong`(N동)과 합쳐 `ArticleRow.name` 생성(마이그레이션 없음). 표 첫 컬럼. 기존 행은 재수집 후 단지명 채워짐. parse/cache 픽스처에 name 반영.
- 대시보드 푸터: `src/components/layout/app-footer.tsx`(AppFooter)를 `(dashboard)/layout.tsx`의 main 아래에 마운트. 헤더와 동일 토큰, 본문과 여백(mt-4)+border-t. 전 대시보드 페이지 공통.
- 매물 검색 ②(비단지형 클러스터, 참고 [web_api_sample.md](web_api_sample.md)): 신규 스크레이퍼 `getArticleClusters`(article/map/articleClusters, 단일 호출)·`getClusteredArticles`(article/clusteredArticles, 페이징·캐시) + `parseArticleClusters` + 액션 `loadArticleClusters`/`loadClusterArticles`. KakaoMap이 `clusters[]`(CustomOverlay 원 안 숫자)+`onClusterClick` 지원. 비단지형 레이아웃 = 지도(위, 높이 40rem)+매물(아래) 통일. 동 선택 시 지도=클러스터·표=빈 상태 → 원 클릭 시 clusteredArticles 드릴로 채움(전체 자동로드 제거, `loadRegionArticles`는 미사용이나 "전체 보기" 재도입 위해 보존). 라이브 검증은 prod 재빌드 후.
- 매물 표 보강 1: 넘버링(`articles.length - 전역index`, 내림차순) + 비단지형 "전체 매물" 버튼(`loadRegionArticles` 재사용) + 엑셀 export route 파일명 타임스탬프(서버 local time).
- 매물 표 보강 2: ArticlesGrid에 행 선택 `Set<articleNumber>`(렌더 중 prop 변화로 초기화) + 헤더 전체선택(indeterminate) + 선택 수. 관심목록 저장 액션과 연결 예정.
- 관심 매물(사용자별): `Favorite` 모델(userId FK, `data Json` = ArticleRow 스냅샷, `@@unique(userId, articleNumber)`) + 마이그레이션 `add_favorite`. 액션 `saveFavorites`/`listFavorites`/`deleteFavorites`(actions.ts). 매물 표 `onSave`→sonner 토스트, 보기 페이지 `naver/favorites`(force-dynamic) + FavoritesView(선택 삭제·router.refresh). nav.ts에 "관심 매물" 추가. 스냅샷이라 전역 Article 캐시 변동/삭제와 무관.
- 엑셀 출력 필드 선택(④): `EXCEL_FIELDS`(excel-fields.ts) 단일 정의를 `articlesToWorkbook(rows, fields?)`와 ExportDialog(체크박스 다이얼로그)가 공용. export route가 `fields` 쿼리(콤마)로 필터. exceljs는 서버에만(클라 번들 안전). 매물 검색 페이지 4단계(레이아웃·지도·표·엑셀) 골격 완료.
- 주소·사용승인일: `NaverArticle.address`(city+division+sector)·`approvalDate`(buildingConjunctionDate)를 parse→raw 저장→toRow/naverToRow·excel(EXCEL_FIELDS)·export route(raw)·표 컬럼까지 일괄. 단일 파서라 전 매물유형 공통. 난방방식은 list/bounded 응답에 없음(미포함). parse/excel 픽스처·테스트 반영.
- 관심 매물 보기 표에 넘버링(`favorites.length - i`, 내림차순) 추가 — 페이징 없이 전체 표시이므로 인덱스 기반.
- 관심 매물 페이지 보강: FavoritesView에 주소·사용승인일 컬럼 + 매물유형/거래유형 클라 필터(ALL 센티넬) + ExportDialog(관심매물 전용 route `api/naver/favorites/export`, 스냅샷→ExcelRow, 필터/필드/타임스탬프). 인라인 편집은 다음 단계.
- 관심 매물 인라인 편집(더블클릭): EditCell(입력)/SelectCell(유형·거래)이 더블클릭 시 편집 진입(평소 표시값 유지: won/ymd/라벨), blur·Enter 저장·Esc 취소. `patchRow` 낙관적 갱신 + `updateFavorite`(스냅샷 data 병합). 필터/내보내기/삭제는 로컬 data 기준.
- KakaoMap 빈 상태: markers·clusters 없을 때 서울시청 좌표를 fallback 중심으로 지도 초기화(이전 empty 오버레이 제거, loading 오버레이만 유지).
- 매물 관리 기반(① 모델·필드 단일소스·서버액션): 자체 `Property` 모델(개인별 userId, 네이버 캐시와 별개) + 마이그레이션. 필드 정의 단일 소스 `src/lib/properties/fields.ts`(그리드·폼·엑셀 공용, `coerceField` 정규화). 서버액션(목록 상태뷰/등록/수정/삭제/상태전환/관심토글/엑셀입력) — UI는 다음 단계.
- 매물 관리 목록(② 상태 뷰): "매물 관리" 메뉴(전체/관심/계약완료) — 공용 `Property` 그리드(체크박스·전체선택·넘버링·매물·거래유형 필터·**더블클릭 인라인편집**·선택 삭제·계약완료 전환·관심 별 토글). 관심매물 셀 편집 컴포넌트를 `components/data-grid/editable-cell`로 공용화해 재사용. (엑셀 출력 버튼은 첫 빌드 비범위)
- 매물 등록/수정 폼(③): `/dashboard/properties/new`·`/[id]/edit` — 필드 단일소스를 섹션(기본/면적/금액/건물/고객/관련부동산/일정/메모)으로 그룹화한 폼(템플릿 `Field`/`Input`/`NativeSelect`/`Checkbox`). 저장 후 목록으로 이동.
- 매물 엑셀 입력(④): "엑셀 입력" 다이얼로그 — 업로드 시 첫 시트 헤더를 매물 항목에 **자동 매칭**(라벨·별칭 사전, 공백/괄호 무시), 매핑 확인 표에서 열↔항목 수동 조정 + 미리보기, 숫자 형식 불일치 셀 경고 후 일괄 등록(출처=엑셀). 읽기 exceljs(서버), 매칭/정규화는 클라·서버 공용 순수 모듈로 분리. 단위 테스트(매칭·정규화·라운드트립 파싱).
- 매물 관리 리파인 1(목록): 목록 정렬을 등록순(createdAt) 고정으로 변경 — 관심 토글·인라인 수정 시 행이 맨 위로 점프하던 것 해소. 상태 필터(전체/진행/계약완료) 추가(계약완료 뷰 제외).
- 매물 관리 리파인 2(엑셀 다운로드): 목록에서 "엑셀" → 필드 선택 다이얼로그(섹션별 체크박스, 기본=목록 10종) → 현재 필터(뷰/유형/거래/상태) 반영해 다운로드(타임스탬프 파일명). 서버 전용 `excel-export`(exceljs)·전용 route.
- 매물 관리 리파인 3(폼 재설계): 등록/수정 폼을 "직접 입력하는 사람" 관점으로 — 출처 자동(폼 제외), 필드 폭을 내용에 비례(12칼럼·메모 전체폭), 금액 콤마+단위(원/㎡/대/세대) 우측정렬, 날짜 선택기, 전화 자동 하이픈, 거래유형 따라 가격→보증금 라벨·관련 없는 금액 흐림.
- 매물 관리 리파인 4(뷰별 액션 정리): 관심/계약완료 뷰에서 "엑셀 입력"·"새 매물" 버튼 숨김(전체 뷰에서만 노출), 계약완료 뷰는 상태 필터도 제외. 엑셀 다운로드·유형/거래 필터는 전 뷰 유지.
- 매물 관리 — 매물명 필드 추가: 단지명과 별개의 자유 텍스트 주 식별자 `name`(nullable) 추가. 필드 단일소스라 폼 기본 섹션 맨 앞·목록 첫 컬럼·엑셀 입력 헤더매칭("매물명")·엑셀 출력 선택에 자동 반영. 비파괴 마이그레이션.
- 계약 서류 참고문서: [contract-documents-guide.md](contract-documents-guide.md) 신규 — 매물유형×거래유형별 필요서류·처리·신고/세금·주의사항 정리(빠른 매트릭스+거래유형별 상세+타임라인+세금요약). "계약 서류 체크리스트" 기능을 위한 데이터 구조 제안 포함: 공통∪거래유형∪매물군∪**교차 오버레이(byCross)** 합집합 모델(거래유형×매물유형 교차 항목 — 예: 주거=전입신고/상가=사업자등록 — 분기). 자동 교차검증 지적은 "검증 노트" 부록에 전문가 확인 플래그로 기록(법령 사실은 미확정·전문가 확인 전제).
- 네이버 매물 API 참고문서: [naver-fin-land-api-reference.md](naver-fin-land-api-reference.md) 신규 — "네이버 관심매물 가져오기" 기능 대비 역공학 정리. 봇차단 우회(평문 curl 429 → `curl_cffi` TLS 위장 → Playwright 스텔스), 검증된 fin.land `front-api` GET/POST 엔드포인트, 단지별 매물 목록 요청 본문(`complex/article/list`)·지도뷰(`article/map/articleClusters`), 관심매물=계정귀속(401)이라 사용자 세션 필요, 앱 `Property` 매핑 제안. **약관/법적 가드레일 명시**(공식 공개 API 없음·자동수집 제약).
- 계약 진행 워크플로(설계 [superpowers/specs/2026-06-25-contract-workflow-design.md](superpowers/specs/2026-06-25-contract-workflow-design.md)·계획 [superpowers/plans/2026-06-25-contract-workflow.md](superpowers/plans/2026-06-25-contract-workflow.md)): 상태 3단계(진행→계약진행→계약완료) + `rentPrice`·`contractChecklist`(Json) 컬럼. 순수 단일소스 `contract-checklist.ts`(PARTIES·GROUPS·항목사전·`resolveChecklist`·`requiredFieldKeys`·`contractProgress` — **byCross 매물군×거래유형 교차** 합성, 상가임대≠전입신고)·`contract-forms.ts`(양식·슬롯 매핑, GROUPS 재사용). 서버 `contract-actions.ts`(userId 스코프·`completeContract` 서버 재검증·`startContract` status="진행" 가드로 역행 차단). 계약 페이지 `[id]/contract/`(서버 page + ContractClient 진행률 파생·읽기전용)·인쇄 `print/[formId]`(`getProperty` 스코프=IDOR차단·A4 print CSS, 대시보드 크롬 `print:hidden`). `toRow`는 `row-utils.ts`로 분리("use server" 파일은 async export만). SDD 7태스크 + opus 전수리뷰(Critical: 계약완료 역행 → 가드 수정). 라이브 첫 렌더에서 RSC 직렬화 오류(서버가 `formsFor` 결과의 `applies` 함수를 클라에 전달) 발견 → page.tsx에서 `{id,label}`만 전달하도록 수정. **교훈: "use server" async-export·RSC 직렬화 오류는 tsc/eslint/build로 안 잡히고 런타임/라이브에서만 드러남 → 머지 전 라이브 1회 렌더 권장.**
- 매물 주소 필드: `Property.address`(String?, 소재지 주소) 추가. 단일소스 `fields.ts`(기본 그룹, complexName 다음)라 폼·엑셀·toData/toRow 자동 반영. `contract-forms.ts` PROPERTY_SLOTS의 "소재지" 슬롯을 complexName→address로 변경(단지명 슬롯 별도 유지). 비파괴 마이그레이션 `add_property_address`.
- 계약 체크리스트 항목 정합(문서↔코드): `ChecklistItem.kind`를 **서류/처리/신고/세금** 4종화(취득세 신고→세금, `TAX_CAPITAL_GAINS` 양도세 예정신고 항목 신규·매매에 부여)·라벨을 문서의 명확한 형태로 통일(등기필증·대항력·우선변제권·매도용 인감·개업20일·농취증). `contract-client.tsx` 종류 배지에 "세금" 추가. 문서 [contract-documents-guide.md](contract-documents-guide.md) §앱적용 JSON(checklistItems·byDealType/byCross·예시)을 구현 `contract-checklist.ts`와 1:1 일치하도록 갱신. ID는 구현 기준(DOC_ID 등)으로 통일.
- 계약 양식 인쇄 재설계: `print/[formId]/page.tsx`가 슬롯 표 대신 신규 `print/contract-document.tsx`의 `ContractDocument`(서버 컴포넌트, 정적 렌더 — RSC 직렬화 위험 없음)를 렌더. 양식별 본문(SaleContract·LeaseContract·ConfirmStatement·Receipt·PowerOfAttorney) + 공용 컴포넌트(PropertyTable·SaleAmount/LeaseAmount·Articles·SpecialTerms·Signatures·DateLine). A4(210mm)·serif·`print:` CSS, 보유 데이터(`address`·금액·일정·고객 한쪽) 자동기입, 상대 당사자·주민번호·날인은 기입란. `contract-forms.ts`의 `slots`는 테스트 자산으로 유지(렌더는 미사용). 표준 조문 텍스트는 실무 보조용(비공식 고지 유지).
- 부동산 실거래가 페이지(설계 [superpowers/specs/2026-06-26-realprice-design.md](superpowers/specs/2026-06-26-realprice-design.md)·계획 [superpowers/plans/2026-06-26-realprice.md](superpowers/plans/2026-06-26-realprice.md), SDD 9태스크+opus 전수리뷰): 순수 데이터층 `src/lib/realprice/`(`endpoints.ts` 유형×거래 엔드포인트·fieldMap 단일소스 / `normalize.ts` XML·JSON 파싱·만원→원·날짜조립 / `stats.ts` 통계 / `fetch.ts` 월별호출·DB캐시[`RealTxCache` 복합unique, 당월·전월 24h TTL, totalCount 페이지루프 상한20p] / `geocode.ts` VWorld·`GeocodeCache`) + 서버액션 `realprice/actions.ts`(`loadRealPrice` 동집계 `LegalDivision level:EMD·sigunguCode=lawdCd 조인 좌표`, `loadComplexPoints` 단지 지오코딩 200상한) + 클라 뷰(`realprice-view.tsx` 필터·그리드·엑셀, `stats-panel.tsx` recharts, `realprice-map.tsx` KakaoMap 동클러스터→단지 드릴다운). 키 `PUBLIC_DATA_API_KEY`·`VWORLD_API_KEY` **서버 전용**(클라는 `NEXT_PUBLIC_KAKAO_MAP_KEY`만). 비파괴 마이그레이션 `add_realprice_cache`. 순수층 74테스트, 네트워크/UI는 tsc+eslint+build. ⚠️ data.go.kr·VWorld·Kakao는 샌드박스 해외IP 차단 → **실 end-to-end·필드명(아파트 전월세 외)·일일 호출한도는 한국 prod 서버 첫 라이브에서 검증**.
- 고객관리(Customer CRM)(설계 [superpowers/specs/2026-06-26-customer-management-design.md](superpowers/specs/2026-06-26-customer-management-design.md)·계획 [superpowers/plans/2026-06-26-customer-management.md](superpowers/plans/2026-06-26-customer-management.md), executing-plans 6태스크): 신규 `Customer` 모델(`userId`·`types String[]`·이름/전화/주소/이메일/성별/메모·`propertyId?` 출처매물 `onDelete:SetNull`). 순수 `customers/types.ts`(`CUSTOMER_TYPES`·`GENDERS`·`normalizeCustomerTypes` — 거래당사자 다중·**단순방문 배타**·기본 단순방문, 5테스트) + 서버액션 `customers/actions.ts`(userId 스코프 CRUD·`propertyId` 소유검증·`customerDraftFromProperty`) + 목록 `customer-list.tsx`(검색·유형필터·삭제) + 폼 `customer-form.tsx`(유형 토글 배타·성별 라디오·`formatTel` 재사용·매물 프리필) + `new`/`[id]` 라우트. 매물 `[id]/edit`에 "고객으로 등록" 버튼(`?propertyId=`). 비파괴 마이그레이션 `add_customer`. tsc+eslint+build+vitest 검증.
- 매물 금액: `dealAmount`(거래금액) 필드 제거 → `price`(가격)로 일원화. `contract-forms.ts` 매매대금 슬롯·`contract-checklist.ts` A1 requiredFieldKeys·`header-match.ts` "매매가" 별칭·`contract-document.tsx` 매매대금/거래예정금액/영수증 모두 `price` 연결. **money 단위 정책: 입력·표시 만원, 저장 원**(`actions.ts` toData ×10000, `property-list`/`property-form`/`contract-client`/`excel-export` ÷10000·×10000 환산, `formMeta` unit "만원"). 계약서 인쇄(`contract-document`)는 저장값(원)을 그대로 `won()` 표기. 컬럼 미변경(비파괴). 테스트 갱신(dealAmount→price, 만원 환산값). ⚠️ 엑셀 import 시 시트의 금액은 만원으로 간주.
- 일정관리(캘린더)(설계 [superpowers/specs/2026-06-26-calendar-design.md](superpowers/specs/2026-06-26-calendar-design.md)·계획 [superpowers/plans/2026-06-26-calendar.md](superpowers/plans/2026-06-26-calendar.md), SDD 6태스크+opus 전수리뷰): 신규 `Event` 모델(userId·title·`date` YYYYMMDD·startTime?·category·memo·propertyId?/customerId? SetNull). 순수 `src/lib/calendar/`(`categories.ts` 유형·색 / `month-grid.ts` `buildMonthGrid`·`ymd`·한국어명칭, month **0-indexed** / `property-events.ts` `propertyCalendarEvents` 매물 7개 날짜필드→파생, 87테스트) + 서버액션 `calendar/actions.ts`(`loadCalendar` userId스코프·`monthPrefix` startsWith·매물파생·옵션 / create·update·delete IDOR `updateMany`·`ownedId` 소유검증) + 클라(`calendar-view.tsx` 월그리드·실제오늘·`useRef` 요청가드·유형필터·매물행→`/properties/[id]/edit`, `event-dialog.tsx` 추가/수정/삭제·종일토글·매물/고객 연결). nav "일정관리"(`Calendar`). 비파괴 마이그레이션 `add_event`. set-state-in-effect는 `key` 리마운트+lazy init+`reload` useCallback으로 회피. tsc+eslint+build+vitest 검증.
- 우편번호 검색기(설계 [superpowers/specs/2026-06-26-postcode-search-design.md](superpowers/specs/2026-06-26-postcode-search-design.md)·계획 [superpowers/plans/2026-06-26-postcode-search.md](superpowers/plans/2026-06-26-postcode-search.md)): 재사용 컴포넌트 `customers/postcode-search.tsx`(Daum 우편번호 스크립트 1회 동적로드 + "주소 검색" 버튼 + `onComplete({zonecode, address})`, `window.daum` 글로벌 타입 선언). 고객 폼에 우편번호(읽기전용)+검색 버튼 → `setZipcode`+`setAddress`(도로명). `Customer.zipcode` 컬럼 추가(비파괴 `add_customer_zipcode`), `CustomerInput`/`CustomerRow`/`toData`/`toRow`에 zipcode. API 키 불필요·외부 CDN(prod 라이브 검증). 추후 매물 폼 주소에도 재사용 가능.
- 일정관리 상세보기: `calendar/event-detail-dialog.tsx`(읽기전용 상세 + 삭제/수정 버튼·매물 링크). `calendar-view.tsx` 월 그리드 셀을 `button`→`div`로 바꾸고 일정 칩을 클릭 가능 `button`(stopPropagation)으로 — 칩 클릭 시 `openDetail`(수기)·`goProperty`(매물 파생). 상세의 `editFromDetail`이 기존 `EventDialog`(편집)로 전환, `onChanged`/`deleteEvent`로 삭제 후 `reload`. (이전엔 좌측 패널을 거쳐야만 수정 가능 → 칩 직접 클릭으로 완결.)
- 일정관리 상태 URL 보존: 초기값을 **클라이언트 `useSearchParams`(실제 주소창 URL)** 에서 읽는다(`calendar-view.tsx`, y·m 0-indexed·d YYYYMMDD) — `page.tsx`는 `<Suspense>`로 감싸기만 함. 뒤로가기 시 서버 `page.tsx`가 Next **Router Cache**에 의해 재실행 안 될 수 있어 서버 prop은 stale → 그래서 클라가 직접 URL을 읽어 복원. view·selectedDate 변경 시 **`window.history.replaceState`** 로 URL만 갱신(리렌더·서버 재요청 없음, Next 14.1+가 useSearchParams와 동기화). 매물 일정 클릭 → `router.push(매물)` → 뒤로가기 시 주소창의 `?y&m&d`를 useSearchParams가 읽어 보던 달·선택일 복원.
- 계약진행 뷰: `PropertyView`에 `"in-progress"` 추가(`actions.ts`·`listProperties` `where.status="계약진행"`, export route도 동일 + `status` 파라미터 가드에 in-progress 포함). 신규 `properties/progress/page.tsx`(계약완료 페이지 미러). `nav.ts` `CircleDashed` 아이콘. `property-list.tsx`: `VIEW_TITLE` 추가, 상태필터는 `contracted`·`in-progress`에서 숨김, `계약진행 전환` 버튼은 `진행` 매물이 있는 `all`·`favorites`에서만 노출.
- 엑셀 임포트 고객 자동생성: `actions.ts` `importProperties`가 매물 생성 후 `customerName` 있으면 `db.customer.create`(propertyId 연결). 유형은 `customerTypesFromTrade`(A1→매도인, B1/B2/B3→임대인, else 단순방문). 중복은 `이름|전화(숫자만)` 키로 기존 고객+같은 파일 내 모두 차단. `revalidatePath("/dashboard/customers")` 추가. (매물 소유자=매도인/임대인 가정.)
- 매물↔고객 다대다: 조인 모델 `PropertyParty`(`propertyId`·`customerId`·`role`, `@@unique([propertyId,customerId,role])`). `Property.parties[]`·`Customer.parties[]` 추가, **기존 `Customer.propertyId`·`Property.customers`는 보존(역전 아님, 추가)**. 마이그레이션 `add_property_party`(비파괴: CREATE TABLE + 기존 `Customer.propertyId` 링크를 `gen_random_uuid()` id로 `PropertyParty` 백필, 역할은 거래유형 기준). 역할 헬퍼 `lib/properties/party-role.ts`(A1→매도인, B1/B2/B3→임대인). `party-actions.ts`(listParties/addParty[이름+전화 find-or-create 후 upsert]/removeParty, 소유권 검증). `property-parties.tsx`(매물 편집 하단, 역할 select+이름+전화). `importProperties`: 고객 find-or-create(Map) 후 `propertyParty.create`. `customers/actions.ts`: createCustomer가 매물 등록 시 party upsert, `CustomerRow.parties[]`+include, customer-list/form에 연결 매물 표시. prod는 `prisma migrate deploy` 필요.
- 확인 다이얼로그: `components/ui/confirm-dialog.tsx`(`ConfirmDialog` — `alert-dialog` 래퍼, controlled `open`/`onOpenChange`/`onConfirm`/`busy`). `customer-list`·`event-dialog`·`event-detail-dialog`의 `window.confirm` 전부 제거 → `ConfirmDialog`. **네이티브 `confirm`/`alert` 금지(§6 템플릿 우선) — 삭제/확인은 ConfirmDialog 사용.**
- 체크리스트 전체 체크: `contract-actions.ts` `setAllChecklist(id, checked)` — `resolveChecklist`로 매물 유형 전 항목을 한 번에 set/clear(contractChecklist Json). `contract-client.tsx` `toggleAll`+`allChecked`(data.checklist.every)로 헤더 버튼 토글. 진행률 complete는 기존대로 필수 항목·필드만 집계.
- 매물 검색: `property-list.tsx` `q` state + 클라이언트 필터에 `name·complexName·address·customerName·customerPhone` substring(소문자) 매칭 추가. CardAction에 Search 아이콘 Input(고객 리스트와 동일 패턴). 기존 fType/fTrade/fStatus 필터와 AND 결합.
- 매물 색상 태그: `Property.colorTag String?`(마이그레이션 `add_property_color_tag`, 비파괴). `lib/properties/color-tags.ts`(4색 dot/row Tailwind 리터럴·동적조합 금지). `actions.ts` `setPropertyColor(id, colorTag)`(COLOR_TAG_VALUES 검증), `listProperties`가 `colorTag` 포함. `property-list.tsx`: `ColorSwatch`(Popover 4색+없음, render-trigger), 행 `TableRow`에 `COLOR_TAG_MAP[colorTag].row` 틴트, 상단 4색 토글 필터(`fColor`). **전부 `view === "all"` 게이팅** — colorTag 값은 매물에 전역 저장되나 UI(스와치·틴트·필터)는 전체 매물 메뉴에서만. 새 컬럼 없이 관심(별) 셀에 함께 배치.
- 반응형 패턴(브레이크포인트 `lg`): 데이터 표는 `<div className="hidden ... lg:block"><Table/></div>` + `<div className="... lg:hidden">카드</div>` 두 벌 렌더(property-list·customer-list·realprice-view). 헤더는 `CardAction` 제거하고 `flex flex-col gap-3 lg:flex-row lg:justify-between`(타이틀/색필터 좌측, 툴바 우측·모바일 스택), 검색 Input `w-full sm:w-*`. 실거래 지도 `h-[24rem] sm:h-[32rem] lg:h-[40rem]`(realprice-map). 캘린더 본문 `flex flex-col-reverse lg:flex-row` + aside `w-full max-lg:max-h-56 lg:w-56`(달력 위·사이드 아래). 카드는 템플릿 토큰(Card 톤·Badge·기존 색 틴트) 그대로 사용. 시각 검증은 prod 빌드 필요(빌드/타입만 통과).
- 매물 목록 페이징: `property-list.tsx` `PAGE_SIZE=50`, `page` state + `current=min(page,pageCount-1)`(clamp)·`paged=rows.slice(...)`. 표·카드 모두 `paged` 렌더, 헤더 전체선택·행번호는 페이지 기준(행번호=`rows.length-(current*PAGE_SIZE+i)`). `CardFooter`에 이전/다음(pageCount>1). 검색·유형·거래·상태·색상 필터 setter에 `setPage(0)`. 4개 뷰 공통(단일 컴포넌트). 실거래 그리드는 별도 자체 페이징 유지.
- 인증 폼 정비: `(auth)/login`·`register` 한글화 + `SocialButtons`·`Separator` 사용 제거(컴포넌트 파일은 보존 — [[template-scaffold-keep]]). `(auth)/actions.ts` `signupSchema`: `name` 필수(min(1)), `agencyAddress`·`agencyPhone`·`phone` 선택 추가. 스키마 `Agency.address`·`Agency.phone`·`User.phone`(마이그레이션 `add_agency_user_contact`, 비파괴). 폼은 FormData 기반 평문 입력(우편번호 검색·전화 포맷 미적용 — 회원가입 단순 유지). Agency=중개사무소(상호·주소·전화), User=개인(이름·전화).
- 회원가입 보강: `PostcodeSearch`를 `src/components/postcode-search.tsx`로 이동(고객폼·회원가입 공유, 옛 경로 삭제). register는 일부 controlled — 전화 `formatTel`, 주소 `PostcodeSearch`(우편번호=`Agency.zipcode` 신규, 마이그레이션 `add_agency_zipcode`). 비밀번호 확인·약관 동의는 `actions.ts` zod `.refine`(passwordConfirm 일치, `agree==="on"`); 약관은 hidden input(name=agree)+버튼 `disabled={!agreed}` 이중. 약관 본문 페이지·전화 저장 정규화는 아직 없음(표시만).
- 약관 페이지: `src/app/terms/page.tsx`·`src/app/privacy/page.tsx` — 최상위 정적 공개 라우트(미들웨어 없어 비로그인 접근, build `○` prerender). 표준 한국어 약관/방침 본문(운영자 검토 전제). register 약관 체크박스 라벨이 `/terms`·`/privacy`로 `target="_blank"` Link(라벨 내 a는 라벨 토글 미발생 — HTML 사양). 돌아가기 링크는 /register.
- 문서 허브(Obsidian): `docs/_home.md`가 `docs/` 볼트의 MOC(시작 노트) — PROJECT_GUIDE·specs·plans를 `[[위키링크]]`로 묶음. `docs/`만 볼트로 열 것(레포 루트는 node_modules 인덱싱 폭사). `.obsidian/`는 `.gitignore` 처리. 코드=Antigravity(Remote-SSH)/문서 그래프=Obsidian이 같은 서버 파일 가리킴.
- 사이드바 메뉴 재구성: `src/lib/nav.ts` `navGroups`를 업무 6그룹으로 교체 — 매물 관리(전체/관심/계약 진행/계약 완료)·국토부 실거래가·네이버 부동산(매물 검색/관심 매물)·고객 관리·일정·설정. 템플릿 데모 그룹(Dashboards·Apps·AI Apps·Pages·Others)은 nav에서 제거(라우트·페이지 파일은 [[template-scaffold-keep]] 보존, ⌘K·사이드바 노출만 제외). 미구현 설정 하위(회원 관리·권한 관리)는 `href:"#"` 빈 링크 — 빈 링크 `#`가 2개라 `app-sidebar.tsx`·`command-palette.tsx`의 React `key`를 `item.href`→`item.title`로 변경(그룹 내 title 유일). `allNavItems`를 쓰는 `e2e/smoke.spec.ts` 라우트 루프는 `href.startsWith("/")`로 빈 링크 제외, 명령 팔레트 테스트는 사라진 `CRM`→`고객 목록`(`/dashboard/customers`)으로 교체. 새 아이콘 `Search`·`UserCog`(unused 템플릿 아이콘 import 정리). tsc+eslint 통과.
- (작업 단위가 끝날 때마다 참고할 변경 사항을 한두 줄로 누적 기록한다. 절차는 루트 [CLAUDE.md](../CLAUDE.md) §5 참고.)

## 9. 세션용 한 줄 지시문

새 세션은 추측으로 구조를 바꾸지 말고, 먼저 이 `docs/PROJECT_GUIDE.md`와 루트 `CLAUDE.md`를 읽은 뒤 현재 결정 사항에 맞춰 작업을 시작한다.
