# 네이버 매물 수집 — 설계 (MVP)

- 작성일: 2026-06-23
- 대상: real-es 첫 서브프로젝트
- 상태: 설계 승인됨 → 단계 0·1 완료, 단계 2 진행 중

> **2026-06-23 진입 흐름 교정 (단계 2 spike 결과):** 본 문서가 진입점으로 적은 **"단지명 키워드 검색"은 폐기**되고 **동(법정동) 드릴다운**으로 대체됨 — 네이버 fin.land는 단지명 키워드로 매물을 검색하지 않는다. 새 흐름은 `[시도→시군구→동] → complex/region(단지목록) → 단지선택 → article/list(매물)`이며, 동 선택은 우리 DB의 법정동 코드(VWorld 적재)로 한다. 확정 설계·엔드포인트·매핑은 **[stage-2 collection design](2026-06-23-stage-2-collection-design.md)** 참조. 아래 §1·§3·§5·§9·§10의 "단지명 검색" 서술은 그 문서로 갱신된 것으로 본다.

## 1. 목적과 범위

real-es의 첫 세로 슬라이스. 공인중개사(부동산)가 네이버 부동산 데이터를 검색·조회하고 관심 매물로 저장하는 기능. **여러 부동산이 사용하는 멀티테넌트** 전제이므로 이 슬라이스는 두 레이어로 구성된다:

1. **멀티테넌트 인증 기반** — 부동산(Agency)·사용자(User)·세션, 회원가입/로그인, 데이터 격리
2. **네이버 매물 수집** — 단지명 검색 → 단지 선택 → 매물/시세 수집 → 관심매물 저장

### 인 범위 (MVP)
- 멀티테넌트 인증 (직접 구현, 경량 세션)
- 단지명 검색 → 매물 인터랙티브 조회 (가장 기본적인 정보만)
- 관심매물 저장 (부동산별 격리)

### 비범위 (YAGNI)

**아예 안 함 (영구 제외):**
- 검색 저장 목록 / 주기적 자동 갱신

**후속 서브프로젝트/단계로 미룸:**
- 지도(카카오/네이버) 연동
- 행정동 드릴다운 → 단지 목록 수집
- 권한(role) 세분화, 직원 초대
- 데스크탑(Tauri), 엑셀 입출력
- 내부 매물 관리 / 고객 관리 / 일정 관리

## 2. 검증된 사실 (spike 결과, 2026-06-23)

`/tmp` throwaway 스크립트로 검증 (레포 미포함):

- 네이버 내부 API **직접 호출**(curl / `page.evaluate` fetch)은 **Akamai WAF가 403**으로 차단. 데이터센터 IP 직접 호출은 **429**.
- 공개 HTML 페이지(`/map`)는 200. SPA라 데이터는 JS가 내부 API로 채운다.
- **헤드리스 브라우저로 `https://fin.land.naver.com/complexes/{단지번호}` 네비게이션 시 Akamai 통과** — 단지 데이터 API 30개 이상이 전부 200.
  - URL 패턴: `/complexes/{n}` (복수형. `/complex/{n}`은 404)
- **로그인 불필요** (익명 세션으로 통과. `auth/userInfo` 200, 개인화 `user/recentView`만 401).
- **응답 바디 캡처**: Playwright `route.fetch()` 인터셉트로 실제 JSON 확보.
  - `complex/article/count` → `{"dealCount":112,"leaseDepositCount":7,"leaseMonthlyCount":3}` (정자동 단지 102614)
  - `complex/pyeongList` → 평형 목록 + 평면도 이미지 URL
  - 응답 래퍼 구조: `{isSuccess, detailCode, result}`

**결론**: 직접 API 호출은 불가. **헤드리스 네비게이션 + `route.fetch` 인터셉트가 유일하게 검증된 경로**이며, 이 때문에 헤드리스 브라우저가 필수다.

## 3. 아키텍처 & 데이터 흐름

