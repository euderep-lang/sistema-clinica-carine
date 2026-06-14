import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
    const { data: target } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
    if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });