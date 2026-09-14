# Windows·Zorin·Cloudflare 배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `real-es`를 Windows에서 검증 가능한 개발환경으로 구성하고, Zorin OS의 충돌 없는 `3103` 포트에 독립 Docker Compose 스택으로 배포해 `https://resm.approid.team`으로 제공한다.

**Architecture:** Windows에서는 기존 `property-manager-postgres` 컨테이너 안에 전용 DB·역할만 추가한다. Zorin에서는 PostgreSQL, Next.js+Playwright 앱, Cloudflare Tunnel을 `real-es` 전용 network·volume·secret으로 격리하고 migration과 법정동 seed는 일회성 Compose 서비스로 실행한다.

**Tech Stack:** Node.js 24.19.0, pnpm lockfile v9, Next.js 16.2.7 standalone, Prisma 6.19.3, PostgreSQL 16, Playwright 1.60.0 Chromium, Docker Compose, Cloudflare Tunnel

**Spec:** `docs/superpowers/specs/2026-09-14-windows-zorin-cloudflare-deployment-design.md`

## Global Constraints

- 구현 전에 설치된 `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`, `01-app/02-guides/self-hosting.md`, `01-app/02-guides/environment-variables.md`, `01-app/03-api-reference/05-config/01-next-config-js/output.md`를 끝까지 읽는다.
- Zorin host port는 `127.0.0.1:3103`만 새로 사용한다. 기존 `3001`, `3100`, `3101`, `3102`, `3200`과 기존 컨테이너를 변경하지 않는다.
- Compose project, network, volume, DB·역할, Tunnel token은 `real-es` 전용으로 만든다.
- PostgreSQL과 비밀값은 호스트·Git·Docker image layer·로그에 노출하지 않는다.
- Playwright package와 Docker browser image는 모두 정확히 `1.60.0`으로 맞춘다.
- 회원 승인 기능은 추가하지 않는다. 첫 가입자가 `superadmin`이 되는 현재 동작을 유지한다.
- destructive 명령, `docker compose down -v`, 기존 DB·volume 삭제는 금지한다.
- 각 commit 단계는 초안 제안일 뿐이다. 저장소 규칙에 따라 사용자 승인 후에만 commit하고, push는 사용자가 명시적으로 요청한 경우에만 수행한다.

---

### Task 1: 도구 버전 고정과 Next.js 16 배포 계약 확인

**Files:**
- Modify: `package.json`
- Read: `pnpm-lock.yaml`
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`
- Read: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Read: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`

**Interfaces:**
- Consumes: Node.js `v24.19.0`, Corepack, `pnpm-lock.yaml` lockfile v9
- Produces: exact `packageManager` pin and verified Next.js 16 deployment assumptions used by Tasks 3–7

- [ ] **Step 1: Record the clean baseline**

Run:

```powershell
git status --short --branch
node --version
corepack --version
docker version --format '{{.Client.Version}}|{{.Server.Version}}'
docker compose version
```

Expected: Git에는 승인된 spec·plan 문서만 untracked이고 Node는 `v24.19.0`, Docker client/server가 모두 응답한다.

- [ ] **Step 2: Pin pnpm through Corepack**

Run:

```powershell
corepack use pnpm@latest-10
corepack pnpm --version
```

Expected: `package.json`에 Corepack이 exact `packageManager` 값을 기록하고 pnpm major는 `10`이다. lockfile은 불필요하게 다시 생성하지 않는다.

- [ ] **Step 3: Install the frozen dependency graph**

Run:

```powershell
corepack pnpm install --frozen-lockfile
```

Expected: lockfile 변경 없이 설치가 성공하고 `node_modules/next/dist/docs/`가 생성된다.

- [ ] **Step 4: Install the matching local Chromium**

Run:

```powershell
corepack pnpm exec playwright install chromium
```

Expected: Playwright `1.60.0`이 기대하는 Chromium executable이 설치되고 `chromium.launch({ headless: true })`가 성공한다.

- [ ] **Step 5: Read the repository-owned Next.js guides**

위 `Files`에 적은 네 문서를 현재 설치된 16.2.7 package에서 읽고 다음을 확인한다.

```text
output: "standalone"
.next/standalone/server.js
.next/static 별도 복사
PORT와 HOSTNAME runtime 환경변수
NEXT_PUBLIC_ 변수의 build/runtime 동작
reverse proxy와 rolling deployment 주의사항
```

Expected: Task 3의 Dockerfile이 현재 버전 문서와 모순되지 않는다. 모순이 있으면 코드를 쓰기 전에 plan과 spec을 먼저 수정한다.

