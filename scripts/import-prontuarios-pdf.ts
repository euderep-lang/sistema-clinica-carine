/**
 * Importa evoluções de prontuário a partir do PDF exportado do sistema antigo.
 *
 * Uso:
 *   bun run scripts/import-prontuarios-pdf.ts /Users/euderfilho/Downloads/prontuarios_evolucoes.pdf
 *   bun run scripts/import-prontuarios-pdf.ts /caminho/arquivo.pdf --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PROFESSIONAL_ID = process.env.IMPORT_PROFESSIONAL_ID ?? "";

type EvolutionRow = {
  date: string;
  time: string;
  text: string;
  createdAt: string;
};

type PatientBlock = {
  pdfName: string;
  evolutions: EvolutionRow[];
};

function requireEnv(label: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável obrigatória ausente: ${label}`);
  return value;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function extractPdfText(pdfPath: string): string {
  try {
    return execSync(`npx pdf-parse text "${pdfPath.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`Falha ao extrair PDF: ${(e as Error).message}`);
  }
}

function cleanPdfText(raw: string): string {
  return raw
    .replace(/^PRONTUÁRIOS[\s\S]*?Gerado em:\s*\d{2}\/\d{2}\/\d{4}\s*/m, "")
    .replace(/Página\s+\d+\s+de\s+\d+/gi, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "");
}

function parseProntuariosPdf(text: string): PatientBlock[] {
  const cleaned = cleanPdfText(text);
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim());

  const blocks: PatientBlock[] = [];
  let currentName: string | null = null;
  let currentDate: string | null = null;
  let currentTime = "12:00";
  let buffer: string[] = [];

  const flush = () => {
    if (!currentName || !currentDate) {
      buffer = [];
      return;
    }
    const body = buffer.join("\n").trim();
    if (!body) {
      buffer = [];
      return;
    }
    const block = blocks.find((b) => b.pdfName === currentName);
    const target = block ?? { pdfName: currentName, evolutions: [] };
    if (!block) blocks.push(target);
    target.evolutions.push({
      date: currentDate,
      time: currentTime,
      text: body,
      createdAt: `${currentDate}T${currentTime}:00`,
    });
    buffer = [];
  };

  for (const line of lines) {
    if (!line) continue;

    const patientMatch = line.match(/^\d+\.\s+(.+)$/);
    if (patientMatch) {
      flush();
      currentName = patientMatch[1].trim();
      currentDate = null;
      currentTime = "12:00";
      buffer = [];
      continue;
    }

    const dateMatch = line.match(/^Data:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/i);
    if (dateMatch) {
      flush();
      currentDate = dateMatch[1];
      currentTime = dateMatch[2] ?? "12:00";
      if (currentTime.length === 4) currentTime = `0${currentTime}`;
      buffer = [];
      continue;
    }

    if (currentName && currentDate) buffer.push(line);
  }

  flush();
  return blocks;
}

function scoreNameMatch(pdfNorm: string, patientNorm: string): number {
  const pdfTokens = pdfNorm.split(" ").filter((t) => t.length > 2);
  const patientTokens = patientNorm.split(" ").filter((t) => t.length > 2);
  if (!pdfTokens.length || !patientTokens.length) return 0;

  // Primeiro nome deve ser idêntico
  if (pdfTokens[0] !== patientTokens[0]) return 0;

  let overlap = 0;
  for (const t of pdfTokens) {
    if (patientTokens.includes(t)) overlap++;
  }

  let score = overlap * 10;
  const pdfLast = pdfTokens[pdfTokens.length - 1];
  const patientLast = patientTokens[patientTokens.length - 1];
  if (pdfLast && pdfLast === patientLast) score += 15;
  if (pdfNorm === patientNorm) score += 100;

  return score;
}

function findPatientId(
  pdfName: string,
  byExact: Map<string, { id: string; full_name: string }>,
  allPatients: { id: string; full_name: string; norm: string }[],
): { id: string; full_name: string } | null {
  const norm = normalizeName(pdfName);
  const exact = byExact.get(norm);
  if (exact) return exact;

  const scored = allPatients
    .map((p) => ({ ...p, score: scoreNameMatch(norm, p.norm) }))
    .filter((p) => p.score >= 35)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  if (scored.length === 1) return { id: scored[0].id, full_name: scored[0].full_name };
  if (scored[0].score - scored[1].score >= 10) {
    return { id: scored[0].id, full_name: scored[0].full_name };
  }

  return null;
}

