# real-es

## 서비스 한 줄 정의

> TBD — 프로젝트를 한 줄로 정의한다.

## 디렉토리 구조

```
real-es/
├── CLAUDE.md             # 개발 행동 가이드라인 (프로젝트 공통)
├── AGENTS.md             # Next.js 16 주의 규칙 (템플릿 인입)
├── README.md             # 이 문서 — 루트 개요 + 현재 반영 상태
├── package.json          # Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
├── src/
│   ├── app/              # (dashboard)·(auth) 라우트 그룹 + api/(health·naver export)
│   ├── components/       # ui/ 프리미티브 + layout/ + dashboards/·pages/·apps/ 패턴
│   ├── lib/              # nav.ts(메뉴)·auth/·db.ts(Prisma)·naver/(수집)·data.ts(템플릿 mock)
│   └── hooks/
├── prisma/               # schema + 마이그레이션 (Agency·User·Session·LegalDivision·Complex·Article)
├── scripts/              # seed-legal-divisions·collect·run-prod 등 러너
├── e2e/                  # Playwright 스모크 테스트
├── .claude/              # Claude Code 하네스 (settings, Stop hook, plugins)
└── docs/
    ├── PROJECT_GUIDE.md  # 새 세션이 먼저 읽는 가이드
    └── project_structure.md  # 제품 스펙
```

## 선정 스택

`/opt/design-template/SDTPL_ADM`(shadcn UI Kit 클론)을 베이스로 채택:

- **Next.js 16 (App Router) + React 19**
- **TypeScript / Tailwind v4**
- **shadcn/ui (Base UI 기반)** — 데이터 테이블·차트·캘린더·칸반·⌘K 팔레트 내장
- **pnpm** 패키지 매니저
- PostgreSQL + Prisma 백엔드·네이버 매물 수집기 적용 완료(단계 0~3), Tauri 데스크탑은 예정

배포 도메인: `https://resm.approid.team` (Cloudflare 터널)

## 현재 반영 상태

