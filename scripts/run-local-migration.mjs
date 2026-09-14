import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const loaded = dotenv.config({ path: ".env.migration", override: true, quiet: true });
if (loaded.error || !process.env.DATABASE_URL) {
  throw new Error(".env.migration with DATABASE_URL is required");
}

const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
