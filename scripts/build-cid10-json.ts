/**
 * Gera public/data/cid10.json a partir do CSV oficial DATASUS (CID-10-SUBCATEGORIAS).
 * Fonte: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
 *
 * Uso: bun run scripts/build-cid10-json.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CSV_PATH = join(ROOT, "scripts/data/cid10/CID-10-SUBCATEGORIAS.CSV");
const OUT_DIR = join(ROOT, "public/data");
const OUT_PATH = join(OUT_DIR, "cid10.json");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function formatCode(raw: string): string {
  const c = raw.trim().toUpperCase();
  if (c.length === 4) return `${c.slice(0, 3)}.${c.slice(3)}`;
  return c;
}

function main() {
  const content = readFileSync(CSV_PATH, "latin1");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const subIdx = headers.indexOf("subcat");
  const descIdx = headers.indexOf("descricao");

  const list: { code: string; description: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const raw = fields[subIdx] ?? fields[0];
    const desc = (fields[descIdx] ?? fields[4] ?? "").trim();
    if (!raw || !desc) continue;
    list.push({ code: formatCode(raw), description: desc });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(list));
  console.log(`CID-10: ${list.length} códigos → ${OUT_PATH}`);
}

main();
