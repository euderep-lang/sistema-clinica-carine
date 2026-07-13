import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditSafe } from "@/lib/audit.server";

export interface TrashItem {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  summary: string | null;
  deleted_by_name: string | null;
  deleted_at: string;
  expires_at: string;
}

interface TrashSnapshot {
  table: string;
  row: Record<string, unknown>;
  children?: { table: string; rows: Record<string, unknown>[] }[];
}

function randomPassword(length = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function requireTenantMember(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<{ tenant_id: string; role: string; userId: string }> {
  const { data: caller, error } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !caller) throw new Error("Perfil não encontrado");
  if (!caller.tenant_id) throw new Error("Tenant não encontrado");
  return { tenant_id: caller.tenant_id as string, role: caller.role as string, userId };
}

async function assertTrashAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  trashId: string,
  tenantId: string,
  role: string,
  userId: string,
): Promise<{ label: string; entity_type: string; deleted_by: string | null }> {
  const { data: rowData, error } = await supabaseAdmin
    .from("trash_bin" as never)
    .select("label, entity_type, deleted_by, tenant_id, restored_at")
    .eq("id", trashId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !rowData) throw new Error("Item não encontrado na lixeira");
  const row = rowData as unknown as {
    label: string;
    entity_type: string;
    deleted_by: string | null;
    restored_at: string | null;
  };
  if (row.restored_at) throw new Error("Este item já foi restaurado");
  if (role !== "admin" && row.deleted_by !== userId) {
    throw new Error("Sem permissão para alterar este item da lixeira");
  }
  return row;
}

export const listTrash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const caller = await requireTenantMember(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("trash_bin" as never)
      .select("id, entity_type, entity_id, label, summary, deleted_by_name, deleted_at, expires_at")
      .eq("tenant_id", caller.tenant_id)
      .is("restored_at", null)
      .gt("expires_at", new Date().toISOString());
    if (caller.role !== "admin") {
      query = query.eq("deleted_by", caller.userId);
    }
    const { data, error } = await query.order("deleted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as unknown as TrashItem[] };
  });

export const restoreTrashItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const caller = await requireTenantMember(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await assertTrashAccess(
      supabaseAdmin,
      data.id,
      caller.tenant_id,
      caller.role,
      caller.userId,
    );

    const { data: rowData, error: getErr } = await supabaseAdmin
      .from("trash_bin" as never)
      .select("id, entity_type, label, snapshot, tenant_id, restored_at, deleted_by")
      .eq("id", data.id)
      .eq("tenant_id", caller.tenant_id)
      .maybeSingle();
    if (getErr || !rowData) throw new Error("Item não encontrado na lixeira");
    const row = rowData as unknown as {
      label: string;
      entity_type: string;
      snapshot: TrashSnapshot;
      restored_at: string | null;
    };
    if (row.restored_at) {
      throw new Error("Este item já foi restaurado");
    }
    if (caller.role !== "admin" && row.entity_type === "user") {
      throw new Error("Apenas administradores podem restaurar usuários");
    }

    const snapshot = row.snapshot;
    if (!snapshot?.table || !snapshot?.row) {
      throw new Error("Snapshot inválido — não é possível restaurar automaticamente");
    }

    let tempPassword: string | undefined;

    if (row.entity_type === "user") {
      const profileRow = { ...snapshot.row };
      const email =
        (typeof profileRow._auth_email === "string" ? profileRow._auth_email : "") ||
        "";
      delete profileRow._auth_email;
      const profileId = profileRow.id as string;
      if (!email) throw new Error("E-mail do usuário não encontrado no snapshot");

      const { data: existing } = await supabaseAdmin.auth.admin.getUserById(profileId);
      if (!existing.user) {
        tempPassword = randomPassword();
        const { error: cErr } = await supabaseAdmin.auth.admin.createUser({
          id: profileId,
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: profileRow.full_name },
        });
        if (cErr) throw new Error(`Erro ao recriar login: ${cErr.message}`);
      }

      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ ...profileRow, active: true } as never, { onConflict: "id" });
      if (pErr) throw new Error(`Erro ao restaurar perfil: ${pErr.message}`);
    } else {
      // Restaura a linha principal.
      const { error: mainErr } = await supabaseAdmin
        .from(snapshot.table as never)
        .upsert(snapshot.row as never, { onConflict: "id" });
      if (mainErr) throw new Error(`Erro ao restaurar registro: ${mainErr.message}`);

      // Restaura filhos (ex.: itens de receita).
      for (const child of snapshot.children ?? []) {
        if (!child.rows?.length) continue;
        const { error: childErr } = await supabaseAdmin
          .from(child.table as never)
          .upsert(child.rows as never, { onConflict: "id" });
        if (childErr) {
          throw new Error(`Erro ao restaurar itens vinculados (${child.table}): ${childErr.message}`);
        }
      }
    }

    await supabaseAdmin
      .from("trash_bin" as never)
      .update({ restored_at: new Date().toISOString() } as never)
      .eq("id", data.id);

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "data",
      action: "trash.restored",
      summary: `Item restaurado da lixeira: ${row.label}`,
      entityType: row.entity_type,
      entityId: data.id,
      source: "ui",
    });

    return { ok: true, tempPassword };
  });

export const purgeTrashItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const caller = await requireTenantMember(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = await assertTrashAccess(
      supabaseAdmin,
      data.id,
      caller.tenant_id,
      caller.role,
      caller.userId,
    );

    const { error } = await supabaseAdmin
      .from("trash_bin" as never)
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", caller.tenant_id);
    if (error) throw new Error(error.message);

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "data",
      action: "trash.purged",
      summary: `Item removido definitivamente da lixeira: ${row?.label ?? data.id}`,
      entityType: row?.entity_type ?? "trash",
      entityId: data.id,
      source: "ui",
    });

    return { ok: true };
  });
