# 고객관리(Customer CRM) 설계

> 작성 2026-06-26. real-es에 고객(거래 당사자·방문자) 관리 기능을 추가한다.

## Goal

매물과 별개로 고객을 등록·관리하는 CRM. 기본 정보는 매물에서 추출(이름·전화)하고 나머지는 관리자가 입력한다. 매물이 없어도 직접 등록 가능하며, 수정·삭제를 지원한다.

## 데이터 모델 — 신규 `Customer`

기존 `Property`의 인라인 고객 필드(`customerName`·`customerPhone`)는 **그대로 둔다**(매물 입력 편의용). 고객 CRM은 별도 테이블로 신설한다.

```prisma
model Customer {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  types      String[]  @default(["단순방문"]) // 고객유형(아래 규칙)
  name       String                            // 이름(필수)
  phone      String?                            // 전화번호
  address    String?                            // 주소(고객 거주지 — 매물 소재지와 무관)
  email      String?                            // 이메일
  gender     String?                            // 남 | 여 | 미지정
  memo       String?                            // 메모
  propertyId String?                            // 출처 매물(선택)
  property   Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId])
}
```

`Property`에 역참조 추가(비파괴 — Property 테이블에 컬럼 생기지 않음. FK는 `Customer.propertyId`):
```prisma
  customers Customer[]
```

마이그레이션은 **비파괴**(CREATE TABLE "Customer" + FK/인덱스, Property 역참조는 가상). 매물 삭제 시 고객은 유지(`onDelete: SetNull` → `propertyId`만 null).

## 고객유형 규칙 (`types`)

- 값: **매도인 · 매수인 · 임대인 · 임차인 · 단순방문**.
- **매도인·매수인·임대인·임차인**: 자유 다중 선택(겸업 한 사람으로 관리).
- **단순방문**: **단독(배타)** — 단순방문이 선택되면 나머지 4개는 불가, 반대도 마찬가지.
- **기본값 `["단순방문"]`** — 신규 고객은 처음 단순방문, 거래 진행 시 매도/매수 등으로 전환(단순방문 자동 해제).
- **검증(서버·클라 공통):** `types`에 단순방문이 있으면 길이 1만 허용. 아니면 {매도인,매수인,임대인,임차인}의 비어있지 않은 부분집합. 빈 배열·미지정 입력은 `["단순방문"]`으로 보정.

## "매물에서 추출" (방식 A)

- 매물 상세/편집 화면에 **"고객으로 등록"** 버튼. 클릭 시 고객 추가 폼이 열리며 그 매물의 `customerName`→이름, `customerPhone`→전화번호가 채워지고 `propertyId`가 연결된다(출처 매물).
- 매물의 `address`(소재지)는 고객 주소와 다르므로 **자동 채우지 않는다**. 주소·이메일·성별·메모·유형은 관리자 입력(유형 기본 단순방문).
- 매물 없이도 고객관리 페이지에서 **새 고객**으로 직접 입력 가능.

## 화면

- 좌측 nav에 **"고객관리"**(`/dashboard/customers`) 추가.
- **목록**: 이름·전화·유형(배지)·주소·출처 매물·수정일. 검색(이름/전화), 유형 필터(그 유형을 하나라도 가진 고객). 행에서 수정·삭제, 상단 "새 고객" 버튼.
- **폼**(신규/수정 공용): 이름·전화번호(tel 포맷)·주소·이메일·성별(라디오 남/여/미지정)·메모(textarea)·유형(체크박스, 단순방문 배타 토글). 기존 매물 폼의 라벨·간격·전화 포맷·primitive를 재사용한다(임의 px/hex 금지).
- 삭제는 확인 후 수행.

## 서버 액션

`properties/actions.ts`의 `requireUser()` 패턴을 따른다. `customers/actions.ts`:
- `listCustomers(filter?)` — userId 스코프, 검색·유형 필터.
- `createCustomer(input)` / `updateCustomer(id, input)` — userId 스코프, `types` 검증, `propertyId`가 있으면 그 매물도 userId 소유인지 확인.
- `deleteCustomer(id)` — userId 스코프(IDOR 차단).
- 매물에서 추출 시 초기값은 서버에서 매물(userId 스코프)을 읽어 이름·전화·propertyId를 채워 폼에 전달(직렬화 가능한 값만 — RSC 경계 주의).

## 비범위(Non-goals)

- 매물↔고객 다대다, 거래 이력 타임라인, 고객 활동 로그, 중복 병합 — 이번 범위 아님.
- 기존 매물 인라인 고객 필드 마이그레이션/연동 자동화 — 안 함(추출은 온디맨드 버튼만).

## 검증

- 순수 로직(`types` 검증 함수)은 vitest 단위 테스트.
- 서버 액션·페이지·폼은 tsc + eslint + **build**(RSC 직렬화·"use server" async-export는 build/런타임만 잡음). 머지 전 라이브 1회 렌더.
