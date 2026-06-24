# 매물 관리 코어 설계 (2026-06-24)

내부 부동산 데이터 관리(제품 **주 메뉴**)의 첫 서브프로젝트. 네이버 캐시(Article/Favorite)와 **별개**의 자체 매물 DB. 결정: **개인별(userId) 소유**, 첫 빌드에 **엑셀 입력 포함**.

## 1. 범위
- **포함**: `Property` 모델(개인별) + 전체/관심/계약완료 목록 + 등록·수정·삭제(폼 + 더블클릭 인라인) + **엑셀 입력**(필드 매칭/타입 팝업).
- **비범위(후속 서브프로젝트)**: 엑셀 출력 고도화(현 export 재사용 가능)·네이버 관심매물 "가져오기"·고객 관리·일정 관리·환경설정.

## 2. 데이터 모델 — `Property` (userId FK, createdAt/updatedAt)
스펙 §필드정의 매핑 (날짜는 입력 유연성 위해 `String`, 금액은 `BigInt`(원), 면적은 `Float`):

| 스펙 | 컬럼 | 타입 |
|---|---|---|
| 매물번호 | articleNo | String? |
| 단지명 | complexName | String? |
| 매물유형 | realEstateType | String (코드, `property-types`) |
| 거래유형 | tradeType | String (코드, `trade-types`) |
| 상태(진행/계약완료) | status | String @default("진행") |
| 관심 | isFavorite | Boolean @default(false) |
| 출처 | source | String @default("수기") // 수기/엑셀/네이버 |
| 소재지/전용/공급/대지/건축연/면적 | siteArea, areaExclusive, areaSupply, landArea, buildingArea, area | Float? |
| 거래금액/가격 | dealAmount, price | BigInt? |
| 총세대수 | totalHouseholds | Int? |
| 사용승인일 | approvalDate | String? |
| 주차가능대수 | parkingCount | Int? |
| 난방방식 | heating | String? |
| 준공아파트여부 | isPreSale | Boolean? |
| 특이사항/메모 | note, memo | String? |
| 고객명/전화 | customerName, customerPhone | String? |
| 관련부동산(상호/전화/담당) | partnerName, partnerPhone, partnerManager | String? |
| 담당자 | manager | String? |
| 계약희망/계약·입주희망/입주 | contractHopeDate, contractDate, moveInHopeDate, moveInDate | String? |
| 중도금1·2/잔금 | interim1Date, interim2Date, balanceDate | String? |

인덱스: `@@index([userId, status])`, `@@index([userId, isFavorite])`.

## 3. 목록 = 상태 뷰 (한 테이블)
메뉴 3항목을 상태로 매핑: **전체**=전부 / **관심**=`isFavorite` / **계약완료**=`status="계약완료"`.
- 라우트 `/dashboard/properties`(전체)·`/properties/favorites`·`/properties/contracted`, 공용 `PropertyList(status?)`.
- 표는 관심매물 그리드 패턴 재사용(체크박스·전체선택·넘버링·더블클릭 인라인편집·필터·선택삭제·엑셀출력).
- nav.ts에 "매물 관리" 항목(또는 그룹).

## 4. 입력/편집/상태
- **등록 폼**(`PropertyForm`): 필드가 많아 섹션 그룹(기본/면적/금액/건물/고객/관련부동산/일정/메모). 템플릿 폼 프리미티브.
- **인라인 편집**: 목록 셀 더블클릭(관심매물 `EditCell`/`SelectCell` 재사용) → `updateProperty`.
- **삭제**: 선택 삭제. **상태**: 관심 토글 / 계약완료 전환(목록 액션).

## 5. 엑셀 입력
업로드 → 시트 헤더 ↔ Property 필드 **자동 매칭**(라벨 사전) → 애매하면 매핑 확인 **다이얼로그**, 셀 타입 불일치도 확인/스킵 → 일괄 `createProperty`. 읽기는 exceljs(기존 의존).

## 6. 컴포넌트/액션
- prisma: `Property` + 마이그레이션.
- actions: `listProperties(status?)`·`createProperty`·`updateProperty`·`deleteProperties`·`importProperties(rows)`.
- UI: `PropertyList`·`PropertyForm`·`ExcelImportDialog`.

## 7. 빌드 순서
1. `Property` 모델 + 마이그레이션
2. 전체 목록(상태 뷰) + 더블클릭 인라인 편집 + 선택삭제 + nav
3. 등록/수정 폼
4. 엑셀 입력(헤더 매핑 + 타입 검증 팝업)
