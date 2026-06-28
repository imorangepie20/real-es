---
title: real-es 문서 허브
tags: [moc, real-es]
---

# real-es — 문서 허브 (MOC)

> 이 폴더(`docs/`)를 Obsidian 볼트로 열면 이 노트가 시작점입니다. 아래는 `[[위키링크]]`로 묶은 프로젝트 문서 지도입니다.
> 코드 편집은 Antigravity(Remote-SSH)로, 문서 그래프는 Obsidian으로 — 같은 서버 파일을 가리킵니다.

## 핵심 참고
- [[PROJECT_GUIDE]] — 현재 참고 상태(아키텍처·구현 메모 누적)
- [[project_structure]] — 디렉토리/모듈 구조
- [[contract-documents-guide]] — 계약 서류 참고
- [[naver-fin-land-api-reference]] — 네이버 fin.land API 접근법
- [[web_api_sample]] — 외부 API 샘플

## 설계 (specs)
- 인증·수집 기반: [[2026-06-23-stage-1-auth-design]] · [[2026-06-23-stage-2-collection-design]] · [[2026-06-23-stage-3-collection-ui-design]] · [[2026-06-23-naver-collection-design]]
- 매물: [[2026-06-24-property-management-design]] · [[2026-06-24-property-type-collection-design]] · [[2026-06-24-naver-search-page-design]] · [[2026-06-25-property-management-refine-design]]
- 계약·일정·고객·실거래: [[2026-06-25-contract-workflow-design]] · [[2026-06-26-calendar-design]] · [[2026-06-26-customer-management-design]] · [[2026-06-26-postcode-search-design]] · [[2026-06-26-realprice-design]]

## 계획 (plans)
- 기반: [[2026-06-23-stage-0-db-prisma]] · [[2026-06-23-stage-1-auth]] · [[2026-06-23-stage-3-collection-ui]]
- 매물: [[2026-06-24-property-management-core]] · [[2026-06-24-property-type-collection]] · [[2026-06-25-property-management-refine]]
- 계약·일정·고객·우편번호·실거래: [[2026-06-25-contract-workflow]] · [[2026-06-26-calendar]] · [[2026-06-26-customer-management]] · [[2026-06-26-postcode-search]] · [[2026-06-26-realprice]]

## 볼트 밖 문서 (레포 루트 — Obsidian 볼트엔 안 들어옴, IDE로 편집)
- [README.md](../README.md) — 현재 반영 상태(사용자 가시 효과 누적)
- [CLAUDE.md](../CLAUDE.md) — 작업 규칙(언어·문서 갱신·커밋 절차)
- [remember.md](../.remember/remember.md) — 세션 핸드오프 히스토리

> 루트 문서·`.remember/`도 한 그래프에서 보려면 `docs/` 안으로 옮기거나 심볼릭 링크를 거세요.
