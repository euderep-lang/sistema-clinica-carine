/**
 * Importa pacientes de planilha Excel (.xlsx) para a tabela patients.
 *
 * Uso:
 *   bun run scripts/import-patients-xlsx.ts /caminho/cadastro_pacientes.xlsx
 *   bun run scripts/import-patients-xlsx.ts /caminho/arquivo.xlsx --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Row = {
  Nome: string;
  Celular: string;
  "Data de Nascimento": string;
  Sexo: string;
  CPF: string;
};

function requireEnv(label: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável obrigatória ausente: ${label}`);
  return value;
}

function parseXlsx(path: string) {
  const wb = XLSX.readFile(path);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function normalizeCpf(raw: string): string | null {
  const d = onlyDigits(raw);
  if (!d) return null;
  const padded = d.padStart(11, "0").slice(-11);
  return padded.length === 11 ? padded : null;
}

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = onlyDigits(trimmed);
    if (!digits.startsWith("55")) return `+${digits}`;
  }
  let d = onlyDigits(trimmed);
  if (!d) return null;
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length < 10) return d || null;
  if (d.length === 10) {
    return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return d.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function parseBirthDate(raw: string): string | null {
  const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
}

function normalizeGender(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith("f")) return "Feminino";
  if (v.startsWith("m")) return "Masculino";
  return raw.trim();
}

async function main() {
  const filePath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!filePath) {
    console.error("Uso: bun run scripts/import-patients-xlsx.ts <arquivo.xlsx> [--dry-run]");
    process.exit(1);
  }

  const rows = parseXlsx(filePath);
  console.log(`Planilha: ${rows.length} pacientes encontrados`);

  if (dryRun) {
    for (const r of rows.slice(0, 5)) {
      console.log({
        full_name: r.Nome,
        phone: normalizePhone(r.Celular),
        birth_date: parseBirthDate(r["Data de Nascimento"]),
        gender: normalizeGender(r.Sexo),
        cpf: normalizeCpf(r.CPF),
      });
    }
    console.log("... (dry-run, nada inserido)");
    return;
  }

  const supabase = createClient(requireEnv("SUPABASE_URL", NEW_URL), requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: loadErr } = await supabase
    .from("patients")
    .select("id, cpf, phone, full_name")
    .eq("tenant_id", TENANT_ID);
  if (loadErr) throw loadErr;

  const byCpf = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const p of existing ?? []) {
    if (p.cpf) byCpf.set(onlyDigits(p.cpf), p.id);
    if (p.phone) byPhone.set(onlyDigits(p.phone), p.id);
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const nome = row.Nome?.trim();
    if (!nome) continue;

    const cpf = normalizeCpf(row.CPF);
    const phone = normalizePhone(row.Celular);
    const cpfKey = cpf ? onlyDigits(cpf) : "";
    const phoneKey = phone ? onlyDigits(phone) : "";

    if (cpfKey && byCpf.has(cpfKey)) {
      skipped++;
      continue;
    }
    if (phoneKey && byPhone.has(phoneKey)) {
      skipped++;
      continue;
    }

    const payload = {
      tenant_id: TENANT_ID,
      full_name: nome,
      cpf,
      phone,
      birth_date: parseBirthDate(row["Data de Nascimento"]),
      gender: normalizeGender(row.Sexo),
      active: true,
    };

    const { data, error } = await supabase.from("patients").insert(payload).select("id, cpf, phone").single();
    if (error) {
      errors.push(`${nome}: ${error.message}`);
      continue;
    }
    inserted++;
    if (data.cpf) byCpf.set(onlyDigits(data.cpf), data.id);
    if (data.phone) byPhone.set(onlyDigits(data.phone), data.id);
  }

  console.log(`Importação concluída: ${inserted} inseridos, ${skipped} ignorados (duplicados)`);
  if (errors.length) {
    console.log(`Erros (${errors.length}):`);
    for (const e of errors.slice(0, 20)) console.log(" -", e);
    if (errors.length > 20) console.log(` ... e mais ${errors.length - 20}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
