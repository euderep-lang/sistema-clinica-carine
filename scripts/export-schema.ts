/**
 * Exporta o schema completo do Supabase (public) para supabase/migrations/.
 * Requer SUPABASE_DB_PASSWORD ou DATABASE_URL no .env.
 *
 * Uso: bun run scripts/export-schema.ts
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "supabase/migrations");

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
const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

function buildDbUrls(): string[] {
  if (DATABASE_URL) return [DATABASE_URL];
  if (!DB_PASSWORD) return [];
  const enc = encodeURIComponent(DB_PASSWORD);
  return [
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`,
  ];
}

function pgDumpSchema(dbUrl: string): string | null {
  const result = spawnSync(
    "pg_dump",
    [
      dbUrl,
      "--schema-only",
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--format=plain",
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );

  if (result.status !== 0 || !result.stdout?.trim()) return null;
  return result.stdout
    .split("\n")
    .filter((line) => !line.startsWith("\\restrict") && !line.startsWith("\\unrestrict"))
    .join("\n");
}

async function testConnection(url: string) {
  const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 15 });
  try {
    await sql`select 1 as ok`;
    return sql;
  } catch (err) {
    await sql.end({ timeout: 1 }).catch(() => {});
    throw err;
  }
}

function clearOldMigrations() {
  if (!existsSync(OUT_DIR)) return;
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith(".sql")) unlinkSync(join(OUT_DIR, file));
  }
}

async function main() {
  const urls = buildDbUrls();
  if (!urls.length) {
    throw new Error("Defina DATABASE_URL ou SUPABASE_DB_PASSWORD no .env");
  }

  let dump: string | null = null;

  for (const url of urls) {
    try {
      const sql = await testConnection(url);
      await sql.end();
      dump = pgDumpSchema(url);
      if (dump) break;
    } catch {
      continue;
    }
  }

  if (!dump) {
    throw new Error(
      "Não foi possível exportar com pg_dump. Verifique SUPABASE_DB_PASSWORD / DATABASE_URL e se pg_dump está instalado.",
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  clearOldMigrations();

  const header = [
    `-- Exportado de ${PROJECT_REF}`,
    `-- Data: ${new Date().toISOString()}`,
    `-- Gerado por: bun run scripts/export-schema.ts`,
    "",
  ].join("\n");

  const schemaFile = "001_initial_schema.sql";
  writeFileSync(join(OUT_DIR, schemaFile), header + dump + "\n", "utf8");
  console.log(`  ✓ ${schemaFile}`);

  const storageFile = "002_storage_and_seed.sql";
  writeFileSync(
    join(OUT_DIR, storageFile),
    [
      header,
      "-- Buckets de storage referenciados no código",
      "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)",
      "VALUES",
      "  ('patient-documents', 'patient-documents', false, 52428800, null),",
      "  ('prescriptions', 'prescriptions', false, 52428800, ARRAY['application/pdf']),",
      "  ('professional-assets', 'professional-assets', false, 10485760, ARRAY['image/png','image/jpeg','image/webp','application/pdf']),",
      "  ('tenant-assets', 'tenant-assets', false, 10485760, ARRAY['image/png','image/jpeg','image/webp'])",
      "ON CONFLICT (id) DO NOTHING;",
      "",
      "-- Tenant inicial (usuário master vem de bun run db:seed)",
      "INSERT INTO public.tenants (id, name, slug, active)",
      "VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica', 'clinica', true)",
      "ON CONFLICT (id) DO NOTHING;",
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`  ✓ ${storageFile}`);

  const manifest = [schemaFile, storageFile];
  writeFileSync(
    join(ROOT, "supabase/apply-all.sql"),
    [
      "-- Aplique no SQL Editor do Supabase (na ordem) ou use: bun run db:schema",
      ...manifest.map((f, i) => `-- ${i + 1}. supabase/migrations/${f}`),
      "",
      ...manifest.map(
        (f) => `-- Cole o conteúdo de supabase/migrations/${f} abaixo, nesta ordem.`,
      ),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nExportação concluída (${manifest.length} arquivos + supabase/apply-all.sql).`);
}

main().catch((err) => {
  console.error("Exportação falhou:", err instanceof Error ? err.message : err);
  process.exit(1);
});
