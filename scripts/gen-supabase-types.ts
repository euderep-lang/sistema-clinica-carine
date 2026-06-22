/**
 * Regenera src/integrations/supabase/types.ts a partir do schema Postgres.
 * Requer DATABASE_URL ou SUPABASE_DB_PASSWORD no .env.
 *
 * Uso: bun run db:types
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "src/integrations/supabase/types.ts");

function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const projectId = process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple";
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

let dbUrl = databaseUrl;
if (!dbUrl && dbPassword) {
  dbUrl = `postgresql://postgres.${projectId}:${encodeURIComponent(dbPassword)}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`;
}

if (!dbUrl) {
  console.error("Configure DATABASE_URL ou SUPABASE_DB_PASSWORD no .env");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--db-url",
    dbUrl,
    "--schema",
    "public",
  ],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const { writeFileSync } = await import("node:fs");
writeFileSync(OUT, result.stdout, "utf8");
console.log(`✓ Types escritos em ${OUT}`);
