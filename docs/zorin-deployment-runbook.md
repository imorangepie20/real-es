# Zorin OS 배포 운영 절차

`real-es`를 `approid@192.168.219.174`의 `~/apps/real-es`에 독립 Docker Compose 스택으로 배포한다. 호스트에는 `127.0.0.1:3103`만 바인딩하고, 전용 Cloudflare Tunnel `real-es-zorin`에서 `http://app:3103`으로 연결한다.

## 1. 읽기 전용 사전 점검

```bash
ssh approid@192.168.219.174
df -h
free -h
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
if ss -H -lnt 'sport = :3103' | grep -q .; then echo '포트 충돌: 3103' >&2; exit 1; fi
existing_checkout=0
if [ -e ~/apps/real-es ]; then
  existing_checkout=1
  test -z "$(git -C ~/apps/real-es status --porcelain)" || { echo 'dirty checkout: ~/apps/real-es' >&2; exit 1; }
fi

for name in real-es-frontend real-es-backend real-es-egress; do
  if docker network inspect "$name" >/dev/null 2>&1; then
    [ "$existing_checkout" -eq 1 ] || { echo "stale network on first deploy: $name" >&2; exit 1; }
    owner=$(docker network inspect "$name" --format '{{ index .Labels "com.docker.compose.project" }}')
    [ "$owner" = "real-es" ] || { echo "network 충돌: $name ($owner)" >&2; exit 1; }
  fi
done
if docker volume inspect real-es-postgres-data >/dev/null 2>&1; then
  [ "$existing_checkout" -eq 1 ] || { echo 'stale volume on first deploy: real-es-postgres-data' >&2; exit 1; }
  owner=$(docker volume inspect real-es-postgres-data --format '{{ index .Labels "com.docker.compose.project" }}')
  [ "$owner" = "real-es" ] || { echo "volume 충돌: real-es-postgres-data ($owner)" >&2; exit 1; }
fi
```

`3103`이 사용 중이거나 기존 `~/apps/real-es`가 dirty 상태면 중단한다. 다른 포트를 자동 선택하거나 기존 컨테이너를 중지하지 않는다.

## 2. 승인된 소스 준비

최초 배포:

```bash
mkdir -p ~/apps
git clone https://github.com/imorangepie20/real-es.git ~/apps/real-es
cd ~/apps/real-es
git switch main
git pull --ff-only origin main
git rev-parse HEAD
```

업데이트 배포:

```bash
cd ~/apps/real-es
test -z "$(git status --porcelain)"
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
```

출력 SHA가 배포 승인된 Git SHA와 같은지 확인한다.

## 3. 비밀값 초기화와 입력

새 스택에서 한 번만 실행한다.

```bash
node infra/scripts/initialize-secrets.mjs --confirm-new-real-es
```

`infra/secrets/app.env`의 다음 빈 값을 실제 `real-es` 전용 값으로 채운다. 터미널 출력·셸 history·Git에 값이 남지 않는 편집기를 사용한다.

```text
VWORLD_API_KEY=
PUBLIC_DATA_API_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
```

Cloudflare Zero Trust에서 named tunnel `real-es-zorin`을 생성하고 Public Hostname `resm.approid.team`의 서비스가 `http://app:3103`인지 확인한다. 기존 hostname이 다른 tunnel에 연결되어 있으면 덮어쓰지 말고 중단한다. 발급 화면의 토큰 또는 Docker 명령은 다음 대화형 입력으로 저장한다.

```bash
sh infra/scripts/set-tunnel-token.sh
sh infra/scripts/check-secrets.sh
```

입력 스크립트는 초기화기가 만든 정확히 빈 `tunnel.env`만 채운다. 실제 토큰이 이미 있으면 교체하지 않는다.

## 4. 이미지 digest와 Compose 계약 확인

```bash
docker pull postgres:16.15-alpine
docker pull cloudflare/cloudflared:latest
docker image inspect postgres:16.15-alpine --format '{{index .RepoDigests 0}}'
docker image inspect cloudflare/cloudflared:latest --format '{{index .RepoDigests 0}}'
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml config --quiet
```

검증된 digest가 `infra/compose.zorin.yml`의 값과 다르면 실행하지 말고, 변경 원인을 검토한 뒤 별도 코드 변경으로 갱신한다.

