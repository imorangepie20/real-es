import { randomBytes } from "node:crypto";
import { chmod, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "linux") {
  console.error("이 스크립트는 Zorin/Linux 배포 호스트에서만 실행할 수 있습니다.");
  process.exit(1);
}

if (process.argv.length !== 3 || process.argv[2] !== "--confirm-new-real-es") {
  console.error("사용법: node infra/scripts/initialize-secrets.mjs --confirm-new-real-es");
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const secretsDir = resolve(repoRoot, "infra/secrets");
const targets = ["compose.env", "database.env", "migration.env", "app.env", "tunnel.env"];

await mkdir(secretsDir, { recursive: true, mode: 0o700 });
await chmod(secretsDir, 0o700);

for (const target of targets) {
  try {
    await stat(resolve(secretsDir, target));
    console.error(`비밀 파일이 이미 있습니다: ${target}. 기존 파일은 덮어쓰지 않습니다.`);
    process.exit(1);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const bootstrapPassword = randomBytes(32).toString("hex");
let migrationPassword = randomBytes(32).toString("hex");
while (migrationPassword === bootstrapPassword) {
  migrationPassword = randomBytes(32).toString("hex");
}
let applicationPassword = randomBytes(32).toString("hex");
while (applicationPassword === bootstrapPassword || applicationPassword === migrationPassword) {
  applicationPassword = randomBytes(32).toString("hex");
}

const contents = new Map([
  ["compose.env", "COMPOSE_PROJECT_NAME=real-es\nAPP_VERSION=local\n"],
  [
    "database.env",
    [
      "POSTGRES_DB=real_es",
      "POSTGRES_USER=real_es_bootstrap",
      `POSTGRES_PASSWORD=${bootstrapPassword}`,
      "REAL_ES_MIGRATION_USER=real_es_migrator",
      `REAL_ES_MIGRATION_PASSWORD=${migrationPassword}`,
      "REAL_ES_APP_USER=real_es_app",
      `REAL_ES_APP_PASSWORD=${applicationPassword}`,
      "",
    ].join("\n"),
  ],
  [
    "migration.env",
    `DATABASE_URL=postgresql://real_es_migrator:${migrationPassword}@postgres:5432/real_es?schema=public\n`,
  ],
  [
    "app.env",
    [
      "NODE_ENV=production",
      "HOSTNAME=0.0.0.0",
      "PORT=3103",
      `DATABASE_URL=postgresql://real_es_app:${applicationPassword}@postgres:5432/real_es?schema=public`,
      "VWORLD_API_KEY=",
      "PUBLIC_DATA_API_KEY=",
      "NEXT_PUBLIC_KAKAO_MAP_KEY=",
      "",
    ].join("\n"),
  ],
  ["tunnel.env", "TUNNEL_TOKEN=\n"],
]);

const created = [];
try {
  for (const target of targets) {
    await writeFile(resolve(secretsDir, target), contents.get(target), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    created.push(target);
  }
} catch (error) {
  await Promise.all(created.map((target) => unlink(resolve(secretsDir, target)).catch(() => {})));
  console.error(`비밀 파일 생성에 실패했습니다: ${error.code ?? "unknown"}`);
  process.exit(1);
}

console.log(`생성 완료: ${targets.join(", ")}`);
console.log("app.env의 외부 API 키와 tunnel.env의 토큰을 입력해야 합니다.");
