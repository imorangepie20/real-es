# 계약 진행 워크플로 + 서류 체크리스트 + 양식 인쇄 — 설계

**작성일:** 2026-06-25
**상태:** 설계 승인 대기 (적대적 리뷰 1회 반영)

## 목표

매물 상태를 **계약진행**으로 바꾸면 해당 매물의 (매물유형×거래유형 기반) **계약 서류 체크리스트**와 **핵심 계약 데이터 입력**이 생성되고, 모두 충족되면 사용자가 버튼으로 **계약완료**로 전환한다. 더불어 계약에 필요한 **양식을 보유 데이터로 자동 기입해 브라우저 인쇄**할 수 있다.

## 아키텍처 개요

- 상태 모델 2단계(`진행·계약완료`) → 3단계(`진행·계약진행·계약완료`).
- 체크리스트 항목은 [contract-documents-guide.md](../../contract-documents-guide.md) §앱 적용 제안의 **byCross(매물군×거래유형 교차) 합성 모델**을 `contract-checklist.ts`(순수 함수)로 구현 — 저장 안 하고 동적 생성.
- 체크 상태만 `Property.contractChecklist`(JSON)에 저장. 핵심 계약필드는 기존 `Property` 필드 재사용 + **월세 `rentPrice` 1개만 신규**.
- 매물별 전용 **계약 페이지**에서 데이터 입력·체크·진행률·완료 버튼·양식 인쇄.
- 양식은 **브라우저 인쇄(A4 print CSS)**, 단일 소스 양식 모듈. **보유 데이터만 자동기입, 나머지는 수기 기입란**(MVP).

## Global Constraints (프로젝트 규칙)

- 응답·UI 카피 한국어. 템플릿 우선(`src/components/ui/` 프리미티브 재사용). 임의 px/hex 금지.
- 단일 소스 원칙: 상태값·체크 항목·양식·매물군 코드집합은 각자 단일 소스 모듈/상수에 1회 정의.
- Prisma money=BigInt(서버)→string(클라) 직렬화 규약 유지(신규 `rentPrice`도 money).
- **비공식·실무 보조 고지**를 계약 페이지 상단·체크리스트·인쇄 양식 **세 곳 모두**에 노출(법령 정확성은 전문가 확인 전제).

---

## 1. 상태 모델

`STATUS_OPTIONS`(`fields.ts`)에 `계약진행` 추가:
```
{ value: "진행", label: "진행" }
{ value: "계약진행", label: "계약진행" }   // 신규
{ value: "계약완료", label: "계약완료" }
```
흐름: `진행 ──startContract──▶ 계약진행 ──completeContract(서버 게이트)──▶ 계약완료`

- 상태는 기존대로 목록 `SelectCell`(인라인 드롭다운)로 편집. 드롭다운에서 **계약진행** 선택 = 상태만 변경(자동 이동 없음).
- 목록에 **"계약" 링크 컬럼** 추가: status가 `계약진행`/`계약완료`인 행에만 노출 → 계약 페이지로 이동. (뱃지 아님 — 상태는 SelectCell.)
- **계약완료 진입의 정식 경로는 계약 페이지 게이트 버튼뿐.** 기존 일괄 버튼(`property-list.tsx`)은 **"계약진행 전환"으로 변경**(`setPropertyStatus(ids,"계약진행")`) — 게이트 우회 일괄완료를 제거해 "계약완료=검증됨" 의미를 일관화.
- 잘못 완료 처리한 매물의 **복구 경로**: 계약완료 매물의 status를 SelectCell로 수동 하향(되돌리기 전용 기능은 범위 외).
- `listProperties`의 `contracted` 뷰(status="계약완료") 유지. 계약진행 매물은 전체/진행 뷰에 노출되며 status 필터(STATUS_OPTIONS 구동)로 "계약진행" 선별 가능.
- `prisma/schema.prisma`의 `status` 주석도 `진행 | 계약진행 | 계약완료`로 갱신(단일 소스 정합).

## 2. 체크리스트 데이터 모델 — `src/lib/properties/contract-checklist.ts`

