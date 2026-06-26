# 우편번호 검색기 설계

> 작성 2026-06-26. 고객 입력 폼에 Daum(카카오) 우편번호/주소 검색을 달아 우편번호·도로명주소를 자동 입력.

## Goal

고객 폼의 주소 입력 시 "주소 검색" 버튼으로 Daum 우편번호 서비스 팝업을 열고, 선택한 주소의 **우편번호 + 도로명주소**를 폼에 자동 채운다. 상세주소(동/호)는 이어서 직접 입력.

## 외부 서비스

- **Daum 우편번호 서비스**(카카오) — 무료, **API 키 불필요**. 스크립트 `https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js`.
- `new window.daum.Postcode({ oncomplete })` → 사용자 선택 시 `oncomplete(data)` 호출. 사용 필드: `data.zonecode`(우편번호 5자리), `data.roadAddress`(도로명주소), 폴백 `data.jibunAddress`(지번주소).
- ⚠️ 외부 CDN·클라이언트 전용. 샌드박스에선 로드/팝업 검증 불가 → tsc+eslint+build로 검증하고 **실 동작은 prod 라이브 1회 확인**.

## 데이터 모델

`Customer`에 `zipcode String?`(우편번호) 추가. 비파괴 마이그레이션 `add_customer_zipcode`(컬럼 추가만).

## 재사용 컴포넌트 — `postcode-search.tsx` (클라)

- props `{ onComplete: (r: { zonecode: string; address: string }) => void; className?: string }`.
- 스크립트를 1회 동적 로드(`window.daum?.Postcode` 있으면 재사용). 버튼 클릭 → 로드 보장 후 `new window.daum.Postcode({ oncomplete: (data) => onComplete({ zonecode: data.zonecode, address: data.roadAddress || data.jibunAddress }) }).open()`.
- `window.daum`은 미타입 → 최소 글로벌 타입 선언 또는 좁은 타입 단언.
- 버튼은 기존 `Button`(variant="outline") 사용, 라벨 "주소 검색". 토큰만, 한국어.
- 추후 매물 폼 주소에도 재사용 가능하도록 고객 의존성 없음.

## 고객 폼 통합 — `customer-form.tsx`

- 상태 `zipcode` 추가(초기값 `customer?.zipcode ?? ""`).
- 주소 영역을 다음으로 교체:
  - 한 줄: `우편번호`(읽기전용 Input, 좁게) + `<PostcodeSearch onComplete={({zonecode, address}) => { setZipcode(zonecode); setAddress(address); }} />`
  - 한 줄: `주소`(기존 Input, 도로명주소 자동 입력 + 상세주소 직접 입력) — 편집 가능 유지.
- 저장 input에 `zipcode` 포함.

## 서버 액션 — `customers/actions.ts`

- `CustomerInput`·`CustomerRow`에 `zipcode: string | null` 추가. `toData`에 `zipcode: input.zipcode?.trim() || null`. `toRow`·`getCustomer`·`listCustomers` 매핑에 zipcode 포함(목록은 노출 안 해도 되나 row에 포함).

## 비범위(Non-goals)

- 매물 폼 적용(이번엔 컴포넌트만 재사용 가능하게, 적용은 후속).
- 주소 → 좌표 지오코딩 연동(별개 VWorld 경로).
- 상세주소 별도 필드 분리(단일 `address`에 도로명+상세 유지).

## 검증

- tsc + eslint + **build**(RSC·"use server"는 build/런타임만). Daum 스크립트 로드·팝업·자동입력은 **prod 라이브 1회 확인**(샌드박스 외부 CDN 불가).
