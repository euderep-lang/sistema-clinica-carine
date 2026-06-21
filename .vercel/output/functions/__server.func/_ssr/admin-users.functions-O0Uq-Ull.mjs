import { c as createServerRpc } from "./createServerRpc-9VenB7Hm.mjs";
import { a as createServerFn } from "./server-GGhSSPgi.mjs";
import { r as requireSupabaseAuth } from "./auth-middleware-DmvhAnC4.mjs";
import { i as isValidCPF } from "./patient-utils-YNqCHR6o.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
async function requireAdminTenant(supabase, userId) {
  const {
    data: caller,
    error: callerErr
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (callerErr || !caller) throw new Error("Perfil não encontrado");
  if (caller.role !== "admin") throw new Error("Apenas administradores podem gerenciar usuários");
  if (!caller.tenant_id) throw new Error("Tenant não encontrado");
  return caller;
}
const listTenantUsers_createServerFn_handler = createServerRpc({
  id: "03ee0b320151e35f89f67c5bb54a15963eaa4e3224507a2684abe1073e33de1c",
  name: "listTenantUsers",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => listTenantUsers.__executeServer(opts));
const listTenantUsers = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(listTenantUsers_createServerFn_handler, async ({
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const caller = await requireAdminTenant(supabase, userId);
  const {
    supabaseAdmin
  } = await import("./index.mjs").then((n) => n.ag);
  const {
    data: profiles,
    error
  } = await supabaseAdmin.from("profiles").select("id, full_name, role, specialty, crm, cpf, phone, active, commission_pct").eq("tenant_id", caller.tenant_id).order("full_name");
  if (error) throw new Error(error.message);
  const rows = [];
  for (const p of profiles ?? []) {
    const {
      data: authUser
    } = await supabaseAdmin.auth.admin.getUserById(p.id);
    rows.push({
      ...p,
      role: p.role,
      email: authUser.user?.email ?? ""
    });
  }
  return {
    users: rows
  };
});
function validateProfessionalCpf(role, cpf) {
  if (role !== "professional") return;
  const digits = cpf?.replace(/\D/g, "") ?? "";
  if (!digits) throw new Error("CPF é obrigatório para profissionais");
  if (!isValidCPF(cpf ?? "")) throw new Error("CPF inválido");
}
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
  } = await import("./index.mjs").then((n) => n.ag);
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
  } = await import("./index.mjs").then((n) => n.ag);
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
const updateTenantUser_createServerFn_handler = createServerRpc({
  id: "9107488cdf0bcf2165a99fce727e1d4cf355e147dd9673d7c15dece02ea558a0",
  name: "updateTenantUser",
  filename: "src/lib/admin-users.functions.ts"
}, (opts) => updateTenantUser.__executeServer(opts));
const updateTenantUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(updateTenantUser_createServerFn_handler, async ({
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
  if (caller.role !== "admin") throw new Error("Apenas administradores podem editar usuários");
  if (data.user_id === userId) {
    const {
      data: self
    } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (self && data.role !== self.role) {
      throw new Error("Você não pode mudar seu próprio cargo");
    }
  }
  const {
    supabaseAdmin
  } = await import("./index.mjs").then((n) => n.ag);
  const {
    data: target,
    error: targetErr
  } = await supabaseAdmin.from("profiles").select("tenant_id, cpf").eq("id", data.user_id).maybeSingle();
  if (targetErr || !target || target.tenant_id !== caller.tenant_id) {
    throw new Error("Usuário não pertence à sua clínica");
  }
  const cpfForSave = data.role === "professional" ? data.cpf?.replace(/\D/g, "") || target.cpf || null : null;
  validateProfessionalCpf(data.role, cpfForSave);
  const {
    data: updated,
    error: pErr
  } = await supabaseAdmin.from("profiles").update({
    full_name: data.full_name.trim(),
    role: data.role,
    phone: data.phone ?? null,
    active: data.active ?? true,
    specialty: data.role === "professional" ? data.specialty ?? null : null,
    crm: data.role === "professional" ? data.crm ?? null : null,
    cpf: cpfForSave,
    commission_pct: data.role === "professional" ? data.commission_pct ?? 0 : 0
  }).eq("id", data.user_id).select("id, full_name, role, specialty, crm, cpf, phone, active, commission_pct").maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!updated) throw new Error("Não foi possível atualizar o usuário");
  if (data.password?.trim()) {
    if (data.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
    const {
      error: pwdErr
    } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password
    });
    if (pwdErr) throw new Error(pwdErr.message);
  }
  const {
    error: metaErr
  } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
    user_metadata: {
      full_name: data.full_name.trim(),
      role: data.role
    }
  });
  if (metaErr) console.error("[updateTenantUser] auth metadata:", metaErr.message);
  const {
    data: authUser
  } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  return {
    user: {
      ...updated,
      role: updated.role,
      email: authUser.user?.email ?? ""
    }
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
  } = await import("./index.mjs").then((n) => n.ag);
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
  } = await import("./index.mjs").then((n) => n.ag);
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
  listTenantUsers_createServerFn_handler,
  resetTenantUserPassword_createServerFn_handler,
  updateTenantUser_createServerFn_handler
};