- [ ] **Step 6: Run the DB-independent baseline gates**

Run:

```powershell
corepack pnpm test:unit
corepack pnpm lint
```

Expected: 기존 단위 테스트와 lint가 통과한다. 기존 실패가 있으면 배포 변경과 섞지 않고 증거를 기록해 중단한다.

---

### Task 2: Windows 전용 PostgreSQL 프로비저닝

**Files:**
- Create: `scripts/provision-local-db.mjs`
- Create: `scripts/run-local-migration.mjs`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: Docker container `property-manager-postgres`, host `127.0.0.1:5432`
- Produces: DB `real_es`, roles `real_es_migrator`·`real_es_app`, ignored `.env`·`.env.migration`, scripts `db:provision`·`db:migrate`

- [ ] **Step 1: Verify the precondition fails before provisioning exists**

Run:

```powershell
corepack pnpm db:provision
```

Expected: FAIL because `db:provision` is not defined. 이 실패가 새 진입점의 필요성을 증명한다.

- [ ] **Step 2: Implement collision-safe local provisioning**

`scripts/provision-local-db.mjs`는 `B2B-STM/scripts/provision-local-db.mjs` 구조를 따르며 다음 계약을 정확히 구현한다.

```js
const container = "property-manager-postgres";
const database = "real_es";
const migrationRole = "real_es_migrator";
const applicationRole = "real_es_app";
```

스크립트는 다음 순서를 지킨다.

1. `.env` 또는 `.env.migration`이 존재하면 mutation 전에 거부한다.
2. `pg_database`와 `pg_roles`에서 세 이름의 충돌을 조회하고 하나라도 있으면 거부한다.
3. `randomBytes(32).toString("hex")`로 서로 다른 두 비밀번호를 만든다.
4. mutation 전에 `.env`에는 application URL과 빈 API key 세 개를, `.env.migration`에는 migration URL을 `flag: "wx"`로 저장한다.
5. migration owner와 application role을 `NOSUPERUSER NOCREATEDB NOCREATEROLE`로 만들고 DB owner는 migration role로 지정한다.
6. `PUBLIC` 권한을 회수하고 application role에 `CONNECT`, schema `USAGE`, future table DML, sequence 사용 권한만 준다.
7. SQL·URL·비밀번호와 Docker stderr를 출력하지 않는다.

`.env`의 key 이름은 다음과 같다.

```dotenv
DATABASE_URL=postgresql://real_es_app:${applicationPassword}@127.0.0.1:5432/real_es?schema=public
VWORLD_API_KEY=
PUBLIC_DATA_API_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
```

- [ ] **Step 3: Add a migration wrapper and package scripts**

`scripts/run-local-migration.mjs`는 `dotenv.config({ path: ".env.migration", override: true })`로 migration URL을 읽고 아래 명령을 `stdio: "inherit"`로 실행한다.

```js
const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
spawnSync(executable, ["exec", "prisma", "migrate", "deploy"], {
  env: process.env,
  stdio: "inherit",
});
```

실패 status를 그대로 process exit code로 반환한다. `package.json`에는 다음 scripts를 추가한다.

```json
{
  "db:provision": "node scripts/provision-local-db.mjs",
  "db:migrate": "node scripts/run-local-migration.mjs",
  "db:seed:legal": "node --env-file=.env scripts/seed-legal-divisions.mjs"
}
```

- [ ] **Step 4: Expand the public environment contract**

`.env.example`은 실제 값 없이 다음 key를 모두 설명한다.

```dotenv
DATABASE_URL="postgresql://real_es_app:CHANGE_ME@127.0.0.1:5432/real_es?schema=public"
VWORLD_API_KEY="CHANGE_ME"
PUBLIC_DATA_API_KEY="CHANGE_ME"
NEXT_PUBLIC_KAKAO_MAP_KEY="CHANGE_ME"
```

- [ ] **Step 5: Provision and migrate the local DB twice**

Run:

```powershell
corepack pnpm db:provision
corepack pnpm db:migrate
corepack pnpm db:migrate
corepack pnpm prisma generate
```

Expected: 첫 migration에서 저장소 migration이 모두 적용되고 두 번째 실행은 pending migration 0개다. 프로비저닝 재실행은 기존 secret/DB 충돌 때문에 안전하게 실패한다.

- [ ] **Step 6: Verify runtime privilege and DB health**

