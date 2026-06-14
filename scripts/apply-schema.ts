/**
 * Aplica todas as migrations no Supabase remoto via conexão Postgres.
 * Requer SUPABASE_DB_PASSWORD (senha do banco, não a service role key).
 *
 * Onde achar: Dashboard → Project Settings → Database → Database password
 * (use "Reset database password" se não lembrar)
 *
 * Uso:
 *   SUPABASE_DB_PASSWORD='sua-senha' bun run scripts/apply-schema.ts
 */
import postgres from "postgres";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
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
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD ?? process.env.DATABASE_URL;

if (!DB_PASSWORD) {
  console.error(
    "Defina SUPABASE_DB_PASSWORD ou DATABASE_URL no arquivo .env.\n" +
      "Senha do Postgres: Dashboard → Settings → Database → Database password\n" +
      "https://supabase.com/dashboard/project/jglzghujpxbakqqmmple/settings/database",
  );
  process.exit(1);
}

const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");

async function connect() {
  const enc = encodeURIComponent(DB_PASSWORD!.startsWith("postgres") ? "" : DB_PASSWORD!);
  const candidates = DB_PASSWORD!.startsWith("postgres")
    ? [DB_PASSWORD!]
    : [
        `postgresql://postgres.${PROJECT_REF}:${enc}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`,
        `postgresql://postgres.${PROJECT_REF}:${enc}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`,
      ];

  let lastErr: unknown;
  for (const url of candidates) {
    const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 10 });
    try {
      await sql`select 1 as ok`;
      return sql;
    } catch (err) {
      lastErr = err;
      await sql.end({ timeout: 1 }).catch(() => {});
    }
  }
  throw lastErr;
}

async function main() {
  const sql = await connect();

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Conectado. Aplicando ${files.length} migrations…`);

  for (const file of files) {
    const content = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`  → ${file}… `);
    try {
      await sql.unsafe(content);
      console.log("ok");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate key") ||
        msg.includes("does not exist, skipping") ||
        msg.includes("is not unique") ||
        /function public\.\w+\(\) does not exist/.test(msg) ||
        /relation "public\.\w+" already exists/.test(msg)
      ) {
        console.log("já aplicado");
        continue;
      }
      console.log("erro");
      throw err;
    }
  }

  await sql.end();
  console.log("Schema aplicado com sucesso.");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("Falha:", msg);
  if (msg.includes("password authentication failed")) {
    console.error(
      "\nA senha não foi aceita. No painel Supabase:\n" +
        "  Settings → Database → Connection string → URI (Session pooler)\n" +
        "Copie a URI inteira e rode:\n" +
        "  DATABASE_URL='postgresql://...' bun run db:schema\n" +
        "Ou cole supabase/apply-all.sql no SQL Editor e avise para rodar o seed.",
    );
  }
  process.exit(1);
});
