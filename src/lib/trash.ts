import { supabase } from "@/integrations/supabase/client";

/** Snapshot genérico de um registro excluído (linha principal + filhos opcionais). */
export interface TrashSnapshot {
  /** Tabela principal do registro (ex.: "prescriptions"). */
  table: string;
  /** Linha completa (select "*") da tabela principal. */
  row: Record<string, unknown>;
  /** Registros filhos a restaurar junto (ex.: itens da receita). */
  children?: { table: string; rows: Record<string, unknown>[] }[];
}

export type TrashEntityType =
  | "prescription"
  | "clinical_template"
  | "appointment"
  | "expense"
  | "message_template"
  | "inventory_category"
  | "inventory_item"
  | "service"
  | "budget"
  | "bill"
  | "patient"
  | "evolution"
  | "user";

export interface MoveToTrashInput {
  tenantId: string;
  entityType: TrashEntityType;
  entityId: string;
  label: string;
  summary?: string | null;
  snapshot: TrashSnapshot;
  deletedBy?: string | null;
  deletedByName?: string | null;
}

/**
 * Registra um snapshot do item na lixeira (30 dias). Deve ser chamado ANTES da
 * exclusão real. Lança erro se a gravação falhar, para não excluir sem backup.
 */
export async function moveToTrash(input: MoveToTrashInput): Promise<void> {
  const { error } = await supabase.from("trash_bin" as never).insert({
    tenant_id: input.tenantId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    label: input.label,
    summary: input.summary ?? null,
    snapshot: input.snapshot as unknown,
    deleted_by: input.deletedBy ?? null,
    deleted_by_name: input.deletedByName ?? null,
  } as never);
  if (error) throw new Error(`Falha ao registrar na lixeira: ${error.message}`);
}

/** Busca a linha completa de uma tabela para snapshot. */
export async function fetchRowForTrash(
  table: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from(table as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

async function currentActor(): Promise<{ id: string | null; name: string | null }> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    if (!uid) return { id: null, name: null };
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", uid)
      .maybeSingle();
    const prof = p as { full_name?: string | null; display_name?: string | null } | null;
    return { id: uid, name: prof?.display_name?.trim() || prof?.full_name || null };
  } catch {
    return { id: null, name: null };
  }
}

export interface SoftDeleteOptions {
  entityType: TrashEntityType;
  /** Tabela principal. */
  table: string;
  /** id do registro. */
  id: string;
  label: string;
  summary?: string | null;
  /** Filhos a preservar para restauração (geralmente apagados em cascata). */
  children?: { table: string; fk: string }[];
  /** Sobrescreve o tenant_id (senão usa o da própria linha). */
  tenantId?: string;
}

async function buildSnapshot(
  opts: Pick<SoftDeleteOptions, "table" | "id" | "children">,
): Promise<{ row: Record<string, unknown>; children: { table: string; rows: Record<string, unknown>[] }[] } | null> {
  const row = await fetchRowForTrash(opts.table, opts.id);
  if (!row) return null;

  const children: { table: string; rows: Record<string, unknown>[] }[] = [];
  for (const child of opts.children ?? []) {
    const { data } = await supabase
      .from(child.table as never)
      .select("*")
      .eq(child.fk, opts.id);
    const rows = (data as Record<string, unknown>[] | null) ?? [];
    if (rows.length) children.push({ table: child.table, rows });
  }
  return { row, children };
}

async function archiveSnapshot(opts: SoftDeleteOptions): Promise<boolean> {
  const built = await buildSnapshot(opts);
  if (!built) return false;

  const tenantId = opts.tenantId ?? (built.row.tenant_id as string | undefined);
  if (!tenantId) throw new Error("tenant_id não encontrado para registrar na lixeira");

  const actor = await currentActor();
  await moveToTrash({
    tenantId,
    entityType: opts.entityType,
    entityId: opts.id,
    label: opts.label,
    summary: opts.summary ?? null,
    snapshot: {
      table: opts.table,
      row: built.row,
      children: built.children.length ? built.children : undefined,
    },
    deletedBy: actor.id,
    deletedByName: actor.name,
  });
  return true;
}