application URL로 `SELECT 1`과 Prisma 조회는 성공하고 `CREATE TABLE`은 권한 오류로 실패해야 한다. 그 뒤 앱을 시작해 health를 확인한다.

```powershell
corepack pnpm build
corepack pnpm start
curl.exe --fail --max-time 10 http://127.0.0.1:3001/api/health
```

Expected: health JSON은 `{"ok":true}`이고 HTTP 200이다. 검증 후 시작한 앱 프로세스만 종료한다.

---

### Task 3: Next.js standalone·Playwright production image

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: Next.js 16 deployment contract from Task 1, Playwright package `1.60.0`
- Produces: non-root `real-es-app` runtime target serving `0.0.0.0:3103` with matching Chromium, plus `real-es-tools` target for migration and legal seed

- [ ] **Step 1: Prove the production container is not yet buildable**

Run:

```powershell
docker build --tag real-es-app:plan-check .
```

Expected: FAIL because the repository has no `Dockerfile`.

- [ ] **Step 2: Enable standalone output**

Preserve the existing origin settings and add only the documented setting.

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["resm.approid.team"],
  experimental: {
    serverActions: {
      allowedOrigins: ["resm.approid.team"],
    },
  },
};
```

- [ ] **Step 3: Add the Playwright-aware multi-stage Dockerfile**

Use `mcr.microsoft.com/playwright:v1.60.0-noble` so the browser version exactly matches `pnpm-lock.yaml`. A shared dependency stage runs Corepack and frozen install, and the build stage runs `pnpm prisma generate` and `pnpm build`.

Create two final targets:

- `tools`: full `node_modules`, `prisma/`, `scripts/`, `package.json`, `pnpm-lock.yaml`; used only for `prisma migrate deploy` and `seed-legal-divisions.mjs`.
- `runtime`: `.next/standalone`, `.next/static`, `public`; used only by the long-running app and contains the traced `playwright` package while using the browser already present in the base image.

The runtime target runs as the image-provided `pwuser` with:

```dockerfile
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3103
EXPOSE 3103
CMD ["node", "server.js"]
```

Do not bake real `DATABASE_URL` or API keys into either stage. Use only a syntactically valid non-routable build URL if Next.js build validation requires one.

- [ ] **Step 4: Add Chromium container hardening**

The collector only visits the fixed Naver origins declared in `src/lib/naver/fetch.ts`; it does not accept an arbitrary browser URL. Keep the image-provided non-root `pwuser` and make Task 5 Compose run the app with `init: true` and `ipc: host`. Do not add `SYS_ADMIN`, privileged mode, or an unconfined seccomp profile.

- [ ] **Step 5: Exclude secrets and local artifacts**

`.dockerignore` must include at least:

```dockerignore
.git
.env
.env.*
!.env.example
node_modules
.next
coverage
playwright-report
test-results
*.log
infra/secrets/*.env
infra/runtime/*
```

- [ ] **Step 6: Build and smoke the image with a disposable network**

Run the image build, inspect that it runs as a non-root user, and start it only against the dedicated local `real_es` DB. Verify `/api/health`, then execute one controlled `withNaverSession` smoke to prove the Chromium executable launches. Remove only the disposable smoke container and network created by this step.

Expected: app health HTTP 200, Chromium launch exits normally, no secret appears in `docker history` or container logs.

---

### Task 4: Zorin secrets and PostgreSQL role initialization

**Files:**
- Create: `infra/secrets/compose.env.example`
- Create: `infra/secrets/database.env.example`
- Create: `infra/secrets/migration.env.example`
- Create: `infra/secrets/app.env.example`
- Create: `infra/secrets/tunnel.env.example`
- Create: `infra/postgres/init/10-application-role.sh`
- Create: `infra/scripts/initialize-secrets.mjs`
- Create: `infra/scripts/check-secrets.sh`
- Create: `infra/scripts/set-tunnel-token.sh`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Linux filesystem, PostgreSQL official entrypoint variables, user-supplied external API keys and Tunnel token
- Produces: mode-600 deployment env files and least-privilege `real_es_app` role

- [ ] **Step 1: Create placeholder-only examples**

Examples must define these exact contracts.

```dotenv
# compose.env.example
COMPOSE_PROJECT_NAME=real-es
APP_VERSION=local

# database.env.example
POSTGRES_DB=real_es
POSTGRES_USER=real_es_bootstrap
POSTGRES_PASSWORD=REPLACE_WITH_BOOTSTRAP_RANDOM_HEX
REAL_ES_MIGRATION_USER=real_es_migrator
REAL_ES_MIGRATION_PASSWORD=REPLACE_WITH_MIGRATION_RANDOM_HEX
REAL_ES_APP_USER=real_es_app
REAL_ES_APP_PASSWORD=REPLACE_WITH_APP_RANDOM_HEX

# migration.env.example
DATABASE_URL=postgresql://real_es_migrator:REPLACE_URL_ENCODED@postgres:5432/real_es?schema=public

# app.env.example
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3103
DATABASE_URL=postgresql://real_es_app:REPLACE_URL_ENCODED@postgres:5432/real_es?schema=public
VWORLD_API_KEY=REPLACE_WITH_KEY
PUBLIC_DATA_API_KEY=REPLACE_WITH_KEY
NEXT_PUBLIC_KAKAO_MAP_KEY=REPLACE_WITH_KEY

# tunnel.env.example
TUNNEL_TOKEN=REPLACE_WITH_REAL_ES_TUNNEL_TOKEN
```

- [ ] **Step 2: Implement no-overwrite secret initialization**

`initialize-secrets.mjs` requires `--confirm-new-real-es` and Linux. It creates `infra/secrets` mode `700`, refuses if any target `.env` exists, generates three distinct 32-byte hex DB passwords, writes all files mode `600`, and leaves external API keys and `TUNNEL_TOKEN` empty. It prints only file names and the fact that user input remains.

- [ ] **Step 3: Implement strict secret preflight**

`check-secrets.sh` verifies directory `700`, files `600`, every required key non-empty, no `REPLACE_`, exact project/DB/role names, `NODE_ENV=production`, port `3103`, and URLs targeting `postgres:5432/real_es`. It must never print values.

- [ ] **Step 4: Implement hidden Tunnel token input**

`set-tunnel-token.sh` follows the B2B reference: require interactive terminal, hidden `read -s`, accept either a Cloudflare Docker command containing `--token` or a token of at least 100 allowed characters, refuse replacement, write mode `600`, unset shell variables, never echo the token.

- [ ] **Step 5: Create the application DB role**

`10-application-role.sh` accepts only `real_es_bootstrap` as the official image bootstrap superuser, creates `real_es_migrator` and `real_es_app` as non-superusers, transfers DB ownership to the migrator, grants the app 최소 DML 권한, then changes bootstrap to `NOLOGIN`.

- [ ] **Step 6: Verify examples fail and initialized test secrets pass**

On a disposable Linux temp directory, `check-secrets.sh` against examples must fail on placeholders. Run initialization into a disposable copy, supply syntactically valid fake external values, verify mode and preflight success, then verify a second initialization refuses overwrite. Delete only that disposable temp directory.

---

### Task 5: 충돌 없는 Zorin Compose와 배포 검증 스크립트

**Files:**
- Create: `infra/compose.zorin.yml`
- Create: `infra/scripts/verify-deployment.sh`
- Create: `docs/zorin-deployment-runbook.md`

**Interfaces:**
- Consumes: image from Task 3, secrets and init script from Task 4
- Produces: services `postgres`, `app`, `tunnel`, `migrate`, `seed-legal-divisions`; host port `127.0.0.1:3103`

- [ ] **Step 1: Prove the Compose contract does not yet exist**

Run:

```powershell
docker compose -p real-es -f infra/compose.zorin.yml config --quiet
```

Expected: FAIL because the Compose file is absent.

- [ ] **Step 2: Implement the isolated Compose topology**

Create services with these exact boundaries.

```yaml
services:
  postgres:
    restart: unless-stopped
    env_file: ./secrets/database.env
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    networks: [backend]

  app:
    restart: unless-stopped
    env_file: ./secrets/app.env
    ports: ["127.0.0.1:3103:3103"]
    depends_on:
      postgres: { condition: service_healthy }
    init: true
    ipc: host
    user: pwuser
    networks: [frontend, backend]

  tunnel:
    profiles: [tunnel]
    restart: unless-stopped
    env_file: ./secrets/tunnel.env
    command: tunnel --no-autoupdate run
    depends_on:
      app: { condition: service_healthy }
    networks: [frontend]

  migrate:
    image: real-es-tools:${APP_VERSION:-local}
    build: { context: "..", target: tools }
    profiles: [tools]
    env_file: ./secrets/migration.env
    command: ["node", "node_modules/prisma/build/index.js", "migrate", "deploy"]
    networks: [backend]

  seed-legal-divisions:
    image: real-es-tools:${APP_VERSION:-local}
    build: { context: "..", target: tools }
    profiles: [tools]
    env_file: ./secrets/app.env
    command: ["node", "scripts/seed-legal-divisions.mjs"]
    networks: [backend, egress]
```

`backend`은 `internal: true`, `frontend`과 `egress`는 별도 named network다. `postgres-data`는 explicit `real-es-postgres-data` 이름을 사용한다. app healthcheck는 `http://127.0.0.1:3103/api/health`, PostgreSQL은 `pg_isready`를 사용한다. 모든 서비스에 Docker `local` logging `10m × 3`을 적용한다.

- [ ] **Step 3: Pin verified official image digests**

Zorin architecture에서 `postgres:16.15-alpine`과 `cloudflare/cloudflared:latest`를 pull한다. `docker image inspect --format '{{index .RepoDigests 0}}'` 결과를 Compose에 기록해 tag-only 참조를 제거한다. Playwright base는 package와 같은 `v1.60.0-noble`을 유지한다.

- [ ] **Step 4: Implement deterministic verification**

`verify-deployment.sh`는 다음 URL을 `curl --location --fail --max-time 10 --retry 2`로 검사하고 label·HTTP status·최종 URL만 출력한다.

```text
local app     http://127.0.0.1:3103/
local health  http://127.0.0.1:3103/api/health
public app    https://resm.approid.team/
public health https://resm.approid.team/api/health
```

- [ ] **Step 5: Write the exact operator runbook**

`docs/zorin-deployment-runbook.md`에는 read-only preflight, clone/update, secret 입력, digest pin, build, DB start, migration twice, legal seed, app start, Tunnel setup, external verification, log inspection, rollback을 실제 명령으로 기록한다. `3103` 충돌 시 중단하고 다른 포트를 자동 선택하지 않는다고 명시한다.

- [ ] **Step 6: Validate Compose without starting production services**

Run:

```bash
infra/scripts/check-secrets.sh
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml config --quiet
```

Expected: 실제 secret 구조와 Compose interpolation이 유효하고 host binding은 `127.0.0.1:3103` 하나뿐이다.

---

### Task 6: 전체 로컬 회귀 검증과 문서 동기화

**Files:**
- Modify: `README.md` (`현재 반영 상태`)
- Modify: `docs/PROJECT_GUIDE.md` (`현재 참고 상태`에 해당하는 상태 목록)
- Test: `src/**/*.test.ts`
- Test: `e2e/health.spec.ts`
- Test: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–5 전체 산출물
- Produces: 배포 가능한 검증 commit 후보와 최신 운영 문서

- [ ] **Step 1: Run static and unit gates**

Run:

```powershell
corepack pnpm test:unit
corepack pnpm lint
corepack pnpm build
git diff --check
```

Expected: 모두 exit 0.

- [ ] **Step 2: Run production health and focused E2E**

Start the production server on local port `3001`, then run:

```powershell
curl.exe --fail --max-time 10 http://127.0.0.1:3001/api/health
corepack pnpm exec playwright test e2e/health.spec.ts e2e/auth.spec.ts
```

Expected: health HTTP 200, 신규 회원가입·로그인·보호 경로 E2E 통과. 테스트가 만든 사용자 데이터는 오직 `real_es` 개발 DB에 존재한다.

- [ ] **Step 3: Run the local container smoke**

Build the final image, start a disposable app instance against local `real_es`, verify health and Chromium launch, then remove only that instance. Inspect image history and logs for `DATABASE_URL`, API key, Tunnel token leakage.

- [ ] **Step 4: Update user-visible state documents**

`README.md` §`현재 반영 상태`와 `docs/PROJECT_GUIDE.md`의 현재 상태 목록에 다음 사용자 효과를 한두 줄로 기록한다.

```text
Windows 개발환경 프로비저닝과 Zorin 전용 Docker Compose 배포 구성을 추가했다. real-es는 기존 서비스와 격리된 127.0.0.1:3103, 독립 PostgreSQL volume, Playwright Chromium runtime, 전용 Cloudflare Tunnel을 사용한다.
```

실제 Zorin/Tunnel 검증 전에는 “배포 완료”라고 쓰지 않는다.

- [ ] **Step 5: Review the complete diff**

Run:

```powershell
git status --short
git diff --stat
git diff --check
git diff -- . ':(exclude)pnpm-lock.yaml'
```

Expected: 모든 변경 줄이 배포 목적과 직접 연결되고 실제 secret이나 기존 사용자 변경이 없다.

- [ ] **Step 6: Propose the implementation commit**

Draft:

```text
feat(deploy): add isolated Zorin Cloudflare stack
```

사용자에게 변경 파일과 검증 결과를 보여주고 “이대로 commit 할까요?”를 묻는다. 제안 끝에는 반드시 다음 줄을 붙인다.

```text
문서 갱신: README §현재 반영 상태 + PROJECT_GUIDE §현재 참고 상태
```

---

### Task 7: Zorin 배포와 Cloudflare Tunnel 연결

**Files:**
- Follow: `docs/zorin-deployment-runbook.md`
- Verify: `infra/scripts/verify-deployment.sh`
- Update after evidence: `README.md`
- Update after evidence: `docs/PROJECT_GUIDE.md`

**Interfaces:**
- Consumes: user-approved commit, explicit push authorization, API keys, dedicated Tunnel token
- Produces: `https://resm.approid.team` production service on Zorin `127.0.0.1:3103`