async function main() {
  const pdfPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!pdfPath) {
    console.error("Uso: bun run scripts/import-prontuarios-pdf.ts <arquivo.pdf> [--dry-run]");
    process.exit(1);
  }
  if (!existsSync(pdfPath)) {
    console.error("Arquivo não encontrado:", pdfPath);
    process.exit(1);
  }

  console.log("Extraindo PDF…");
  const text = extractPdfText(pdfPath);
  const blocks = parseProntuariosPdf(text);
  const totalEvolutions = blocks.reduce((n, b) => n + b.evolutions.length, 0);
  console.log(`PDF: ${blocks.length} pacientes, ${totalEvolutions} evoluções`);

  const supabase = createClient(
    requireEnv("SUPABASE_URL", NEW_URL),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: patients, error: pErr } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("tenant_id", TENANT_ID);
  if (pErr) throw pErr;

  const allPatients = (patients ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    norm: normalizeName(p.full_name),
  }));
  const byExact = new Map<string, { id: string; full_name: string }>();
  for (const p of allPatients) {
    byExact.set(p.norm, { id: p.id, full_name: p.full_name });
  }

  let professionalId = DEFAULT_PROFESSIONAL_ID;
  if (!professionalId) {
    const { data: pro } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("role", "professional")
      .eq("active", true)
      .order("full_name")
      .limit(1)
      .maybeSingle();
    professionalId = pro?.id ?? "";
  }

  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  let matchedPatients = 0;
  let toInsert = 0;
  let skippedDup = 0;

  for (const block of blocks) {
    const match = findPatientId(block.pdfName, byExact, allPatients);
    if (!match) {
      const norm = normalizeName(block.pdfName);
      const scored = allPatients
        .map((p) => ({ ...p, score: scoreNameMatch(norm, p.norm) }))
        .filter((p) => p.score >= 25)
        .sort((a, b) => b.score - a.score);
      if (scored.length >= 2 && scored[0].score - scored[1].score < 10) {
        ambiguous.push(`${block.pdfName} → ${scored.slice(0, 3).map((c) => c.full_name).join(" | ")}`);
      } else unmatched.push(block.pdfName);
      continue;
    }
    matchedPatients++;

    if (dryRun) {
      toInsert += block.evolutions.length;
      continue;
    }

    const { data: existing } = await supabase
      .from("patient_evolutions")
      .select("date, evolution_text")
      .eq("patient_id", match.id);

    const existingKeys = new Set(
      (existing ?? []).map((e) => `${e.date}|${(e.evolution_text ?? "").slice(0, 100)}`),
    );

    for (const ev of block.evolutions) {
      const key = `${ev.date}|${ev.text.slice(0, 100)}`;
      if (existingKeys.has(key)) {
        skippedDup++;
        continue;
      }

      const { data: mr, error: mrErr } = await supabase
        .from("medical_records")
        .insert({
          tenant_id: TENANT_ID,
          patient_id: match.id,
          professional_id: professionalId || null,
          date: ev.date,
          chief_complaint: ev.text.slice(0, 500),
          notes: "Importado do sistema anterior",
        })
        .select("id")
        .single();

      if (mrErr || !mr) {
        console.error(`Erro medical_record ${block.pdfName} ${ev.date}:`, mrErr?.message);
        continue;
      }

      const { error: evErr } = await supabase.from("patient_evolutions").insert({
        tenant_id: TENANT_ID,
        patient_id: match.id,
        professional_id: professionalId || null,
        medical_record_id: mr.id,
        date: ev.date,
        evolution_text: ev.text,
        created_at: ev.createdAt,
        updated_at: ev.createdAt,
      });

      if (evErr) {
        console.error(`Erro evolução ${block.pdfName} ${ev.date}:`, evErr.message);
        continue;
      }

      existingKeys.add(key);
      toInsert++;
    }
  }

  console.log("\n--- Resumo ---");
  console.log(`Pacientes no PDF: ${blocks.length}`);
  console.log(`Evoluções no PDF: ${totalEvolutions}`);
  console.log(`Pacientes encontrados no sistema: ${matchedPatients}`);
  console.log(`Evoluções ${dryRun ? "a importar" : "importadas"}: ${toInsert}`);
  if (!dryRun) console.log(`Evoluções ignoradas (duplicadas): ${skippedDup}`);
  console.log(`Sem correspondência: ${unmatched.length}`);
  console.log(`Ambíguos: ${ambiguous.length}`);

  if (unmatched.length) {
    console.log("\nPacientes não encontrados:");
    for (const n of unmatched) console.log(" -", n);
  }
  if (ambiguous.length) {
    console.log("\nPacientes ambíguos (importação manual):");
    for (const n of ambiguous) console.log(" -", n);
  }

  if (dryRun) console.log("\n(dry-run — nada foi gravado no banco)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
