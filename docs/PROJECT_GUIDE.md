# Project Guide

real-es 프로젝트의 공통 방향 가이드. 새 세션은 추측으로 구조를 바꾸지 말고 이 문서부터 읽는다.

## 1. 프로젝트 한 줄 요약

> TBD

## 2. 현재 확정된 큰 방향

> TBD

## 3. 왜 이렇게 정했는가

> TBD

## 4. 현재 소스 구조 이해

> TBD (소스 구조가 정해지면 갱신)

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

- **스택 확정**: `SDTPL_ADM`(shadcn UI Kit 클론) 템플릿을 베이스로 인입 완료 — Next.js 16 + React 19 + Tailwind v4 + shadcn/ui(Base UI) + pnpm. 빌드·기동 검증 통과. 백엔드(PostgreSQL/Prisma)·네이버 매물 수집·Tauri 데스크탑은 예정.
- **메뉴 단일 소스**: `src/lib/nav.ts` 한 곳이 사이드바 + ⌘K 팔레트를 구동 — 스펙(§제품)의 메뉴 구조를 여기에 매핑한다.
- **데이터는 아직 전부 mock**(`src/lib/data.ts`): 템플릿은 프론트 전용. 실제 데이터는 백엔드를 붙이며 교체한다.
- **배포**: `https://resm.approid.team` (Cloudflare 터널로 로컬 dev/prod 서버를 노출 예정).
- 제품 스펙은 [project_structure.md](project_structure.md) 참고 — 세부는 진행하며 사용자와 상의해 채운다.
- **백엔드 단계 0 완료**: 기존 `mrms-pg`의 `real_es` DB(호스트 5433)에 Prisma 6 연결 — `Agency`(테넌트 루트) 모델 + 첫 마이그레이션, `src/lib/db.ts` 싱글톤, `GET /api/health` DB ping(e2e 통과), 앱 포트 3001. 다음 단계 1(인증)은 이 `Agency` 위에 `User`/`Session`을 얹는다. 계획·진행: [superpowers/plans/2026-06-23-stage-0-db-prisma.md](superpowers/plans/2026-06-23-stage-0-db-prisma.md).
- (작업 단위가 끝날 때마다 참고할 변경 사항을 한두 줄로 누적 기록한다. 절차는 루트 [CLAUDE.md](../CLAUDE.md) §5 참고.)

## 9. 세션용 한 줄 지시문

새 세션은 추측으로 구조를 바꾸지 말고, 먼저 이 `docs/PROJECT_GUIDE.md`와 루트 `CLAUDE.md`를 읽은 뒤 현재 결정 사항에 맞춰 작업을 시작한다.