- [ ] **Step 1: Obtain the required deployment authorities**

사용자 승인 후 implementation commit을 만들고, 사용자가 명시적으로 push를 요청한 뒤에만 `origin/main`으로 push한다. Zorin 배포 SHA는 push된 SHA와 정확히 일치해야 한다.

- [ ] **Step 2: Re-run Zorin collision and capacity preflight**

Run through SSH:

```bash
df -h
free -h
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -H -lnt 'sport = :3103'
docker network inspect real-es-frontend real-es-backend real-es-egress
docker volume inspect real-es-postgres-data
test ! -e ~/apps/real-es || test -z "$(git -C ~/apps/real-es status --short)"
```

Expected: `3103` is unused and an existing target directory is either absent or clean. 최초 배포에서는 같은 이름의 network/volume이 하나라도 있으면 stale resource로 보고 중단한다. 업데이트 배포에서만 `com.docker.compose.project=real-es` label이 있는 기존 resource를 재사용한다. 부족 자원, dirty tree, 이름 충돌이 있으면 중단한다.

- [ ] **Step 3: Clone the approved SHA and initialize secrets**

Clone/update `~/apps/real-es`, record `git rev-parse HEAD`, run `initialize-secrets.mjs --confirm-new-real-es`, then supply `VWORLD_API_KEY`, `PUBLIC_DATA_API_KEY`, `NEXT_PUBLIC_KAKAO_MAP_KEY` without echo. Use `set-tunnel-token.sh` for the dedicated `real-es-zorin` token and run secret preflight.

