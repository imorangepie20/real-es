# 단계 0: DB + Prisma 셋업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** real-es를 기존 `mrms-pg` PostgreSQL 컨테이너의 `real_es` DB에 Prisma로 연결하고, 앱을 3001 포트로 띄워 DB 연결 상태를 확인할 수 있는 기반을 만든다 (네이버 수집 MVP의 단계 0).

**Architecture:** 새 컨테이너를 띄우지 않고 이미 떠 있는 `mrms-pg`(pgvector/pg16, 호스트 5433)에 `real_es` 데이터베이스만 추가한다. Prisma로 스키마/마이그레이션을 관리하고, client는 싱글톤으로 감싸 Next dev 핫리로드 커넥션 누수를 막는다. `/api/health` 라우트가 DB ping으로 연결을 검증한다.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Prisma 6 · PostgreSQL(mrms-pg, pg16) · Playwright(e2e) · pnpm

## Global Constraints

- 스택: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/Base UI + pnpm (변경 금지)
- **앱 포트는 3001** — 3000은 my-forever-music 웹앱이 점유
- **DB는 기존 `mrms-pg` 컨테이너의 새 DB `real_es`** — 새 postgres 컨테이너/도커컴포즈를 만들지 않는다
  - 접속: `localhost:5433`, user `mrms`, db `real_es`, password는 `mrms-pg`의 `POSTGRES_PASSWORD` env에서 가져온다
- 멀티테넌트: `Agency`가 모든 테넌트 데이터의 루트 (단계 0에선 `Agency` 모델만 둔다)
- `User`/`Session`/`Complex`/`Article`/`Watchlist` 등 나머지 모델은 후속 단계에서 추가 — 단계 0에 넣지 않는다
- 차곡차곡: 각 Task의 끝은 독립적으로 실행·검증 가능한 산출물이어야 한다
- 설계 출처: `docs/superpowers/specs/2026-06-23-naver-collection-design.md`

---

## File Structure

- Modify `package.json` — `dev`/`start` 스크립트에 `-p 3001`
- Modify `playwright.config.ts` — `baseURL`/`webServer`를 3001로
- Create `.env` — `DATABASE_URL` (gitignore 대상, 커밋 안 함)
- Create `.env.example` — `DATABASE_URL` 템플릿 (커밋)
- Create `prisma/schema.prisma` — generator/datasource + `Agency` 모델
- (자동 생성) `prisma/migrations/**` — 첫 마이그레이션
- Create `src/lib/db.ts` — `PrismaClient` 싱글톤 (`db` export)
- Create `src/app/api/health/route.ts` — DB ping 헬스체크 (`GET`)
- Create `e2e/health.spec.ts` — health 라우트 e2e

> docker-compose.yml은 만들지 않는다 (기존 컨테이너 재사용).

---

## Task 1: 앱 포트를 3001로 설정

**Files:**
- Modify: `package.json` (scripts)
- Modify: `playwright.config.ts`

**Interfaces:**
- Produces: 앱이 `http://localhost:3001`에서 기동. e2e가 3001을 baseURL로 사용.

- [ ] **Step 1: `package.json` scripts 수정**