```ts
export type PartyOption = { value: string; label: string };   // STATUS_OPTIONS와 동일 패턴
export const PARTIES = [
  { value: "common",   label: "공통" }, { value: "seller", label: "매도인" },
  { value: "buyer",    label: "매수인" }, { value: "landlord", label: "임대인" },
  { value: "tenant",   label: "임차인" }, { value: "agent",   label: "중개" },
];
export type ItemKind = "서류" | "처리" | "신고";   // 신고=법정신고(기한·과태료) — 완료 게이트 제외
export type ChecklistItem = { id: string; label: string; party: string; kind: ItemKind; required: boolean };
```

**매물군 코드 상수(단일 소스 — §6 양식도 재사용):**
```ts
export const GROUPS = {
  RESI:       ["A01","A02","A04","C02","C01"],   // 주거 집합(아파트·오피스텔·재건축·빌라·원룸)
  RESI_SINGLE:["C03","C04"],                       // 주거 단독(단독·다가구·전원)
  COMMERCIAL: ["D01","D02","D03","D05"],           // 상가·사무실·건물·상가주택
  LAND:       ["E03"],                              // 토지
  FACTORY:    ["E02","E04"],                        // 공장·지산
};
const RESIDENTIAL = [...GROUPS.RESI, ...GROUPS.RESI_SINGLE];
```

**항목 사전(시작 세트 — 단일 소스라 확장 용이):**

| id | label | party | kind | required |
|---|---|---|---|---|
| DOC_ID | 신분증 | common | 서류 | ✓ |
| DOC_REGISTER | 등기사항전부증명서 | agent | 서류 | ✓ |
| DOC_BLDG_LEDGER | 건축물대장 | agent | 서류 | ✓ |
| DOC_CONTRACT | 계약서 | agent | 서류 | ✓ |
| DOC_CONFIRM | 중개대상물 확인·설명서 | agent | 서류 | ✓ |
| DOC_TITLE_DEED | 등기권리증 | seller | 서류 | ✓ (A1) |
| DOC_SEAL_SALE | 매도용 인감증명서 | seller | 서류 | ✓ (A1) |
| ACT_OWNERSHIP | 소유권이전등기 | buyer | 처리 | ✓ (A1) |
| FILE_TX_REPORT | 부동산거래신고(계약+30일) | agent | 신고 | ✗ |
| TAX_ACQUISITION | 취득세 신고·납부 | buyer | 신고 | ✗ |
| DOC_TAX_CLEARANCE | 임대인 납세증명서·미납국세 확인 | landlord | 서류 | ✗ (임대 권고 — 임대인 거부 가능) |
| ACT_SENIOR_LIEN | 선순위 권리·전입세대 점검 | agent | 처리 | ✓ (주거 임대) |
| ACT_MOVE_IN | 전입신고 | tenant | 처리 | ✓ (주거 임대) |
| ACT_FIXED_DATE | 확정일자 | tenant | 처리 | ✓ (주거 임대) |
| ACT_DEPOSIT_GUARANTEE | 전세보증금반환보증 | tenant | 처리 | ✗ (주거×B1) |
| FILE_LEASE_REPORT | 주택임대차신고(30일) | common | 신고 | ✗ (임대) |
| ACT_BIZ_REG | 사업자등록 | tenant | 처리 | ✓ (상가 임대) |
| ACT_TAX_FIXED_DATE | 세무서 확정일자 | tenant | 처리 | ✓ (상가 임대) |
| ACT_FARMLAND_CERT | 농지취득자격증명 | buyer | 처리 | ✗ (토지) |
| ACT_LUT_PERMIT | 토지거래허가 | buyer | 처리 | ✗ (토지) |

**합성 규칙** = 공통 ∪ byDealType ∪ byPropertyGroup ∪ **byCross(매물군×거래유형 2D)**:

