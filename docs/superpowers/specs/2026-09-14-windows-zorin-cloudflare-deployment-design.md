# Windows 개발환경·Zorin OS·Cloudflare Tunnel 배포 설계

작성일: 2026-09-14
상태: 구현 및 로컬 검증 완료, 실제 배포 대기

## 목적과 범위

`real-es`를 현재 Windows PC에서 개발·검증할 수 있도록 구성한 뒤, 기존 `B2B-STM`과 같은 Zorin OS 서버에 독립 Docker Compose 스택으로 배포하고 `https://resm.approid.team`에서 제공한다.

이번 범위는 다음을 포함한다.

- Windows의 Node.js 24·pnpm·PostgreSQL 개발환경 구성
- 의존성 설치, Prisma migration, 법정동 seed, 단위 테스트와 production build 검증
- Zorin용 Next.js production image와 Docker Compose 구성
- 독립 PostgreSQL, migration·seed 일회성 서비스, 전용 Cloudflare Tunnel
- 비밀값 초기화·검사, healthcheck, 자동 재시작, 로그 순환
- 로컬·Zorin 내부·외부 HTTPS 검증과 애플리케이션 롤백 절차

회원가입 후 관리자 승인 기능, 기존 데이터 이전, 자동 무중단 배포, 별도 백업 서버 구축은 이번 범위에서 제외한다. 현재 회원가입 동작은 유지하므로 가입 즉시 서비스를 이용할 수 있다.

## 확인된 제약

Zorin 서버 `approid@192.168.219.174`의 실제 리스닝 포트를 확인한 결과 `3001`, `3100`, `3101`, `3102`, `3200`이 기존 서비스에서 사용 중이다. 기존 컨테이너·포트·network·volume·Tunnel은 변경하지 않는다.

Windows에서는 Docker Desktop의 `property-manager-postgres`가 `127.0.0.1:5432`를 사용 중이다. 이 컨테이너는 로컬 개발에만 재사용하며 `real_es` 전용 database와 역할을 새로 만든다. 다른 database와 역할은 읽거나 변경하지 않는다.

## 배포 토폴로지

Zorin의 서버 경로는 `~/apps/real-es`, Compose project 이름은 `real-es`로 고정한다.

| 서비스 | 역할 | 접근 범위 |
| --- | --- | --- |
| `postgres` | `real_es` 운영 DB | Compose network 내부 `5432` 전용 |
| `app` | Next.js production 서버 | 내부·호스트 `3103`, 호스트는 `127.0.0.1:3103`만 바인딩 |
| `tunnel` | 전용 Cloudflare Tunnel connector | 호스트 포트 없음 |
| `migrate` | `prisma migrate deploy` | 명시적으로 실행하는 일회성 서비스 |
| `seed-legal-divisions` | VWorld 법정동 초기 적재 | 명시적으로 실행하는 일회성 서비스 |

공개 요청 흐름은 `resm.approid.team -> Cloudflare Tunnel -> app:3103`이다. PostgreSQL은 호스트와 외부에 공개하지 않는다. `app`과 `tunnel`은 동일한 전용 frontend network를 사용하고, DB 통신은 전용 backend network로 제한한다.

모든 장기 실행 서비스는 `restart: unless-stopped`를 사용한다. PostgreSQL healthcheck 통과 후 앱을 시작하고, 앱의 `GET /api/health`가 HTTP 200을 반환한 뒤 Tunnel을 정상 상태로 판단한다.

## Windows 개발환경

Node.js는 현재 설치된 24.19.0을 사용한다. pnpm은 Corepack을 통해 lockfile과 호환되는 버전으로 고정하며 전역 임의 버전 설치를 피한다.

로컬 DB는 기존 `property-manager-postgres` 안에 다음 자원을 새로 만든다.

- database: `real_es`
- migration owner: `real_es_migrator`
- application role: `real_es_app`

