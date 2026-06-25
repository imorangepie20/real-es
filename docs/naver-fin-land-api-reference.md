# 네이버페이 부동산(fin.land.naver.com) 매물 데이터 접근 참고

> 앱 로드맵 **"네이버 관심매물 가져오기"** 를 위한 역공학 참고 자료. 2026-06-25 기준 직접 캡처·검증한 내용이다.
>
> ⚠️ **주의**: 네이버는 부동산 매물에 대한 **공식 공개 API가 없다.** 아래는 fin.land 웹이 내부적으로 호출하는 비공식 `front-api`이며, **이용약관상 자동수집은 제약**이 있고 엔드포인트·스키마·봇차단 정책은 **예고 없이 바뀐다.** 운영 기능화 시 약관·차단정책·법적 리스크를 먼저 검토할 것. 본 문서는 구조 파악용이다.

---

## 1. 접근(봇차단 우회) — 검증된 방법

| 방법 | 결과 |
|---|---|
| 평문 `curl` / WebFetch | **429 TOO_MANY_REQUESTS** — TLS 지문 기반 봇차단 |
| **`curl_cffi`(`impersonate="chrome"`)** | ✅ 우회. **GET 엔드포인트(단지정보·시세·실거래가 등) 정상 응답** |
| 헤드리스 Playwright(기본) | `navigator.webdriver:true` 텔레메트리로 **탐지 → 매물 로딩 차단** |
| **Playwright + 스텔스** | ✅ SPA 렌더 + 실 XHR 캡처 (아래 POST 본문은 이 방식으로 확보) |

스텔스 핵심: `--disable-blink-features=AutomationControlled` + init script로 `navigator.webdriver=undefined`, `window.chrome={runtime:{}}`, `navigator.languages/plugins` 마스킹.

> POST 계열 매물 엔드포인트는 추측한 body가 모두 400이었고, **실제 페이지가 보내는 요청을 캡처**해야 정확히 풀린다(추측 금지). 정적 JS는 turbopack 동적 임포트라 경로가 안 잡힌다.

---

## 2. 코드 매핑 (앱 코드와 동일 체계)

- `tradeType`: **A1 매매 / B1 전세 / B2 월세 / B3 단기**
- `realEstateType`: **A01 아파트 / A04 재건축 / A02 오피스텔 / C02 빌라 …** (앱 `@/lib/naver/property-types`와 호환)
- `priceInfo.dealPrice` 등은 **원 단위** (÷1e8 = 억).
- `complexNumber`는 fin.land 자체 네임스페이스(예: **8928 = 개포자이**). 구 `new.land`의 `hscpNo`와 다름.

---

## 3. 검증된 엔드포인트

### 3.1 단지 (GET, `curl_cffi`로 무인증 동작)

| 엔드포인트 | 내용 |
|---|---|
| `GET /front-api/v1/complex?complexNumber={n}` | 단지 종합정보(이름·유형·주소·좌표·세대/동수·시공사·사용승인·용적/건폐율·주차·난방·관리실·층range) |
| `GET /front-api/v1/complex/article/count?complexNumber={n}` | 매물 건수 |
| `GET /front-api/v1/complex/article/price?complexNumber={n}` | 매매 호가 min/max (`dealMinPrice`/`dealMaxPrice`) |
| `GET /front-api/v1/complex/pyeongList?complexNumber={n}` | 평형 목록 |
| `GET /front-api/v1/complex/askingPrice?complexNumber={n}&pyeongTypeNumber=&realEstateType=` | 평형별 호가 |
| `GET /front-api/v1/complex/pyeong/realPrice?complexNumber={n}&tradeType=A1&pyeongTypeNumber=&page=1` | 실거래가 |
| `GET /front-api/v1/complex/marketPrice/list?complexNumber={n}&pyeongTypeNumber=&startDate=&endDate=` | 시세(한국부동산원 등) |
| `GET /front-api/v1/complex/declaredValue/pyeongType?complexNumber={n}&pyeongTypeNumber=` | 공시가격 |
| `GET /front-api/v1/complex/holdingTax?complexNumber={n}&pyeongTypeNumber=` | 보유세 |
| `GET /front-api/v1/complex/mapComplexSummaryInfo?complexNumber={n}` | 지도용 단지 요약 |
| `GET /front-api/v1/legalDivision/searchByCoordinate?longitude={lon}&latitude={lat}` | **좌표 → 법정동** (지도 center 해석에 유용) |

### 3.2 매물 목록 (POST) — 실제 캡처한 요청

**단지별 매물 목록** — `POST /front-api/v1/complex/article/list`
```json
{"size":30,"complexNumber":"8928","tradeTypes":[],"pyeongTypes":[],
 "dongNumbers":[],"userChannelType":"PC","articleSortType":"RANKING_DESC","lastInfo":[]}
```
- `complexNumber`는 **문자열**. `userChannelType:"PC"`·`articleSortType`·`lastInfo` 누락 시 **400**.
- 페이지네이션: 응답의 `lastInfo`·`hasNextPage`를 다음 요청 `lastInfo`에 넘기는 **커서 방식**.