- [ ] **Step 4: Build and initialize the empty production DB**

Run the exact runbook commands to build `app`, start `postgres`, wait healthy, execute `migrate` twice, and execute `seed-legal-divisions`. Query only aggregate counts to confirm migrations and `LegalDivision` rows; never print credentials.

- [ ] **Step 5: Start and verify the app before public exposure**

Start `app`, verify `http://127.0.0.1:3103/` and `/api/health`, inspect health and logs, and run a controlled Naver Chromium collection smoke. Confirm existing `alpha-momega`, `b2b-stm`, and `sdtpl-adm` containers remain in their preflight state. Tunnel 시작 전 SSH port forwarding으로 첫 운영자 계정을 생성하고 단일 `superadmin`인지 확인한다.

- [ ] **Step 6: Connect the dedicated named Tunnel**

In Cloudflare, create or verify `real-es-zorin` and route `resm.approid.team` to `http://app:3103`. If the hostname or DNS already targets a different tunnel, stop and report rather than overwrite. Start only the `tunnel` profile.

- [ ] **Step 7: Verify external behavior**

Run `infra/scripts/verify-deployment.sh`, then verify in a real browser:

```text
anonymous /real-estate redirects to /login
the pre-publication first account reaches superadmin settings
a second test account can register and log in immediately
Kakao map renders
VWorld legal divisions exist
one low-volume Naver collection succeeds
one public-data query succeeds
```

Delete only the second test account through the application's supported admin flow if the user approves that cleanup.

- [ ] **Step 8: Verify operations and record evidence**

Inspect Compose status, healthchecks, `local` log driver `10m × 3`, recent logs for secret leakage, and current host port bindings. Update README and PROJECT_GUIDE from “배포 구성” to “배포 검증 완료” only for checks that actually passed.

- [ ] **Step 9: Treat reboot verification as a separate destructive checkpoint**

Do not reboot automatically. Explain that reboot affects all services and request fresh approval. If approved, reboot Zorin and verify all pre-existing services plus `real-es` recover before declaring automatic restart proven.