프로비저닝은 기존 `.env`나 DB·역할이 하나라도 있으면 덮어쓰지 않고 중단한다. 비밀번호는 안전한 난수로 생성하고 실제 연결 문자열은 Git에서 제외된 `.env`에만 저장한다. application 역할은 DML만 수행하고 migration은 owner 역할로 실행한다.

설정 순서는 pnpm 준비, `pnpm install --frozen-lockfile`, DB 프로비저닝, `prisma migrate deploy`, `prisma generate`, 법정동 seed, 단위 테스트, lint, production build 순서다. 현재 테스트가 기대하는 인증·DB 조건을 먼저 확인하고 테스트 데이터가 운영 또는 다른 프로젝트 DB를 가리키지 않도록 한다.

## 컨테이너 이미지와 Compose

Next.js는 Playwright 1.60.0과 같은 버전의 Chromium이 포함된 Node.js 기반 multi-stage Dockerfile로 빌드한다. build 단계에서 frozen lockfile로 의존성을 설치하고 Prisma Client와 production build를 생성한다. `runtime` target에는 실행에 필요한 standalone 결과만 두고 비권한 Playwright 사용자로 실행한다. 별도 `tools` target에는 Prisma CLI·schema·migration과 법정동 seed script를 두며 `migrate`·`seed-legal-divisions` 일회성 서비스에서만 사용한다. Chromium은 코드에 고정된 네이버 origin만 방문하므로 별도 확장 seccomp profile 없이 비권한 사용자·init process·공유 메모리 설정을 적용한다.

가능하면 Next.js `standalone` output을 사용하되, 구현 전에 저장소의 Next.js 16.2.7 문서를 확인해 현재 버전의 정확한 설정과 산출물 경로를 따른다. `.env`, 로그, 테스트 결과, 로컬 산출물과 비밀값은 Docker build context에서 제외한다.

PostgreSQL과 `cloudflared`는 공식 image를 사용한다. 최초 구현·배포 시 현재 Zorin architecture에서 실제 pull·검증한 digest로 고정한다. 모든 장기 서비스 로그는 Docker `local` driver에서 `max-size=10m`, `max-file=3`으로 순환한다.

## DB 권한과 초기 데이터

Zorin 운영 DB는 독립 named volume `real-es-postgres-data`에서 새로 시작한다. 공식 image 초기화용 `real_es_bootstrap` superuser는 역할 생성 후 `NOLOGIN`으로 잠그고, 별도 `real_es_migrator`를 DB owner이자 비-superuser로 만든다. application 역할에는 필요한 DML 권한과 기본 권한만 부여한다.

Prisma schema를 바꾸지 않고 서비스별 환경을 분리한다.

- `app`: application 역할의 `DATABASE_URL`
- `migrate`: migration owner 역할의 `DATABASE_URL`
- `seed-legal-divisions`: application 역할의 `DATABASE_URL`과 `VWORLD_API_KEY`

초기화 순서는 PostgreSQL healthy 확인, migration 실행, migration 재실행 시 추가 적용 0개 확인, 법정동 seed 실행, `LegalDivision` 적재 건수 확인이다. 기존 데이터는 없으므로 dump·restore는 수행하지 않는다.

## 비밀값과 외부 API 키

실제 환경 파일은 Zorin의 `infra/secrets/`에만 두고 디렉터리 권한 `700`, 파일 권한 `600`을 적용한다. 초기화 스크립트는 기존 파일 덮어쓰기를 거부하고 생성한 값을 출력하지 않는다.

- `compose.env`: Compose project와 image version
- `database.env`: 운영 DB, 잠긴 bootstrap 역할, migration 역할, application 역할의 자격증명
- `migration.env`: migration owner의 `DATABASE_URL`
- `app.env`: `NODE_ENV=production`, application `DATABASE_URL`, 지도·공공데이터 API 키
- `tunnel.env`: `real-es` 전용 `TUNNEL_TOKEN`

