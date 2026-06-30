/**
 * Atualiza/insere evoluções a partir do export "Prontuários Completo" (PDF com data e hora).
 * - Entradas com DD/MM/YYYY HH:MM  -> evoluções (atualiza horário das existentes; adiciona novas)
 * - Entradas com YYYY-MM-DD (sem hora) -> anexos (IGNORADAS, conforme pedido)
 *
 * Uso:
 *   bun run scripts/update-evolucoes-horario.ts <arquivo.pdf>                 (dry-run)
 *   bun run scripts/update-evolucoes-horario.ts <arquivo.pdf> --apply
 *   bun run scripts/update-evolucoes-horario.ts <arquivo.pdf> --apply --add-new[=all|clinical|none]
 */
import postgres from "postgres";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const PROJECT = process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple";
const dbUrl =
  process.env.DATABASE_URL ??
  `postgresql://postgres.${PROJECT}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD ?? "")}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`;

type Entry = { dateIso: string; time: string; text: string };
type Block = { name: string; entries: Entry[] };

const TS = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function extractPdfText(p: string): string {
  return execSync(`npx pdf-parse text "${p.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
}

function cleanLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l))
    .filter((l) => !/^Prontuários · Dra/i.test(l))
    .filter((l) => !/^Página\s+\d+$/i.test(l))
    .filter((l) => !/^Prontuários Médicos/i.test(l))
    .filter((l) => !/^Relatório completo ·/i.test(l));
}

function parse(raw: string, canonical: Set<string>): Block[] {
  const lines = cleanLines(raw);
  const blocks: Block[] = [];
  let current: Block | null = null;
  let curEntry: Entry | null = null;
  let inAttachments = false;

  const flushEntry = () => {
    if (current && curEntry) {
      curEntry.text = curEntry.text.trim();
      if (curEntry.text) current.entries.push(curEntry);
    }
    curEntry = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";

    // Cabeçalho de paciente: nome canônico seguido de um timestamp,
    // e que NÃO seja precedido por um timestamp (evita texto de evolução que é igual a um nome).
    const prev = lines[i - 1] ?? "";
    if (canonical.has(norm(line)) && TS.test(next) && !TS.test(prev)) {
      flushEntry();
      current = { name: line, entries: [] };
      blocks.push(current);
      inAttachments = false;
      continue;
    }

    if (!current) continue;

    const m = line.match(TS);
    if (m) {
      flushEntry();
      curEntry = { dateIso: `${m[3]}-${m[2]}-${m[1]}`, time: `${m[4]}:${m[5]}`, text: "" };
      continue;
    }

    if (ISO.test(line)) {
      // início (ou continuação) da seção de anexos deste paciente
      flushEntry();
      inAttachments = true;
      continue;
    }

    if (inAttachments) continue; // texto de anexo -> ignorar
    if (curEntry) curEntry.text += (curEntry.text ? " " : "") + line;
  }
  flushEntry();
  return blocks;
}

async function main() {
  const pdf = process.argv[2];
  const apply = process.argv.includes("--apply");
  const addArg = process.argv.find((a) => a.startsWith("--add-new"));
  const addMode = addArg ? (addArg.split("=")[1] ?? "clinical") : "none";
  if (!pdf || !existsSync(pdf)) {
    console.error("Uso: bun run scripts/update-evolucoes-horario.ts <arquivo.pdf> [--apply] [--add-new=all|clinical|none]");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: "require", max: 1, connect_timeout: 20 });

  const patients = await sql<{ id: string; full_name: string }[]>`
    SELECT id, full_name FROM public.patients WHERE tenant_id=${TENANT_ID}`;
  const byName = new Map<string, string>();
  const canonical = new Set<string>();
  for (const p of patients) {
    canonical.add(norm(p.full_name));
    byName.set(norm(p.full_name), p.id);
  }

  const blocks = parse(extractPdfText(pdf), canonical);
  const totalEntries = blocks.reduce((n, b) => n + b.entries.length, 0);
  console.log(`Pacientes detectados: ${blocks.length} | evoluções com data/hora: ${totalEntries}`);

  let willUpdateTime = 0;
  let alreadyOk = 0;
  let newClinical = 0;
  let newDoc = 0;
  let inserted = 0;
  let updated = 0;
  const unmatchedPatients: string[] = [];
  const sampleNewClinical: string[] = [];
  const sampleNewDoc: string[] = [];

  // profissional para inserts
  const [pro] = await sql<{ id: string }[]>`
    SELECT id FROM public.profiles WHERE tenant_id=${TENANT_ID} AND role='professional' AND active=true ORDER BY full_name LIMIT 1`;
  const professionalId = process.env.IMPORT_PROFESSIONAL_ID ?? pro?.id;

  for (const block of blocks) {
    const pid = byName.get(norm(block.name));
    if (!pid) {
      unmatchedPatients.push(block.name);
      continue;
    }

    const existing = await sql<{ id: string; date: string; evolution_text: string; created_at: string }[]>`
      SELECT id, date::text AS date, evolution_text, created_at::text AS created_at
      FROM public.patient_evolutions WHERE patient_id=${pid}`;
    const existingByKey = new Map<string, { id: string; created_at: string }>();
    for (const e of existing) {
      const key = `${e.date}|${norm((e.evolution_text ?? "").slice(0, 60))}`;
      if (!existingByKey.has(key)) existingByKey.set(key, { id: e.id, created_at: e.created_at });
    }

    for (const entry of block.entries) {
      const key = `${entry.dateIso}|${norm(entry.text.slice(0, 60))}`;
      const target = `${entry.dateIso} ${entry.time}:00`;
      const hit = existingByKey.get(key);

      if (hit) {
        const cur = hit.created_at.slice(0, 16).replace("T", " ");
        if (cur !== `${entry.dateIso} ${entry.time}`) {
          willUpdateTime++;
          if (apply) {
            await sql`UPDATE public.patient_evolutions
              SET created_at=${target}, updated_at=${target} WHERE id=${hit.id}`;
            updated++;
          }
        } else {
          alreadyOk++;
        }
        continue;
      }

      // Novo (não existe no banco)
      const isClinical = entry.text.length >= 40;
      if (isClinical) {
        newClinical++;
        if (sampleNewClinical.length < 8) sampleNewClinical.push(`${block.name} ${entry.dateIso} ${entry.time}: ${entry.text.slice(0, 70)}`);
      } else {
        newDoc++;
        if (sampleNewDoc.length < 12) sampleNewDoc.push(`${block.name} ${entry.dateIso} ${entry.time}: ${entry.text}`);
      }

      const shouldAdd = addMode === "all" || (addMode === "clinical" && isClinical);
      if (apply && shouldAdd && professionalId) {
        const [mr] = await sql<{ id: string }[]>`
          INSERT INTO public.medical_records (tenant_id, patient_id, professional_id, date, chief_complaint, notes)
          VALUES (${TENANT_ID}, ${pid}, ${professionalId}, ${entry.dateIso}, ${entry.text.slice(0, 500)}, 'Importado do relatório MEDX')
          RETURNING id`;
        await sql`INSERT INTO public.patient_evolutions
          (tenant_id, patient_id, professional_id, medical_record_id, date, evolution_text, created_at, updated_at)
          VALUES (${TENANT_ID}, ${pid}, ${professionalId}, ${mr.id}, ${entry.dateIso}, ${entry.text}, ${target}, ${target})`;
        existingByKey.set(key, { id: mr.id, created_at: `${entry.dateIso}T${entry.time}` });
        inserted++;
      }
    }
  }

  console.log("\n===== RESUMO =====");
  console.log(`Evoluções já existentes com horário a corrigir: ${willUpdateTime}${apply ? ` (atualizadas: ${updated})` : ""}`);
  console.log(`Evoluções já existentes com horário já correto: ${alreadyOk}`);
  console.log(`Novas (texto clínico, >=40 chars): ${newClinical}`);
  console.log(`Novas (curtas/documentos, <40 chars): ${newDoc}`);
  if (apply) console.log(`Inseridas nesta execução (modo --add-new=${addMode}): ${inserted}`);
  if (unmatchedPatients.length) {
    console.log(`\nPacientes não casados (${unmatchedPatients.length}):`);
    for (const n of unmatchedPatients) console.log("  •", n);
  }
  console.log("\n--- Amostra de NOVAS clínicas ---");
  for (const s of sampleNewClinical) console.log("  ·", s);
  console.log("\n--- Amostra de NOVAS curtas/documentos ---");
  for (const s of sampleNewDoc) console.log("  ·", s);
  if (!apply) console.log("\n(DRY-RUN — nada foi gravado)");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
