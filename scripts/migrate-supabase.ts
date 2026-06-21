/**
 * Migra schema + dados do Supabase Lovable → Supabase próprio.
 *
 * Uso:
 *   bun run scripts/migrate-supabase.ts schema   # aplica migrations SQL
 *   bun run scripts/migrate-supabase.ts data     # copia dados (requer OLD + NEW service role)
 *   bun run scripts/migrate-supabase.ts seed     # garante usuário master admin
 *   bun run scripts/migrate-supabase.ts all      # schema → data → seed
 */
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");

const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEW_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://gcuitpaytezzgvismxqg.supabase.co";
const OLD_SERVICE_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const OLD_ANON_KEY =
  process.env.OLD_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdWl0cGF5dGV6emd2aXNteHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDgyNDQsImV4cCI6MjA5NjM4NDI0NH0.vtHK-jBcrsoRxO5uF2NvJ2oRwpvMv_XtifpkI677JHU";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

/** Ordem respeitando FKs (auth.users deve existir antes de profiles). */
const DATA_TABLES = [
  "tenants",
  "tenant_settings",
  "rooms",
  "patients",
  "services",
  "inventory_categories",
  "inventory_items",
  "service_inventory_items",
  "profiles",
  "appointments",
  "medical_records",
  "patient_evolutions",
  "evolution_attachments",
  "prescriptions",
  "prescription_items",
  "budgets",
  "budget_items",
  "consultation_charges",
  "consultation_charge_items",
  "patient_session_packages",
  "session_usages",
  "bills_receivable",
  "bills_payable",
  "commission_closings",
  "inventory_movements",
  "patient_media_history",
  "message_templates",
  "message_logs",
  "professional_digital_certificates",
] as const;

/** Usuário master — único admin com acesso total ao sistema. */
const MASTER_EMAIL = process.env.MASTER_EMAIL ?? "carine@dracarinecassol.com.br";
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
const MASTER_NAME = process.env.MASTER_NAME ?? "Dra. Carine Cassol";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function requireEnv(label: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável obrigatória ausente: ${label}`);
  return value;
}

async function applySchema() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl =
    DATABASE_URL ??
    (dbPassword
      ? `postgresql://postgres.${process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple"}:${encodeURIComponent(dbPassword)}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
      : undefined);

  if (!dbUrl) {
    throw new Error("Defina DATABASE_URL ou SUPABASE_DB_PASSWORD para aplicar o schema.");
  }

  const sql = postgres(dbUrl, { ssl: "require", max: 1, connect_timeout: 15 });

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Aplicando ${files.length} migrations…`);

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
        msg.includes("already member of publication") ||
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

async function fetchAll(client: ReturnType<typeof createClient>, table: string) {
  const pageSize = 1000;
  let from = 0;
  const rows: Record<string, unknown>[] = [];

  while (true) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function copyData() {
  const newUrl = requireEnv("SUPABASE_URL", NEW_URL);
  const newKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY);

  const oldKey = OLD_SERVICE_KEY ?? OLD_ANON_KEY;
  const oldClient = createClient(OLD_URL, oldKey, { auth: { persistSession: false } });
  const newClient = createClient(newUrl, newKey, { auth: { persistSession: false } });

  console.log(`Copiando dados de ${OLD_URL} → ${newUrl}`);

  // Auth users primeiro (profiles referencia auth.users)
  if (OLD_SERVICE_KEY) {
    const { data: list, error } = await oldClient.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    for (const user of list.users) {
      const { data: existing } = await newClient.auth.admin.getUserById(user.id);
      if (existing.user) continue;

      const { error: createErr } = await newClient.auth.admin.createUser({
        id: user.id,
        email: user.email!,
        email_confirm: true,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
      });
      if (createErr && !createErr.message.includes("already")) {
        console.warn(`  auth ${user.email}: ${createErr.message}`);
      } else {
        console.log(`  auth: ${user.email}`);
      }
    }
  } else {
    console.warn("OLD_SUPABASE_SERVICE_ROLE_KEY ausente — pulando cópia de auth.users");
  }

  for (const table of DATA_TABLES) {
    if (table === "profiles") {
      const existingProfiles = await fetchAll(newClient, "profiles");
      if (existingProfiles.length > 0) {
        console.log(`  profiles: ${existingProfiles.length} já existem — pulando cópia`);
        continue;
      }
    }

    const rows = await fetchAll(oldClient, table);
    if (!rows.length) {
      console.log(`  ${table}: vazio`);
      continue;
    }

    const { error } = await newClient.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`${table} insert: ${error.message}`);
    console.log(`  ${table}: ${rows.length} registros`);
  }

  console.log("Cópia de dados concluída.");
}

async function seedUsers() {
  const newUrl = requireEnv("SUPABASE_URL", NEW_URL);
  const newKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY);
  const password = requireEnv("MASTER_PASSWORD", MASTER_PASSWORD);
  const admin = createClient(newUrl, newKey, { auth: { persistSession: false } });

  const email = MASTER_EMAIL.toLowerCase();
  console.log(`Garantindo usuário master admin: ${email}`);

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((x) => x.email?.toLowerCase() === email);

  let userId = found?.id;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: MASTER_NAME },
    });
    if (error) throw error;
    userId = created.user.id;
    console.log("  auth criado");
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) throw error;
    console.log("  auth verificado (senha e cargo não são alterados automaticamente)");
  }

  await admin.from("tenants").update({
    name: "Dra. Carine Cassol",
    slug: "dracarine-cassol",
    email,
  }).eq("id", TENANT_ID);

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: pErr } = await admin.from("profiles").insert({
      id: userId,
      tenant_id: TENANT_ID,
      full_name: MASTER_NAME,
      role: "admin",
      active: true,
    });
    if (pErr) throw pErr;
    console.log("  perfil master criado");
  } else {
    const { error: pErr } = await admin
      .from("profiles")
      .update({
        tenant_id: TENANT_ID,
        active: true,
        full_name: existingProfile.full_name?.trim() ? existingProfile.full_name : MASTER_NAME,
      })
      .eq("id", userId);
    if (pErr) throw pErr;
    console.log("  perfil master mantido (cargo e senha preservados)");
  }

  console.log("Usuário master admin pronto (acesso total).");
}

async function main() {
  const step = process.argv[2] ?? "all";

  switch (step) {
    case "schema":
      await applySchema();
      break;
    case "data":
      await copyData();
      break;
    case "seed":
      await seedUsers();
      break;
    case "all":
      if (DATABASE_URL || process.env.SUPABASE_DB_PASSWORD) await applySchema();
      else console.warn("DATABASE_URL/SUPABASE_DB_PASSWORD ausente — pulando schema (aplique via SQL Editor ou bun run db:schema)");
      if (OLD_SERVICE_KEY || OLD_ANON_KEY) await copyData().catch((e) => console.warn("Cópia de dados:", e.message));
      await seedUsers();
      break;
    default:
      throw new Error(`Passo desconhecido: ${step}. Use: schema | data | seed | all`);
  }
}

main().catch((err) => {
  console.error("\nMigração falhou:", err.message ?? err);
  process.exit(1);
});
