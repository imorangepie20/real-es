#!/bin/sh
set -eu

[ "${POSTGRES_DB:-}" = "real_es" ] || {
  printf 'POSTGRES_DB는 real_es여야 합니다.\n' >&2
  exit 1
}
[ "${POSTGRES_USER:-}" = "real_es_bootstrap" ] || {
  printf 'POSTGRES_USER는 real_es_bootstrap이어야 합니다.\n' >&2
  exit 1
}
[ "${REAL_ES_MIGRATION_USER:-}" = "real_es_migrator" ] || {
  printf 'REAL_ES_MIGRATION_USER는 real_es_migrator여야 합니다.\n' >&2
  exit 1
}
[ "${REAL_ES_APP_USER:-}" = "real_es_app" ] || {
  printf 'REAL_ES_APP_USER는 real_es_app이어야 합니다.\n' >&2
  exit 1
}
[ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${REAL_ES_MIGRATION_PASSWORD:-}" ] && [ -n "${REAL_ES_APP_PASSWORD:-}" ] || {
  printf 'DB 역할 비밀번호가 비어 있습니다.\n' >&2
  exit 1
}
[ "$POSTGRES_PASSWORD" != "$REAL_ES_MIGRATION_PASSWORD" ] &&
  [ "$POSTGRES_PASSWORD" != "$REAL_ES_APP_PASSWORD" ] &&
  [ "$REAL_ES_MIGRATION_PASSWORD" != "$REAL_ES_APP_PASSWORD" ] || {
  printf 'DB 역할 비밀번호는 모두 달라야 합니다.\n' >&2
  exit 1
}

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$REAL_ES_APP_USER" \
  --set=app_password="$REAL_ES_APP_PASSWORD" \
  --set=db_name="$POSTGRES_DB" \
  --set=bootstrap_user="$POSTGRES_USER" \
  --set=migration_user="$REAL_ES_MIGRATION_USER" \
  --set=migration_password="$REAL_ES_MIGRATION_PASSWORD" <<-'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
  :'migration_user',
  :'migration_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_user') \gexec

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
  :'app_user',
  :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

ALTER DATABASE :"db_name" OWNER TO :"migration_user";
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO :"migration_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER ROLE :"bootstrap_user" NOLOGIN;
SQL
