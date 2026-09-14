import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const container = "property-manager-postgres";
const database = "real_es";
const migrationRole = "real_es_migrator";
const applicationRole = "real_es_app";
const envPath = new URL("../.env", import.meta.url);
const migrationEnvPath = new URL("../.env.migration", import.meta.url);

if (existsSync(envPath) || existsSync(migrationEnvPath)) {
  throw new Error(".env or .env.migration already exists; provisioning refused");
}

function sql(statement, targetDatabase) {
  const command = targetDatabase
    ? `exec psql -U "$POSTGRES_USER" -d ${targetDatabase} -At -v ON_ERROR_STOP=1`
    : "exec psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -At -v ON_ERROR_STOP=1";
  const result = spawnSync("docker", ["exec", "-i", container, "sh", "-c", command], {
    input: statement,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Database provisioning command failed; inspect target state before retrying");
  }
  return result.stdout.trim();
}

const collision = sql(`
SELECT datname FROM pg_database WHERE datname = '${database}';
SELECT rolname FROM pg_roles WHERE rolname IN ('${migrationRole}', '${applicationRole}');
`);
if (collision) {
  throw new Error("Target database or role already exists; provisioning refused");
}

const migrationPassword = randomBytes(32).toString("hex");
const applicationPassword = randomBytes(32).toString("hex");

writeFileSync(
  envPath,
  [
    `DATABASE_URL="postgresql://${applicationRole}:${applicationPassword}@127.0.0.1:5432/${database}?schema=public"`,
    'VWORLD_API_KEY=""',
    'PUBLIC_DATA_API_KEY=""',
    'NEXT_PUBLIC_KAKAO_MAP_KEY=""',
    "",
  ].join("\n"),
  { flag: "wx", mode: 0o600 },
);
writeFileSync(
  migrationEnvPath,
  `DATABASE_URL="postgresql://${migrationRole}:${migrationPassword}@127.0.0.1:5432/${database}?schema=public"\n`,
  { flag: "wx", mode: 0o600 },
);

sql(`
CREATE ROLE ${migrationRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${migrationPassword}';
CREATE ROLE ${applicationRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${applicationPassword}';
CREATE DATABASE ${database} OWNER ${migrationRole};
REVOKE ALL ON DATABASE ${database} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${database} TO ${applicationRole};
`);

sql(
  `
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO ${migrationRole};
GRANT USAGE ON SCHEMA public TO ${applicationRole};
ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${applicationRole};
ALTER DEFAULT PRIVILEGES FOR ROLE ${migrationRole} IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${applicationRole};
`,
  database,
);

console.log(`Created ${database} with separate migration and application roles`);
