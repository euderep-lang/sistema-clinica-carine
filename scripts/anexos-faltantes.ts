/**
 * Relatório: compara os anexos de um ZIP (prontuarios_anexos/<Paciente>/<arquivo>)
 * com os já existentes no ClinicOS (evolution_attachments) e lista o que falta por paciente.
 *
 * Uso:
 *   bun run scripts/anexos-faltantes.ts <lista.txt>   (lista = saída de `unzip -Z1 arquivo.zip`)
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const dbUrl = `postgresql://postgres.${process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple"}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD ?? "")}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`;

function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function score(folderNorm: string, patientNorm: string): number {
  const a = folderNorm.split(" ").filter((t) => t.length > 2);
  const b = patientNorm.split(" ").filter((t) => t.length > 2);
  if (!a.length || !b.length || a[0] !== b[0]) return 0;
  let overlap = 0;
  for (const t of a) if (b.includes(t)) overlap++;
  let s = overlap * 10;
  if (a[a.length - 1] === b[b.length - 1]) s += 15;
  if (folderNorm === patientNorm) s += 100;
  return s;
}

function fileDate(name: string): string {
  let m = name.match(/^(\d{4}-\d{2}-\d{2})_/);
  if (m) return m[1];
  m = name.match(/^(\d{4})(\d{2})(\d{2})_/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "??";
}

async function main() {
  const listPath = process.argv[2];
  if (!listPath) {
    console.error("Uso: bun run scripts/anexos-faltantes.ts <lista.txt>");
    process.exit(1);
  }
  const lines = readFileSync(listPath, "utf8").split(/\r?\n/).filter(Boolean);

  const byFolder = new Map<string, string[]>();
  for (const line of lines) {
    const parts = line.split("/");
    if (parts.length < 3) continue; // espera prontuarios_anexos/<paciente>/<arquivo>
    const folder = parts[parts.length - 2];
    const file = parts[parts.length - 1];
    if (!file) continue;
    const list = byFolder.get(folder) ?? [];
    list.push(file);
    byFolder.set(folder, list);
  }

  const sql = postgres(dbUrl, { ssl: "require", max: 1, connect_timeout: 20 });
  const patients = await sql<{ id: string; full_name: string }[]>`
    SELECT id, full_name FROM public.patients WHERE tenant_id=${TENANT_ID}`;
  const all = patients.map((p) => ({ id: p.id, full_name: p.full_name, norm: norm(p.full_name) }));
  const exact = new Map(all.map((p) => [p.norm, p]));

  const matchFolder = (folder: string) => {
    const n = norm(folder);
    if (exact.has(n)) return exact.get(n)!;
    const scored = all.map((p) => ({ p, s: score(n, p.norm) })).filter((x) => x.s >= 35).sort((a, b) => b.s - a.s);
    if (!scored.length) return null;
    if (scored.length === 1 || scored[0].s - scored[1].s >= 10) return scored[0].p;
    return null;
  };

  let totalZip = 0, totalPresent = 0, totalMissing = 0;
  const unmatched: { folder: string; n: number }[] = [];
  const perPatient: { name: string; zip: number; present: number; missing: string[] }[] = [];

  for (const [folder, files] of byFolder) {
    totalZip += files.length;
    const m = matchFolder(folder);
    if (!m) {
      unmatched.push({ folder, n: files.length });
      continue;
    }
    const existing = await sql<{ file_name: string }[]>`
      SELECT file_name FROM public.evolution_attachments WHERE patient_id=${m.id}`;
    const have = new Set(existing.map((e) => e.file_name));
    const missing = files.filter((f) => !have.has(f));
    totalPresent += files.length - missing.length;
    totalMissing += missing.length;
    perPatient.push({ name: m.full_name, zip: files.length, present: files.length - missing.length, missing });
  }

  perPatient.sort((a, b) => b.missing.length - a.missing.length || a.name.localeCompare(b.name));

  console.log("================ ANEXOS: FALTANTES POR PACIENTE ================\n");
  console.log(`Pastas no ZIP: ${byFolder.size} | Anexos no ZIP: ${totalZip}`);
  console.log(`Já no ClinicOS: ${totalPresent} | FALTANDO: ${totalMissing}\n`);

  console.log("--- Faltando por paciente (apenas quem tem pendência) ---");
  for (const p of perPatient) {
    if (p.missing.length === 0) continue;
    const dates = p.missing.map(fileDate);
    const dc: Record<string, number> = {};
    for (const d of dates) dc[d] = (dc[d] ?? 0) + 1;
    const dstr = Object.entries(dc).sort().map(([d, n]) => `${d}(${n})`).join(", ");
    console.log(`  • ${p.name}: ${p.missing.length} de ${p.zip}  → ${dstr}`);
  }

  const complete = perPatient.filter((p) => p.missing.length === 0);
  console.log(`\n--- Já completos (todos os anexos presentes): ${complete.length} pacientes ---`);
  for (const p of complete) console.log(`  ✓ ${p.name} (${p.zip})`);

  if (unmatched.length) {
    console.log(`\n--- Pastas do ZIP SEM paciente correspondente (${unmatched.length}) ---`);
    for (const u of unmatched.sort((a, b) => b.n - a.n)) console.log(`  ? ${u.folder} (${u.n} anexos)`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
