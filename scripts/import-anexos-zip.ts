/**
 * Importa anexos de prontuário (fotos, PDFs) a partir de ZIP exportado do sistema antigo.
 *
 * Estrutura esperada:
 *   Nome do Paciente/2026-04-08_arquivo-uuid.pdf
 *
 * Uso:
 *   bun run scripts/import-anexos-zip.ts /caminho/prontuarios_anexos.zip
 *   bun run scripts/import-anexos-zip.ts /caminho/arquivo.zip --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { createReadStream, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PROFESSIONAL_ID = process.env.IMPORT_PROFESSIONAL_ID ?? "";

const MEDIA_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".html",
  ".htm",
]);

type AttachmentEntry = {
  patientFolderName: string;
  filePath: string;
  fileName: string;
  date: string;
  sourceKey: string;
  caption: string;
  sizeBytes: number;
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

function scoreNameMatch(folderNorm: string, patientNorm: string): number {
  const folderTokens = folderNorm.split(" ").filter((t) => t.length > 2);
  const patientTokens = patientNorm.split(" ").filter((t) => t.length > 2);
  if (!folderTokens.length || !patientTokens.length) return 0;
  if (folderTokens[0] !== patientTokens[0]) return 0;

  let overlap = 0;
  for (const t of folderTokens) {
    if (patientTokens.includes(t)) overlap++;
  }

  let score = overlap * 10;
  const folderLast = folderTokens[folderTokens.length - 1];
  const patientLast = patientTokens[patientTokens.length - 1];
  if (folderLast && folderLast === patientLast) score += 15;
  if (folderNorm === patientNorm) score += 100;
  return score;
}

function findPatientId(
  folderName: string,
  byExact: Map<string, { id: string; full_name: string }>,
  allPatients: { id: string; full_name: string; norm: string }[],
): { id: string; full_name: string } | null {
  const norm = normalizeName(folderName);
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

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    case ".html":
    case ".htm":
      return "text/html";
    default:
      return "application/octet-stream";
  }
}

function parseFileName(fileName: string): { date: string; sourceKey: string; caption: string } | null {
  const iso = fileName.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (iso) {
    return { date: iso[1], sourceKey: iso[2], caption: `Importado · ${iso[1]}` };
  }
  const compact = fileName.match(/^(\d{4})(\d{2})(\d{2})_(.+)$/);
  if (compact) {
    const date = `${compact[1]}-${compact[2]}-${compact[3]}`;
    const title = basename(compact[4], extname(compact[4])).replace(/_/g, " ").trim();
    return { date, sourceKey: compact[4], caption: title || `Documento · ${date}` };
  }
  return null;
}

function extractZip(zipPath: string): string {
  const dir = mkdtempSync(join(tmpdir(), "prontuarios-anexos-"));
  execSync(
    `python3 -c 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' ${JSON.stringify(zipPath)} ${JSON.stringify(dir)}`,
    { stdio: "inherit" },
  );
  return dir;
}

function collectAttachments(rootDir: string): AttachmentEntry[] {
  const entries: AttachmentEntry[] = [];

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = extname(name).toLowerCase();
      if (!MEDIA_EXT.has(ext)) continue;

      const parsed = parseFileName(name);
      if (!parsed) continue;

      entries.push({
        patientFolderName: basename(dir),
        filePath: full,
        fileName: name,
        date: parsed.date,
        sourceKey: parsed.sourceKey,
        caption: parsed.caption,
        sizeBytes: st.size,
      });
    }
  };

  walk(rootDir);
  return entries;
}

async function fileToBuffer(path: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream(path)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main() {
  const zipPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!zipPath) {
    console.error("Uso: bun run scripts/import-anexos-zip.ts <arquivo.zip> [--dry-run]");
    process.exit(1);
  }
  if (!existsSync(zipPath)) {
    console.error("Arquivo não encontrado:", zipPath);
    process.exit(1);
  }

  console.log("Extraindo ZIP…");
  const extractDir = extractZip(zipPath);
  const attachments = collectAttachments(extractDir);
  const patientFolders = new Set(attachments.map((a) => a.patientFolderName));
  console.log(
    `ZIP: ${patientFolders.size} pastas de paciente, ${attachments.length} anexos`,
  );

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
  if (!professionalId) {
    throw new Error("Defina IMPORT_PROFESSIONAL_ID no .env");
  }

  const unmatchedPatients = new Set<string>();
  const ambiguousPatients: string[] = [];
  const noEvolution: { patient: string; date: string; file: string }[] = [];
  const skippedDup: string[] = [];
  const errors: string[] = [];

  let uploaded = 0;
  let matchedPatients = 0;
  const matchedPatientIds = new Set<string>();

  const byPatientFolder = new Map<string, AttachmentEntry[]>();
  for (const att of attachments) {
    const list = byPatientFolder.get(att.patientFolderName) ?? [];
    list.push(att);
    byPatientFolder.set(att.patientFolderName, list);
  }

  for (const [folderName, files] of byPatientFolder) {
    const match = findPatientId(folderName, byExact, allPatients);
    if (!match) {
      const norm = normalizeName(folderName);
      const scored = allPatients
        .map((p) => ({ ...p, score: scoreNameMatch(norm, p.norm) }))
        .filter((p) => p.score >= 25)
        .sort((a, b) => b.score - a.score);
      if (scored.length >= 2 && scored[0].score - scored[1].score < 10) {
        ambiguousPatients.push(
          `${folderName} → ${scored.slice(0, 3).map((c) => c.full_name).join(" | ")}`,
        );
      } else {
        unmatchedPatients.add(folderName);
      }
      continue;
    }

    matchedPatients++;
    matchedPatientIds.add(match.id);

    const { data: evolutions, error: evErr } = await supabase
      .from("patient_evolutions")
      .select("id, date, professional_id, created_at")
      .eq("patient_id", match.id)
      .order("created_at", { ascending: true });
    if (evErr) throw evErr;

    const evByDate = new Map<string, { id: string; professional_id: string | null }[]>();
    for (const ev of evolutions ?? []) {
      const list = evByDate.get(ev.date) ?? [];
      list.push({ id: ev.id, professional_id: ev.professional_id });
      evByDate.set(ev.date, list);
    }

    const { data: existingAtt } = await supabase
      .from("evolution_attachments")
      .select("file_name")
      .eq("patient_id", match.id);
    const existingNames = new Set((existingAtt ?? []).map((a) => a.file_name));

    for (const att of files) {
      let dayEvs = evByDate.get(att.date);
      let evolutionId: string | null = null;

      if (dayEvs?.length) {
        evolutionId =
          (dayEvs.find((e) => e.professional_id === professionalId) ?? dayEvs[0]).id;
      } else if (!dryRun) {
        const { data: mr, error: mrErr } = await supabase
          .from("medical_records")
          .insert({
            tenant_id: TENANT_ID,
            patient_id: match.id,
            professional_id: professionalId,
            date: att.date,
            notes: "Importado do sistema anterior (anexos)",
          })
          .select("id")
          .single();
        if (mrErr || !mr) {
          errors.push(`${match.full_name} / ${att.fileName}: ${mrErr?.message ?? "medical_record"}`);
          continue;
        }

        const { data: evRow, error: evInsertErr } = await supabase
          .from("patient_evolutions")
          .insert({
            tenant_id: TENANT_ID,
            patient_id: match.id,
            professional_id: professionalId,
            medical_record_id: mr.id,
            date: att.date,
            evolution_text: `Anexos importados · ${att.date}`,
            created_at: `${att.date}T12:00:00`,
            updated_at: `${att.date}T12:00:00`,
          })
          .select("id, professional_id")
          .single();
        if (evInsertErr || !evRow) {
          errors.push(`${match.full_name} / ${att.fileName}: ${evInsertErr?.message ?? "evolution"}`);
          continue;
        }

        dayEvs = [{ id: evRow.id, professional_id: evRow.professional_id }];
        evByDate.set(att.date, dayEvs);
        evolutionId = evRow.id;
      } else {
        noEvolution.push({
          patient: match.full_name,
          date: att.date,
          file: att.fileName,
        });
        uploaded++;
        continue;
      }

      if (!evolutionId) continue;

      if (existingNames.has(att.fileName)) {
        skippedDup.push(`${match.full_name} / ${att.fileName}`);
        continue;
      }

      if (dryRun) {
        uploaded++;
        continue;
      }

      try {
        const attachmentId = randomUUID();
        const safeName = att.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${match.id}/media/${attachmentId}/${Date.now()}_${safeName}`;
        const body = await fileToBuffer(att.filePath);
        const ext = extname(att.fileName).toLowerCase();

        const { error: upErr } = await supabase.storage
          .from("patient-documents")
          .upload(storagePath, body, {
            upsert: false,
            contentType: mimeFromExt(ext),
          });
        if (upErr) throw new Error(upErr.message);

        const { error: attErr } = await supabase.from("evolution_attachments").insert({
          id: attachmentId,
          tenant_id: TENANT_ID,
          evolution_id: evolutionId,
          patient_id: match.id,
          professional_id: professionalId,
          storage_path: storagePath,
          file_name: att.fileName,
          mime_type: mimeFromExt(ext),
          file_size_kb: Math.round((att.sizeBytes / 1024) * 100) / 100,
          caption: att.caption,
        });
        if (attErr) throw new Error(attErr.message);

        existingNames.add(att.fileName);
        uploaded++;
      } catch (e) {
        errors.push(`${match.full_name} / ${att.fileName}: ${(e as Error).message}`);
      }
    }
  }

  rmSync(extractDir, { recursive: true, force: true });

  console.log("\n--- Resumo ---");
  console.log(`Pastas no ZIP: ${patientFolders.size}`);
  console.log(`Anexos no ZIP: ${attachments.length}`);
  console.log(`Pacientes encontrados: ${matchedPatients}`);
  console.log(`Anexos ${dryRun ? "a importar" : "importados"}: ${uploaded}`);
  console.log(`Duplicados ignorados: ${skippedDup.length}`);
  if (dryRun) {
    console.log(`Sem evolução na data (criará stub na importação real): ${noEvolution.length}`);
  }
  console.log(`Pacientes sem correspondência: ${unmatchedPatients.size}`);
  console.log(`Pacientes ambíguos: ${ambiguousPatients.length}`);
  console.log(`Erros: ${errors.length}`);

  if (unmatchedPatients.size) {
    console.log("\nPacientes não encontrados:");
    for (const n of [...unmatchedPatients].sort()) console.log(" -", n);
  }
  if (ambiguousPatients.length) {
    console.log("\nPacientes ambíguos:");
    for (const n of ambiguousPatients) console.log(" -", n);
  }
  if (dryRun && noEvolution.length) {
    console.log("\nDatas sem evolução (serão criadas na importação real, primeiros 15):");
    for (const row of noEvolution.slice(0, 15)) {
      console.log(` - ${row.patient} · ${row.date} · ${row.file}`);
    }
    if (noEvolution.length > 15) {
      console.log(` … e mais ${noEvolution.length - 15}`);
    }
  }
  if (errors.length) {
    console.log("\nErros (primeiros 20):");
    for (const e of errors.slice(0, 20)) console.log(" -", e);
  }

  if (dryRun) console.log("\n(dry-run — nada foi gravado no banco/storage)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
