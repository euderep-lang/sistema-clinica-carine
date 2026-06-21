import { F as supabaseAdmin, H as getDefaultReceptionAssignee, m as isWhatsAppConfigured, n as normalizeBrazilPhone, o as providerSendText, I as insertWaMessage, k as phonesMatch, J as renderTemplate, K as fmtTimeFromDate, L as fmtDateFromDate } from "../server.js";
const FOLLOW_UP_SEQUENCES = {
  lead_no_response: [
    {
      key: "lead_no_response_15m",
      delayMinutes: 15,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}, tudo bem? Vi que você entrou em contato com a clínica. Para eu te direcionar melhor: você busca atendimento por emagrecimento, hormônios, menopausa, lipedema ou outro motivo?"
    },
    {
      key: "lead_no_response_4h",
      delayMinutes: 240,
      mode: "auto",
      template: "{{primeiro_nome}}, passando só para não deixar sua mensagem perdida. Me diga qual é sua principal queixa hoje que eu te explico como funciona o atendimento."
    },
    {
      key: "lead_no_response_24h",
      delayMinutes: 1440,
      mode: "auto",
      template: "Vou encerrar seu atendimento por aqui para não te incomodar, {{primeiro_nome}}. Mas, se ainda quiser entender como funciona a consulta médica, é só me falar aqui."
    },
    {
      key: "lead_no_response_3d",
      delayMinutes: 4320,
      mode: "auto",
      template: "{{primeiro_nome}}, muitas pacientes procuram a clínica quando já tentaram dieta, treino ou tratamentos isolados e ainda sentem que o corpo não responde. Se esse for seu caso, posso te explicar o caminho da avaliação médica."
    },
    {
      key: "lead_no_response_7d",
      delayMinutes: 10080,
      mode: "auto",
      template: "Último contato por aqui, {{primeiro_nome}}. Caso ainda queira agendar sua avaliação, me avise — será um prazer ter você aqui com a gente."
    }
  ],
  lead_price_sent: [
    {
      key: "lead_price_sent_30m",
      delayMinutes: 30,
      mode: "auto",
      template: "{{primeiro_nome}}, ficou alguma dúvida sobre o valor ou sobre como funciona a consulta? Posso te explicar de forma simples."
    },
    {
      key: "lead_price_sent_24h",
      delayMinutes: 1440,
      mode: "auto",
      template: "Só reforçando, {{primeiro_nome}}: a consulta não é apenas uma conversa rápida. A ideia é investigar exames, sintomas, rotina, composição corporal e montar uma conduta individualizada para o seu caso, está bem?"
    },
    {
      key: "lead_price_sent_48h",
      delayMinutes: 2880,
      mode: "auto",
      template: "Oii, {{primeiro_nome}}. Se o que te travou foi o valor, me fala com sinceridade. Às vezes consigo te orientar sobre a melhor forma de iniciar sem você ficar perdida."
    },
    {
      key: "lead_price_sent_5d",
      delayMinutes: 7200,
      mode: "auto",
      template: "Continuar tentando sozinha pode sair mais caro do que investigar corretamente. Quando quiser dar esse passo com estratégia, me chama por aqui. Muito obrigada, {{primeiro_nome}}."
    }
  ],
  appointment_booked: [
    {
      key: "appointment_booked_now",
      delayMinutes: 0,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}, sua consulta ficou agendada para {{data_consulta}} às {{hora_consulta}}. Para aproveitar melhor, traga seus exames recentes, lista de medicamentos/suplementos e anote suas principais queixas."
    },
    {
      key: "appointment_reminder_24h",
      delayMinutes: -1440,
      mode: "auto",
      template: 'Confirmando sua consulta amanhã às {{hora_consulta}}, {{primeiro_nome}}. Responda "eu vou" para manter seu horário reservado.'
    },
    {
      key: "appointment_reminder_3h",
      delayMinutes: -180,
      mode: "auto",
      template: "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Chegue com alguns minutos de antecedência e traga seus exames, se tiver. Te vejo lá!"
    }
  ],
  post_consultation: [
    {
      key: "post_consultation_24h",
      delayMinutes: 1440,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}. Passando para saber como você ficou após a consulta de ontem com a {{nome_profissional}}. Conseguiu entender bem a conduta e os próximos passos? Se surgiu alguma dúvida inicial, pode me enviar por aqui."
    },
    {
      key: "post_consultation_7d",
      delayMinutes: 10080,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}. Já se passaram alguns dias desde a consulta. Como você está se sentindo? Alguma dificuldade com alimentação, medicação, suplementação ou rotina?"
    },
    {
      key: "post_consultation_15d",
      delayMinutes: 21600,
      mode: "auto",
      template: "{{primeiro_nome}}, passando para acompanhar sua evolução. O mais importante nessa fase não é perfeição, é aderência. Me diga: de 0 a 10, quanto você está se sentindo? Me conte tudo."
    },
    {
      key: "post_consultation_30d",
      delayMinutes: 43200,
      mode: "auto",
      template: "Já temos um mês desde a consulta, {{primeiro_nome}}. Esse é um bom momento para ajustar o que não encaixou bem na rotina. Como estão energia, fome, sono, disposição e medidas?"
    }
  ],
  no_show: [
    {
      key: "no_show_2h",
      delayMinutes: 120,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}. Vi que você não conseguiu comparecer à consulta de hoje. Aconteceu algum imprevisto?"
    },
    {
      key: "no_show_next_day",
      delayMinutes: 1440,
      mode: "manual",
      template: "{{primeiro_nome}}, posso verificar uma nova possibilidade de horário para você. Quer que eu veja a próxima agenda disponível?"
    }
  ],
  reactivation: [
    {
      key: "reactivation_30d",
      delayMinutes: 43200,
      mode: "auto",
      template: "Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Como você está? Se quiser retomar seu acompanhamento, estou à disposição."
    },
    {
      key: "reactivation_60d",
      delayMinutes: 86400,
      mode: "auto",
      template: "{{primeiro_nome}}, passando para saber se ainda faz sentido cuidarmos da sua saúde com estratégia. Posso te ajudar a retomar?"
    },
    {
      key: "reactivation_90d",
      delayMinutes: 129600,
      mode: "auto",
      template: "Último contato por aqui, {{primeiro_nome}}. Quando quiser voltar a cuidar de você com acompanhamento médico, é só me chamar."
    }
  ],
  objection_vou_pensar: [
    {
      key: "objection_vou_pensar",
      delayMinutes: 0,
      mode: "manual",
      template: "Claro. Só não deixa isso virar mais uma coisa que você adia enquanto continua insatisfeita com os mesmos sintomas. Quer que eu te ajude a entender se esse atendimento faz sentido para seu caso?"
    }
  ],
  objection_achei_caro: [
    {
      key: "objection_achei_caro",
      delayMinutes: 0,
      mode: "manual",
      template: "Entendo. Só vale comparar com o que está incluso: avaliação médica, investigação por exames, conduta individualizada e acompanhamento. Não é uma consulta genérica."
    }
  ],
  objection_preciso_agenda: [
    {
      key: "objection_preciso_agenda",
      delayMinutes: 0,
      mode: "manual",
      template: "Perfeito. Posso te enviar duas opções de horário e você escolhe a melhor?"
    }
  ],
  objection_medo_hormonio: [
    {
      key: "objection_medo_hormonio",
      delayMinutes: 0,
      mode: "manual",
      template: "A consulta não significa sair usando hormônio ou medicação. Primeiro vem avaliação, exames e indicação correta. Conduta sem necessidade não faz sentido."
    }
  ]
};
const FOLLOW_UP_TAG_POST_CONSULT = {
  name: "Follow-up Pós-Consulta",
  color: "#166534"
};
const PRICE_KEYWORDS = [
  "valor",
  "preço",
  "preco",
  "r$",
  "investimento",
  "custa",
  "quanto",
  "orçamento",
  "orcamento"
];
function firstName(fullName) {
  if (!fullName?.trim()) return "tudo bem";
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
function detectPriceInMessage(text) {
  const lower = text.toLowerCase();
  return PRICE_KEYWORDS.some((k) => lower.includes(k)) || /\br\$\s*\d/.test(lower);
}
function buildFollowUpVars(ctx) {
  const appt = ctx.appointmentAt ?? null;
  return {
    primeiro_nome: firstName(ctx.patientName),
    nome_paciente: ctx.patientName?.trim() || "paciente",
    nome_profissional: ctx.professionalName?.trim() || "equipe médica",
    nome_clinica: ctx.tenantName?.trim() || "nossa clínica",
    data_consulta: appt ? fmtDateFromDate(appt) : "{{data_consulta}}",
    hora_consulta: appt ? fmtTimeFromDate(appt) : "{{hora_consulta}}"
  };
}
function renderFollowUpMessage(template, ctx) {
  return renderTemplate(template, buildFollowUpVars(ctx));
}
async function logCrmEvent(input) {
  await supabaseAdmin.from("wa_crm_events").insert({
    tenant_id: input.tenantId,
    event_type: input.eventType,
    conversation_id: input.conversationId ?? null,
    patient_id: input.patientId ?? null,
    appointment_id: input.appointmentId ?? null,
    user_id: input.userId ?? null,
    metadata: input.metadata ?? {}
  });
}
async function getTenantName(tenantId) {
  const { data } = await supabaseAdmin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  return data?.name ?? "Clínica";
}
async function ensureFollowUpTag(tenantId, name, color) {
  const { data: existing } = await supabaseAdmin.from("wa_tags").select("id").eq("tenant_id", tenantId).eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabaseAdmin.from("wa_tags").insert({ tenant_id: tenantId, name, color }).select("id").single();
  if (error) throw new Error(error.message);
  return created.id;
}
async function applyTagToConversation(conversationId, tagId) {
  await supabaseAdmin.from("wa_conversation_tags").upsert(
    { conversation_id: conversationId, tag_id: tagId },
    { onConflict: "conversation_id,tag_id", ignoreDuplicates: true }
  );
}
async function findConversationForPatient(tenantId, patientId) {
  const { data: byLink } = await supabaseAdmin.from("wa_conversations").select("id, contact_phone, contact_name").eq("tenant_id", tenantId).eq("patient_id", patientId).order("last_message_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (byLink) return byLink;
  const { data: patient } = await supabaseAdmin.from("patients").select("phone, full_name").eq("id", patientId).maybeSingle();
  if (!patient?.phone) return null;
  const { data: convs } = await supabaseAdmin.from("wa_conversations").select("id, contact_phone, contact_name").eq("tenant_id", tenantId);
  const match = (convs ?? []).find(
    (c) => phonesMatch(c.contact_phone, patient.phone ?? "")
  );
  if (match) {
    await supabaseAdmin.from("wa_conversations").update({ patient_id: patientId, contact_name: patient.full_name }).eq("id", match.id);
    return match;
  }
  return null;
}
async function analyzeConversation(conversationId) {
  const { data: conv } = await supabaseAdmin.from("wa_conversations").select("id, status, closed_at, first_response_at, last_patient_reply_at, price_sent_at").eq("id", conversationId).maybeSingle();
  if (!conv) return null;
  const convRow = conv;
  const { data: messages } = await supabaseAdmin.from("wa_messages").select("direction, created_at, sent_by, body").eq("conversation_id", conversationId).order("created_at", { ascending: true });
  const rows = messages ?? [];
  let inboundCount = 0;
  let outboundStaffCount = 0;
  let lastInboundAt = null;
  let lastOutboundStaffAt = null;
  for (const m of rows) {
    if (m.direction === "inbound") {
      inboundCount++;
      lastInboundAt = m.created_at;
    } else if (m.sent_by) {
      outboundStaffCount++;
      lastOutboundStaffAt = m.created_at;
    }
  }
  return {
    conversationId,
    status: convRow.status,
    closedAt: convRow.closed_at,
    firstResponseAt: convRow.first_response_at,
    lastPatientReplyAt: convRow.last_patient_reply_at,
    priceSentAt: convRow.price_sent_at,
    inboundCount,
    outboundStaffCount,
    lastInboundAt,
    lastOutboundStaffAt,
    lastMessage: rows.at(-1) ?? null,
    recentMessages: rows.slice(-12)
  };
}
function patientRepliedSince(analysis, since) {
  if (!analysis.lastInboundAt) return false;
  return new Date(analysis.lastInboundAt).getTime() >= since.getTime();
}
function staffRepliedSince(analysis, since) {
  if (!analysis.lastOutboundStaffAt) return false;
  return new Date(analysis.lastOutboundStaffAt).getTime() >= since.getTime();
}
function isConversationHandled(analysis) {
  if (analysis.status === "closed") return true;
  if (analysis.outboundStaffCount >= 3 && analysis.inboundCount >= 2) {
    const last = analysis.lastMessage;
    if (last?.direction === "outbound" && last.sent_by) return true;
  }
  return false;
}
function hasRecentBackAndForth(analysis) {
  const recent = analysis.recentMessages.slice(-6);
  if (recent.length < 3) return false;
  const hasIn = recent.some((m) => m.direction === "inbound");
  const hasStaffOut = recent.some((m) => m.direction === "outbound" && m.sent_by);
  return hasIn && hasStaffOut;
}
function shouldStartLeadPriceSent(analysis, outboundText) {
  if (!detectPriceInMessage(outboundText)) return { ok: false, reason: "sem_valor_na_mensagem" };
  if (analysis.status === "closed") return { ok: false, reason: "conversa_encerrada" };
  if (isConversationHandled(analysis)) return { ok: false, reason: "conversa_ja_tratada" };
  if (!analysis.lastInboundAt) return { ok: false, reason: "paciente_nunca_escreveu" };
  if (analysis.lastMessage?.direction !== "outbound" || !analysis.lastMessage.sent_by) {
    return { ok: false, reason: "ultima_mensagem_nao_e_resposta_da_equipe" };
  }
  return { ok: true };
}
async function shouldSendFollowUpStep(input) {
  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return { ok: false, reason: "conversa_nao_encontrada", cancelRun: true };
  const runStarted = new Date(input.runStartedAt);
  if (analysis.status === "closed") {
    return { ok: false, reason: "conversa_encerrada", cancelRun: true };
  }
  if (patientRepliedSince(analysis, runStarted)) {
    return { ok: false, reason: "paciente_respondeu", cancelRun: true };
  }
  switch (input.triggerType) {
    case "lead_no_response": {
      if (analysis.firstResponseAt) {
        return { ok: false, reason: "equipe_ja_respondeu", cancelRun: true };
      }
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_respondeu", cancelRun: true };
      }
      if (analysis.inboundCount !== 1) {
        return { ok: false, reason: "lead_ja_interagiu", cancelRun: true };
      }
      break;
    }
    case "lead_price_sent": {
      if (!analysis.priceSentAt) return { ok: false, reason: "valor_nao_registrado", cancelRun: true };
      if (patientRepliedSince(analysis, new Date(analysis.priceSentAt))) {
        return { ok: false, reason: "paciente_respondeu_apos_valor", cancelRun: true };
      }
      if (isConversationHandled(analysis)) {
        return { ok: false, reason: "conversa_ja_tratada", cancelRun: true };
      }
      break;
    }
    case "appointment_booked": {
      if (!input.appointmentId) break;
      const { data: appt } = await supabaseAdmin.from("appointments").select("status, date, start_time").eq("id", input.appointmentId).maybeSingle();
      if (!appt) return { ok: false, reason: "consulta_nao_encontrada", cancelRun: true };
      const status = appt.status;
      if (status === "cancelled" || status === "rescheduled") {
        return { ok: false, reason: "consulta_cancelada", cancelRun: true };
      }
      if (status === "completed" || status === "no_show") {
        return { ok: false, reason: "consulta_ja_ocorreu", cancelRun: true };
      }
      break;
    }
    case "post_consultation":
    case "reactivation": {
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_ja_acompanhou", cancelRun: true };
      }
      if (hasRecentBackAndForth(analysis)) {
        return { ok: false, reason: "conversa_ativa", cancelRun: true };
      }
      break;
    }
    case "no_show": {
      if (!input.appointmentId) break;
      const { data: appt } = await supabaseAdmin.from("appointments").select("status").eq("id", input.appointmentId).maybeSingle();
      if (appt?.status !== "no_show") {
        return { ok: false, reason: "falta_nao_confirmada", cancelRun: true };
      }
      break;
    }
  }
  return { ok: true };
}
async function skipFollowUpStep(scheduleId, reason, runId, cancelRun = false) {
  await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "skipped", error_message: reason }).eq("id", scheduleId);
  if (cancelRun && runId) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await supabaseAdmin.from("wa_follow_up_runs").update({ status: "cancelled", cancelled_at: now, cancel_reason: reason }).eq("id", runId).eq("status", "active");
    await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "cancelled" }).eq("run_id", runId).eq("status", "pending");
  }
}
async function cancelFollowUpsOnConversationClose(tenantId, conversationId) {
  await cancelActiveFollowUpRuns({
    tenantId,
    conversationId,
    reason: "conversa_encerrada"
  });
}
async function cancelActiveFollowUpRuns(input) {
  let q = supabaseAdmin.from("wa_follow_up_runs").select("id").eq("tenant_id", input.tenantId).eq("status", "active");
  if (input.conversationId) q = q.eq("conversation_id", input.conversationId);
  if (input.patientId) q = q.eq("patient_id", input.patientId);
  if (input.triggerTypes?.length) q = q.in("trigger_type", input.triggerTypes);
  const { data: runs } = await q;
  const runIds = (runs ?? []).map((r) => r.id);
  if (!runIds.length) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseAdmin.from("wa_follow_up_runs").update({ status: "cancelled", cancelled_at: now, cancel_reason: input.reason }).in("id", runIds);
  await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "cancelled" }).in("run_id", runIds).eq("status", "pending");
}
async function createManualTask(input) {
  const { data: task, error } = await supabaseAdmin.from("wa_tasks").insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId ?? null,
    title: input.title,
    description: input.description,
    assigned_to: input.assignedTo,
    due_at: input.dueAt,
    priority: "normal",
    task_type: "follow_up",
    created_by: input.createdBy ?? input.assignedTo
  }).select("id").single();
  if (error) throw new Error(error.message);
  if (input.conversationId) {
    await supabaseAdmin.from("wa_reminders").insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      assigned_to: input.assignedTo,
      remind_at: input.dueAt,
      note: input.title,
      created_by: input.createdBy ?? input.assignedTo,
      task_id: task.id
    });
  }
}
async function scheduleFollowUpRun(input) {
  const steps = FOLLOW_UP_SEQUENCES[input.sequenceKey];
  if (!steps?.length) return null;
  const base = input.baseTime ?? /* @__PURE__ */ new Date();
  const tenantName = await getTenantName(input.tenantId);
  const ctx = {
    tenantName,
    ...input.templateContext
  };
  if (input.conversationId || input.patientId) {
    await cancelActiveFollowUpRuns({
      tenantId: input.tenantId,
      conversationId: input.conversationId ?? void 0,
      patientId: input.patientId ?? void 0,
      triggerTypes: [input.triggerType],
      reason: "replaced_by_new_sequence"
    });
  }
  const { data: run, error: runErr } = await supabaseAdmin.from("wa_follow_up_runs").insert({
    tenant_id: input.tenantId,
    trigger_type: input.triggerType,
    patient_id: input.patientId ?? null,
    conversation_id: input.conversationId ?? null,
    appointment_id: input.appointmentId ?? null,
    created_by: input.createdBy ?? null,
    metadata: input.metadata ?? {}
  }).select("id").single();
  if (runErr) throw new Error(runErr.message);
  const runId = run.id;
  const receptionId = await getDefaultReceptionAssignee(input.tenantId);
  const rows = [];
  for (const [idx, step] of steps.entries()) {
    if (input.onlyStepKeys?.length && !input.onlyStepKeys.includes(step.key)) continue;
    let scheduledAt;
    if (step.delayMinutes < 0 && ctx.appointmentAt) {
      scheduledAt = new Date(ctx.appointmentAt.getTime() + step.delayMinutes * 6e4);
      if (scheduledAt.getTime() <= Date.now()) continue;
    } else if (step.delayMinutes < 0) {
      continue;
    } else {
      scheduledAt = new Date(base.getTime() + step.delayMinutes * 6e4);
    }
    const rendered = renderFollowUpMessage(step.template, ctx);
    rows.push({
      tenant_id: input.tenantId,
      run_id: runId,
      step_key: step.key,
      sequence_order: idx,
      mode: step.mode,
      scheduled_at: scheduledAt.toISOString(),
      message_template: step.template,
      rendered_message: rendered,
      conversation_id: input.conversationId ?? null,
      patient_id: input.patientId ?? null,
      appointment_id: input.appointmentId ?? null,
      assigned_to: step.mode === "manual" ? receptionId : null
    });
  }
  if (rows.length) {
    const { error } = await supabaseAdmin.from("wa_follow_up_schedules").insert(rows);
    if (error) throw new Error(error.message);
  }
  return runId;
}
async function sendAutomatedMessage(tenantId, conversationId, text) {
  if (!isWhatsAppConfigured()) return null;
  const { data: conv } = await supabaseAdmin.from("wa_conversations").select("contact_phone, channel").eq("id", conversationId).maybeSingle();
  if (!conv) return null;
  const convRow = conv;
  if ((convRow.channel ?? "whatsapp") !== "whatsapp") return null;
  const phone = normalizeBrazilPhone(convRow.contact_phone);
  const result = await providerSendText(phone, text);
  const now = /* @__PURE__ */ new Date();
  await insertWaMessage({
    tenantId,
    conversationId,
    waMessageId: result.messageId,
    direction: "outbound",
    messageType: "text",
    body: text,
    status: "sent",
    sentBy: null,
    sentAt: now,
    rawPayload: { source: "follow_up_automation" }
  });
  const { data: msgRow } = await supabaseAdmin.from("wa_messages").select("id").eq("wa_message_id", result.messageId).maybeSingle();
  await supabaseAdmin.from("wa_conversations").update({
    last_message_at: now.toISOString(),
    last_message_preview: text.slice(0, 120),
    updated_at: now.toISOString()
  }).eq("id", conversationId);
  return {
    waMessageId: result.messageId,
    messageRowId: msgRow?.id ?? ""
  };
}
async function processDueFollowUps(limit = 30) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { data: due } = await supabaseAdmin.from("wa_follow_up_schedules").select(
    "id, tenant_id, run_id, step_key, mode, rendered_message, conversation_id, patient_id, assigned_to, message_template, appointment_id, wa_follow_up_runs!inner(trigger_type, started_at, status)"
  ).eq("status", "pending").eq("wa_follow_up_runs.status", "active").lte("scheduled_at", now).order("scheduled_at").limit(limit);
  let sent = 0;
  let manual = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of due ?? []) {
    try {
      const run = row.wa_follow_up_runs;
      if (row.conversation_id) {
        const decision = await shouldSendFollowUpStep({
          tenantId: row.tenant_id,
          conversationId: row.conversation_id,
          triggerType: run.trigger_type,
          runStartedAt: run.started_at,
          appointmentId: row.appointment_id,
          stepKey: row.step_key
        });
        if (!decision.ok) {
          await skipFollowUpStep(row.id, decision.reason, row.run_id, decision.cancelRun);
          skipped++;
          continue;
        }
      }
      if (row.mode === "manual") {
        const assignee = row.assigned_to ?? await getDefaultReceptionAssignee(row.tenant_id);
        if (assignee) {
          await createManualTask({
            tenantId: row.tenant_id,
            conversationId: row.conversation_id,
            patientId: row.patient_id,
            assignedTo: assignee,
            title: `Follow-up: ${row.step_key.replace(/_/g, " ")}`,
            description: row.rendered_message ?? row.message_template,
            dueAt: now
          });
        }
        await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "sent", sent_at: now }).eq("id", row.id);
        manual++;
        continue;
      }
      if (!row.conversation_id || !row.rendered_message) {
        await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "skipped", error_message: "Sem conversa WhatsApp vinculada" }).eq("id", row.id);
        continue;
      }
      const result = await sendAutomatedMessage(row.tenant_id, row.conversation_id, row.rendered_message);
      if (!result) {
        await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "failed", error_message: "WhatsApp não configurado ou indisponível" }).eq("id", row.id);
        failed++;
        continue;
      }
      await supabaseAdmin.from("wa_follow_up_schedules").update({
        status: "sent",
        sent_at: now,
        wa_message_id: result.messageRowId || null
      }).eq("id", row.id);
      await logCrmEvent({
        tenantId: row.tenant_id,
        eventType: "follow_up_sent",
        conversationId: row.conversation_id,
        patientId: row.patient_id,
        metadata: { step_key: row.step_key, run_id: row.run_id }
      });
      sent++;
    } catch (e) {
      await supabaseAdmin.from("wa_follow_up_schedules").update({ status: "failed", error_message: e.message }).eq("id", row.id);
      failed++;
    }
  }
  return { processed: (due ?? []).length, sent, manual, failed, skipped };
}
async function onOutboundMessageForFollowUp(input) {
  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    triggerTypes: ["lead_no_response"],
    reason: "staff_replied"
  });
  if (!detectPriceInMessage(input.text)) return;
  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return;
  const priceDecision = shouldStartLeadPriceSent(analysis, input.text);
  if (!priceDecision.ok) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseAdmin.from("wa_conversations").update({ price_sent_at: now }).eq("id", input.conversationId);
  const { data: conv } = await supabaseAdmin.from("wa_conversations").select("patient_id, contact_name, price_sent_at").eq("id", input.conversationId).maybeSingle();
  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "price_sent",
    conversationId: input.conversationId,
    patientId: conv?.patient_id ?? null,
    userId: input.userId ?? null
  });
  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "lead_price_sent",
    sequenceKey: "lead_price_sent",
    conversationId: input.conversationId,
    patientId: conv?.patient_id ?? null,
    createdBy: input.userId ?? null,
    baseTime: new Date(now),
    templateContext: {
      patientName: conv?.contact_name
    }
  });
}
async function onAppointmentBooked(input) {
  const [{ data: patient }, { data: professional }] = await Promise.all([
    supabaseAdmin.from("patients").select("full_name, phone").eq("id", input.patientId).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", input.professionalId).maybeSingle()
  ]);
  const conv = await findConversationForPatient(input.tenantId, input.patientId);
  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "appointment_booked",
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    conversationId: conv?.id ?? null,
    userId: input.createdBy ?? null
  });
  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    patientId: input.patientId,
    triggerTypes: ["lead_no_response", "lead_price_sent"],
    reason: "appointment_booked"
  });
  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "appointment_booked",
    sequenceKey: "appointment_booked",
    conversationId: conv?.id ?? null,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    createdBy: input.createdBy ?? null,
    baseTime: /* @__PURE__ */ new Date(),
    templateContext: {
      patientName: patient?.full_name ?? conv?.contact_name,
      professionalName: professional?.full_name,
      appointmentAt: input.startsAt
    }
  });
}
async function onAppointmentStatusChange(input) {
  if (input.status === "completed") {
    const conv = await findConversationForPatient(input.tenantId, input.patientId);
    const { data: professional } = await supabaseAdmin.from("profiles").select("full_name").eq("id", input.professionalId).maybeSingle();
    const { data: patient } = await supabaseAdmin.from("patients").select("full_name").eq("id", input.patientId).maybeSingle();
    await logCrmEvent({
      tenantId: input.tenantId,
      eventType: "appointment_attended",
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      conversationId: conv?.id ?? null
    });
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "post_consultation",
      sequenceKey: "post_consultation",
      conversationId: conv?.id ?? null,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      baseTime: /* @__PURE__ */ new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv?.contact_name,
        professionalName: professional?.full_name
      }
    });
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "reactivation",
      sequenceKey: "reactivation",
      conversationId: conv?.id ?? null,
      patientId: input.patientId,
      baseTime: /* @__PURE__ */ new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv?.contact_name,
        professionalName: professional?.full_name
      }
    });
    return;
  }
  if (input.status === "no_show") {
    const conv = await findConversationForPatient(input.tenantId, input.patientId);
    const { data: patient } = await supabaseAdmin.from("patients").select("full_name").eq("id", input.patientId).maybeSingle();
    await logCrmEvent({
      tenantId: input.tenantId,
      eventType: "appointment_no_show",
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      conversationId: conv?.id ?? null
    });
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "no_show",
      sequenceKey: "no_show",
      conversationId: conv?.id ?? null,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      baseTime: /* @__PURE__ */ new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv?.contact_name,
        appointmentAt: input.startsAt
      }
    });
  }
}
async function setupProfessionalPostConsultFollowUp(input) {
  const receptionId = await getDefaultReceptionAssignee(input.tenantId);
  if (!receptionId) throw new Error("Nenhuma recepcionista ativa encontrada");
  const conv = await findConversationForPatient(input.tenantId, input.patientId);
  const tagId = await ensureFollowUpTag(
    input.tenantId,
    FOLLOW_UP_TAG_POST_CONSULT.name,
    FOLLOW_UP_TAG_POST_CONSULT.color
  );
  if (conv?.id) {
    await applyTagToConversation(conv.id, tagId);
  }
  const { data: patient } = await supabaseAdmin.from("patients").select("full_name").eq("id", input.patientId).maybeSingle();
  const { data: professional } = await supabaseAdmin.from("profiles").select("full_name").eq("id", input.professionalId).maybeSingle();
  const dueAt = (/* @__PURE__ */ new Date(`${input.contactDate}T09:00:00`)).toISOString();
  const title = `Follow-up pós-consulta — ${patient?.full_name ?? "Paciente"}`;
  const description = input.secretaryNotes.trim() || "Entrar em contato conforme orientação da profissional.";
  await createManualTask({
    tenantId: input.tenantId,
    conversationId: conv?.id ?? null,
    assignedTo: receptionId,
    title,
    description,
    dueAt,
    createdBy: input.professionalId
  });
  if (conv?.id) {
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "post_consultation",
      sequenceKey: "post_consultation",
      conversationId: conv.id,
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      createdBy: input.professionalId,
      baseTime: /* @__PURE__ */ new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv.contact_name,
        professionalName: professional?.full_name
      }
    });
  }
  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "professional_follow_up_scheduled",
    patientId: input.patientId,
    appointmentId: input.appointmentId ?? null,
    conversationId: conv?.id ?? null,
    userId: input.professionalId,
    metadata: { contact_date: input.contactDate, notes: description }
  });
  return { conversationId: conv?.id ?? null, tagId };
}
async function markConversationObjection(input) {
  await supabaseAdmin.from("wa_conversations").update({ objection_type: input.objectionType }).eq("id", input.conversationId);
  const { data: conv } = await supabaseAdmin.from("wa_conversations").select("patient_id, contact_name").eq("id", input.conversationId).maybeSingle();
  const sequenceKey = `objection_${input.objectionType}`;
  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "objection",
    sequenceKey,
    conversationId: input.conversationId,
    patientId: conv?.patient_id ?? null,
    createdBy: input.userId,
    templateContext: {
      patientName: conv?.contact_name
    }
  });
  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "objection_marked",
    conversationId: input.conversationId,
    patientId: conv?.patient_id ?? null,
    userId: input.userId,
    metadata: { objection_type: input.objectionType }
  });
  const steps = FOLLOW_UP_SEQUENCES[sequenceKey];
  return steps?.[0]?.template ?? "";
}
export {
  onAppointmentStatusChange as a,
  onOutboundMessageForFollowUp as b,
  cancelFollowUpsOnConversationClose as c,
  markConversationObjection as m,
  onAppointmentBooked as o,
  processDueFollowUps as p,
  setupProfessionalPostConsultFollowUp as s
};
