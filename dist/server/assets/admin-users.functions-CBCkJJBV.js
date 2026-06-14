import { c as createServerRpc } from "./createServerRpc-DahUPuBo.js";
import { a as createServerFn } from "./server-BXpJ0fIw.js";
import { r as requireSupabaseAuth } from "./auth-middleware-D93OGO-c.js";
import { c as isValidCPF } from "./patient-utils-YNqCHR6o.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@supabase/supabase-js";
const createTenantUser_createServerFn_handler = createServerRpc({
  id: "1bb0dafb088cd91e112e6a468179eccc6177fce97337c2187786b4abdf97f102",
  name: "createTenantUser",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => createTenantUser.__executeServer(opts));
const createTenantUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createTenantUser_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data: caller,
    error: callerErr
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (callerErr || !caller) throw new Error("Perfil não encontrado");
  if (caller.role !== "admin") throw new Error("Apenas administradores podem criar usuários");
  if (!caller.tenant_id) throw new Error("Tenant não encontrado");
  if (data.role === "professional") {
    const cpf = data.cpf?.replace(/\D/g, "") ?? "";
    if (!cpf) throw new Error("CPF é obrigatório para profissionais");
    if (!isValidCPF(cpf)) throw new Error("CPF inválido");
  }
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: created,
    error: cErr
  } = await supabaseAdmin.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name
    }
  });
  if (cErr || !created.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");
  const {
    error: pErr
  } = await supabaseAdmin.from("profiles").insert({
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
    active: data.active ?? true
  });
  if (pErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {
    });
    throw new Error(pErr.message);
  }
  return {
    id: created.user.id
  };
});
const getTenantUserEmail_createServerFn_handler = createServerRpc({
  id: "ca8aed5939e392c4a5c041d45553cfdca95e689e3c20cf3fc5d22669c25bc39e",
  name: "getTenantUserEmail",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => getTenantUserEmail.__executeServer(opts));
const getTenantUserEmail = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(getTenantUserEmail_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data: caller
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (!caller || caller.role !== "admin") throw new Error("Sem permissão");
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: target
  } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
  if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");
  const {
    data: authUser,
    error
  } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  if (error || !authUser.user) throw new Error("Conta de acesso não encontrada para este usuário");
  return {
    email: authUser.user.email ?? ""
  };
});
const resetTenantUserPassword_createServerFn_handler = createServerRpc({
  id: "885dfaeb905362b51c8672c1a11f2c3922f6092128c10666ec8f070d6e7c75f8",
  name: "resetTenantUserPassword",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => resetTenantUserPassword.__executeServer(opts));
const resetTenantUserPassword = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(resetTenantUserPassword_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data: caller
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (!caller || caller.role !== "admin") throw new Error("Sem permissão");
  if (!data.password || data.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: target
  } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
  if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");
  const {
    error
  } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
    password: data.password
  });
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const deleteTenantUser_createServerFn_handler = createServerRpc({
  id: "d095d7f98195e9cda09e0ebca6bcf785f4ed5e3119335f5419cbbf762ef3f935",
  name: "deleteTenantUser",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => deleteTenantUser.__executeServer(opts));
const deleteTenantUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(deleteTenantUser_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const {
    data: caller
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (!caller || caller.role !== "admin") throw new Error("Sem permissão");
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: target
  } = await supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.user_id).maybeSingle();
  if (!target || target.tenant_id !== caller.tenant_id) throw new Error("Usuário não pertence à sua clínica");
  const {
    error
  } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
export {
  createTenantUser_createServerFn_handler,
  deleteTenantUser_createServerFn_handler,
  getTenantUserEmail_createServerFn_handler,
  resetTenantUserPassword_createServerFn_handler
};