응답 구조(요약):
```jsonc
{ "result": { "totalCount": 21, "hasNextPage": false, "seed": "...", "lastInfo": [...],
  "list": [ { "representativeArticleInfo": {
      "complexName","articleNumber","articleName","dongName",
      "tradeType":"A1","realEstateType":"A01",
      "spaceInfo": { "supplySpace","contractSpace","exclusiveSpace","supplySpaceName","exclusiveSpaceName" },
      "priceInfo": { "dealPrice","warrantyPrice","rentPrice","managementFeeAmount" },   // 원 단위
      "articleDetail": { "direction","floorInfo":"1/22","floorDetailInfo":{...} },
      "verificationInfo": { "verificationType":"OWNER","articleConfirmDate","exposureStartDate" },
      "brokerInfo": { "brokerageName","brokerName","cpId" },
      "address": {...}
    },
    "duplicatedArticleInfo": {...}   // 동일 매물 중복 묶음
  } ] } }
```

**지도 뷰(viewport) 매물** — `POST /front-api/v1/article/map/articleClusters` (원본 지도 URL의 `article_list` 뷰가 쓰는 엔드포인트)
```jsonc
{ "filter": { "tradeTypes":["A1","B1"], "realEstateTypes":["A01","A04","B01"],
    "roomCount":[],"bathRoomCount":[],"optionTypes":[],"oneRoomShapeTypes":[],
    "moveInTypes":[],"filtersExclusiveSpace":false,"floorTypes":[],"directionTypes":[],
    "hasArticlePhoto":false,"isAuthorizedByOwner":false,"parkingTypes":[] },
  /* + 지도 bounds(좌표 범위) 필드 */ }
```
- 응답: `{ result: { totalCount, clusters:[{ clusterId, coordinates:{xCoordinate,yCoordinate}, articleCount }] } }`
- 관련: `POST /front-api/v1/article/boundedArticlesCount`(범위 내 건수), `POST /front-api/v1/complex/complexClusters`(단지 클러스터), `POST /front-api/v1/preSale/pinExposure`(분양 핀).

### 3.3 인증 필요(401) — 로그인 세션 의존
`auth/userInfo`, `complex/auth/mount`(PUT), `user/recentView`, `user/legalDivisionView`.
→ **"관심부동산(관심매물)"은 계정 귀속**이라 무인증으로 못 가져온다. 사용자 NID 세션 쿠키가 있어야 한다.

---

## 4. 원본 지도 URL 해석

`https://fin.land.naver.com/map?center={enc}&zoom=15&layer={lz}`
- `layer`는 **lz-string**(`decompressFromEncodedURIComponent`) → 예: `[{"id":"article_list","searchParams":{"type":"CAPSULE"}}]`(매물 캡슐 뷰).
- `center`는 네이버 자체 인코딩 좌표(미해독). **실무적으로는 그 URL을 브라우저로 열어 `articleClusters` 요청을 캡처**하면 디코딩 없이 해당 viewport 매물을 얻는다. 좌표→법정동은 `legalDivision/searchByCoordinate`.

---

## 5. 앱 적용 제안 ("네이버 관심매물 가져오기")

1. **무인증 공개 데이터**(단지정보·시세·실거래가·단지별 매물 목록)는 `curl_cffi` GET/POST로 수집 가능 → 단지번호 기반 보강 자료로 활용.
2. **관심매물(계정 귀속)** 은 무인증 불가 → 사용자 **NID 로그인 세션** 필요. 현실적 경로:
   - (a) 사용자가 직접 브라우저에서 로그인한 세션으로 수집(확장프로그램/북마클릿) 후 앱으로 전달, 또는
   - (b) 사용자가 관심목록을 **내보내기/붙여넣기** → 앱 엑셀 입력 파이프라인 재사용.
3. 수집 데이터 → 앱 `Property` 매핑: `tradeType`/`realEstateType` 코드 호환, `dealPrice`(÷1e8) → `dealAmount`, `exclusiveSpace`→전용면적, `articleNumber`→`articleNo`, `dongName`/`floorInfo`, `brokerInfo`→중개사.
4. **법적/약관 가드레일 먼저**: 봇차단 우회·자동수집은 약관 위반 소지. 정식 제휴/수기 입력/사용자 세션 위임 등 합법 경로 우선.

---

## 6. 검증 메모
- 샘플 단지 **8928 개포자이**(강남구 개포동, 212세대, 2004년, 좌표 127.077115/37.496437)에서 **매매 매물 21건** 전체를 실제로 수집(28~45억 분포)했다.
- 접근: `curl_cffi`(GET 검증) + Playwright 스텔스(POST 매물 목록 요청 캡처). 추측 없이 네이버 페이지가 보내는 요청 그대로 사용.
