import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncZApiChatsToCrm } from "@/lib/whatsapp-crm-storage.server";
import { assignOpenConversationsToReception } from "@/lib/wa-crm-assign.server";
import { phonesMatch } from "@/lib/wa-phone";
import { getZApiChats, getZApiConfig } from "@/lib/whatsapp-zapi.server";
import { normalizeBrazilPhone } from "@/lib/whatsapp-meta.server";
import { logWaAudit } from "@/lib/wa-audit.server";
import { isContactPhotoCacheFresh } from "@/lib/wa-contact-photo";
import {
  cancelFollowUpsOnConversationClose,
  markConversationObjection,
  onAppointmentBooked,
  onAppointmentStatusChange,
  onInboundMessageForFollowUp,
  onOutboundMessageForFollowUp,
  processDueFollowUps,
  setupProfessionalPostConsultFollowUp,
  type ObjectionType,
} from "@/lib/wa-follow-up.server";
import {
  getWhatsAppConnectionStatus,
  getWhatsAppProvider,
  isWhatsAppConfigured,
  providerGetContactPhoto,
  providerSendText,
} from "@/lib/whatsapp-provider.server";
import {
  getWhatsAppConfig,
  listWhatsAppTemplates,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp-meta.server";

type CrmRole = "admin" | "professional" | "receptionist";

async function requireCrmAccess(
  supabase: Awaited<ReturnType<typeof import("@supabase/supabase-js").createClient>>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Perfil não encontrado");
  if (!["admin", "professional", "receptionist"].includes(profile.role)) {
    throw new Error("Sem permissão para o CRM");
  }
  return profile as { role: CrmRole; tenant_id: string };
}

export const getWhatsAppConnection = createServerFn({ method: "GET" }).handler(async () =>
  getWhatsAppConnectionStatus(),
);

export const getCrmMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const tenantId = profile.tenant_id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openRes, unassignedRes, unreadRes, closedTodayRes, responseRes] = await Promise.all([
      context.supabase
        .from("wa_conversations" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "open"),
      context.supabase
        .from("wa_conversations" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .is("assigned_to", null),
      context.supabase
        .from("wa_conversations" as never)
        .select("unread_count")
        .eq("tenant_id", tenantId)
        .gt("unread_count", 0),
      context.supabase
        .from("wa_conversations" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "closed")
        .gte("closed_at", todayStart.toISOString()),
      context.supabase
        .from("wa_conversations" as never)
        .select("first_response_at, created_at")
        .eq("tenant_id", tenantId)
        .not("first_response_at", "is", null)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    const unreadTotal = ((unreadRes.data ?? []) as { unread_count: number }[]).reduce(
      (s, r) => s + r.unread_count,
      0,
    );

    let avgFirstResponseMinutes: number | null = null;
    const withResponse = (responseRes.data ?? []) as { first_response_at: string; created_at: string }[];
    if (withResponse.length > 0) {
      const totalMs = withResponse.reduce((s, r) => {
        return s + (new Date(r.first_response_at).getTime() - new Date(r.created_at).getTime());
      }, 0);
      avgFirstResponseMinutes = Math.round(totalMs / withResponse.length / 60000);
    }

    return {
      open: openRes.count ?? 0,
      unassigned: unassignedRes.count ?? 0,
      unreadTotal,
      closedToday: closedTodayRes.count ?? 0,
      avgFirstResponseMinutes,
    };
  });

export const closeWaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    const { error } = await context.supabase
      .from("wa_conversations" as never)
      .update({
        status: "closed",
        close_reason: data.reason.trim(),
        closed_at: now,
        closed_by: context.userId,
        updated_at: now,
      } as never)
      .eq("id", data.conversationId);

    if (error) throw new Error(error.message);

    await logWaAudit({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      userId: context.userId,
      action: "conversation_closed",
      details: { reason: data.reason.trim() },
    });

    void cancelFollowUpsOnConversationClose(profile.tenant_id, data.conversationId).catch((e) =>
      console.error("[CRM] cancel follow-ups on close:", e),
    );

    return { ok: true };
  });

export const reopenWaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    const { error } = await context.supabase
      .from("wa_conversations" as never)
      .update({
        status: "open",
        close_reason: null,
        closed_at: null,
        closed_by: null,
        updated_at: now,
      } as never)
      .eq("id", data.conversationId);

    if (error) throw new Error(error.message);

    await logWaAudit({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      userId: context.userId,
      action: "conversation_reopened",
    });

    return { ok: true };
  });

export const linkWaPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; patientId: string | null }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);

    let contactName: string | null = null;
    if (data.patientId) {
      const { data: patient } = await context.supabase
        .from("patients")
        .select("full_name")
        .eq("id", data.patientId)
        .maybeSingle();
      contactName = patient?.full_name ?? null;
    }

    const { error } = await context.supabase
      .from("wa_conversations" as never)
      .update({
        patient_id: data.patientId,
        ...(contactName ? { contact_name: contactName } : {}),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.conversationId);

    if (error) throw new Error(error.message);

    await logWaAudit({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      userId: context.userId,
      action: "patient_linked",
      details: { patientId: data.patientId },
    });

    return { ok: true };
  });

