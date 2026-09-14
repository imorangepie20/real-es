#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
secrets_dir="$repo_root/infra/secrets"
files="compose.env database.env migration.env app.env tunnel.env"

fail() {
  printf 'secret preflight 실패: %s\n' "$1" >&2
  exit 1
}

mode_of() {
  stat -c '%a' "$1"
}

value_of() {
  file=$1
  key=$2
  count=$(awk -F= -v key="$key" '$1 == key { count++ } END { print count + 0 }' "$file")
  [ "$count" -eq 1 ] || fail "$(basename "$file")의 $key 항목 수가 1이 아닙니다"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$file"
}

require_value() {
  file=$1
  key=$2
  value=$(value_of "$file" "$key")
  [ -n "$value" ] || fail "$(basename "$file")의 $key 값이 비어 있습니다"
  case "$value" in
    *REPLACE_*|*CHANGE_ME*) fail "$(basename "$file")의 $key가 자리표시자입니다" ;;
  esac
}

[ -d "$secrets_dir" ] || fail "infra/secrets 디렉터리가 없습니다"
[ "$(mode_of "$secrets_dir")" = "700" ] || fail "infra/secrets 권한은 700이어야 합니다"

for name in $files; do
  path="$secrets_dir/$name"
  [ -f "$path" ] || fail "$name 파일이 없습니다"
  [ "$(mode_of "$path")" = "600" ] || fail "$name 권한은 600이어야 합니다"
done

compose="$secrets_dir/compose.env"
database="$secrets_dir/database.env"
migration="$secrets_dir/migration.env"
app="$secrets_dir/app.env"
tunnel="$secrets_dir/tunnel.env"

[ "$(value_of "$compose" COMPOSE_PROJECT_NAME)" = "real-es" ] || fail "COMPOSE_PROJECT_NAME은 real-es여야 합니다"
require_value "$compose" APP_VERSION

[ "$(value_of "$database" POSTGRES_DB)" = "real_es" ] || fail "POSTGRES_DB는 real_es여야 합니다"
[ "$(value_of "$database" POSTGRES_USER)" = "real_es_bootstrap" ] || fail "POSTGRES_USER는 real_es_bootstrap이어야 합니다"
[ "$(value_of "$database" REAL_ES_MIGRATION_USER)" = "real_es_migrator" ] || fail "REAL_ES_MIGRATION_USER는 real_es_migrator여야 합니다"
[ "$(value_of "$database" REAL_ES_APP_USER)" = "real_es_app" ] || fail "REAL_ES_APP_USER는 real_es_app이어야 합니다"
require_value "$database" POSTGRES_PASSWORD
require_value "$database" REAL_ES_MIGRATION_PASSWORD
require_value "$database" REAL_ES_APP_PASSWORD
bootstrap_password=$(value_of "$database" POSTGRES_PASSWORD)
migration_password=$(value_of "$database" REAL_ES_MIGRATION_PASSWORD)
application_password=$(value_of "$database" REAL_ES_APP_PASSWORD)
[ "$bootstrap_password" != "$migration_password" ] &&
  [ "$bootstrap_password" != "$application_password" ] &&
  [ "$migration_password" != "$application_password" ] || fail "DB 역할 비밀번호는 모두 달라야 합니다"

require_value "$migration" DATABASE_URL
[ "$(value_of "$migration" DATABASE_URL)" = "postgresql://real_es_migrator:${migration_password}@postgres:5432/real_es?schema=public" ] || fail "migration DATABASE_URL이 database.env와 일치하지 않습니다"

[ "$(value_of "$app" NODE_ENV)" = "production" ] || fail "NODE_ENV는 production이어야 합니다"
[ "$(value_of "$app" HOSTNAME)" = "0.0.0.0" ] || fail "HOSTNAME은 0.0.0.0이어야 합니다"
[ "$(value_of "$app" PORT)" = "3103" ] || fail "PORT는 3103이어야 합니다"
require_value "$app" DATABASE_URL
[ "$(value_of "$app" DATABASE_URL)" = "postgresql://real_es_app:${application_password}@postgres:5432/real_es?schema=public" ] || fail "app DATABASE_URL이 database.env와 일치하지 않습니다"
require_value "$app" VWORLD_API_KEY
require_value "$app" PUBLIC_DATA_API_KEY
require_value "$app" NEXT_PUBLIC_KAKAO_MAP_KEY
require_value "$tunnel" TUNNEL_TOKEN

printf 'secret preflight 통과: 파일 5개, 권한 및 계약 확인 완료\n'