```
byDealType:
  A1 → DOC_TITLE_DEED, DOC_SEAL_SALE, ACT_OWNERSHIP, FILE_TX_REPORT, TAX_ACQUISITION
  B1/B2 → FILE_LEASE_REPORT, DOC_TAX_CLEARANCE            // 납세증명은 임대 공통(권고), 거부 가능성 있어 게이트 비강제
  B3 → []                                                  // 의도: 단기는 전입 통상 불가 → 공통 항목 위주(빈 분기 명시)
byPropertyGroup:
  LAND → ACT_FARMLAND_CERT, ACT_LUT_PERMIT
  FACTORY(E02/E04) → []                                    // MVP 제외: 산업단지 입주계약·업종 적합성은 후속(공통+거래유형만)
byCross (group × deal — 단순 합집합 불가):
  RESIDENTIAL × {B1,B2} → ACT_MOVE_IN, ACT_FIXED_DATE, ACT_SENIOR_LIEN  // 선순위·전입세대 점검은 주거 한정(상가는 환산보증금/상임법 체계라 부적합)
  RESIDENTIAL × {B1}    → ACT_DEPOSIT_GUARANTEE          // 주거 전세 한정(상가 전세 부적합)
  COMMERCIAL  × {B1,B2} → ACT_BIZ_REG, ACT_TAX_FIXED_DATE  // 사업자등록(전입신고 아님)
```
> byCross가 핵심: 단순 합집합이면 "상가 월세에 전입신고"가 잘못 붙는다 → 교차에서 분기. 보증보험은 1D(deal)이 아니라 주거×B1 2D로 둔다.

```ts
export function resolveChecklist(realEstateType: string, tradeType: string): ChecklistItem[]
export function requiredFieldKeys(tradeType: string): string[]
```
`requiredFieldKeys`:
- 공통: `customerName`, `contractDate`, `balanceDate`
- 매매(A1): + `dealAmount`
- 전세(B1): + `price`(보증금)
- 월세(B2): + `price`(보증금) + `rentPrice`(월세)
- 단기(B3): 공통만

## 3. 저장 (Prisma)

`Property`에 컬럼 2개 추가:
```prisma
rentPrice         BigInt?   // 월세(money) — B2 핵심 계약필드
contractChecklist Json?     // { "<itemId>": "<checkedAt ISO8601>" } — 체크된 항목만
```
- 마이그레이션: `ADD COLUMN "rentPrice" BIGINT` + `ADD COLUMN "contractChecklist" JSONB`(둘 다 nullable·비파괴).
- `fields.ts`에 `rentPrice` 추가(group "금액", type "money", label "월세").
- **JSON vs 별도 테이블**: 가이드 §앱적용은 별도 테이블 권장하나, 본 MVP는 **항목별 memo·당사자뷰·기한알림이 범위 외**라 매물당 소수 항목의 체크 상태만 필요 → JSON 단일 컬럼으로 충분(마이그레이션·조인 절감). 향후 memo/감사 필요 시 `ContractChecklistItem` 테이블로 이관(itemId·checkedAt 그대로 매핑).

## 4. 서버 액션 — `src/app/(dashboard)/dashboard/properties/contract-actions.ts`

모두 `requireUser()` + `userId` 스코프 + `revalidatePath`.
- `getContractData(id)` → `{ property, items, checked, requiredFields:{key,label,filled}[], progress:{done,total} }`
- `toggleChecklistItem(id, itemId, checked)` → `contractChecklist` JSON 갱신(true=itemId→now, false=키 삭제). itemId가 현 `resolveChecklist`에 없으면 거부(무결성).
- `startContract(id)` → status="계약진행".
- `completeContract(id)` → **서버 재검증**: `resolveChecklist`의 `required` 항목 전부 체크 ∧ `requiredFieldKeys` 전부 입력 → status="계약완료". 미충족 시 에러(클라 신뢰 금지).

**진행률 산식(명시):** `done = (체크된 required 항목 수) + (입력된 requiredField 수)`, `total = (required 항목 수) + (requiredField 수)`. 항목과 필드를 **각 1개 가중치 동일**로 한 분모에 합산. 필드를 항목과 별도로 두는 이유: 필드는 포맷·검증이 있는 구조화 Property 데이터(체크박스가 아닌 입력)라서.

## 5. UI — 매물별 계약 페이지