export const getWaQuickReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const { data: crmReplies } = await context.supabase
      .from("wa_quick_replies" as never)
      .select("id, name, content, category, shortcut, sort_order")
      .eq("tenant_id", profile.tenant_id)
      .eq("active", true)
      .order("sort_order")
      .order("name");

    if (crmReplies?.length) return crmReplies as { id: string; name: string; content: string; category: string; shortcut: string | null }[];

    const { data } = await context.supabase
      .from("message_templates")
      .select("id, name, content")
      .eq("tenant_id", profile.tenant_id)
      .eq("channel", "whatsapp")
      .eq("active", true)
      .order("name");
    return ((data ?? []) as { id: string; name: string; content: string }[]).map((r) => ({
      ...r,
      category: "marketing",
      shortcut: null,
    }));
  });

const DEFAULT_QUICK_REPLIES = [
  { name: "Saudação", content: "Olá! {{nome_clinica}} aqui. Como posso ajudar?", category: "atendimento", shortcut: "/ola" },
  { name: "Horário", content: "Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.", category: "atendimento", shortcut: "/horario" },
  { name: "Agendar", content: "Para agendar, informe o melhor dia e período (manhã/tarde) para sua consulta.", category: "agenda", shortcut: "/agendar" },
  { name: "Endereço", content: "Estamos localizados em [endereço]. Posso enviar a localização no mapa?", category: "atendimento", shortcut: "/endereco" },
  { name: "Confirmação", content: "Confirmamos seu agendamento. Aguardamos você!", category: "agenda", shortcut: "/confirmar" },
  { name: "Remarcar", content: "Sem problemas! Qual outro dia e horário ficam melhor para você?", category: "agenda", shortcut: "/remarcar" },
  { name: "Valores", content: "Posso enviar os valores dos procedimentos de interesse. Qual serviço você gostaria de saber?", category: "vendas", shortcut: "/valores" },
  { name: "Documentos", content: "Por favor, envie os documentos solicitados por foto ou PDF neste chat.", category: "atendimento", shortcut: "/docs" },
  { name: "Retorno", content: "Vou verificar com a equipe e retorno em breve. Obrigado pela paciência!", category: "atendimento", shortcut: "/retorno" },
  { name: "Encerrar", content: "Foi um prazer atender você! Se precisar de algo, estamos à disposição.", category: "atendimento", shortcut: "/tchau" },
];

export const seedWaQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const { count } = await context.supabase
      .from("wa_quick_replies" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id);

    if ((count ?? 0) > 0) return { seeded: 0 };

    const rows = DEFAULT_QUICK_REPLIES.map((r, i) => ({
      tenant_id: profile.tenant_id,
      ...r,
      sort_order: i,
      active: true,
    }));

    const { error } = await context.supabase.from("wa_quick_replies" as never).insert(rows as never);
    if (error) throw new Error(error.message);
    return { seeded: rows.length };
  });

export const upsertWaQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; content: string; category?: string; shortcut?: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const row = {
      tenant_id: profile.tenant_id,
      name: data.name.trim(),
      content: data.content.trim(),
      category: data.category?.trim() || "geral",
      shortcut: data.shortcut?.trim() || null,
      active: true,
    };

    if (data.id) {
      const { error } = await context.supabase.from("wa_quick_replies" as never).update(row as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("wa_quick_replies" as never)
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as { id: string }).id };
  });