## 5. 빌드와 빈 DB 초기화

```bash
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml build app migrate seed-legal-divisions
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml up -d postgres
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml ps
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml --profile tools run --rm migrate
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml --profile tools run --rm migrate
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml --profile tools run --rm seed-legal-divisions
```

두 번째 migration은 `No pending migrations`여야 한다. 법정동 seed 후에는 값 대신 집계만 확인한다.

```bash
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml exec -T postgres \
  sh -c 'PGPASSWORD="$REAL_ES_MIGRATION_PASSWORD" psql -U "$REAL_ES_MIGRATION_USER" -d "$POSTGRES_DB" -tAc '\''select level, count(*) from "LegalDivision" group by level order by level;'\'''
count_ok=$(docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml exec -T postgres \
  sh -c 'PGPASSWORD="$REAL_ES_MIGRATION_PASSWORD" psql -U "$REAL_ES_MIGRATION_USER" -d "$POSTGRES_DB" -tAc '\''select count(*) >= 5000 from "LegalDivision";'\''')
[ "$count_ok" = "t" ]
```

## 6. 앱을 먼저 시작하고 로컬 검증

```bash
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml up -d app
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml ps
curl --fail --max-time 10 http://127.0.0.1:3103/api/health
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml logs --tail 100 app postgres
```

`/api/health`가 HTTP 200과 `{"ok":true}`를 반환해야 한다. 기존 서비스의 컨테이너·포트 상태가 1단계와 같은지도 다시 확인한다.

Tunnel을 시작하기 전에 운영자 PC의 별도 터미널에서 SSH 포트포워딩을 연다.

```bash
ssh -N -L 13103:127.0.0.1:3103 approid@192.168.219.174
```

운영자 PC 브라우저에서 `http://127.0.0.1:13103/register`로 접속해 첫 운영자 계정을 만든다. 이어서 Zorin에서 사용자 수와 역할만 확인한다.

```bash
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml exec -T postgres \
  sh -c 'PGPASSWORD="$REAL_ES_MIGRATION_PASSWORD" psql -U "$REAL_ES_MIGRATION_USER" -d "$POSTGRES_DB" -tAc '\''select role, count(*) from "User" group by role order by role;'\'''
```

출력이 정확히 `superadmin|1`이고 브라우저에서 관리자 설정 접근이 확인된 경우에만 포트포워딩을 종료하고 다음 Tunnel 단계를 진행한다. 계정 수나 역할이 다르면 공개하지 않고 중단한다.

## 7. Tunnel 시작과 외부 검증

```bash
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml --profile tunnel up -d tunnel
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml --profile tunnel ps
sh infra/scripts/verify-deployment.sh
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml logs --tail 100 tunnel app
```

브라우저에서 익명 `/real-estate`가 `/login`으로 이동하는지 확인한다. 첫 운영자 계정은 공개 전에 생성·검증했으므로, 이후 외부 사용자는 가입 직후 `member`로 로그인할 수 있다. 승인 대기 기능은 추후 작업이다.

Kakao 지도, VWorld 법정동, 저용량 Naver 수집 한 건, 공공데이터 조회 한 건을 각각 확인한다. 로그에서 토큰·DB URL·API 키가 보이면 즉시 서비스를 중단하고 해당 비밀값을 폐기·재발급한다.

## 8. 업데이트와 롤백

업데이트 전 현재 SHA를 기록하고 1~7단계를 반복한다. DB migration이 포함된 배포는 스키마 호환성을 먼저 검토한다. 앱 코드만 이전 SHA로 되돌릴 수 있을 때는 명시적인 SHA를 checkout한 뒤 앱 이미지만 재빌드한다.

```bash
cd ~/apps/real-es
git checkout --detach <PREVIOUS_APPROVED_SHA>
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml build app
docker compose --env-file infra/secrets/compose.env -p real-es -f infra/compose.zorin.yml up -d app
curl --fail --max-time 10 http://127.0.0.1:3103/api/health
```

`docker compose down -v`, `docker volume rm`, 기존 서비스 중지·삭제 명령은 사용하지 않는다. 재부팅 검증은 서버의 모든 서비스에 영향을 주므로 별도 승인을 받은 경우에만 수행한다.