라우트 `src/app/(dashboard)/dashboard/properties/[id]/contract/page.tsx` (서버: `getContractData`, `requireUser`+userId 스코프):
- **상단 고지 배너**: "실무 보조용 체크리스트·양식 — 공식/법적 효력 보장 아님, 전문가 확인 필요."
- **헤더**: 매물명·단지명, 매물유형·거래유형 뱃지, **진행률 바**(§4 산식).
- **① 핵심 계약 데이터**: `requiredFieldKeys` 필드 인라인 입력(기존 폼 컴포넌트·`formMeta` 재사용, 거래유형 연동 라벨: price=보증금/가격, rentPrice=월세). 변경 시 `updateProperty` 저장.
- **② 서류 체크리스트**: `resolveChecklist` 결과를 party별(`PARTIES` 라벨) 그룹 + `Checkbox`. 토글 즉시 `toggleChecklistItem`. `required=false`(신고·참고) 항목엔 "참고/법정신고" 뱃지.
- **③ 양식 인쇄**(§6): 적용 가능한 양식 버튼.
- **푸터**: `계약 완료 처리` 버튼 — 진행률 100%(required) 아니면 비활성. 클릭 → `completeContract` → 목록/계약완료 뷰 복귀. 실패(경합) 시 에러 토스트.
- **계약완료 매물의 계약 페이지 = 읽기전용**: 체크 토글·필드 입력·완료 버튼 비활성, "수정하려면 목록에서 상태를 하향하세요" 안내(완료 상태와 진행률 불일치 방지). 양식 인쇄는 가능.
- 유형/거래유형 미설정 → "먼저 매물유형·거래유형을 설정하세요" 안내 + 수정 폼 링크(진입 차단).
- 클라 인터랙션은 `contract-client.tsx`로 분리.

## 6. 양식 인쇄 — `src/lib/properties/contract-forms.ts` + 인쇄 라우트

**양식 정의(단일 소스, `GROUPS` 재사용):**
```ts
export type FormFieldSlot = { slot: string; sourceKey?: string };  // sourceKey 없으면 수기 기입란
export type ContractForm = { id: string; label: string; applies(realEstateType: string, tradeType: string): boolean; slots: FormFieldSlot[] };
```
시작 양식:
- `sale_contract` 매매계약서 (A1)
- `lease_contract` 임대차계약서 (B1/B2/B3)
- `confirm_residential` 확인·설명서[주거용] (RESIDENTIAL)
- `confirm_nonresidential` 확인·설명서[비주거용] (COMMERCIAL·LAND·FACTORY)
- `receipt` 영수증 (공통)
- `power_of_attorney` 위임장 (공통)

**자동기입 매핑(MVP — 보유 필드만 채움):**

| 양식 슬롯 | sourceKey | 비고 |
|---|---|---|
| 부동산 표시(단지/매물명) | `complexName`,`name` | |
| 매물유형/거래유형 | `realEstateType`,`tradeType` | 라벨 변환 |
| 전용/공급/대지 면적 | `areaExclusive`,`areaSupply`,`landArea` | |
| 매매대금/보증금 | `dealAmount`/`price` | 거래유형별 |
| 월세 | `rentPrice` | B2 |
| 계약일/중도금/잔금일 | `contractDate`,`interim1Date`,`interim2Date`,`balanceDate` | |
| 고객(일방 당사자) 성명/연락처 | `customerName`,`customerPhone` | |
| **상대 당사자 인적사항·주소상세·계약금/잔금액** | — | **수기 기입란(밑줄)** |

> ⚠️ MVP 한계 명시: 현 `Property`는 당사자 1명(`customerName`)·소재지 상세주소·금액 분해 필드가 없어 **양식이 부분 자동기입**된다. 상대 당사자·주소·계약금/잔금 분해는 인쇄물에서 수기 기입. 향후 데이터 모델 확장 시 자동기입 범위 확대.

**렌더/인쇄:** 라우트 `.../[id]/contract/print/[formId]/page.tsx`
- 서버 컴포넌트에서 **`getProperty(id)`(requireUser+userId 스코프)** 로 읽어 **IDOR 차단**(타 사용자 매물 인쇄 불가).
- A4 `@media print` CSS, 화면 "인쇄" 버튼(`window.print()`), 인쇄 시 버튼/네비 `print:hidden`.
- 상단 고지: "실무 보조용 자동기입 양식 — 공식 표준양식 아님."
- 본문 마크업의 색·간격·타이포는 Tailwind 토큰 사용.

## 7. 범위 / YAGNI