- 개발 하네스 초기 셋업: `CLAUDE.md`, `.claude/`(Stop hook + 플러그인), `README.md`·`docs/PROJECT_GUIDE.md` 컨벤션 골격, `.gitignore` 구성 (my-forever-music 룰 기준)
- 디자인 템플릿(SDTPL_ADM) 베이스 인입: 템플릿 소스(`src/`·설정·`e2e/`) 복사 → `pnpm install` → 프로덕션 빌드·서버 기동 검증 통과. real-es 자체 하네스(`CLAUDE.md`·`.claude/`·`docs/`)는 보존, 템플릿 secret(`SDTPL.txt`)은 제외. 전 라우트 정상(`/dashboard/real-estate`·`/login` 200).
- 백엔드 단계 0(DB 연결): 앱 포트 3001(3000은 my-forever-music 점유). 새 컨테이너 없이 기존 `mrms-pg`(pg16, 호스트 5433)에 `real_es` DB 추가. Prisma 6으로 `Agency` 모델 + 첫 마이그레이션, `src/lib/db.ts` 싱글톤 클라이언트. `GET /api/health`가 DB ping으로 연결을 검증(e2e `e2e/health.spec.ts` 통과) → **DB에 연결되는 앱** 확보.
- 인증 단계 1(로그인되는 앱): `User`/`Session` 모델 + `init_auth` 마이그레이션. 셀프서비스 회원가입(Agency+admin 동시 생성)·로그인·로그아웃, opaque 토큰 세션(httpOnly 쿠키·DB tokenHash). `(dashboard)` 서버 사이드 가드로 보호, 기존 템플릿 e2e는 storageState 인증 픽스처로 통과. 인증 코어는 `src/lib/auth/`(bcryptjs·zod). 단위(vitest)·E2E(`e2e/auth.spec.ts`) 통과.
- 네이버 수집 단계 2(진행): 진입을 **동(법정동) 드릴다운**으로 확정(단지명 키워드 검색 폐기). 법정동(시도/시군구/읍면동 5067개 + 좌표)을 VWorld로 `LegalDivision`에 적재(`scripts/seed-legal-divisions.mjs`). 수집 파서·캐시(`Complex`/`Article`, 픽스처 결정적 테스트) + 스크래퍼 모듈 `src/lib/naver/`(`listComplexesByRegion`·`getComplexArticles`). 라이브 수집 **검증 완료**(정자동→단지 30 + 매물 113건 캐시). 네이버는 브라우저 동일 헤더(sec-ch-ua·sec-fetch-*·accept-language)가 없으면 429로 거부 — IP 아님.
- 매물 수집 단계 3(UI): `/dashboard/naver` — 동 선택→단지 목록→단지 선택→카카오지도+매물 그리드→엑셀 다운로드(exceljs). 캐시 우선 수집, KAKAO_MAP_KEY(서버→prop).
- 터널 운영(prod)·거래유형 UI: 터널(`resm.approid.team`) 접속은 **production 모드**로 띄운다(`bash scripts/run-prod.sh`) — dev는 cross-origin 서버액션이 막혀 동 드릴다운이 안 됨. `next.config.ts`에 터널 origin 허용. 거래유형 선택을 **지역 선택 위 라디오 단일선택**(매매/전세/월세)으로 옮기고, 거래유형 코드·라벨을 단일 소스(`src/lib/naver/trade-types.ts`)로 통합.
- 매물유형 전체 수집 단계 4: 거래유형(매매/전세/월세/**단기임대**) + **매물유형 14종**(아파트/오피스텔/빌라/상가/토지 등) 선택. 매물유형에 따라 **단지형**(아파트·오피스텔·재건축 → 단지목록→매물)과 **비단지형**(나머지 → 동별 매물 직접) 자동 분기. 네이버 bounded API(`boundedComplexes`/`boundedArticles`), 박스=동 중심 ±0.3°(법정동 코드가 실필터). 거래·매물유형 단일 소스(`trade-types`/`property-types`). 라이브 검증(영통동: 오피스텔 9단지 / 상가 208매물).
- 매물유형 표시 수정: 매물유형 셀렉트가 코드(A01)를 그대로 노출하던 것을 라벨(아파트)로 표시 — Base UI `SelectValue`는 value를 렌더하므로 `PROPERTY_LABEL` 매핑을 children으로 전달.
- 매물 검색 페이지 단계 ①(레이아웃): 검색 바를 Card로 묶고 선택 요약 Badge(거래·매물·동)·결과 수 표시, 단지형은 단지목록(좁은 스크롤 패널)+지도 우측·매물 하단 풀너비, 로딩 Skeleton·빈 상태 Empty·클릭 단지 카드 button화(접근성). 템플릿 프리미티브 재사용(§6). 설계: [docs/superpowers/specs/2026-06-24-naver-search-page-design.md](docs/superpowers/specs/2026-06-24-naver-search-page-design.md).
- 카카오 지도 키 정정: `page.tsx`가 존재하지 않는 `KAKAO_MAP_KEY`를 읽어 지도가 빈 화면이던 것을 `.env` 실제 변수명 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 수정 — 지도 정상 로드.
- 매물 목록 페이징: 매물 표를 20개씩 클라이언트 페이징(이전/다음 + 페이지 표시), 검색·갱신 시 1페이지로 리셋. (단계 ③ 표 기능의 일부)
- 매물 검색 ②(단지 마커): 단지형 지도에 단지 전체를 마커로 표시 + 화면 자동 맞춤(bounds), **마커 클릭 = 단지 선택**(목록·표 연동), 선택 단지로 지도 이동. `ComplexRow`에 좌표 노출 + KakaoMap 다중 마커 지원. (비단지형 클러스터는 다음 단계)
- 매물 목록에 매물명 컬럼 추가: **매물명 = 단지명 + 동명(N동)**. 파서가 단지명(`articleName`/`complexName`)을 `raw`에 저장, `toRow`에서 동명과 합쳐 표 첫 컬럼에 표시. 기존 캐시 행은 갱신(재수집) 후 단지명까지 채워짐.
- 대시보드 푸터 추가: `AppFooter`(© 2026 real-es · 부동산 매물 수집·관리 도구)를 `(dashboard)/layout.tsx` 하단에 마운트, 본문과 사이에 여백(mt-4) + 상단 구분선. 헤더와 동일 토큰(border·muted·px-4).
- 매물 검색 ②(비단지형 클러스터): 비단지형(상가/빌라/토지 등) 지도를 **클러스터(원 안 숫자=묶음 매물 수, `article/map/articleClusters`)** 로 표시, 원 클릭 시 하위 매물(`article/clusteredArticles`) 드릴다운 + "전체 매물 보기". 레이아웃을 **지도(위 박스)+매물(아래 박스)** 로 통일(지도 높이 2배 40rem). 초기 표는 비어 있고 지도의 원(클러스터) 클릭 시 그 묶음 매물이 채워짐. 신규 스크레이퍼/파서/액션 + 파서 테스트(`articleClusters` 픽스처). 라이브 검증은 prod 재빌드 후 필요.
- 매물 표 보강 1: **넘버링**(전체 매물 수부터 1까지 내림차순, 페이지 연속) + 비단지형 **"전체 매물" 버튼**(boundedArticles 전체 로드) + **엑셀 파일명에 타임스탬프**(`_YYYYMMDD_HHmmss`).
- 매물 표 보강 2: **행 체크박스 + 헤더 전체선택**(indeterminate) + 선택 수 표시. 관심목록 저장·선택 내보내기의 토대.
- 관심 매물(사용자별): 매물 표에서 체크 → **"관심 매물 저장"**(토스트), 사이드바 **"관심 매물"** 페이지(`/dashboard/naver/favorites`)에서 조회·선택 삭제. 저장 시점 **스냅샷** 보관(전역 캐시 변동과 무관). 신규 `Favorite` 모델 + 마이그레이션(userId별, `@@unique(userId, articleNumber)`).
- 엑셀 출력 필드 선택(④): 엑셀 다운로드 시 다이얼로그에서 내보낼 필드(단지명·가격·면적 등 10종)를 체크 → 선택 필드만 다운로드. 필드 정의 `excel-fields.ts`(클라/서버 공용, exceljs 미포함), export route `fields` 쿼리.
- 매물 표·엑셀에 **주소·사용승인일** 추가: 단일 파서(`parseArticles`)라 **전 매물유형(단지형·비단지형) 자동 적용**. 주소=시/도 시/군/구 동, 사용승인일=`buildingConjunctionDate`(표는 YYYY.MM.DD). **난방방식은 기본 수집 API 응답에 없어 미포함**(상세 호출 필요).
- 관심 매물 표에도 넘버링(총 개수부터 1까지 내림차순) 추가 — 매물 검색 표와 동일.
- 관심 매물 페이지 보강: **주소·사용승인일 컬럼**, **매물유형/거래유형 필터**, **엑셀 다운로드**(전용 export route, 타임스탬프+출력 필드 선택, 현재 필터 반영). 메인·관심매물 모든 엑셀에 타임스탬프 일관 적용.
- 관심 매물 **모든 셀 인라인 편집(더블클릭)**: 셀을 더블클릭하면 입력/셀렉트로 전환(평소엔 천단위 가격·유형/거래 라벨 표시), blur/Enter 저장·Esc 취소 → 스냅샷에 저장(`updateFavorite`).
- 네이버 지도 빈 상태 기본값: 마커·클러스터가 없을 때 "좌표 없음" 대신 **서울시청(37.5663, 126.9779)** 중심으로 지도를 띄움.
- 매물 관리 기반(① 모델·필드 단일소스·서버액션): 자체 `Property` 모델(개인별 userId, 네이버 캐시와 별개) + 마이그레이션. 필드 정의 단일 소스 `src/lib/properties/fields.ts`(그리드·폼·엑셀 공용, `coerceField` 정규화). 서버액션(목록 상태뷰/등록/수정/삭제/상태전환/관심토글/엑셀입력) — UI는 다음 단계.
- (작업 단위가 끝날 때마다 사용자 가시 효과를 한두 줄로 누적 기록한다. 절차는 [CLAUDE.md](CLAUDE.md) §5 참고.)