/**
 * Registra snapshot na lixeira sem excluir o registro (ex.: antes de RPC `delete_bill`).
 */
export async function archiveEntity(opts: SoftDeleteOptions): Promise<void> {
  await archiveSnapshot(opts);
}

/**
 * Move o registro (e filhos) para a lixeira e então o exclui da tabela original.
 * Os filhos costumam ser removidos em cascata pelo FK; aqui apenas guardamos o
 * snapshot deles para permitir a restauração completa.
 */
export async function softDelete(opts: SoftDeleteOptions): Promise<void> {
  const archived = await archiveSnapshot(opts);
  if (!archived) return;

  const { error } = await supabase.from(opts.table as never).delete().eq("id", opts.id);
  if (error) throw new Error(error.message);
}

/**
 * Inativa o registro (active=false) e registra na lixeira para restauração em 30 dias.
 */
export async function softDeactivate(opts: SoftDeleteOptions): Promise<void> {
  const row = await fetchRowForTrash(opts.table, opts.id);
  if (!row || row.active === false) return;

  await archiveSnapshot(opts);

  const { error } = await supabase
    .from(opts.table as never)
    .update({ active: false } as never)
    .eq("id", opts.id);
  if (error) throw new Error(error.message);
}

/**
 * Exclui DEFINITIVAMENTE um paciente já inativo. Antes de remover, guarda um
 * snapshot (paciente + principais filhos) na lixeira para eventual restauração
 * em 30 dias. A maioria dos vínculos é apagada em cascata pelo banco; o vínculo
 * de `inventory_movements` (que não tem cascata) é desassociado para não travar
 * a exclusão.
 */
export async function hardDeletePatient(
  id: string,
  label: string,
  summary?: string | null,
): Promise<void> {
  await archiveEntity({
    entityType: "patient",
    table: "patients",
    id,
    label,
    summary,
    children: [
      { table: "appointments", fk: "patient_id" },
      { table: "medical_records", fk: "patient_id" },
      { table: "patient_evolutions", fk: "patient_id" },
      { table: "prescriptions", fk: "patient_id" },
    ],
  });

  const { error: mvError } = await supabase
    .from("inventory_movements" as never)
    .update({ patient_id: null } as never)
    .eq("patient_id", id);
  if (mvError) throw new Error(mvError.message);

  const { error } = await supabase.from("patients" as never).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Exclui orçamento com itens e fatura vinculada (status orçamento). */
export async function deleteBudgetWithTrash(budgetId: string): Promise<void> {
  const row = await fetchRowForTrash("budgets", budgetId);
  if (!row) return;

  const { data: items } = await supabase
    .from("budget_items" as never)
    .select("*")
    .eq("budget_id", budgetId);
  const { data: bills } = await supabase
    .from("bills_receivable" as never)
    .select("*")
    .eq("budget_id", budgetId);

  const itemRows = (items as Record<string, unknown>[] | null) ?? [];
  const billRows = (bills as Record<string, unknown>[] | null) ?? [];
  const children: { table: string; rows: Record<string, unknown>[] }[] = [];
  if (itemRows.length) children.push({ table: "budget_items", rows: itemRows });
  if (billRows.length) children.push({ table: "bills_receivable", rows: billRows });

  const tenantId = row.tenant_id as string;
  const actor = await currentActor();
  await moveToTrash({
    tenantId,
    entityType: "budget",
    entityId: budgetId,
    label: `Orçamento #${row.number ?? budgetId.slice(0, 8)}`,
    summary:
      row.final_value != null
        ? `R$ ${Number(row.final_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : null,
    snapshot: { table: "budgets", row, children: children.length ? children : undefined },
    deletedBy: actor.id,
    deletedByName: actor.name,
  });

  for (const bill of billRows) {
    if (bill.status === "budget" && Number(bill.paid_amount ?? 0) === 0) {
      const { error } = await supabase.rpc("delete_bill" as never, { p_bill_id: bill.id } as never);
      if (error) throw new Error(error.message);
    }
  }

  const { error } = await supabase.from("budgets" as never).delete().eq("id", budgetId);
  if (error) throw new Error(error.message);
}
