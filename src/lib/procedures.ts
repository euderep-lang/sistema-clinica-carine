/** Ordem preferida de exibição dos procedimentos/serviços do profissional. */
const DISPLAY_ORDER = [
  "Consulta Presencial",
  "Consulta Online",
  "Plano de Acompanhamento 3 meses",
  "Soro EV",
  "Injetáveis IM",
] as const;

function tirzepatidaUiRank(name: string): number | null {
  const match = name.match(/tirzepatida\s+(\d+)\s*ui/i);
  return match ? Number(match[1]) : null;
}

function displayRank(name: string): number {
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  const idx = DISPLAY_ORDER.findIndex(
    (item) => item.toLocaleLowerCase("pt-BR") === normalized,
  );
  if (idx >= 0) return idx;
  if (tirzepatidaUiRank(name) !== null) return 900;
  return 1000;
}

export function sortProceduresForDisplay<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byRank = displayRank(a.name) - displayRank(b.name);
    if (byRank !== 0) return byRank;

    const aUi = tirzepatidaUiRank(a.name);
    const bUi = tirzepatidaUiRank(b.name);
    if (aUi !== null && bUi !== null && aUi !== bUi) return aUi - bUi;

    return a.name.localeCompare(b.name, "pt-BR");
  });
}

/** Serviços (consultas, planos) não consomem estoque; demais categorias são procedimentos. */
export function isClinicalService(category: string | null | undefined): boolean {
  const c = (category ?? "").trim().toLocaleLowerCase("pt-BR");
  return c === "serviço" || c === "servico";
}

export interface InventoryLinkInput {
  inventory_item_id: string;
  quantity: number;
}

export type ProcedureInventoryScope = "implantes" | "injetaveis" | "tirzepatida" | "all";

export interface ProcedureInventoryOption {
  id: string;
  name: string;
  unit: string;
  cost_price: number;
  categoryName: string | null;
}

function normalizeInventoryCategory(name: string | null | undefined): string {
  return (name ?? "").trim().toLocaleLowerCase("pt-BR");
}

function isTirzepatidaItemName(name: string): boolean {
  return name.toLocaleLowerCase("pt-BR").includes("tirzepatida");
}

/** Define quais insumos de estoque aparecem ao vincular um procedimento na venda. */
export function inventoryScopeForProcedure(serviceName: string): ProcedureInventoryScope {
  const n = serviceName.trim().toLocaleLowerCase("pt-BR");
  if (n.includes("implante")) return "implantes";
  if (n.includes("tirzepatida")) return "tirzepatida";
  if (
    n.includes("soro ev") ||
    n.includes("injetável") ||
    n.includes("injetavel") ||
    n.includes("injetáveis im") ||
    n.includes("injetaveis im")
  ) {
    return "injetaveis";
  }
  return "all";
}

export function filterInventoryOptionsForProcedure(
  options: ProcedureInventoryOption[],
  serviceName: string,
): ProcedureInventoryOption[] {
  const scope = inventoryScopeForProcedure(serviceName);

  switch (scope) {
    case "implantes":
      return options.filter((o) => normalizeInventoryCategory(o.categoryName) === "implantes");
    case "tirzepatida":
      return options.filter((o) => isTirzepatidaItemName(o.name));
    case "injetaveis":
      return options.filter(
        (o) =>
          normalizeInventoryCategory(o.categoryName) === "injetáveis" &&
          !isTirzepatidaItemName(o.name),
      );
    default:
      return options;
  }
}

export function inventoryScopeLabel(scope: ProcedureInventoryScope): string | null {
  switch (scope) {
    case "implantes":
      return "Mostrando apenas insumos da categoria Implantes.";
    case "injetaveis":
      return "Mostrando apenas insumos injetáveis (exceto Tirzepatida).";
    case "tirzepatida":
      return "Mostrando apenas insumos de Tirzepatida.";
    default:
      return null;
  }
}

export interface ProcedureInventoryTarget {
  serviceId: string;
  serviceName: string;
  unitIndex: number;
  unitKey: string;
  totalUnits: number;
}

export function procedureInventoryUnitKey(serviceId: string, unitIndex: number): string {
  return `${serviceId}:${unitIndex}`;
}

export function procedureInventoryTargetLabel(target: ProcedureInventoryTarget): string {
  if (target.totalUnits <= 1) return target.serviceName;
  return `${target.serviceName} ${target.unitIndex}`;
}

export function buildProcedureInventoryQueue(
  procedures: Array<{ id: string; name: string }>,
  quantities: Record<string, number>,
  inventoryMap: Record<string, InventoryLinkInput[]>,
): ProcedureInventoryTarget[] {
  const queue: ProcedureInventoryTarget[] = [];
  for (const proc of procedures) {
    const qty = Math.max(0, quantities[proc.id] ?? 0);
    for (let unit = 1; unit <= qty; unit++) {
      const unitKey = procedureInventoryUnitKey(proc.id, unit);
      if (!inventoryMap[unitKey]?.length) {
        queue.push({
          serviceId: proc.id,
          serviceName: proc.name,
          unitIndex: unit,
          unitKey,
          totalUnits: qty,
        });
      }
    }
  }
  return queue;
}

export interface SaleItemForInventory {
  id: string;
  category?: string | null;
  hasLinkedInventory?: boolean;
}

export interface ExpandedSaleItemInput {
  service_id: string;
  quantity: number;
  unit_price: number;
  inventory_items?: InventoryLinkInput[];
}

export function expandSaleItemsWithPerUnitInventory<T extends SaleItemForInventory>(
  items: T[],
  quantities: Record<string, number>,
  getUnitPrice: (item: T) => number,
  inventoryMap: Record<string, InventoryLinkInput[]>,
): ExpandedSaleItemInput[] {
  const result: ExpandedSaleItemInput[] = [];

  for (const item of items) {
    const qty = quantities[item.id] ?? 0;
    if (qty <= 0) continue;

    const unitPrice = Math.round(getUnitPrice(item) * 100) / 100;
    const perUnitInventory = !isClinicalService(item.category) && !item.hasLinkedInventory;

    if (perUnitInventory) {
      for (let unit = 1; unit <= qty; unit++) {
        const line: ExpandedSaleItemInput = {
          service_id: item.id,
          quantity: 1,
          unit_price: unitPrice,
        };
        const inv = inventoryMap[procedureInventoryUnitKey(item.id, unit)];
        if (inv?.length) line.inventory_items = inv;
        result.push(line);
      }
    } else {
      result.push({
        service_id: item.id,
        quantity: qty,
        unit_price: unitPrice,
      });
    }
  }

  return result;
}