```
┌─ 브라우저: Next.js UI (네이버 부동산 > 매물 검색) ──────────┐
│  [단지명 입력]──검색──▶ 단지 후보 목록 ──선택──▶ 매물 표       │
│                                          [관심 매물로 저장] 버튼 │
└───────────────┬────────────────────────────────────────────┘
   (1) GET  /api/naver/complexes?q=래미안   (단지 검색)
   (2) GET  /api/naver/complexes/{n}        (단지+매물 수집)
   (3) POST /api/watchlist                  (관심매물 저장)
                │
                ▼
┌─ Next.js Route Handlers (서버) ─────────────────────────────┐
│  인증 가드 · 입력검증 · 캐시 조회(TTL) · 정규화 응답           │
└───────────────┬────────────────────────────────────────────┘
                │ 캐시 미스 시에만
                ▼
┌─ 스크래퍼 서비스 (격리 모듈, src/lib/naver/) ───────────────┐
│  Playwright 헤드리스 · 세션 1개 재사용                        │
│   · 단지 페이지 네비게이션 (/complexes/{n})                   │
│   · route.fetch 인터셉트로 응답 수집  ← 검증된 유일 경로       │
│   · 레이트리밋: 동시성 1 · 요청 간 지연 · 백오프              │
│   · 파싱 → 정규화                                            │
│  공개 인터페이스:  searchComplexes(q)  ·  getComplexDetail(n) │
└───────────────┬────────────────────────────────────────────┘
                ▼
┌─ 데이터 계층 (Prisma + PostgreSQL, Docker) ─────────────────┐
│  Agency · User · Session  (인증/테넌트)                       │
│  Complex · Article        (전역 공유 수집 캐시)              │
│  Watchlist                (부동산별 관심매물)                │
└─────────────────────────────────────────────────────────────┘
```

핵심 원칙:
1. **스크래퍼는 격리된 단일 책임 모듈** — 바깥에 `searchComplexes(q)` / `getComplexDetail(n)`만 노출, Playwright·인터셉트·파싱은 내부에 은닉. UI/API는 정규화된 데이터만 본다.
2. **직접 API 호출 금지** — 반드시 네비게이션 + `route.fetch` 인터셉트.
3. **보수적 운영** — 헤드리스 세션 재사용, 동시성 1, 요청 간 지연, 결과 캐싱(TTL).
4. **수집 데이터 = 캐시/스냅샷** — 원본은 네이버, 우리는 미러. 관심매물만 사용자가 영구 저장.
5. **스크래퍼 위치** — MVP에선 Next 서버 안 모듈. 부하 증가 시 별도 워커로 분리 가능.

## 4. 데이터 모델 (Prisma)

```prisma
model Agency {                  // 부동산 = 테넌트
  id        String   @id @default(cuid())
  name      String
  users     User[]
  watchlist Watchlist[]
  createdAt DateTime @default(now())
}

model User {                    // 부동산 소속 직원/중개사
  id           String   @id @default(cuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id])
  email        String   @unique
  passwordHash String
  name         String?
  role         String   @default("member")   // admin / member (세분화는 후속)
  sessions     Session[]
}

model Session {                 // 로그인 세션 (httpOnly 쿠키)
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
}

model Complex {                 // 단지 (전역 공유 캐시)
  id              String   @id @default(cuid())
  complexNumber   String   @unique     // 네이버 단지번호 (예: "102614")
  name            String
  address         String?
  totalHouseholds Int?
  approvalDate    String?
  raw             Json?                // 원본 응답 보관 (스키마 진화 대비)
  fetchedAt       DateTime @default(now())
  articles        Article[]
}

model Article {                // 개별 매물 (전역 공유 캐시)
  id            String   @id @default(cuid())
  articleNumber String   @unique
  complexId     String
  complex       Complex  @relation(fields: [complexId], references: [id])
  tradeType     String               // 매매 / 전세 / 월세
  price         BigInt?              // 거래금액(원)
  areaExclusive Float?               // 전용면적
  areaSupply    Float?               // 공급면적
  floor         String?
  realtorName   String?
  raw           Json?
  fetchedAt     DateTime @default(now())
  watchlist     Watchlist[]
}

model Watchlist {              // 관심매물 (부동산별 격리)
  id        String   @id @default(cuid())
  agencyId  String
  agency    Agency   @relation(fields: [agencyId], references: [id])
  articleId String
  article   Article  @relation(fields: [articleId], references: [id])
  memo      String?
  savedAt   DateTime @default(now())
  @@unique([agencyId, articleId])
}
```

설계 선택:
- **수집 캐시(Complex/Article)는 전역 공유** — 네이버 데이터는 테넌트 무관. 한 부동산이 수집하면 모두가 캐시 혜택.
- **`raw Json` 병행 저장** — 정규화 컬럼 + 원본 JSON. 필드 추가 시 재수집 없이 `raw`에서 추출.
- **수집 범위 = 가장 기본적인 정보만** — 단지(단지명·주소·총세대수·사용승인일)와 매물(거래유형·가격·면적·층·부동산)의 핵심 필드만 저장한다. 네이버가 제공하는 평면도 이미지·시세 추이·실거래가 히스토리·보유세·공시가·KB시세·대출 등 부가 데이터는 수집/저장하지 않는다.

## 5. 핵심 흐름