export const deleteWaQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("wa_quick_replies" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchWaMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; query: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const q = data.query.trim();
    if (!q) return [];

    const { data: rows, error } = await context.supabase
      .from("wa_messages" as never)
      .select("id, body, created_at, direction, message_type, media_filename")
      .eq("conversation_id", data.conversationId)
      .or(`body.ilike.%${q}%,media_filename.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const searchWaMessagesGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const q = data.query.trim();
    if (q.length < 2) return [];

    const { data: rows, error } = await context.supabase.rpc("search_wa_messages_global" as never, {
      p_query: q,
      p_limit: data.limit ?? 50,
    } as never);

    if (error) throw new Error(error.message);
    return (rows ?? []) as {
      message_id: string;
      conversation_id: string;
      body: string | null;
      message_type: string;
      direction: string;
      created_at: string;
      contact_name: string | null;
      contact_phone: string;
      channel: string;
    }[];
  });

export const getWaPatientContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patientId: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    const { data: upcoming } = await context.supabase
      .from("appointments")
      .select("id, date, start_time, status, profiles:professional_id(full_name)")
      .eq("patient_id", data.patientId)
      .gte("date", now.slice(0, 10))
      .in("status", ["scheduled", "confirmed", "rescheduled"])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(3);

    const { data: lastAppt } = await context.supabase
      .from("appointments")
      .select("id, date, start_time, status")
      .eq("patient_id", data.patientId)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(1);

    return {
      upcoming: upcoming ?? [],
      lastCompleted: lastAppt?.[0] ?? null,
    };
  });

export const assignWaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    const { error } = await context.supabase
      .from("wa_conversations" as never)
      .update({ assigned_to: context.userId, updated_at: now } as never)
      .eq("id", data.conversationId);

    if (error) throw new Error(error.message);

    await logWaAudit({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      userId: context.userId,
      action: "conversation_assigned",
      details: { assignedTo: context.userId },
    });

    return { ok: true };
  });

/** Atribui conversas abertas sem responsável ao recepcionista padrão da clínica. */
export const assignWaQueueToReception = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { allOpen?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const result = await assignOpenConversationsToReception(profile.tenant_id, {
      onlyUnassigned: !data.allOpen,
    });

    if (!result.receptionistId) {
      throw new Error("Nenhum usuário recepcionista cadastrado na clínica.");
    }

    await logWaAudit({
      tenantId: profile.tenant_id,
      userId: context.userId,
      action: "queue_assigned_to_reception",
      details: { updated: result.updated, receptionistId: result.receptionistId },
    });

    return result;
  });

export const toggleWaConversationTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; tagId: string; apply: boolean }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);

    const { data: conv, error: convErr } = await context.supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, tenant_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (convErr || !conv) throw new Error("Conversa não encontrada");

    const convRow = conv as { id: string; contact_phone: string; tenant_id: string };
    const { data: allConvs } = await context.supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone")
      .eq("tenant_id", convRow.tenant_id);

    const relatedIds = ((allConvs ?? []) as { id: string; contact_phone: string }[])
      .filter((c) => phonesMatch(c.contact_phone, convRow.contact_phone))
      .map((c) => c.id);
    const targetIds = relatedIds.length ? relatedIds : [data.conversationId];

    if (data.apply) {
      const { error } = await context.supabase
        .from("wa_conversation_tags" as never)
        .upsert({ conversation_id: data.conversationId, tag_id: data.tagId } as never, {
          onConflict: "conversation_id,tag_id",
          ignoreDuplicates: true,
        });
      if (error) throw new Error(error.message);
      return { ok: true, applied: true };
    }

    const { error } = await context.supabase
      .from("wa_conversation_tags" as never)
      .delete()
      .in("conversation_id", targetIds)
      .eq("tag_id", data.tagId);
    if (error) throw new Error(error.message);

    return { ok: true, applied: false };
  });

export const sendWaAfterHoursTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; text: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    if (!isWhatsAppConfigured()) throw new Error("WhatsApp não configurado");

    const { data: conv } = await context.supabase
      .from("wa_conversations" as never)
      .select("contact_phone")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    const phone = normalizeBrazilPhone((conv as { contact_phone: string }).contact_phone);
    await providerSendText(phone, data.text);

    await logWaAudit({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      userId: context.userId,
      action: "manual_message",
      details: { preview: data.text.slice(0, 80) },
    });

    return { ok: true };
  });

export const fetchWaContactPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);

    const { data: conv, error } = await context.supabase
      .from("wa_conversations" as never)
      .select("contact_phone, contact_photo_url, contact_photo_fetched_at")
      .eq("id", data.conversationId)
      .maybeSingle();

    if (error || !conv) throw new Error("Conversa não encontrada");

    const row = conv as {
      contact_phone: string;
      contact_photo_url: string | null;
      contact_photo_fetched_at: string | null;
    };

    if (row.contact_photo_url && isContactPhotoCacheFresh(row.contact_photo_fetched_at)) {
      return { url: row.contact_photo_url };
    }

    if (!isWhatsAppConfigured()) return { url: null as string | null };

    const phone = normalizeBrazilPhone(row.contact_phone);
    const url = await providerGetContactPhoto(phone);
    const now = new Date().toISOString();

    await context.supabase
      .from("wa_conversations" as never)
      .update({
        contact_photo_url: url,
        contact_photo_fetched_at: now,
      } as never)
      .eq("id", data.conversationId);

    return { url };
  });

/** Importa lista de chats ativos da Z-API para o CRM (não traz histórico antigo de mensagens). */
export const syncWaChatsFromZApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");

    const all: Awaited<ReturnType<typeof getZApiChats>> = [];
    for (let page = 1; page <= 20; page++) {
      const batch = await getZApiChats(config, page, 100);
      if (!batch.length) break;
      all.push(...batch);
      if (batch.length < 100) break;
    }

    const synced = await syncZApiChatsToCrm(profile.tenant_id, all);
    return { synced, total: all.length };
  });

// ---------------------------------------------------------------------------
// Tags — regras de automação
// ---------------------------------------------------------------------------

export const getWaTagRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("wa_tag_rules" as never)
      .select("id, tag_id, name, trigger_type, trigger_value, active, wa_tags(name, color)")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertWaTagRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      tagId: string;
      name: string;
      triggerType: "keyword" | "first_message" | "channel" | "pipeline_stage";
      triggerValue?: string;
      active?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const row = {
      tenant_id: profile.tenant_id,
      tag_id: data.tagId,
      name: data.name.trim(),
      trigger_type: data.triggerType,
      trigger_value: data.triggerValue?.trim() || null,
      active: data.active ?? true,
    };

    if (data.id) {
      const { error } = await context.supabase.from("wa_tag_rules" as never).update(row as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("wa_tag_rules" as never)
      .insert(row as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (created as { id: string }).id };
  });

export const deleteWaTagRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const { error } = await context.supabase.from("wa_tag_rules" as never).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Tarefas integradas
// ---------------------------------------------------------------------------

export const getWaTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId?: string; onlyOpen?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    let q = context.supabase
      .from("wa_tasks" as never)
      .select(
        "id, title, description, due_at, completed, completed_at, priority, task_type, conversation_id, assigned_to, assignee:assigned_to(full_name)",
      )
      .eq("tenant_id", profile.tenant_id)
      .order("due_at", { ascending: true });

    if (data.conversationId) q = q.eq("conversation_id", data.conversationId);
    if (data.onlyOpen !== false) q = q.eq("completed", false);
    if (profile.role === "receptionist") q = q.eq("assigned_to", context.userId);

    const { data: rows, error } = await q.limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createWaTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      conversationId?: string;
      title: string;
      description?: string;
      assignedTo: string;
      dueAt: string;
      priority?: "low" | "normal" | "high" | "urgent";
      taskType?: "call" | "follow_up" | "meeting" | "whatsapp" | "other";
      createReminder?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);

    const { data: task, error } = await context.supabase
      .from("wa_tasks" as never)
      .insert({
        tenant_id: profile.tenant_id,
        conversation_id: data.conversationId ?? null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        assigned_to: data.assignedTo,
        due_at: data.dueAt,
        priority: data.priority ?? "normal",
        task_type: data.taskType ?? "follow_up",
        created_by: context.userId,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    const taskId = (task as { id: string }).id;

    if (data.createReminder !== false && data.conversationId) {
      await context.supabase.from("wa_reminders" as never).insert({
        tenant_id: profile.tenant_id,
        conversation_id: data.conversationId,
        assigned_to: data.assignedTo,
        remind_at: data.dueAt,
        note: data.title.trim(),
        created_by: context.userId,
        task_id: taskId,
      } as never);
    }

    return { id: taskId };
  });

export const completeWaTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { taskId: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("wa_tasks" as never)
      .update({ completed: true, completed_at: now } as never)
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("wa_reminders" as never)
      .update({ completed: true } as never)
      .eq("task_id", data.taskId);

    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Funil de vendas
// ---------------------------------------------------------------------------

const DEFAULT_PIPELINE_STAGES = [
  { name: "Novo lead", color: "#6366f1", win_probability: 10 },
  { name: "Contato feito", color: "#8b5cf6", win_probability: 25 },
  { name: "Interesse", color: "#a855f7", win_probability: 40 },
  { name: "Orçamento enviado", color: "#f59e0b", win_probability: 60 },
  { name: "Negociação", color: "#f97316", win_probability: 75 },
  { name: "Agendado", color: "#22c55e", win_probability: 90 },
  { name: "Ganho", color: "#10b981", win_probability: 100 },
  { name: "Perdido", color: "#ef4444", win_probability: 0 },
];

async function ensurePipelineForTenant(
  supabase: Awaited<ReturnType<typeof import("@supabase/supabase-js").createClient>>,
  tenantId: string,
) {
  const { data: existing } = await supabase
    .from("wa_pipelines" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;

  const { data: pipeline, error: pErr } = await supabase
    .from("wa_pipelines" as never)
    .insert({ tenant_id: tenantId, name: "Funil principal", is_default: true } as never)
    .select("id")
    .single();
  if (pErr) throw new Error(pErr.message);

  const pipelineId = (pipeline as { id: string }).id;
  const stages = DEFAULT_PIPELINE_STAGES.map((s, i) => ({
    pipeline_id: pipelineId,
    ...s,
    sort_order: i,
  }));

  const { error: sErr } = await supabase.from("wa_pipeline_stages" as never).insert(stages as never);
  if (sErr) throw new Error(sErr.message);

  return pipelineId;
}

export const ensureWaPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const pipelineId = await ensurePipelineForTenant(context.supabase, profile.tenant_id);
    return { pipelineId };
  });

export const getWaPipelineBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);

    const { data: pipeline } = await context.supabase
      .from("wa_pipelines" as never)
      .select("id, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_default", true)
      .maybeSingle();

    if (!pipeline) return { pipeline: null, stages: [], deals: [] };

    const pipelineId = (pipeline as { id: string }).id;

    const [{ data: stages }, { data: deals }] = await Promise.all([
      context.supabase
        .from("wa_pipeline_stages" as never)
        .select("id, name, color, sort_order, win_probability")
        .eq("pipeline_id", pipelineId)
        .order("sort_order"),
      context.supabase
        .from("wa_deals" as never)
        .select(
          "id, title, value_cents, status, stage_id, conversation_id, assigned_to, updated_at, wa_conversations(contact_name, contact_phone, channel)",
        )
        .eq("pipeline_id", pipelineId)
        .eq("status", "open")
        .order("updated_at", { ascending: false }),
    ]);

    return { pipeline, stages: stages ?? [], deals: deals ?? [] };
  });

export const createWaDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { conversationId: string; title?: string; valueCents?: number; stageId?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);

    const { data: conv } = await context.supabase
      .from("wa_conversations" as never)
      .select("id, contact_name, contact_phone, deal_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");
    if ((conv as { deal_id?: string | null }).deal_id) {
      throw new Error("Esta conversa já possui negócio no funil");
    }

    const pipelineId = await ensurePipelineForTenant(context.supabase, profile.tenant_id);

    let stageId = data.stageId;
    if (!stageId) {
      const { data: firstStage } = await context.supabase
        .from("wa_pipeline_stages" as never)
        .select("id")
        .eq("pipeline_id", pipelineId)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      stageId = (firstStage as { id: string } | null)?.id;
    }
    if (!stageId) throw new Error("Funil sem etapas");

    const convRow = conv as { contact_name: string | null; contact_phone: string };
    const title = data.title?.trim() || convRow.contact_name || convRow.contact_phone;

    const { data: deal, error } = await context.supabase
      .from("wa_deals" as never)
      .insert({
        tenant_id: profile.tenant_id,
        pipeline_id: pipelineId,
        stage_id: stageId,
        conversation_id: data.conversationId,
        title,
        value_cents: data.valueCents ?? 0,
        assigned_to: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const dealId = (deal as { id: string }).id;
    await context.supabase
      .from("wa_conversations" as never)
      .update({ deal_id: dealId, pipeline_stage_id: stageId, updated_at: new Date().toISOString() } as never)
      .eq("id", data.conversationId);

    return { dealId };
  });

export const moveWaDealStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dealId: string; stageId: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const now = new Date().toISOString();

    const { data: stage } = await context.supabase
      .from("wa_pipeline_stages" as never)
      .select("win_probability, name")
      .eq("id", data.stageId)
      .maybeSingle();

    const winProb = (stage as { win_probability?: number; name?: string } | null)?.win_probability ?? 0;
    const stageName = (stage as { name?: string } | null)?.name ?? "";
    const status = winProb >= 100 ? "won" : stageName.toLowerCase().includes("perdido") ? "lost" : "open";

    const { data: deal, error } = await context.supabase
      .from("wa_deals" as never)
      .update({ stage_id: data.stageId, status, updated_at: now } as never)
      .eq("id", data.dealId)
      .select("conversation_id")
      .single();
    if (error) throw new Error(error.message);

    const conversationId = (deal as { conversation_id?: string | null }).conversation_id;
    if (conversationId) {
      await context.supabase
        .from("wa_conversations" as never)
        .update({ pipeline_stage_id: data.stageId, updated_at: now } as never)
        .eq("id", conversationId);
    }

    return { ok: true, status };
  });

// ---------------------------------------------------------------------------
// Broadcast Meta templates
// ---------------------------------------------------------------------------

export const getMetaWaTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    if (getWhatsAppProvider() !== "meta") return [];

    const config = getWhatsAppConfig();
    if (!config) return [];
    return listWhatsAppTemplates(config);
  });

export const sendWaBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      name: string;
      templateName: string;
      templateLanguage?: string;
      variables?: string[];
      conversationIds: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    if (getWhatsAppProvider() !== "meta") {
      throw new Error("Broadcast com templates Meta requer WHATSAPP_PROVIDER=meta");
    }
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");

    const { data: broadcast, error: bErr } = await context.supabase
      .from("wa_broadcasts" as never)
      .insert({
        tenant_id: profile.tenant_id,
        name: data.name.trim(),
        template_name: data.templateName,
        template_language: data.templateLanguage ?? "pt_BR",
        template_variables: data.variables ?? [],
        status: "sending",
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    const broadcastId = (broadcast as { id: string }).id;
    let sent = 0;
    let failed = 0;

    const { data: convs } = await context.supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, channel")
      .in("id", data.conversationIds)
      .eq("channel", "whatsapp");

    for (const conv of (convs ?? []) as { id: string; contact_phone: string }[]) {
      const phone = normalizeBrazilPhone(conv.contact_phone);
      const { data: recipient } = await context.supabase
        .from("wa_broadcast_recipients" as never)
        .insert({
          broadcast_id: broadcastId,
          conversation_id: conv.id,
          phone,
          status: "pending",
        } as never)
        .select("id")
        .single();

      try {
        const { messageId } = await sendWhatsAppTemplate(
          config,
          phone,
          data.templateName,
          data.templateLanguage ?? "pt_BR",
          data.variables ?? [],
        );
        sent++;
        await context.supabase
          .from("wa_broadcast_recipients" as never)
          .update({ status: "sent", sent_at: new Date().toISOString() } as never)
          .eq("id", (recipient as { id: string }).id);

        await context.supabase.from("wa_messages" as never).insert({
          tenant_id: profile.tenant_id,
          conversation_id: conv.id,
          wa_message_id: messageId,
          direction: "outbound",
          message_type: "template",
          body: `[Template] ${data.templateName}`,
          status: "sent",
          sent_by: context.userId,
        } as never);
      } catch (e) {
        failed++;
        await context.supabase
          .from("wa_broadcast_recipients" as never)
          .update({
            status: "failed",
            error_message: e instanceof Error ? e.message : "Erro",
          } as never)
          .eq("id", (recipient as { id: string }).id);
      }
    }

    await context.supabase
      .from("wa_broadcasts" as never)
      .update({
        status: failed > 0 && sent === 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
      } as never)
      .eq("id", broadcastId);

    return { broadcastId, sent, failed };
  });

// ---------------------------------------------------------------------------
// Follow-up automático
// ---------------------------------------------------------------------------

export const processWaFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    return processDueFollowUps();
  });

export const setupPostConsultationFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      patientId: string;
      appointmentId?: string | null;
      contactDate: string;
      secretaryNotes: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    if (profile.role !== "professional" && profile.role !== "admin") {
      throw new Error("Apenas profissionais podem agendar follow-up pós-consulta");
    }
    return setupProfessionalPostConsultFollowUp({
      tenantId: profile.tenant_id,
      patientId: data.patientId,
      appointmentId: data.appointmentId ?? null,
      professionalId: context.userId,
      contactDate: data.contactDate,
      secretaryNotes: data.secretaryNotes,
    });
  });

export const triggerAppointmentFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      appointmentId: string;
      patientId: string;
      professionalId: string;
      startsAt: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    await onAppointmentBooked({
      tenantId: profile.tenant_id,
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      startsAt: new Date(data.startsAt),
      createdBy: context.userId,
    });
    return { ok: true };
  });

export const triggerAppointmentStatusFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      appointmentId: string;
      patientId: string;
      professionalId: string;
      status: string;
      startsAt: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    await onAppointmentStatusChange({
      tenantId: profile.tenant_id,
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      status: data.status,
      startsAt: new Date(data.startsAt),
    });
    return { ok: true };
  });

export const markWaObjection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string; objectionType: ObjectionType }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    const suggestedMessage = await markConversationObjection({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      objectionType: data.objectionType,
      userId: context.userId,
    });
    return { suggestedMessage };
  });

const FOLLOW_UP_QUICK_REPLIES = [
  { name: "Lead 15min", category: "lead_sem_resposta", shortcut: "/lead15", content: "Oi, {{primeiro_nome}}, tudo bem? Vi que você entrou em contato com a clínica. Para eu te direcionar melhor: você busca atendimento por emagrecimento, hormônios, menopausa, lipedema ou outro motivo?" },
  { name: "Lead 4h", category: "lead_sem_resposta", shortcut: "/lead4h", content: "{{primeiro_nome}}, passando só para não deixar sua mensagem perdida. Me diga qual é sua principal queixa hoje que eu te explico como funciona o atendimento." },
  { name: "Lead 24h", category: "lead_sem_resposta", shortcut: "/lead24h", content: "Vou encerrar seu atendimento por aqui para não te incomodar, {{primeiro_nome}}. Mas, se ainda quiser entender como funciona a consulta médica, é só me falar aqui." },
  { name: "Lead 3 dias", category: "lead_sem_resposta", shortcut: "/lead3d", content: "{{primeiro_nome}}, muitas pacientes procuram a clínica quando já tentaram dieta, treino ou tratamentos isolados e ainda sentem que o corpo não responde. Se esse for seu caso, posso te explicar o caminho da avaliação médica." },
  { name: "Lead 7 dias", category: "lead_sem_resposta", shortcut: "/lead7d", content: "Último contato por aqui, {{primeiro_nome}}. Caso ainda queira agendar sua avaliação, me avise — será um prazer ter você aqui com a gente." },
  { name: "Valor 30min", category: "lead_valor", shortcut: "/valor30", content: "{{primeiro_nome}}, ficou alguma dúvida sobre o valor ou sobre como funciona a consulta? Posso te explicar de forma simples." },
  { name: "Valor 24h", category: "lead_valor", shortcut: "/valor24h", content: "Só reforçando, {{primeiro_nome}}: a consulta não é apenas uma conversa rápida. A ideia é investigar exames, sintomas, rotina, composição corporal e montar uma conduta individualizada para o seu caso, está bem?" },
  { name: "Valor 48h", category: "lead_valor", shortcut: "/valor48h", content: "Oii, {{primeiro_nome}}. Se o que te travou foi o valor, me fala com sinceridade. Às vezes consigo te orientar sobre a melhor forma de iniciar sem você ficar perdida." },
  { name: "Valor 5 dias", category: "lead_valor", shortcut: "/valor5d", content: "Continuar tentando sozinha pode sair mais caro do que investigar corretamente. Quando quiser dar esse passo com estratégia, me chama por aqui. Muito obrigada, {{primeiro_nome}}." },
  { name: "Agendamento", category: "agendamento", shortcut: "/agendou", content: "Oi, {{primeiro_nome}}, sua consulta ficou agendada para {{data_consulta}} às {{hora_consulta}}. Para aproveitar melhor, traga seus exames recentes, lista de medicamentos/suplementos e anote suas principais queixas." },
  { name: "Confirma 24h", category: "agendamento", shortcut: "/conf24h", content: "Confirmando sua consulta amanhã às {{hora_consulta}}, {{primeiro_nome}}. Responda \"eu vou\" para manter seu horário reservado." },
  { name: "Confirma 3h", category: "agendamento", shortcut: "/conf3h", content: "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Chegue com alguns minutos de antecedência e traga seus exames, se tiver. Te vejo lá!" },
  { name: "Pós-consulta 24h", category: "pos_consulta", shortcut: "/pos24h", content: "Oi, {{primeiro_nome}}. Passando para saber como você ficou após a consulta de ontem com a {{nome_profissional}}. Conseguiu entender bem a conduta e os próximos passos? Se surgiu alguma dúvida inicial, pode me enviar por aqui." },
  { name: "Pós-consulta 7d", category: "pos_consulta", shortcut: "/pos7d", content: "Oi, {{primeiro_nome}}. Já se passaram alguns dias desde a consulta. Como você está se sentindo? Alguma dificuldade com alimentação, medicação, suplementação ou rotina?" },
  { name: "Pós-consulta 15d", category: "pos_consulta", shortcut: "/pos15d", content: "{{primeiro_nome}}, passando para acompanhar sua evolução. O mais importante nessa fase não é perfeição, é aderência. Me diga: de 0 a 10, quanto você está se sentindo? Me conte tudo." },
  { name: "Pós-consulta 30d", category: "pos_consulta", shortcut: "/pos30d", content: "Já temos um mês desde a consulta, {{primeiro_nome}}. Esse é um bom momento para ajustar o que não encaixou bem na rotina. Como estão energia, fome, sono, disposição e medidas?" },
  { name: "Falta 2h", category: "falta", shortcut: "/falta2h", content: "Oi, {{primeiro_nome}}. Vi que você não conseguiu comparecer à consulta de hoje. Aconteceu algum imprevisto?" },
  { name: "Falta remarcar", category: "falta", shortcut: "/faltarem", content: "{{primeiro_nome}}, posso verificar uma nova possibilidade de horário para você. Quer que eu veja a próxima agenda disponível?" },
  { name: "Obj. vou pensar", category: "objecao", shortcut: "/objpensa", content: "Claro. Só não deixa isso virar mais uma coisa que você adia enquanto continua insatisfeita com os mesmos sintomas. Quer que eu te ajude a entender se esse atendimento faz sentido para seu caso?" },
  { name: "Obj. caro", category: "objecao", shortcut: "/objcaro", content: "Entendo. Só vale comparar com o que está incluso: avaliação médica, investigação por exames, conduta individualizada e acompanhamento. Não é uma consulta genérica." },
  { name: "Obj. agenda", category: "objecao", shortcut: "/objagenda", content: "Perfeito. Posso te enviar duas opções de horário e você escolhe a melhor?" },
  { name: "Obj. hormônio", category: "objecao", shortcut: "/objmedo", content: "A consulta não significa sair usando hormônio ou medicação. Primeiro vem avaliação, exames e indicação correta. Conduta sem necessidade não faz sentido." },
  { name: "Reativação 30d", category: "reativacao", shortcut: "/reat30", content: "Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Como você está? Se quiser retomar seu acompanhamento, estou à disposição." },
  { name: "Reativação 60d", category: "reativacao", shortcut: "/reat60", content: "{{primeiro_nome}}, passando para saber se ainda faz sentido cuidarmos da sua saúde com estratégia. Posso te ajudar a retomar?" },
  { name: "Reativação 90d", category: "reativacao", shortcut: "/reat90", content: "Último contato por aqui, {{primeiro_nome}}. Quando quiser voltar a cuidar de você com acompanhamento médico, é só me chamar." },
];

export const seedFollowUpQuickReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    let inserted = 0;

    for (const [i, r] of FOLLOW_UP_QUICK_REPLIES.entries()) {
      const { data: existing } = await context.supabase
        .from("wa_quick_replies" as never)
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .eq("shortcut", r.shortcut)
        .maybeSingle();
      if (existing) continue;

      const { error } = await context.supabase.from("wa_quick_replies" as never).insert({
        tenant_id: profile.tenant_id,
        name: r.name,
        content: r.content,
        category: r.category,
        shortcut: r.shortcut,
        sort_order: 100 + i,
        active: true,
      } as never);
      if (!error) inserted++;
    }

    return { inserted };
  });

export const getCrmAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireCrmAccess(context.supabase, context.userId);
    if (profile.role !== "admin") throw new Error("Apenas administradores podem ver métricas completas");

    const tenantId = profile.tenant_id;
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      leadsRes,
      convRes,
      apptRes,
      priceRes,
      closeRes,
      dealsRes,
      staffRes,
    ] = await Promise.all([
      context.supabase
        .from("wa_crm_events" as never)
        .select("created_at")
        .eq("tenant_id", tenantId)
        .eq("event_type", "lead_received")
        .gte("created_at", since30),
      context.supabase
        .from("wa_conversations" as never)
        .select("id, created_at, first_response_at, last_patient_reply_at, close_reason, assigned_to, price_sent_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", since30),
      context.supabase
        .from("appointments")
        .select("id, status, patient_id, professional_id, created_at, date, start_time")
        .eq("tenant_id", tenantId)
        .gte("created_at", since30),
      context.supabase
        .from("wa_conversations" as never)
        .select("id, patient_id, price_sent_at")
        .eq("tenant_id", tenantId)
        .not("price_sent_at", "is", null)
        .gte("price_sent_at", since30),
      context.supabase
        .from("wa_conversations" as never)
        .select("close_reason, status")
        .eq("tenant_id", tenantId)
        .eq("status", "closed")
        .gte("updated_at", since30),
      context.supabase
        .from("wa_deals" as never)
        .select("id, status, assigned_to, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", since30),
      context.supabase
        .from("profiles")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .in("role", ["admin", "receptionist", "professional"]),
    ]);

    const leads = (leadsRes.data ?? []) as { created_at: string }[];
    const convs = (convRes.data ?? []) as {
      id: string;
      created_at: string;
      first_response_at: string | null;
      last_patient_reply_at: string | null;
      close_reason: string | null;
      assigned_to: string | null;
      price_sent_at: string | null;
    }[];
    const appts = (apptRes.data ?? []) as {
      id: string;
      status: string;
      patient_id: string;
      professional_id: string;
      created_at: string;
    }[];
    const priced = (priceRes.data ?? []) as { id: string; patient_id: string | null }[];
    const closed = (closeRes.data ?? []) as { close_reason: string | null }[];
    const deals = (dealsRes.data ?? []) as { status: string; assigned_to: string | null }[];
    const staff = (staffRes.data ?? []) as { id: string; full_name: string }[];

    const leadsPerDay: Record<string, number> = {};
    for (const l of leads) {
      const day = l.created_at.slice(0, 10);
      leadsPerDay[day] = (leadsPerDay[day] ?? 0) + 1;
    }

    const withResponse = convs.filter((c) => c.first_response_at);
    let avgFirstResponseMinutes: number | null = null;
    if (withResponse.length) {
      const total = withResponse.reduce(
        (s, c) => s + (new Date(c.first_response_at!).getTime() - new Date(c.created_at).getTime()),
        0,
      );
      avgFirstResponseMinutes = Math.round(total / withResponse.length / 60000);
    }

    const repliedLeads = convs.filter((c) => c.last_patient_reply_at).length;
    const leadResponseRate = convs.length ? Math.round((repliedLeads / convs.length) * 100) : 0;

    const scheduledAppts = appts.filter((a) =>
      ["scheduled", "confirmed", "completed", "in_progress", "no_show"].includes(a.status),
    ).length;
    const schedulingRate = convs.length ? Math.round((scheduledAppts / convs.length) * 100) : 0;

    const completed = appts.filter((a) => a.status === "completed").length;
    const noShow = appts.filter((a) => a.status === "no_show").length;
    const attendanceRate =
      completed + noShow > 0 ? Math.round((completed / (completed + noShow)) * 100) : null;

    const pricedPatientIds = new Set(priced.map((p) => p.patient_id).filter(Boolean));
    const bookedAfterPrice = appts.filter(
      (a) => a.patient_id && pricedPatientIds.has(a.patient_id),
    ).length;
    const closeRateAfterPrice =
      priced.length > 0 ? Math.round((bookedAfterPrice / priced.length) * 100) : null;

    const lossReasons: Record<string, number> = {};
    for (const c of closed) {
      const reason = c.close_reason?.trim() || "Sem motivo";
      lossReasons[reason] = (lossReasons[reason] ?? 0) + 1;
    }

    const staffNames = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));
    const conversionByStaff: Record<string, { name: string; deals: number; appointments: number }> = {};
    for (const d of deals.filter((x) => x.status === "won" && x.assigned_to)) {
      const id = d.assigned_to!;
      if (!conversionByStaff[id]) conversionByStaff[id] = { name: staffNames[id] ?? "Equipe", deals: 0, appointments: 0 };
      conversionByStaff[id].deals++;
    }
    for (const a of appts.filter((x) => ["completed", "confirmed", "scheduled"].includes(x.status))) {
      const id = a.professional_id;
      if (!conversionByStaff[id]) conversionByStaff[id] = { name: staffNames[id] ?? "Equipe", deals: 0, appointments: 0 };
      conversionByStaff[id].appointments++;
    }
    const topConverters = Object.values(conversionByStaff)
      .map((s) => ({ ...s, score: s.deals * 3 + s.appointments }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      periodDays: 30,
      leadsPerDay: Object.entries(leadsPerDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      avgFirstResponseMinutes,
      leadResponseRate,
      schedulingRate,
      attendanceRate,
      closeRateAfterPrice,
      lossReasons: Object.entries(lossReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      topConverters,
      totals: {
        leads: leads.length,
        conversations: convs.length,
        appointments: appts.length,
        pricedConversations: priced.length,
      },
    };
  });
