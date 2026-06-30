import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtDateFromDate, fmtDateTime, fmtDateTimeFromDate } from "@/lib/locale";
import { renderTemplate } from "@/lib/settings-helpers";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";

import { buildCrmInboxSearch, type CrmInboxSearch } from "@/lib/crm-navigation";

export const DEFAULT_BIRTHDAY_MESSAGE =
  "{{primeiro_nome}}, feliz aniversário! 🎂\n\nA equipe da {{nome_clinica}} celebra com você este novo ciclo e deseja saúde, bem-estar e um dia muito especial. Conte sempre com a gente!";

export interface PatientLite {
  id: string;
  full_name: string;
  phone: string | null;
  birth_date?: string | null;
  gender?: string | null;
}

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** @deprecated Use `openCrmInbox` / `buildCrmInboxSearch` — conversas abrem no CRM. */
export function buildWhatsAppLink(phone: string | null | undefined, content: string): CrmInboxSearch {
  return buildCrmInboxSearch({ phone, draft: content });
}

export function buildVars(patient: PatientLite, tenantName: string, extras?: Record<string, string>): Record<string, string> {
  const primeiro = patient.full_name.split(" ")[0] ?? patient.full_name;
  return {
    ...buildGenderTemplateVars(patient.gender),
    nome_paciente: primeiro,
    nome_clinica: tenantName,
    primeiro_nome: primeiro,
    ...(extras ?? {}),
  };
}

export function applyVars(template: string, patient: PatientLite, tenantName: string, extras?: Record<string, string>): string {
  return renderTemplate(template, buildVars(patient, tenantName, extras));
}

export interface LogMessageInput {
  tenant_id: string;
  patient_id: string | null;
  template_id?: string | null;
  channel: Channel;
  content: string;
  sent_by?: string | null;
  status?: "sent" | "delivered" | "failed" | "pending";
  campaign_id?: string | null;
}

export async function logMessage(input: LogMessageInput) {
  const payload = {
    tenant_id: input.tenant_id,
    patient_id: input.patient_id,
    template_id: input.template_id ?? null,
    channel: input.channel,
    content: input.content,
    sent_by: input.sent_by ?? null,
    status: input.status ?? "sent",
    campaign_id: input.campaign_id ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("message_logs").insert(payload);
  if (error) throw error;
}

export function age(birth?: string | null, on: Date = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  let a = on.getFullYear() - b.getFullYear();
  const m = on.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < b.getDate())) a--;
  return a;
}

export function formatDateBR(d: string | Date): string {
  return typeof d === "string" ? fmtDate(d) : fmtDateFromDate(d);
}

export function formatDateTimeBR(d: string | Date): string {
  return typeof d === "string" ? fmtDateTime(d) : fmtDateTimeFromDate(d);
}

export const CHANNEL_BADGE: Record<string, { label: string; cls: string }> = {
  whatsapp: { label: "WhatsApp", cls: "bg-green-100 text-green-800 border-green-200" },
  sms: { label: "Mensagem de texto", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  email: { label: "E-mail", cls: "bg-purple-100 text-purple-800 border-purple-200" },
};

export const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "Enviado", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  delivered: { label: "Entregue", cls: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-800 border-red-200" },
  pending: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
};

export function daysSince(date: string | null | undefined, ref: Date = new Date()): number | null {
  if (!date) return null;
  const d = new Date(date);
  return Math.floor((ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function birthdayInMonth(birth: string, month: number): boolean {
  return new Date(birth).getMonth() === month;
}

export function birthdayDay(birth: string): number {
  return new Date(birth).getDate();
}

export function birthdayKey(birth: string): string {
  const d = new Date(birth);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}