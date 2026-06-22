import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditSafe } from "@/lib/audit.server";
import { isValidCPF } from "@/lib/patient-utils";

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "receptionist" | "professional" | "financial";
  phone?: string | null;
  specialty?: string | null;
  crm?: string | null;
  cpf?: string | null;
  commission_pct?: number | null;
  appointment_types?: string[] | null;
  active?: boolean;
}

export type TenantUserRole = CreateUserInput["role"];

export interface UpdateUserInput {
  user_id: string;
  full_name: string;
  role: TenantUserRole;
  phone?: string | null;
  specialty?: string | null;
  crm?: string | null;
  cpf?: string | null;
  commission_pct?: number | null;
  active?: boolean;
  /** Nova senha de acesso (opcional). Mínimo 6 caracteres. */
  password?: string | null;
}

export interface TenantUserRow {
  id: string;
  full_name: string;
  role: TenantUserRole;
  specialty: string | null;
  crm: string | null;
  cpf: string | null;
  phone: string | null;
  active: boolean;
  commission_pct: number | null;
  email: string;
}

async function requireAdminTenant(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
) {
  const { data: caller, error: callerErr } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (callerErr || !caller) throw new Error("Perfil não encontrado");
  if (caller.role !== "admin") throw new Error("Apenas administradores podem gerenciar usuários");
  if (!caller.tenant_id) throw new Error("Tenant não encontrado");
  return caller as { role: string; tenant_id: string };
}

export const listTenantUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const caller = await requireAdminTenant(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, specialty, crm, cpf, phone, active, commission_pct")
      .eq("tenant_id", caller.tenant_id)
      .order("full_name");

    if (error) throw new Error(error.message);

    const rows: TenantUserRow[] = [];
    for (const p of profiles ?? []) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id);
      rows.push({
        ...p,
        role: p.role as TenantUserRole,
        email: authUser.user?.email ?? "",
      });
    }

    return { users: rows };
  });

function validateProfessionalCpf(role: TenantUserRole, cpf?: string | null) {
  if (role !== "professional") return;
  const digits = cpf?.replace(/\D/g, "") ?? "";
  if (!digits) throw new Error("CPF é obrigatório para profissionais");
  if (!isValidCPF(cpf ?? "")) throw new Error("CPF inválido");
}

export const createTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateUserInput) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is admin and get their tenant
    const { data: caller, error: callerErr } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (callerErr || !caller) throw new Error("Perfil não encontrado");
    if (caller.role !== "admin") throw new Error("Apenas administradores podem criar usuários");
    if (!caller.tenant_id) throw new Error("Tenant não encontrado");

    if (data.role === "professional") {
      const cpf = data.cpf?.replace(/\D/g, "") ?? "";
      if (!cpf) throw new Error("CPF é obrigatório para profissionais");
      if (!isValidCPF(cpf)) throw new Error("CPF inválido");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create auth user
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");

    // Insert profile row
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      tenant_id: caller.tenant_id,
      full_name: data.full_name,
      role: data.role,
      phone: data.phone ?? null,
      specialty: data.role === "professional" ? data.specialty ?? null : null,
      crm: data.role === "professional" ? data.crm ?? null : null,
      cpf: data.role === "professional" ? data.cpf?.replace(/\D/g, "") ?? null : null,
      commission_pct: data.role === "professional" ? data.commission_pct ?? 0 : 0,
      appointment_types: data.role === "professional" ? data.appointment_types ?? null : null,
      active: data.active ?? true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw new Error(pErr.message);
    }

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "auth",
      action: "auth.user_created",
      summary: `Usuário criado: ${data.full_name} (${data.role})`,
      entityType: "user",
      entityId: created.user.id,
      details: { email: data.email.trim().toLowerCase(), role: data.role },
      source: "ui",
    });

    return { id: created.user.id };
  });

export const getTenantUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
    if (!caller || caller.role !== "admin") throw new Error("Sem permissão");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
    if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");

    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (error || !authUser.user) throw new Error("Conta de acesso não encontrada para este usuário");
    return { email: authUser.user.email ?? "" };
  });

export const updateTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdateUserInput) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller, error: callerErr } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (callerErr || !caller) throw new Error("Perfil não encontrado");
    if (caller.role !== "admin") throw new Error("Apenas administradores podem editar usuários");

    if (data.user_id === userId) {
      const { data: self } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (self && data.role !== self.role) {
        throw new Error("Você não pode mudar seu próprio cargo");
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, cpf")
      .eq("id", data.user_id)
      .maybeSingle();
    if (targetErr || !target || target.tenant_id !== caller.tenant_id) {
      throw new Error("Usuário não pertence à sua clínica");
    }

    const cpfForSave =
      data.role === "professional"
        ? data.cpf?.replace(/\D/g, "") || target.cpf || null
        : null;

    validateProfessionalCpf(data.role, cpfForSave);

    const { data: updated, error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name.trim(),
        role: data.role,
        phone: data.phone ?? null,
        active: data.active ?? true,
        specialty: data.role === "professional" ? data.specialty ?? null : null,
        crm: data.role === "professional" ? data.crm ?? null : null,
        cpf: cpfForSave,
        commission_pct: data.role === "professional" ? data.commission_pct ?? 0 : 0,
      })
      .eq("id", data.user_id)
      .select("id, full_name, role, specialty, crm, cpf, phone, active, commission_pct")
      .maybeSingle();

    if (pErr) throw new Error(pErr.message);
    if (!updated) throw new Error("Não foi possível atualizar o usuário");

    if (data.password?.trim()) {
      if (data.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.password,
      });
      if (pwdErr) throw new Error(pwdErr.message);
    }

    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      user_metadata: { full_name: data.full_name.trim(), role: data.role },
    });
    if (metaErr) console.error("[updateTenantUser] auth metadata:", metaErr.message);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.user_id);

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "auth",
      action: "auth.user_updated",
      summary: `Usuário atualizado: ${data.full_name} (${data.role})`,
      entityType: "user",
      entityId: data.user_id,
      details: {
        role: data.role,
        active: data.active ?? true,
        password_changed: Boolean(data.password?.trim()),
      },
      source: "ui",
    });

    return {
      user: {
        ...updated,
        role: updated.role as TenantUserRole,
        email: authUser.user?.email ?? "",
      } satisfies TenantUserRow,
    };
  });

export const resetTenantUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
    if (!caller || caller.role !== "admin") throw new Error("Sem permissão");
    if (!data.password || data.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
    if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "auth",
      action: "auth.password_reset",
      summary: "Senha de usuário redefinida pelo administrador",
      entityType: "user",
      entityId: data.user_id,
      source: "ui",
    });

    return { ok: true };
  });

export const deleteTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
    if (!caller || caller.role !== "admin") throw new Error("Sem permissão");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, full_name, role")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    logAuditSafe({
      tenantId: caller.tenant_id,
      actorId: userId,
      category: "auth",
      action: "auth.user_deleted",
      summary: `Usuário excluído: ${(target as { full_name: string }).full_name}`,
      entityType: "user",
      entityId: data.user_id,
      details: { role: (target as { role: string }).role },
      source: "ui",
    });

    return { ok: true };
  });