외부 기능에 필요한 키는 `VWORLD_API_KEY`, `PUBLIC_DATA_API_KEY`, `NEXT_PUBLIC_KAKAO_MAP_KEY`다. 실제 값은 Git, 문서, Docker image layer, 로그에 남기지 않는다. 다른 프로젝트의 키나 Tunnel token을 자동 복사하지 않는다.

Tunnel 이름은 `real-es-zorin`, public hostname은 `resm.approid.team`으로 고정한다. 기존 DNS 또는 hostname route가 있으면 덮어쓰기 전에 중단하고 충돌을 보고한다.

## 회원가입과 최초 관리자

현재 동작대로 외부 회원가입을 공개하고 가입 즉시 session을 발급한다. 운영 DB의 첫 가입자는 자동으로 `superadmin`이 되며, advisory transaction lock으로 최초 관리자 판정을 직렬화한다. 승인 기능은 이번 배포에서 추가하지 않는다.

Tunnel 공개 전 SSH 포트포워딩으로 사용자만 첫 운영자 계정을 생성하고 `superadmin` 접근을 확인한다. 그 전에는 Tunnel을 시작하지 않는다. 향후 후속 작업에서 신규 가입자를 `pending`으로 만들고 관리자가 승인하는 흐름으로 교체한다.

## 배포·검증·롤백

최초 배포는 Zorin SSH session에서 다음 순서로 진행한다.

1. 현재 서버 자원, Docker 상태, `3103` 포트 미사용을 다시 확인한다.
2. `~/apps/real-es`에 저장소를 clone하고 배포 SHA를 기록한다.
3. 서버 전용 비밀값을 생성·입력하고 권한과 필수 key를 검사한다.
4. image를 build하고 PostgreSQL을 시작한다.
5. migration을 두 번 실행하고 법정동 seed를 실행한다.
6. 앱을 시작하고 `http://127.0.0.1:3103/api/health`와 주요 인증 페이지를 확인한다.
7. SSH 포트포워딩으로 첫 운영자 계정을 생성하고 단일 `superadmin`임을 확인한다.
8. Cloudflare에서 `real-es-zorin` named tunnel과 `resm.approid.team -> http://app:3103` public hostname을 구성한다.
9. Tunnel을 시작하고 외부 HTTPS, 회원가입, 로그인, 인증 보호 경로, 지도·수집 기능을 확인한다.

애플리케이션 롤백은 직전 검증 SHA로 돌아가 image를 다시 build하고 `app`만 교체한다. 성공한 DB migration은 자동으로 되돌리지 않는다. `docker compose down -v`는 운영 절차에서 금지해 DB volume 삭제를 막는다.

재부팅 검증은 같은 서버의 기존 서비스에도 영향을 줄 수 있으므로 별도 사용자 승인을 받은 뒤 수행한다.

## 완료 기준

다음 증거가 모두 있어야 배포 완료로 선언한다.

- Windows에서 frozen install, Prisma generate·migration, 단위 테스트, lint, production build 통과
- Windows `GET /api/health` HTTP 200 및 로그인·회원가입 기본 동작 확인
- Zorin에서 `postgres`, `app`, `tunnel` 정상 또는 healthy
- Zorin `127.0.0.1:3103` 외 다른 신규 host port를 사용하지 않음
- `http://127.0.0.1:3103/api/health` HTTP 200
- `https://resm.approid.team`과 `/api/health` HTTP 200
- 사용자가 첫 계정을 생성하고 `superadmin` 접근 확인
- 외부 신규 회원가입과 로그인 확인
- 법정동 데이터 및 Kakao·VWorld·공공데이터 연동 확인
- Docker 로그에 비밀값이 없고 로그 순환 설정이 적용됨
- 기존 `alpha-momega`, `b2b-stm`, `sdtpl-adm` 컨테이너·응답에 변화가 없음
