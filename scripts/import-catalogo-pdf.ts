/**
 * Importa catálogo MEDX (estoque + procedimentos) com custo e preço de venda.
 *
 * Uso:
 *   bun run scripts/import-catalogo-pdf.ts /caminho/catalogo_zerado_final.pdf
 *   bun run scripts/import-catalogo-pdf.ts /caminho/arquivo.pdf --dry-run
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const KNOWN_BRANDS = [
  "CentralFarma",
  "CentralForma",
  "CenralFarma",
  "UP Universe Ph",
  "CENTRAL",
  "Central",
  "BIOS",
  "Diversos",
  "Amploa",
  "Injetável",
].sort((a, b) => b.length - a.length);

type InventoryRow = {
  medxNum: number;
  name: string;
  presentation: string;
  brand: string | null;
  minStock: number;
};

type ProcedureRow = {
  medxNum: number;
  name: string;
  cost: number;
  salePrice: number;
  marginPct: number;
  sessions: number;
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

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function extractPdfText(pdfPath: string): string {
  try {
    return execSync(`npx pdf-parse text ${JSON.stringify(pdfPath)}`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`Falha ao extrair PDF: ${(e as Error).message}`);
  }
}

function cleanPdfText(raw: string): string {
  return raw
    .replace(/MEDX [–-] CATÁLOGO GERAL[^\n]*\nPágina \d+/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\nGerado em \d{2}\/\d{2}\/\d{4}[^\n]*MEDX v\d+[^\n]*/i, "");
}

function splitNamePresentation(body: string): { name: string; presentation: string } {
  const tabParts = body.split("\t").map((p) => p.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    return { name: tabParts[0], presentation: tabParts.slice(1).join(" ") };
  }

  const inj = body.match(/^(.+?)\s+(\d[\d.,]*\s*(?:ml|mg|UI|G|mcg|PELLET|Amploa).*)$/i);
  if (inj) return { name: inj[1].trim(), presentation: inj[2].trim() };

  const pellet = body.match(/^(.+?)\s+(\d+\s*MG\s+PELLET.*)$/i);
  if (pellet) return { name: pellet[1].trim(), presentation: pellet[2].trim() };

  return { name: body.trim(), presentation: "" };
}

function parseInventoryLine(line: string): InventoryRow | null {
  const m = line.match(/^(\d+)\s+(.+)$/);
  if (!m) return null;
  const medxNum = Number(m[1]);
  let rest = m[2].trim();
  const end = rest.match(/\s+(\d+|—)\s+0\s*$/);
  if (!end) return null;
  const minStock = end[1] === "—" ? 0 : Number(end[1]);
  rest = rest.slice(0, end.index).trim();

  let brand: string | null = null;
  for (const candidate of KNOWN_BRANDS) {
    if (rest.endsWith(candidate)) {
      brand = candidate;
      rest = rest.slice(0, -candidate.length).trim();
      break;
    }
  }

  const { name, presentation } = splitNamePresentation(rest);
  if (!name) return null;
  return { medxNum, name, presentation, brand, minStock };
}

function parseProcedureLine(line: string): ProcedureRow | null {
  const normalized = line.replace(/([^\s])R\$/g, "$1 R$");

  const withCost = normalized.match(
    /^(\d+)\s+(.+?)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\s+(\d+)%\s+(\d+)\s*$/,
  );
  if (withCost) {
    return {
      medxNum: Number(withCost[1]),
      name: withCost[2].trim(),
      cost: parseMoney(withCost[3]),
      salePrice: parseMoney(withCost[4]),
      marginPct: Number(withCost[5]),
      sessions: Number(withCost[6]),
    };
  }

  const noCost = normalized.match(/^(\d+)\s+(.+?)\s+—\s+R\$\s*([\d.,]+)\s+(\d+)%\s+(\d+)\s*$/);
  if (noCost) {
    return {
      medxNum: Number(noCost[1]),
      name: noCost[2].trim(),
      cost: 0,
      salePrice: parseMoney(noCost[3]),
      marginPct: Number(noCost[4]),
      sessions: Number(noCost[5]),
    };
  }

  return null;
}