```
searchComplexes(q)                         # 단지명 → 단지 후보
  1. 헤드리스 세션 확보 (재사용)
  2. 네이버 검색/자동완성 네비게이션 (q)
  3. route.fetch 인터셉트 → 단지 후보 응답 캡처
  4. 파싱 → [{ complexNumber, name, address }]

getComplexDetail(complexNumber, { tradeType })   # 단지 → 매물 (기본 정보만)
  1. DB 캐시 확인 (TTL 이내면 즉시 반환, 네이버 호출 안 함)
  2. /complexes/{n} 네비게이션
  3. 인터셉트: article/count · pyeongList · article/list ...
  4. 파싱 → 정규화 → Complex·Article upsert
  5. 반환 { complex, articles[] }
```

UI 흐름:
```
[검색창] ─입력▶ [단지 후보 리스트] ─클릭▶ [매물 표: @tanstack data-table]
                                              └ 각 행 [♥ 관심] 토글 → Watchlist
```

## 6. 운영

- **캐싱**: `getComplexDetail` 결과를 DB에 캐시(TTL 10~30분). 같은 단지 재조회 시 네이버 재호출 안 함.
- **헤드리스 세션**: 브라우저 1개를 워밍업해 재사용, 유휴 시 종료.
- **레이트리밋**: 요청 큐(동시성 1) + 요청 간 지연(2~5초) + 429/403 감지 시 지수 백오프.
- **에러 처리**: 검색 없음 / 차단 / 타임아웃 → 사용자 친화 메시지 + 재시도. 차단 지속 시 "일시적으로 수집이 제한됨" 안내(graceful degradation).

## 7. 테스트 전략

- **스크래퍼 파싱**: 인터셉트한 실제 응답을 픽스처로 저장 → 파싱/정규화 단위 테스트 (네트워크 없이 결정적).
- **인증**: 세션 생성·검증·만료, 비밀번호 해싱 단위 테스트. 보호 라우트 통합 테스트.
- **E2E**: Playwright(템플릿 내장)로 로그인 → 검색 → 매물 표 → 관심 저장 스모크.
- **네이버 실호출 스크래핑**: flaky하므로 CI 제외. 픽스처 기반 테스트로 대체하고, 실호출은 수동/별도 검증.

## 8. 단계 구성 ("차곡차곡, 각 단계가 동작하는 완성품")

| 단계 | 내용 | 끝나면 동작하는 것 |
|---|---|---|
| **0** | PostgreSQL(Docker) + Prisma + 첫 마이그레이션 | DB에 연결되는 앱 |
| **1** | 인증 기반 — Agency/User/Session, 회원가입·로그인·로그아웃·보호 라우트 | 로그인되는 앱 |
| **2** | 스크래퍼 모듈 — 검색 엔드포인트·매물탭 진입 spike→확정, `searchComplexes`/`getComplexDetail` | 콘솔에서 단지 검색→매물 수집 |
| **3** | 매물 검색 UI — 검색창→단지 후보→매물 표(data-table) | 화면에서 매물 조회 |
| **4** | 관심매물 — `Watchlist`(agency 격리) 저장·조회 | 관심매물 담고 보는 앱 |
| **5** | 캐싱·레이트리밋·에러 견고화 | 안정적 수집 |

각 단계는 이전 단계 위에 얹히고, 끝나면 실제로 실행되는 산출물이 나온다. 미완성 조각을 여러 개 벌려두지 않는다.

## 9. 미해결 / 리스크

- **단지명 검색 엔드포인트 미확정** — 단계 2 spike에서 확정. 메커니즘(네비게이션+인터셉트)은 검증됨.
- **`article/list`(매물 리스트) 진입 미확정** — 단지 페이지에서 자연 호출될지, "매물" 탭 네비게이션이 필요할지. 단계 2에서 확정.
- **스펙의 API URL이 현재와 다름** (`complex/region` 404) — 모든 경로는 실제 네비게이션으로 재확인한다.
- **Akamai/레이트리밋 정책 변경 가능성** (운영 리스크) — 백오프·캐싱으로 완화, 차단 시 graceful degradation.
- **단일 서버 IP** — 차단 시 전체 영향. 향후 프록시 또는 데스크탑(사용자 IP) 전환 경로를 열어둔다.

## 10. 결정 로그

- 첫 영역: 네이버 수집 (데이터 공급원 먼저)
- 수집 흐름: 인터랙티브 검색
- 접근: A. 서버 헤드리스 (Playwright)
- 진입점: 단지명 검색
- 테넌시: 멀티테넌트 + 인증을 MVP에 포함
- 인증: 직접 구현 (경량 세션, httpOnly 쿠키)
- 작업 원칙: 차곡차곡 — 각 단계가 동작하는 vertical slice