`dev`와 `start`에 포트를 박는다 (나머지 스크립트는 그대로):
```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start -p 3001",
  "lint": "eslint",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 2: `playwright.config.ts` 수정**

`baseURL`, `webServer.url`을 3001로, `webServer.command`에서 `-p 3000`을 제거(이제 `start` 스크립트가 3001):
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 3: dev 서버가 3001에서 뜨는지 확인 (이 Task의 테스트)**

```bash
cd /opt/real-es
nohup pnpm dev > /tmp/reales-dev.log 2>&1 &
echo $! > /tmp/reales-dev.pid
curl -sf --retry 40 --retry-delay 1 --retry-connrefused -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/
kill "$(cat /tmp/reales-dev.pid)"
```
Expected: `HTTP 307` (루트가 `/dashboard/default`로 리다이렉트) 또는 `200`

- [ ] **Step 4: Commit**

```bash
cd /opt/real-es
git add package.json playwright.config.ts
git commit -m "chore: 앱 포트 3001로 변경 (3000은 my-forever-music 점유)"
```

---

## Task 2: mrms-pg에 real_es DB 생성 + .env

**Files:**
- Create: `.env.example` (커밋)
- Create: `.env` (gitignore — 커밋 안 함)

**Interfaces:**
- Consumes: 기동 중인 `mrms-pg` 컨테이너
- Produces: `mrms-pg` 안의 `real_es` 데이터베이스, `DATABASE_URL` 환경변수

- [ ] **Step 1: real_es 데이터베이스 생성**

```bash
docker exec mrms-pg psql -U mrms -c "CREATE DATABASE real_es;"
```
Expected: `CREATE DATABASE`

- [ ] **Step 2: `.env.example` 작성 (커밋됨)**

```
DATABASE_URL="postgresql://mrms:CHANGE_ME@localhost:5433/real_es?schema=public"
```

- [ ] **Step 3: `.env` 작성 (password를 mrms-pg env에서 동적 추출)**

```bash
cd /opt/real-es
PW=$(docker inspect mrms-pg --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')
printf 'DATABASE_URL="postgresql://mrms:%s@localhost:5433/real_es?schema=public"\n' "$PW" > .env
```
> 주의: password에 `@ : / ? # %` 같은 문자가 있으면 URL 인코딩이 필요하다. 생성된 `.env`로 Step 4 연결이 실패하면 password를 percent-encode 할 것.

- [ ] **Step 4: real_es 접속 확인 (이 Task의 테스트)**

```bash
docker exec mrms-pg psql -U mrms -d real_es -tc "select 'real_es ok'"
```
Expected: `real_es ok`

- [ ] **Step 5: Commit (`.env.example`만)**

```bash
cd /opt/real-es
git add .env.example
git status   # .env가 목록에 없어야 한다 (.gitignore 처리됨)
git commit -m "feat(db): mrms-pg에 real_es DB + .env.example"
```
> `.env`가 `git status`에 보이면 커밋하지 말 것 — `.gitignore`에 `.env`가 있는지 확인.

---

## Task 3: Prisma 셋업 + Agency 스키마 + 첫 마이그레이션 + client 싱글톤

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Modify: `package.json`, `pnpm-lock.yaml` (pnpm이 자동 수정)

**Interfaces:**
- Consumes: `DATABASE_URL` (Task 2), `real_es` DB
- Produces:
  - `db: PrismaClient` — `src/lib/db.ts`의 named export
  - `real_es` DB에 `Agency` 테이블 (`id`, `name`, `createdAt`)

- [ ] **Step 1: Prisma 설치**

```bash
cd /opt/real-es
pnpm add -D prisma
pnpm add @prisma/client
```
Expected: `package.json`에 `prisma`(devDependencies), `@prisma/client`(dependencies) 추가

- [ ] **Step 2: `prisma/schema.prisma` 작성**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agency {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: 첫 마이그레이션 실행**

```bash
cd /opt/real-es && pnpm prisma migrate dev --name init_agency
```
Expected: `prisma/migrations/<timestamp>_init_agency/` 생성, `Your database is now in sync with your schema.`, Prisma Client 생성됨

- [ ] **Step 4: `src/lib/db.ts` 싱글톤 작성**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: 마이그레이션 상태 확인 (이 Task의 테스트)**

```bash
cd /opt/real-es && pnpm prisma migrate status
```
Expected: `Database schema is up to date!`

- [ ] **Step 6: Commit**

```bash
cd /opt/real-es
git add prisma package.json pnpm-lock.yaml src/lib/db.ts
git commit -m "feat(db): Prisma + Agency 스키마, 첫 마이그레이션, client 싱글톤"
```

---

## Task 4: `/api/health` 라우트 + e2e

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `e2e/health.spec.ts`

**Interfaces:**
- Consumes: `db` (Task 3의 `src/lib/db.ts`)
- Produces: `GET /api/health` → `200 {"ok":true}` (DB 연결 시) / `500 {"ok":false}` (실패 시)

- [ ] **Step 1: 실패하는 e2e 테스트 작성**

`e2e/health.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("GET /api/health returns ok when DB is reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /opt/real-es && pnpm exec playwright test e2e/health.spec.ts
```
Expected: FAIL — `/api/health`가 없어 404 (status 200 기대와 불일치)

- [ ] **Step 3: `src/app/api/health/route.ts` 구현**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // 매 요청 DB ping — 정적 prerender 금지

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd /opt/real-es && pnpm exec playwright test e2e/health.spec.ts
```
Expected: PASS (webServer가 `pnpm build && pnpm start`로 3001에 prod 서버를 띄운 뒤 200 `{ok:true}` 반환)

- [ ] **Step 5: Commit**

```bash
cd /opt/real-es
git add src/app/api/health/route.ts e2e/health.spec.ts
git commit -m "feat(db): /api/health DB ping 라우트 + e2e"
```

---

## 단계 0 완료 기준 (Definition of Done)

- 앱이 3001 포트에서 기동
- `mrms-pg`의 `real_es` DB에 `Agency` 테이블 존재, `pnpm prisma migrate status`가 up to date
- `pnpm exec playwright test e2e/health.spec.ts` 통과 → **DB에 연결되는 앱** 확인
- 다음 단계 1(인증)에서 이 `Agency` 위에 `User`/`Session`을 얹는다

---

## Self-Review

**1. Spec coverage:** 단계 0(스펙 §8)의 "PostgreSQL + Prisma + 첫 마이그레이션 → DB에 연결되는 앱"을 Task 2(real_es DB) · Task 3(Prisma+마이그레이션) · Task 4(연결 검증)가 커버. 앱 포트 변경(Task 1)은 운영 제약(3000 점유) 반영. `Agency` 모델은 스펙 §4 테넌트 루트와 일치. ✓

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드·명령·기대 출력 명시. `.env` password는 동적 추출 명령으로 처리(노출 없음). ✓

**3. Type consistency:** `db`(PrismaClient 싱글톤, Task 3) → Task 4에서 `import { db }`로 동일 사용. `Agency` 필드(`id/name/createdAt`)는 스펙 §4와 동일. 포트 3001은 package.json/playwright.config/e2e 전반에서 일관. ✓
