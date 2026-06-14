/**
 * Fluxo completo de setup do banco:
 *   schema (migrations SQL) → data (cópia Lovable, opcional) → seed (usuário master)
 *
 * Uso:
 *   bun run scripts/setup-database.ts
 *   bun run scripts/setup-database.ts --schema-only
 *   bun run scripts/setup-database.ts --seed-only
 *   bun run scripts/setup-database.ts --with-data
 */
import { spawn } from "node:child_process";
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

const args = new Set(process.argv.slice(2));
const schemaOnly = args.has("--schema-only");
const seedOnly = args.has("--seed-only");
const withData = args.has("--with-data");

function hasEnv(name: string, placeholders: string[] = []) {
  const value = process.env[name]?.trim();
  if (!value) return false;
  return !placeholders.some((p) => value.includes(p));
}

function run(step: string, scriptArgs: string[] = []) {
  return new Promise<void>((resolve, reject) => {
    console.log(`\n▶ ${step}`);
    const child = spawn("bun", ["run", ...scriptArgs], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${step} falhou (exit ${code})`));
    });
  });
}

function printChecklist() {
  console.log("Checklist do .env:\n");
  const checks = [
    ["SUPABASE_URL / VITE_SUPABASE_URL", hasEnv("SUPABASE_URL") || hasEnv("VITE_SUPABASE_URL")],
    ["SUPABASE_SERVICE_ROLE_KEY", hasEnv("SUPABASE_SERVICE_ROLE_KEY", ["sua-service-role"])],
    ["SUPABASE_DB_PASSWORD ou DATABASE_URL", hasEnv("SUPABASE_DB_PASSWORD") || hasEnv("DATABASE_URL")],
    ["MASTER_PASSWORD", hasEnv("MASTER_PASSWORD", ["sua-senha-master"])],
    ["OLD_SUPABASE_SERVICE_ROLE_KEY (opcional)", hasEnv("OLD_SUPABASE_SERVICE_ROLE_KEY")],
  ];
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "✓" : "○"} ${label}`);
  }
  console.log("");
}

async function main() {
  printChecklist();

  if (!existsSync(join(ROOT, "supabase/migrations/001_initial_schema.sql"))) {
    console.log("Migrations ausentes — exportando schema do Supabase atual…");
    await run("export-schema", ["scripts/export-schema.ts"]);
  }

  if (seedOnly) {
    await run("seed master", ["scripts/migrate-supabase.ts", "seed"]);
    console.log("\n✓ Seed concluído.");
    return;
  }

  if (!hasEnv("SUPABASE_DB_PASSWORD") && !hasEnv("DATABASE_URL")) {
    console.error(
      "Defina SUPABASE_DB_PASSWORD ou DATABASE_URL para aplicar o schema.\n" +
        "Alternativa: cole supabase/migrations/*.sql no SQL Editor do Supabase e rode:\n" +
        "  bun run db:seed",
    );
    process.exit(1);
  }

  await run("schema", ["scripts/apply-schema.ts"]);

  if (schemaOnly) {
    console.log("\n✓ Schema aplicado. Rode depois: bun run db:seed");
    return;
  }

  if (withData || hasEnv("OLD_SUPABASE_SERVICE_ROLE_KEY")) {
    if (!hasEnv("OLD_SUPABASE_SERVICE_ROLE_KEY")) {
      console.warn("OLD_SUPABASE_SERVICE_ROLE_KEY ausente — pulando cópia de dados.");
    } else {
      await run("cópia de dados", ["scripts/migrate-supabase.ts", "data"]);
    }
  } else {
    console.log("Cópia de dados ignorada (use --with-data ou configure OLD_SUPABASE_SERVICE_ROLE_KEY).");
  }

  if (!hasEnv("MASTER_PASSWORD", ["sua-senha-master"])) {
    console.warn("MASTER_PASSWORD ausente — pulando seed do usuário master.");
    console.log("\n✓ Setup parcial concluído. Configure MASTER_PASSWORD e rode: bun run db:seed");
    return;
  }

  await run("seed master", ["scripts/migrate-supabase.ts", "seed"]);
  console.log("\n✓ Setup do banco concluído.");
}

main().catch((err) => {
  console.error("\nSetup falhou:", err instanceof Error ? err.message : err);
  process.exit(1);
});
