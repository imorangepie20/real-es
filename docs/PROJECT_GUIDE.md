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
- (작업 단위가 끝날 때마다 참고할 변경 사항을 한두 줄로 누적 기록한다. 절차는 루트 [CLAUDE.md](../CLAUDE.md) §5 참고.)

## 9. 세션용 한 줄 지시문

새 세션은 추측으로 구조를 바꾸지 말고, 먼저 이 `docs/PROJECT_GUIDE.md`와 루트 `CLAUDE.md`를 읽은 뒤 현재 결정 사항에 맞춰 작업을 시작한다.
