# 매물 관리 리파인 설계 (2026-06-25)

머지된 매물 관리 코어에 대한 사용자 테스트 피드백 4건. 모두 기존 단일소스(`src/lib/properties/fields.ts`)와 §6 템플릿 프리미티브 위에서 구현한다.

## 1. 상태별 필터링
- `PropertyList` 헤더에 **상태 필터** Select(전체/진행/계약완료) 추가 — 기존 매물유형·거래유형 필터 옆. 클라이언트 필터(`p.status`).
- **계약완료 뷰에서는 숨김**(전부 계약완료라 무의미). 전체·관심 뷰에만 노출.

## 2. 필드 선택 엑셀 다운로드 (매물 export)
보류했던 매물 엑셀 출력. 네이버 관심매물 export 패턴을 그대로 따른다.
- `src/lib/properties/excel-export.ts`(서버, exceljs): `propertiesToWorkbook(rows, fields)` — 헤더=선택 필드의 라벨, 값 변환: enum 코드→라벨, money→Number, date→`YYYY.MM.DD`, bool→예/아니오.
- 라우트 `src/app/api/properties/export/route.ts`: 인증 + **userId 격리** + 쿼리(`view`·`realEstateType`·`tradeType`·`status`·`fields`)로 `listProperties` 동일 스코프·필터 적용 → 워크북 → 타임스탬프 파일명 `매물_YYYYMMDD_HHmmss.xlsx`.
- `PropertyExportDialog`(클라): `PROPERTY_FIELDS`를 `FORM_GROUPS`별 체크박스로(33개 그룹화), **기본 체크 = `LIST_COLUMNS`(10종)**. 현재 필터(유형/거래/상태/뷰)를 href 쿼리에 반영.
- `PropertyList` 헤더에 **"엑셀"** 버튼 추가(엑셀 입력 옆).

## 3. 관심 토글 시 순서 유지
- 원인: `listProperties` 정렬이 `updatedAt desc` → 관심 토글·인라인 수정이 `@updatedAt`을 갱신 → 새로고침 시 행이 맨 위로 점프.
- 수정: 정렬을 **`createdAt desc`(등록순 고정)**로 변경. 관심 토글·인라인 편집 모두 자리 고정(인라인 점프도 함께 해소).

## 4. 폼 재설계 — "직접 입력하는 사람" 관점
무성의한 33칸 균일 나열 ❌ → 입력 동선·필드 성격·폭을 맞춘 폼. **모든 필드는 계속 펼쳐 보임**(섹션 접기 없음).

### 4.1 시스템이 아는 건 안 받음
- **출처(source)**: 폼에서 제외(`formHidden`) — 수기/엑셀 자동.
- **상태(status)**: 신규 등록 시 "진행" 기본 프리셋(이미 적용됨), 수정에서만 변경.
- **매물번호(articleNo)**: 선택 입력(내 참조번호) — placeholder로 안내.

### 4.2 폼 메타데이터 (`fields.ts` 단일소스에 추가)
`PropertyField`에 선택 속성 추가: `formHidden?: boolean`, `formInput?: "tel" | "textarea" | "date"`(미지정 시 `type`에서 파생), `unit?: string`, `span?: number`(12칼럼 기준, 미지정 시 3), `placeholder?: string`.
폼 섹션 순서를 **금액이 면적보다 먼저** 오도록 `FORM_GROUPS` 재정렬: `["기본","금액","면적","건물","고객","관련부동산","일정","메모"]`.

| 필드 | formInput | unit | span | 비고 |
|---|---|---|---|---|
| realEstateType | select | | 3 | |
| tradeType | select | | 3 | |
| complexName | text | | 6 | ph "예: 정자동 래미안" |
| articleNo | text | | 3 | ph "예: 2024-1001" |
| status | select | | 3 | 신규 기본 진행 |
| source | — | | | **formHidden** |
| dealAmount | money | 원 | 6 | 매매 시 강조 |
| price | money | 원 | 6 | 라벨 동적: 전세·월세→"보증금", 매매→"가격" |
| areaExclusive/areaSupply/landArea/buildingArea/area/siteArea | area | ㎡ | 3 | |
| totalHouseholds | number | 세대 | 3 | |
| parkingCount | number | 대 | 3 | |
| approvalDate | date | | 3 | |
| heating | text | | 3 | ph "예: 개별난방" |
| isPreSale | bool | | 3 | |
| customerName | text | | 4 | |
| customerPhone | tel | | 4 | ph 010-0000-0000 |
| partnerName/partnerPhone(tel)/partnerManager/manager | text/tel | | 4 | |
| contractHopeDate~balanceDate (7) | date | | 3 | |
| note / memo | textarea | | 12 | 전체폭 여러 줄 |

### 4.3 입력 컴포넌트(템플릿 프리미티브)
- **money/number/area**: `InputGroup` + 단위 suffix, 우측정렬. money는 천단위 콤마 표시(저장은 숫자만). area/number는 콤마 없이 단위만.
- **date**: `<Input type="date">`(저장 `YYYYMMDD` ↔ 표시 `YYYY-MM-DD` 변환). 파싱 불가한 기존 값은 빈 값.
- **tel**: 입력 시 `010-0000-0000` 자동 하이픈.
- **textarea**: `Textarea`(note/memo, 전체폭).
- **거래유형 연동**: 선택된 tradeType에 따라 price 라벨(보증금/가격) + 매매 시 dealAmount 강조(흐림 처리 반대편).
- 폭: 12칼럼 그리드(`lg:grid-cols-12`)에서 각 필드 `span`만큼 col-span.

## 컴포넌트/액션 요약
- `fields.ts`: 폼 메타 추가, `FORM_GROUPS` 재정렬.
- `actions.ts`: `listProperties` 정렬 `createdAt desc`.
- `property-list.tsx`: 상태 필터 + 엑셀 버튼.
- `property-form.tsx`: 메타 구동 입력 컴포넌트(InputGroup·Textarea·date·tel) + 12칼럼 가변폭 + 거래유형 연동.
- 신규: `excel-export.ts`, `api/properties/export/route.ts`, `property-export-dialog.tsx`.

## 비범위
- 월세 전용 금액 필드 신설(모델 변경) — 현재 price=보증금으로 충분. 엑셀 import의 라벨→코드 역매핑(별도 후속).
