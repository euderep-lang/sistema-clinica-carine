import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderTemplate } from "@/lib/settings-helpers";
import { todayISO } from "@/lib/locale";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";
import { pickAndAdvanceMessageVariant } from "@/lib/wa-follow-up-variant.server";
import {
  ensureOutboundConversationForPatient,
  processDueFollowUps,
} from "@/lib/wa-follow-up.server";
import {
  ensureScheduledInMessagingWindow,
  isWithinMessagingWindow,
} from "@/lib/wa-appointment-reminders";
import { getTenantSettingServer } from "@/lib/wa-tenant-settings.server";
import {
  BIRTHDAY_STEP_KEY,
  normalizeWaBirthdaySettings,
  WA_BIRTHDAY_TEMPLATES_KEY,
} from "@/lib/wa-birthday-settings";
import { normalizeMessageLineBreaks } from "@/lib/wa-automation-quick-replies";
import { isWhatsAppConfigured } from "@/lib/whatsapp-provider.server";

type BirthdayPatientRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  phone_ddi: string | null;
  gender: string | null;
  birth_date: string;
};

async function getTenantName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  return data?.name ?? "Clínica";
}

async function alreadyScheduledBirthdayThisYear(
  tenantId: string,
  patientId: string,
  year: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .select("id, metadata")
    .eq("tenant_id", tenantId)
    .eq("patient_id", patientId)
    .eq("trigger_type", "birthday")
    .gte("started_at", `${year}-01-01T00:00:00.000Z`)
    .lte("started_at", `${year}-12-31T23:59:59.999Z`)
    .limit(20);

  const rows = (data ?? []) as { id: string; metadata?: { birthday_year?: string } | null }[];
  return rows.some((r) => String(r.metadata?.birthday_year ?? year) === year);
}

async function scheduleBirthdayMessage(input: {
  tenantId: string;
  patientId: string;
  patientName: string;
  gender?: string | null;
  birthdayDate: string;
}): Promise<string | null> {
  const settings = normalizeWaBirthdaySettings(
    await getTenantSettingServer(input.tenantId, WA_BIRTHDAY_TEMPLATES_KEY),
  );
  if (!settings.enabled) return null;

  const year = input.birthdayDate.slice(0, 4);
  if (await alreadyScheduledBirthdayThisYear(input.tenantId, input.patientId, year)) {
    return null;
  }

  const conv = await ensureOutboundConversationForPatient(input.tenantId, input.patientId);
  if (!conv?.id) return null;

  const { template } = await pickAndAdvanceMessageVariant({
    tenantId: input.tenantId,
    stepKey: BIRTHDAY_STEP_KEY,
    patientId: input.patientId,
    conversationId: conv.id,
    templates: settings.templates,
  });

  const clinicName = await getTenantName(input.tenantId);
  const first = input.patientName.trim().split(/\s+/)[0] ?? "";
  const text = normalizeMessageLineBreaks(
    renderTemplate(template, {
      ...buildGenderTemplateVars(input.gender),
      primeiro_nome: first,
      nome_paciente: first,
      saudacao: first ? `Olá, ${first}` : "Olá",
      nome_clinica: clinicName,
    }),
  );
  if (!text) return null;

  const scheduledAt = ensureScheduledInMessagingWindow(new Date());

  const { data: run, error: runErr } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .insert({
      tenant_id: input.tenantId,
      trigger_type: "birthday",
      patient_id: input.patientId,
      conversation_id: conv.id,
      metadata: {
        birthday_date: input.birthdayDate,
        birthday_year: year,
      },
    } as never)
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);

  const runId = (run as { id: string }).id;
  const { error: schedErr } = await supabaseAdmin.from("wa_follow_up_schedules" as never).insert({
    tenant_id: input.tenantId,
    run_id: runId,
    step_key: BIRTHDAY_STEP_KEY,
    sequence_order: 0,
    mode: "auto",
    scheduled_at: scheduledAt.toISOString(),
    message_template: text,
    rendered_message: text,
    conversation_id: conv.id,
    patient_id: input.patientId,
  } as never);
  if (schedErr) throw new Error(schedErr.message);

  return runId;
}

/**
 * Agenda (e dispara) mensagens de aniversário do dia — só entre 7h e 20h (SP).
 * Idempotente: no máximo 1 envio por paciente/ano.
 */
export async function processBirthdayMessages(limit = 40): Promise<{
  candidates: number;
  scheduled: number;
  skipped: number;
  outsideWindow: boolean;
}> {
  if (!isWhatsAppConfigured()) {
    return { candidates: 0, scheduled: 0, skipped: 0, outsideWindow: false };
  }

  if (!isWithinMessagingWindow(new Date())) {
    return { candidates: 0, scheduled: 0, skipped: 0, outsideWindow: true };
  }

  const today = todayISO();
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));

  const { data, error } = await supabaseAdmin.rpc("patients_with_birthday_on" as never, {
    p_month: month,
    p_day: day,
  } as never);

  if (error) {
    console.error("[birthday] patients_with_birthday_on", error.message);
    throw new Error(error.message);
  }

  const patients = ((data ?? []) as BirthdayPatientRow []).slice(0, limit);
  let scheduled = 0;
  let skipped = 0;
  const runIds: string[] = [];

  for (const p of patients) {
    try {
      const runId = await scheduleBirthdayMessage({
        tenantId: p.tenant_id,
        patientId: p.id,
        patientName: p.full_name,
        gender: p.gender,
        birthdayDate: today,
      });
      if (runId) {
        scheduled += 1;
        runIds.push(runId);
      } else {
        skipped += 1;
      }
    } catch (e) {
      skipped += 1;
      console.error("[birthday] schedule error", p.id, e);
    }
  }

  for (const runId of runIds) {
    try {
      await processDueFollowUps(5, { runId });
    } catch (e) {
      console.error("[birthday] processDueFollowUps", runId, e);
    }
  }

  return { candidates: patients.length, scheduled, skipped, outsideWindow: false };
}
