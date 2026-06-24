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
- (작업 단위가 끝날 때마다 사용자 가시 효과를 한두 줄로 누적 기록한다. 절차는 [CLAUDE.md](CLAUDE.md) §5 참고.)
