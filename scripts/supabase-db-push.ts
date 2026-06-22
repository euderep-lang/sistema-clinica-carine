/**
 * `supabase db push` via pooler IPv4 (evita erro de IPv6 em redes sem suporte).
 * Usa SUPABASE_DB_PASSWORD do .env (senha com # precisa de encode na URL).
 *
 * Uso: bun run db:push
 *      bun run db:push -- --dry-run
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

function loadEnvFile() {
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

loadEnvFile();

const PROJECT_REF = process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DB_PASSWORD && !DATABASE_URL) {
  console.error("Defina SUPABASE_DB_PASSWORD ou DATABASE_URL no .env");
  process.exit(1);
}

const dbUrl = DATABASE_URL?.startsWith("postgres")
  ? DATABASE_URL
  : `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD!)}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`;

const extraArgs = process.argv.slice(2);
const result = spawnSync("supabase", ["db", "push", "--db-url", dbUrl, ...extraArgs], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