function parseCatalogPdf(text: string): { inventory: InventoryRow[]; procedures: ProcedureRow[] } {
  const lines = cleanPdfText(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const inventory: InventoryRow[] = [];
  const procedures: ProcedureRow[] = [];
  let mode: "none" | "inventory" | "procedures" = "none";

  for (const line of lines) {
    if (/^ESTOQUE DE INSUMOS/i.test(line)) {
      mode = "inventory";
      continue;
    }
    if (/^PROTOCOLOS\s*\/\s*PROCEDIMENTOS/i.test(line)) {
      mode = "procedures";
      continue;
    }
    if (/^#\s+Item/i.test(line) || /^#\s+Procedimento/i.test(line)) continue;
    if (/^Saldo atual/i.test(line) || /^Custo =/i.test(line)) continue;
    if (/^Itens no Estoque/i.test(line) || /^Procedimentos Ativos/i.test(line)) continue;
    if (/^CATÁLOGO GERAL/i.test(line) || /^Todo o estoque/i.test(line)) continue;

    if (mode === "inventory") {
      const row = parseInventoryLine(line);
      if (row) inventory.push(row);
    } else if (mode === "procedures") {
      const row = parseProcedureLine(line);
      if (row) procedures.push(row);
    }
  }

  return { inventory, procedures };
}

function procedureCostForInventory(
  invName: string,
  procedures: ProcedureRow[],
): { cost: number; sell: number } | null {
  const key = normalizeName(invName);
  let best: ProcedureRow | null = null;
  let bestScore = 0;

  for (const proc of procedures) {
    const pk = normalizeName(proc.name);
    if (pk === key) return { cost: proc.cost, sell: proc.salePrice };
    if (pk.includes(key) || key.includes(pk)) {
      const score = Math.min(pk.length, key.length);
      if (score > bestScore) {
        bestScore = score;
        best = proc;
      }
    }
  }

  if (best && bestScore >= 4) {
    return { cost: best.cost, sell: best.salePrice };
  }
  return null;
}

async function ensureInventoryCategory(supabase: SupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from("inventory_categories")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("name", "Insumos")
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("inventory_categories")
    .insert({
      tenant_id: TENANT_ID,
      name: "Insumos",
      color: "#0d9488",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function loadInventoryByName(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("tenant_id", TENANT_ID);
  if (error) throw error;
  const map = new Map<string, { id: string; name: string }>();
  for (const row of data ?? []) {
    map.set(normalizeName(row.name), row);
  }
  return map;
}

async function loadServicesByName(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .eq("tenant_id", TENANT_ID);
  if (error) throw error;
  const map = new Map<string, { id: string; name: string }>();
  for (const row of data ?? []) {
    map.set(normalizeName(row.name), row);
  }
  return map;
}

async function upsertInventory(
  supabase: SupabaseClient,
  categoryId: string,
  row: InventoryRow,
  prices: { cost: number; sell: number } | null,
  existing: Map<string, { id: string; name: string }>,
  dryRun: boolean,
): Promise<"inserted" | "updated" | "skipped"> {
  const key = normalizeName(row.name);
  const description = [row.presentation, row.brand ? `Marca: ${row.brand}` : null]
    .filter(Boolean)
    .join(" · ");

  const payload = {
    tenant_id: TENANT_ID,
    category_id: categoryId,
    name: row.name,
    description: description || null,
    brand: row.brand,
    unit: "un",
    min_stock: row.minStock,
    current_stock: 0,
    cost_price: prices?.cost ?? 0,
    sell_price: prices?.sell ?? 0,
    active: true,
  };

  const hit = existing.get(key);
  if (dryRun) {
    return hit ? "updated" : "inserted";
  }

  if (hit) {
    const { error } = await supabase
      .from("inventory_items")
      .update({
        category_id: categoryId,
        description: payload.description,
        brand: payload.brand,
        min_stock: payload.min_stock,
        cost_price: payload.cost_price,
        sell_price: payload.sell_price,
        active: true,
      })
      .eq("id", hit.id);
    if (error) throw error;
    return "updated";
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  existing.set(key, { id: data.id, name: row.name });
  return "inserted";
}

async function upsertService(
  supabase: SupabaseClient,
  row: ProcedureRow,
  existing: Map<string, { id: string; name: string }>,
  dryRun: boolean,
): Promise<"inserted" | "updated" | "skipped"> {
  const key = normalizeName(row.name);
  const payload = {
    tenant_id: TENANT_ID,
    name: row.name,
    category: "Protocolo",
    cost_price: row.cost,
    default_price: row.salePrice,
    session_count: row.sessions,
    professional_id: null,
    active: true,
    description: `Importado MEDX · margem ${row.marginPct}%`,
  };

  const hit = existing.get(key);
  if (dryRun) {
    return hit ? "updated" : "inserted";
  }

  if (hit) {
    const { error } = await supabase
      .from("services")
      .update({
        category: payload.category,
        cost_price: payload.cost_price,
        default_price: payload.default_price,
        session_count: payload.session_count,
        active: true,
        description: payload.description,
      })
      .eq("id", hit.id);
    if (error) throw error;
    return "updated";
  }

  const { data, error } = await supabase.from("services").insert(payload).select("id").single();
  if (error) throw error;
  existing.set(key, { id: data.id, name: row.name });
  return "inserted";
}

async function main() {
  const pdfPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!pdfPath) {
    console.error("Uso: bun run scripts/import-catalogo-pdf.ts /caminho/catalogo.pdf [--dry-run]");
    process.exit(1);
  }

  const supabase = createClient(requireEnv("SUPABASE_URL", NEW_URL), requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY));

  console.log(`Extraindo PDF: ${pdfPath}`);
  const text = extractPdfText(pdfPath);
  const { inventory, procedures } = parseCatalogPdf(text);

  if (inventory.length === 0 && procedures.length === 0) {
    throw new Error("Nenhum item encontrado no PDF. Verifique o formato do catálogo.");
  }

  console.log(`Encontrados: ${inventory.length} itens de estoque, ${procedures.length} procedimentos`);
  if (dryRun) console.log("(dry-run — nenhuma gravação)");

  const categoryId = dryRun ? "dry-category" : await ensureInventoryCategory(supabase);
  const inventoryMap = dryRun ? new Map() : await loadInventoryByName(supabase);
  const serviceMap = dryRun ? new Map() : await loadServicesByName(supabase);

  const invStats = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of inventory) {
    const prices = procedureCostForInventory(row.name, procedures);
    const result = await upsertInventory(supabase, categoryId, row, prices, inventoryMap, dryRun);
    invStats[result]++;
  }

  const svcStats = { inserted: 0, updated: 0, skipped: 0 };
  for (const row of procedures) {
    const result = await upsertService(supabase, row, serviceMap, dryRun);
    svcStats[result]++;
  }

  console.log("\nEstoque:");
  console.log(`  inseridos: ${invStats.inserted}`);
  console.log(`  atualizados: ${invStats.updated}`);
  console.log("\nProcedimentos:");
  console.log(`  inseridos: ${svcStats.inserted}`);
  console.log(`  atualizados: ${svcStats.updated}`);
  console.log("\nImportação concluída.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
