# 단계 1: 인증 기반 — 설계

- 작성일: 2026-06-23
- 상태: 설계 승인됨 → 구현 plan 대기
- 상위 스펙: [2026-06-23-naver-collection-design.md](2026-06-23-naver-collection-design.md) (§3 아키텍처, §4 데이터 모델, §8 단계 구성)
- 선행: 단계 0(DB+Prisma, `Agency` 모델·`/api/health`) 완료 — main 머지됨

## 1. 목적 / 끝나면 동작하는 것

멀티테넌트 인증 기반을 올린다. 회원가입·로그인·로그아웃·보호 라우트가 동작해 **"로그인되는 앱"**이 된다. 이후 단계(스크래퍼·검색 UI·관심매물)가 이 인증/테넌트 위에 얹힌다.

## 2. 범위

### 인 범위 (MVP)
- **회원가입(셀프서비스)** — 상호명 + 이메일 + 비밀번호 → 새 `Agency` + 첫 `User`(role=`admin`) 동시 생성
- **로그인 / 로그아웃** — 경량 세션, httpOnly 쿠키
- **보호 라우트** — `(dashboard)` 전체를 서버 사이드 세션 가드로 보호

### 비범위 (이번 단계 제외)
- 비밀번호 재설정 / 이메일 인증 — 템플릿에 `forgot-password`·`reset-password`·`verify` 페이지가 있으나 **미연결로 둔다**(후속)
- 권한(role) 세분화, 직원 초대 — 후속
- 소셜 로그인, 2FA — 비범위

## 3. 데이터 모델 (Prisma 델타)

기존 `Agency`에 관계 추가 + 신규 `User`·`Session`. (상위 스펙 §4 기준, **세션 토큰 컬럼만 델타**)

```prisma
model Agency {                  // 단계 0에 존재 — users 관계만 추가
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  users     User[]              // 추가 (watchlist는 단계 4에서)
}

model User {
  id           String   @id @default(cuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id])
  email        String   @unique
  passwordHash String
  name         String?
  role         String   @default("member")  // 첫 가입자 = "admin"
  createdAt    DateTime @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique   // ← 상위 스펙 대비 델타: 쿠키는 opaque 랜덤 토큰, DB엔 그 sha256만 저장
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- 마이그레이션: `init_auth`
- **세션 토큰 결정(델타)**: 쿠키에 `randomBytes(32)` base64url 토큰을 담고, DB에는 `sha256(token)`만 저장한다. cuid를 쿠키로 직접 노출하지 않아 안전하고, DB 유출 시에도 토큰 원문이 드러나지 않는다.

## 4. 인증 코어 모듈 (`src/lib/auth/`, 격리)

UI/액션은 이 모듈의 공개 함수만 사용한다. 해싱·토큰·쿠키 세부는 내부에 은닉.

| 파일 | 공개 인터페이스 | 책임 |
|---|---|---|
| `password.ts` | `hashPassword(pw)` · `verifyPassword(pw, hash)` | bcryptjs 해싱/검증 |
| `session.ts` | `createSession(userId)` → `{token, expiresAt}` · `validateSessionToken(token)` → `{user, session} \| null` · `invalidateSession(token)` | 토큰 생성/해시/조회/만료 |
| `cookies.ts` | `setSessionCookie(token, expiresAt)` · `clearSessionCookie()` | httpOnly·Secure·SameSite=Lax 쿠키 (이름 `session`) |
| `current-user.ts` | `getCurrentUser()` → `User \| null` | 쿠키 → 세션 검증 → 유저 (서버 전용) |

- 세션 수명: 30일 (`expiresAt`). 만료 시 `validateSessionToken`이 null 반환 + 만료 레코드 정리.
- `db`(단계 0 `src/lib/db.ts` 싱글톤) 사용.

## 5. 흐름 (Next 서버 액션)

폼은 기존 템플릿 UI를 재사용해 서버 액션에 연결한다. (별도 `/api` 라우트 불필요 — 인증은 서버 액션이 관용적)

```
회원가입  signupAction(상호명, email, password)
  1. zod 입력검증 (이메일 형식, 비밀번호 길이 등)
  2. email 중복 확인 → 있으면 에러
  3. 트랜잭션: Agency 생성 → User(role="admin", passwordHash) 생성
  4. createSession(user.id) → setSessionCookie
  5. redirect("/dashboard/real-estate")

로그인  loginAction(email, password)
  1. zod 검증 → User 조회 → verifyPassword
  2. 실패 시 통합 에러("이메일 또는 비밀번호가 올바르지 않습니다")
  3. createSession → setSessionCookie → redirect

로그아웃  logoutAction()
  1. invalidateSession(현재 토큰) → clearSessionCookie → redirect("/login")
```

## 6. 보호 라우트

- `src/app/(dashboard)/layout.tsx`(서버 컴포넌트): `getCurrentUser()` → null이면 `redirect("/login")`. → 모든 대시보드 라우트 일괄 보호.
- `(auth)` 페이지(login/register): 이미 로그인 상태면 `/dashboard/real-estate`로 리다이렉트.
- 루트 `/`는 기존대로 `/dashboard/default`로 리다이렉트(가드가 미인증을 `/login`으로 보냄).

## 7. 에러 처리

| 상황 | 처리 |
|---|---|
| 잘못된 자격증명 | 폼 에러 "이메일 또는 비밀번호가 올바르지 않습니다" (이메일 존재 여부 비노출) |
| 중복 이메일(가입) | "이미 가입된 이메일입니다" |
| 입력 검증 실패 | 필드별 메시지 |
| 만료/위조 세션 | 쿠키 정리 + `/login` 리다이렉트 |

## 8. 테스트 전략 (상위 스펙 §7)

- **단위**: `hashPassword`/`verifyPassword` 라운드트립; `createSession`→`validateSessionToken` 성공, 만료 토큰 거부, `invalidateSession` 후 거부.
- **통합**: 미인증 `/dashboard/*` 접근 → `/login` 리다이렉트; `signupAction`이 Agency+User 생성; `loginAction`이 세션 쿠키 설정.
- **E2E** `e2e/auth.spec.ts`: 회원가입 → 로그아웃 → 로그인 → 대시보드 도달; 미인증 접근 → 로그인으로 리다이렉트.

## 9. 신규 의존성

- `bcryptjs` + `@types/bcryptjs` — 비밀번호 해싱(순수 JS)
- `zod` — 입력 검증

모두 순수 JS라 pnpm `allowBuilds` 추가 불필요.

## 10. 결정 로그

- 가입 모델: **셀프서비스** — 회원가입이 Agency + admin User 동시 생성 (멀티테넌트 온보딩 MVP)
- 비밀번호 해싱: **bcryptjs** (네이티브 빌드 회피)
- 세션: **opaque 랜덤 토큰 + DB tokenHash**, httpOnly 쿠키, 30일 (상위 스펙 Session 모델에 `tokenHash` 추가)
- 보호 방식: **서버 레이아웃 가드** (Edge 미들웨어 회피 — Prisma 비호환)
- 인증 액션: **Next 서버 액션** (별도 API 라우트 없음)
- UI: 템플릿 기존 `(auth)/login`·`register` 재사용
- Git: 단계 0 PR #1 머지 후 `stage-1-auth`를 main에서 분기