- 데이터 모델은 **MVP**: 신규 필드는 `rentPrice` 1개만. 당사자 양측·주소상세·금액 분해는 추가하지 않고 양식 수기란으로.
- 항목·양식은 위 시작 세트부터(단일 소스라 확장 용이). 신고(post-잔금)는 "신고" kind로 참고 표시, 완료 게이트 제외.
- **공장/지산(FACTORY) 전용 항목(산업단지 입주계약·업종 적합성)은 MVP 제외** — 공통+거래유형 항목만 받음(누락 아님, 후속 확장).
- 확인·설명서: 게이트 항목은 `DOC_CONFIRM` 1건으로 충족, 인쇄 양식만 주거/비주거 2종 분기(비대칭 의도).
- B3(단기임대): byDealType=빈 배열(의도) → 공통 항목 위주(전입신고 등 미부착 — 가이드상 단기는 전입 통상 불가).
- 제외: 계약완료 되돌리기 전용 기능, 항목별 memo, 기한 알림, PDF/엑셀 출력, 양식의 법적 효력 보장.

## 8. 테스트

- `resolveChecklist` 교차 정확성: (A01×B1)→전입+확정일자+선순위점검 포함·사업자등록 미포함 / (D02×B2)→사업자등록+세무서확정일자 포함·전입신고·선순위점검 **미**포함 / (E03×A1)→농취증·토허 포함 / (A01×B1)→보증보험 포함, (D02×B1)→보증보험 **미**포함 / (B1/B2 전반)→임대인 납세증명 포함(required=✗) / (B3)→공통 위주·전입신고 미포함 / (E02×A1)→공통+매매만(FACTORY 전용항목 0).
- `requiredFieldKeys`: A1/B1/B2(월세 포함)/B3 키 검증.
- 완료 게이트: required 항목·필드 일부 누락 시 `completeContract` 거부, 전부 충족 시 통과. 진행률 산식 분자/분모.
- `contract-forms`: 거래/유형별 `applies` 노출 양식, 슬롯 sourceKey 매핑 존재.
- 인쇄 라우트: 타 사용자 매물 id 접근 시 차단(스코프).

## 9. 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/properties/contract-checklist.ts` | PARTIES·GROUPS·항목 사전·resolveChecklist·requiredFieldKeys (순수) |
| `src/lib/properties/contract-checklist.test.ts` | 교차/게이트/진행률 단위 테스트 |
| `src/lib/properties/contract-forms.ts` | 양식 정의·applies·슬롯 매핑 (순수) |
| `src/lib/properties/contract-forms.test.ts` | applies·매핑 테스트 |
| `src/app/(dashboard)/dashboard/properties/contract-actions.ts` | 서버 액션 |
| `.../properties/[id]/contract/page.tsx` | 계약 페이지(고지·데이터·체크·완료·양식 진입) |
| `.../properties/[id]/contract/contract-client.tsx` | 클라 인터랙션(체크 토글·완료) |
| `.../properties/[id]/contract/print/[formId]/page.tsx` | 양식 인쇄(스코프 적용) |
| `prisma/schema.prisma` + 마이그레이션 | `rentPrice`·`contractChecklist` 추가, status 주석 갱신 |
| `src/lib/properties/fields.ts` | STATUS_OPTIONS에 계약진행, 금액 그룹에 rentPrice |
| `.../properties/property-list.tsx` | 일괄 버튼 "계약진행 전환"으로 변경, "계약" 링크 컬럼 |

## 10. 엣지 케이스

- 유형/거래유형 미설정 → 체크리스트 해석 불가 → 안내 + 진입 차단.
- **유형/거래유형 변경 시 체크 잔존 정책(명시)**: 체크는 JSON에 `{itemId:checkedAt}`로 남고, 화면은 `resolveChecklist ∩ 저장키`만 표시(읽기 시 필터). 사라진 항목의 키는 **정리하지 않음** → 같은 유형으로 되돌리면 과거 체크 복원(편의·의도). 완료 게이트는 항상 현 `resolveChecklist` 기준 재계산이라 안전.
- 완료 버튼 클릭 시 서버 재검증 실패(경합·필드 누락) → 에러 토스트, 상태 미변경.
- 인쇄 페이지 IDOR: 반드시 userId 스코프(§6).
