import { s as supabase } from "./client-CUE-_UGz.js";
import { v as renderTemplate } from "./router-uS_mSfDy.js";
function digitsOnly(phone) {
  return (phone ?? "").replace(/\D/g, "");
}
function buildWhatsAppLink(phone, content) {
  let d = digitsOnly(phone);
  if (d.length > 0 && !d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(content)}`;
}
function buildVars(patient, tenantName, extras) {
  return {
    nome_paciente: patient.full_name,
    nome_clinica: tenantName,
    primeiro_nome: patient.full_name.split(" ")[0] ?? patient.full_name,
    ...extras ?? {}
  };
}
function applyVars(template, patient, tenantName, extras) {
  return renderTemplate(template, buildVars(patient, tenantName, extras));
}
async function logMessage(input) {
  const payload = {
    tenant_id: input.tenant_id,
    patient_id: input.patient_id,
    template_id: input.template_id ?? null,
    channel: input.channel,
    content: input.content,
    sent_by: input.sent_by ?? null,
    status: input.status ?? "sent",
    campaign_id: input.campaign_id ?? null
  };
  const { error } = await supabase.from("message_logs").insert(payload);
  if (error) throw error;
}
function age(birth, on = /* @__PURE__ */ new Date()) {
  if (!birth) return null;
  const b = new Date(birth);
  let a = on.getFullYear() - b.getFullYear();
  const m = on.getMonth() - b.getMonth();
  if (m < 0 || m === 0 && on.getDate() < b.getDate()) a--;
  return a;
}
function formatDateTimeBR(d) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
const CHANNEL_BADGE = {
  whatsapp: { label: "WhatsApp", cls: "bg-green-100 text-green-800 border-green-200" },
  sms: { label: "Mensagem de texto", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  email: { label: "E-mail", cls: "bg-purple-100 text-purple-800 border-purple-200" }
};
const STATUS_BADGE = {
  sent: { label: "Enviado", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  delivered: { label: "Entregue", cls: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-800 border-red-200" },
  pending: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" }
};
function daysSince(date, ref = /* @__PURE__ */ new Date()) {
  if (!date) return null;
  const d = new Date(date);
  return Math.floor((ref.getTime() - d.getTime()) / (1e3 * 60 * 60 * 24));
}
export {
  CHANNEL_BADGE as C,
  STATUS_BADGE as S,
  applyVars as a,
  buildWhatsAppLink as b,
  age as c,
  daysSince as d,
  formatDateTimeBR as f,
  logMessage as l
};
