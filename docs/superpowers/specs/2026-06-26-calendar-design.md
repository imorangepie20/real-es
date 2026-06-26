# 일정관리(캘린더) 설계

> 작성 2026-06-26. 템플릿 캘린더 앱을 DB 기반 일정관리로 커스터마이징. 매물 일정 자동 표시 + 수기 일정 CRUD.

## Goal

`/dashboard/calendar` 월 캘린더에서 (1) 매물의 일정 날짜(계약일·잔금일·입주일 등)를 자동 표시하고, (2) 직접 추가·수정·삭제하는 일정(미팅·임장 등)을 DB로 관리한다.

## 데이터 모델 — 신규 `Event` (수기 일정)

```prisma
model Event {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title      String
  date       String    // YYYYMMDD (매물 날짜와 동일 포맷)
  startTime  String?   // "HH:MM" 또는 null=종일
  category   String    @default("기타") // 미팅 | 임장 | 계약 | 기타
  memo       String?
  propertyId String?
  property   Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId, date])
}
```

`Property`·`Customer`·`User`에 역참조 `events Event[]` 추가(비파괴 — Event에만 FK). 마이그레이션 `add_event`(CREATE TABLE만).

## 매물 일정 자동 표시 (읽기전용·파생)

매물의 일정 날짜 필드에서 캘린더 항목을 **계산**(DB 저장 안 함). 대상 필드(7): `contractHopeDate`(계약희망일)·`contractDate`(계약일)·`interim1Date`(중도금1)·`interim2Date`(중도금2)·`balanceDate`(잔금일)·`moveInHopeDate`(입주희망일)·`moveInDate`(입주일). (`approvalDate` 사용승인일은 건물 속성이라 제외.)

- 각 파생 항목: `{ date(YYYYMMDD), label: "{매물명|단지명} {필드라벨}", propertyId, kind: "property" }`. 매물명 없으면 단지명.
- 순수 함수 `propertyCalendarEvents(properties, fieldLabels): PropertyDateEvent[]` 로 추출 → 단위 테스트.
- 캘린더에서 클릭 시 `/dashboard/properties/{id}/edit` 이동.

## 카테고리·색

`calendar/categories.ts` 단일 정의:
- 미팅=파랑, 임장=초록, 계약=주황, 기타=회색 (수기 일정 유형).
- 매물 일정=빨강 (파생, 토글로 표시/숨김).
- 색은 Tailwind 토큰 클래스(임의 hex 금지). 사이드바 체크박스로 유형별 필터.

## 화면

템플릿 `src/components/apps/calendar/calendar-app.tsx`의 월 그리드 구조를 재사용·커스터마이징한 **클라 컴포넌트 `calendar-view.tsx`**:
- **한국어** 월/요일, **실제 오늘** 강조(클라 컴포넌트이므로 `new Date()` 사용), 이전/다음/오늘 네비.
- 월 그리드 각 칸: 그날 일정(수기+파생) 점·제목 요약, 넘치면 "+N".
- **날짜 클릭** → 그날 일정 목록 패널 + **"일정 추가"** 버튼.
- **일정 추가/수정 다이얼로그**: 제목·날짜(date input)·시간("HH:MM" 또는 종일 토글)·유형(미팅/임장/계약/기타)·매물 연결(선택)·고객 연결(선택)·메모. 저장/삭제.
- 수기 일정 클릭 → 수정 다이얼로그. 파생(매물) 일정 클릭 → 해당 매물 edit로 이동.
- 좌측 사이드바: 유형별 색·체크박스 필터(미팅·임장·계약·기타 + 매물 일정 토글).
- 매물/고객 연결 셀렉트는 기존 매물·고객 목록을 서버에서 받아 옵션 제공(이름·단지명).

## 서버 액션 (`calendar/actions.ts`, userId 스코프)

- `loadCalendar(year, month): Promise<{ events: EventRow[]; propertyDates: PropertyDateEvent[]; properties: {id,label}[]; customers: {id,label}[] }>` — 그 달(YYYYMM prefix)의 수기 일정 + 매물 파생 일정 + 연결용 매물·고객 옵션.
- `createEvent(input)` / `updateEvent(id, input)` / `deleteEvent(id)` — userId 스코프, `propertyId`/`customerId`는 소유 검증.
- `EventRow = { id, title, date, startTime, category, memo, propertyId, propertyLabel, customerId, customerLabel }`.

## 진입

nav "매물 관리" 그룹에 **"일정관리"** → `/dashboard/calendar`(Calendar 아이콘). 기존 템플릿 `/apps/calendar`는 그대로 둠(템플릿 자산).

## 비범위(Non-goals)

- 주/일/리스트 뷰, 다일(멀티데이) 이벤트, 반복 일정, 드래그앤드롭, 알림/리마인더 — 이번 범위 아님.
- 매물 날짜를 캘린더에서 직접 수정 — 안 함(매물 edit에서). 파생은 읽기전용.

## 검증

- 순수 로직(`propertyCalendarEvents`·월 그리드 빌더) vitest 단위 테스트.
- 서버 액션·페이지·다이얼로그는 tsc + eslint + **build**(RSC 직렬화·"use server" async-export는 build/런타임만). 머지 전 라이브 1회 렌더.
