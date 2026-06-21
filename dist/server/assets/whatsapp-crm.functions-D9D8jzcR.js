import { c as createServerRpc } from "./createServerRpc-CGdsczey.js";
import { a as createServerFn } from "./server-CATTbrgJ.js";
import { r as requireSupabaseAuth } from "./auth-middleware-C1kGvq5j.js";
import { h as getWhatsAppConnectionStatus, l as logWaAudit, j as assignOpenConversationsToReception, k as phonesMatch, m as isWhatsAppConfigured, n as normalizeBrazilPhone, o as providerSendText, q as providerGetContactPhoto, u as getZApiConfig, v as getZApiChats, w as syncZApiChatsToCrm, x as getWhatsAppProvider, y as getWhatsAppConfig, z as listWhatsAppTemplates, A as sendWhatsAppTemplate } from "../server.js";
import { i as isContactPhotoCacheFresh } from "./wa-contact-photo-nUeTrbPu.js";
import { c as cancelFollowUpsOnConversationClose, p as processDueFollowUps, s as setupProfessionalPostConsultFollowUp, o as onAppointmentBooked, a as onAppointmentStatusChange, m as markConversationObjection } from "./wa-follow-up.server-BWth3L5S.js";
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
import "node:crypto";
async function requireCrmAccess(supabase, userId) {
  const {
    data: profile
  } = await supabase.from("profiles").select("role, tenant_id").eq("id", userId).maybeSingle();
  if (!profile?.tenant_id) throw new Error("Perfil não encontrado");
  if (!["admin", "professional", "receptionist"].includes(profile.role)) {
    throw new Error("Sem permissão para o CRM");
  }
  return profile;
}
const getWhatsAppConnection_createServerFn_handler = createServerRpc({
  id: "f27d42c3ce51adfa7a79c7e5e40324215436e89ab8c95dad9e4ae5518e9c96f9",
  name: "getWhatsAppConnection",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWhatsAppConnection.__executeServer(opts));
const getWhatsAppConnection = createServerFn({
  method: "GET"
}).handler(getWhatsAppConnection_createServerFn_handler, async () => getWhatsAppConnectionStatus());
const getCrmMetrics_createServerFn_handler = createServerRpc({
  id: "4aa2da792de5d4b9c7823144471171dec67c4059f2f5c1cd5a6544adfdbf8581",
  name: "getCrmMetrics",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getCrmMetrics.__executeServer(opts));
const getCrmMetrics = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getCrmMetrics_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const tenantId = profile.tenant_id;
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [openRes, unassignedRes, unreadRes, closedTodayRes, responseRes] = await Promise.all([context.supabase.from("wa_conversations").select("id", {
    count: "exact",
    head: true
  }).eq("tenant_id", tenantId).eq("status", "open"), context.supabase.from("wa_conversations").select("id", {
    count: "exact",
    head: true
  }).eq("tenant_id", tenantId).eq("status", "open").is("assigned_to", null), context.supabase.from("wa_conversations").select("unread_count").eq("tenant_id", tenantId).gt("unread_count", 0), context.supabase.from("wa_conversations").select("id", {
    count: "exact",
    head: true
  }).eq("tenant_id", tenantId).eq("status", "closed").gte("closed_at", todayStart.toISOString()), context.supabase.from("wa_conversations").select("first_response_at, created_at").eq("tenant_id", tenantId).not("first_response_at", "is", null).gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())]);
  const unreadTotal = (unreadRes.data ?? []).reduce((s, r) => s + r.unread_count, 0);
  let avgFirstResponseMinutes = null;
  const withResponse = responseRes.data ?? [];
  if (withResponse.length > 0) {
    const totalMs = withResponse.reduce((s, r) => {
      return s + (new Date(r.first_response_at).getTime() - new Date(r.created_at).getTime());
    }, 0);
    avgFirstResponseMinutes = Math.round(totalMs / withResponse.length / 6e4);
  }
  return {
    open: openRes.count ?? 0,
    unassigned: unassignedRes.count ?? 0,
    unreadTotal,
    closedToday: closedTodayRes.count ?? 0,
    avgFirstResponseMinutes
  };
});
const closeWaConversation_createServerFn_handler = createServerRpc({
  id: "69582ce6c6f988d5d84638be7f0acfde2a645c12165ad9a689068518495e13cf",
  name: "closeWaConversation",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => closeWaConversation.__executeServer(opts));
const closeWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(closeWaConversation_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    error
  } = await context.supabase.from("wa_conversations").update({
    status: "closed",
    close_reason: data.reason.trim(),
    closed_at: now,
    closed_by: context.userId,
    updated_at: now
  }).eq("id", data.conversationId);
  if (error) throw new Error(error.message);
  await logWaAudit({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    userId: context.userId,
    action: "conversation_closed",
    details: {
      reason: data.reason.trim()
    }
  });
  void cancelFollowUpsOnConversationClose(profile.tenant_id, data.conversationId).catch((e) => console.error("[CRM] cancel follow-ups on close:", e));
  return {
    ok: true
  };
});
const reopenWaConversation_createServerFn_handler = createServerRpc({
  id: "279e782cdaa8df59cb3d7c343d79ceb5df13e00e2b098411af2b6495fe045495",
  name: "reopenWaConversation",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => reopenWaConversation.__executeServer(opts));
const reopenWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(reopenWaConversation_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    error
  } = await context.supabase.from("wa_conversations").update({
    status: "open",
    close_reason: null,
    closed_at: null,
    closed_by: null,
    updated_at: now
  }).eq("id", data.conversationId);
  if (error) throw new Error(error.message);
  await logWaAudit({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    userId: context.userId,
    action: "conversation_reopened"
  });
  return {
    ok: true
  };
});
const linkWaPatient_createServerFn_handler = createServerRpc({
  id: "44af6dd6f50019f39902e07fe7186ba1456e5be18764ea53c931b22ce1b134ab",
  name: "linkWaPatient",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => linkWaPatient.__executeServer(opts));
const linkWaPatient = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(linkWaPatient_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  let contactName = null;
  if (data.patientId) {
    const {
      data: patient
    } = await context.supabase.from("patients").select("full_name").eq("id", data.patientId).maybeSingle();
    contactName = patient?.full_name ?? null;
  }
  const {
    error
  } = await context.supabase.from("wa_conversations").update({
    patient_id: data.patientId,
    ...contactName ? {
      contact_name: contactName
    } : {},
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", data.conversationId);
  if (error) throw new Error(error.message);
  await logWaAudit({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    userId: context.userId,
    action: "patient_linked",
    details: {
      patientId: data.patientId
    }
  });
  return {
    ok: true
  };
});
const getWaQuickReplies_createServerFn_handler = createServerRpc({
  id: "2a84e716e0a653cf67d1a4b8fc01e43c6b4b461774004d391c65ebf7ffee6b9e",
  name: "getWaQuickReplies",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWaQuickReplies.__executeServer(opts));
const getWaQuickReplies = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getWaQuickReplies_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    data: crmReplies
  } = await context.supabase.from("wa_quick_replies").select("id, name, content, category, shortcut, sort_order").eq("tenant_id", profile.tenant_id).eq("active", true).order("sort_order").order("name");
  if (crmReplies?.length) return crmReplies;
  const {
    data
  } = await context.supabase.from("message_templates").select("id, name, content").eq("tenant_id", profile.tenant_id).eq("channel", "whatsapp").eq("active", true).order("name");
  return (data ?? []).map((r) => ({
    ...r,
    category: "marketing",
    shortcut: null
  }));
});
const DEFAULT_QUICK_REPLIES = [{
  name: "Saudação",
  content: "Olá! {{nome_clinica}} aqui. Como posso ajudar?",
  category: "atendimento",
  shortcut: "/ola"
}, {
  name: "Horário",
  content: "Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.",
  category: "atendimento",
  shortcut: "/horario"
}, {
  name: "Agendar",
  content: "Para agendar, informe o melhor dia e período (manhã/tarde) para sua consulta.",
  category: "agenda",
  shortcut: "/agendar"
}, {
  name: "Endereço",
  content: "Estamos localizados em [endereço]. Posso enviar a localização no mapa?",
  category: "atendimento",
  shortcut: "/endereco"
}, {
  name: "Confirmação",
  content: "Confirmamos seu agendamento. Aguardamos você!",
  category: "agenda",
  shortcut: "/confirmar"
}, {
  name: "Remarcar",
  content: "Sem problemas! Qual outro dia e horário ficam melhor para você?",
  category: "agenda",
  shortcut: "/remarcar"
}, {
  name: "Valores",
  content: "Posso enviar os valores dos procedimentos de interesse. Qual serviço você gostaria de saber?",
  category: "vendas",
  shortcut: "/valores"
}, {
  name: "Documentos",
  content: "Por favor, envie os documentos solicitados por foto ou PDF neste chat.",
  category: "atendimento",
  shortcut: "/docs"
}, {
  name: "Retorno",
  content: "Vou verificar com a equipe e retorno em breve. Obrigado pela paciência!",
  category: "atendimento",
  shortcut: "/retorno"
}, {
  name: "Encerrar",
  content: "Foi um prazer atender você! Se precisar de algo, estamos à disposição.",
  category: "atendimento",
  shortcut: "/tchau"
}];
const seedWaQuickReplies_createServerFn_handler = createServerRpc({
  id: "fc0cd45978a91ab0a63a1715b29163f2c2c0b43982f4ccd9a0865bba80db4ccd",
  name: "seedWaQuickReplies",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => seedWaQuickReplies.__executeServer(opts));
const seedWaQuickReplies = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(seedWaQuickReplies_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    count
  } = await context.supabase.from("wa_quick_replies").select("id", {
    count: "exact",
    head: true
  }).eq("tenant_id", profile.tenant_id);
  if ((count ?? 0) > 0) return {
    seeded: 0
  };
  const rows = DEFAULT_QUICK_REPLIES.map((r, i) => ({
    tenant_id: profile.tenant_id,
    ...r,
    sort_order: i,
    active: true
  }));
  const {
    error
  } = await context.supabase.from("wa_quick_replies").insert(rows);
  if (error) throw new Error(error.message);
  return {
    seeded: rows.length
  };
});
const upsertWaQuickReply_createServerFn_handler = createServerRpc({
  id: "760852d44ddaf4f6f8ea0929642b4f715658bb767d0a894bbd1ad1bb5e36335a",
  name: "upsertWaQuickReply",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => upsertWaQuickReply.__executeServer(opts));
const upsertWaQuickReply = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(upsertWaQuickReply_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const row = {
    tenant_id: profile.tenant_id,
    name: data.name.trim(),
    content: data.content.trim(),
    category: data.category?.trim() || "geral",
    shortcut: data.shortcut?.trim() || null,
    active: true
  };
  if (data.id) {
    const {
      error: error2
    } = await context.supabase.from("wa_quick_replies").update(row).eq("id", data.id);
    if (error2) throw new Error(error2.message);
    return {
      id: data.id
    };
  }
  const {
    data: created,
    error
  } = await context.supabase.from("wa_quick_replies").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: created.id
  };
});
const deleteWaQuickReply_createServerFn_handler = createServerRpc({
  id: "8732d73aa2f79181cabd57fd26276dee217c7ecc881668ddec45b73f00ad9643",
  name: "deleteWaQuickReply",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => deleteWaQuickReply.__executeServer(opts));
const deleteWaQuickReply = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(deleteWaQuickReply_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const {
    error
  } = await context.supabase.from("wa_quick_replies").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const searchWaMessages_createServerFn_handler = createServerRpc({
  id: "e31f9aeaa969284b8f53a2c10f025c9ae07046bb6f5812c0fe8333517c7b0e49",
  name: "searchWaMessages",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => searchWaMessages.__executeServer(opts));
const searchWaMessages = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(searchWaMessages_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const q = data.query.trim();
  if (!q) return [];
  const {
    data: rows,
    error
  } = await context.supabase.from("wa_messages").select("id, body, created_at, direction, message_type, media_filename").eq("conversation_id", data.conversationId).or(`body.ilike.%${q}%,media_filename.ilike.%${q}%`).order("created_at", {
    ascending: false
  }).limit(50);
  if (error) throw new Error(error.message);
  return rows ?? [];
});
const searchWaMessagesGlobal_createServerFn_handler = createServerRpc({
  id: "8abd1b2fa0d3d1064cfa94d9ffd68fa33bfe472dc64296c1d264b42dfa2395ad",
  name: "searchWaMessagesGlobal",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => searchWaMessagesGlobal.__executeServer(opts));
const searchWaMessagesGlobal = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(searchWaMessagesGlobal_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const q = data.query.trim();
  if (q.length < 2) return [];
  const {
    data: rows,
    error
  } = await context.supabase.rpc("search_wa_messages_global", {
    p_query: q,
    p_limit: data.limit ?? 50
  });
  if (error) throw new Error(error.message);
  return rows ?? [];
});
const getWaPatientContext_createServerFn_handler = createServerRpc({
  id: "66a3519e0a676b3471aa961b3e78aade17b8af7d8aa3b5203a916b3c17ca3bb6",
  name: "getWaPatientContext",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWaPatientContext.__executeServer(opts));
const getWaPatientContext = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(getWaPatientContext_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    data: upcoming
  } = await context.supabase.from("appointments").select("id, date, start_time, status, profiles:professional_id(full_name)").eq("patient_id", data.patientId).gte("date", now.slice(0, 10)).in("status", ["scheduled", "confirmed", "rescheduled"]).order("date", {
    ascending: true
  }).order("start_time", {
    ascending: true
  }).limit(3);
  const {
    data: lastAppt
  } = await context.supabase.from("appointments").select("id, date, start_time, status").eq("patient_id", data.patientId).eq("status", "completed").order("date", {
    ascending: false
  }).limit(1);
  return {
    upcoming: upcoming ?? [],
    lastCompleted: lastAppt?.[0] ?? null
  };
});
const assignWaConversation_createServerFn_handler = createServerRpc({
  id: "7e3fa0c774b8c8b528d61a16d35970df18ce4e679c1e3407c64d9062d7b8c6a6",
  name: "assignWaConversation",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => assignWaConversation.__executeServer(opts));
const assignWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(assignWaConversation_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    error
  } = await context.supabase.from("wa_conversations").update({
    assigned_to: context.userId,
    updated_at: now
  }).eq("id", data.conversationId);
  if (error) throw new Error(error.message);
  await logWaAudit({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    userId: context.userId,
    action: "conversation_assigned",
    details: {
      assignedTo: context.userId
    }
  });
  return {
    ok: true
  };
});
const assignWaQueueToReception_createServerFn_handler = createServerRpc({
  id: "e1b99e9a817b7a11668ebf7cc0a70360825f208ffa0b2471e0f5f87b2df1e71f",
  name: "assignWaQueueToReception",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => assignWaQueueToReception.__executeServer(opts));
const assignWaQueueToReception = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(assignWaQueueToReception_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const result = await assignOpenConversationsToReception(profile.tenant_id, {
    onlyUnassigned: !data.allOpen
  });
  if (!result.receptionistId) {
    throw new Error("Nenhum usuário recepcionista cadastrado na clínica.");
  }
  await logWaAudit({
    tenantId: profile.tenant_id,
    userId: context.userId,
    action: "queue_assigned_to_reception",
    details: {
      updated: result.updated,
      receptionistId: result.receptionistId
    }
  });
  return result;
});
const toggleWaConversationTag_createServerFn_handler = createServerRpc({
  id: "4442e7974b7b9af81ac416f0db3c8c283fabb5187bf7b51344290954fa48968d",
  name: "toggleWaConversationTag",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => toggleWaConversationTag.__executeServer(opts));
const toggleWaConversationTag = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(toggleWaConversationTag_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const {
    data: conv,
    error: convErr
  } = await context.supabase.from("wa_conversations").select("id, contact_phone, tenant_id").eq("id", data.conversationId).maybeSingle();
  if (convErr || !conv) throw new Error("Conversa não encontrada");
  const convRow = conv;
  const {
    data: allConvs
  } = await context.supabase.from("wa_conversations").select("id, contact_phone").eq("tenant_id", convRow.tenant_id);
  const relatedIds = (allConvs ?? []).filter((c) => phonesMatch(c.contact_phone, convRow.contact_phone)).map((c) => c.id);
  const targetIds = relatedIds.length ? relatedIds : [data.conversationId];
  if (data.apply) {
    const {
      error: error2
    } = await context.supabase.from("wa_conversation_tags").upsert({
      conversation_id: data.conversationId,
      tag_id: data.tagId
    }, {
      onConflict: "conversation_id,tag_id",
      ignoreDuplicates: true
    });
    if (error2) throw new Error(error2.message);
    return {
      ok: true,
      applied: true
    };
  }
  const {
    error
  } = await context.supabase.from("wa_conversation_tags").delete().in("conversation_id", targetIds).eq("tag_id", data.tagId);
  if (error) throw new Error(error.message);
  return {
    ok: true,
    applied: false
  };
});
const sendWaAfterHoursTest_createServerFn_handler = createServerRpc({
  id: "2e34b9c43922e1b250acb296884332880a337ff3c35c54018154630c6896731c",
  name: "sendWaAfterHoursTest",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => sendWaAfterHoursTest.__executeServer(opts));
const sendWaAfterHoursTest = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(sendWaAfterHoursTest_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  if (!isWhatsAppConfigured()) throw new Error("WhatsApp não configurado");
  const {
    data: conv
  } = await context.supabase.from("wa_conversations").select("contact_phone").eq("id", data.conversationId).maybeSingle();
  if (!conv) throw new Error("Conversa não encontrada");
  const phone = normalizeBrazilPhone(conv.contact_phone);
  await providerSendText(phone, data.text);
  await logWaAudit({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    userId: context.userId,
    action: "manual_message",
    details: {
      preview: data.text.slice(0, 80)
    }
  });
  return {
    ok: true
  };
});
const fetchWaContactPhoto_createServerFn_handler = createServerRpc({
  id: "4e872bbf5a301e00ffc48ce9f36c7bebf81d8ea0e31306d0ffbd6e445b315810",
  name: "fetchWaContactPhoto",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => fetchWaContactPhoto.__executeServer(opts));
const fetchWaContactPhoto = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(fetchWaContactPhoto_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const {
    data: conv,
    error
  } = await context.supabase.from("wa_conversations").select("contact_phone, contact_photo_url, contact_photo_fetched_at").eq("id", data.conversationId).maybeSingle();
  if (error || !conv) throw new Error("Conversa não encontrada");
  const row = conv;
  if (row.contact_photo_url && isContactPhotoCacheFresh(row.contact_photo_fetched_at)) {
    return {
      url: row.contact_photo_url
    };
  }
  if (!isWhatsAppConfigured()) return {
    url: null
  };
  const phone = normalizeBrazilPhone(row.contact_phone);
  const url = await providerGetContactPhoto(phone);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await context.supabase.from("wa_conversations").update({
    contact_photo_url: url,
    contact_photo_fetched_at: now
  }).eq("id", data.conversationId);
  return {
    url
  };
});
const syncWaChatsFromZApi_createServerFn_handler = createServerRpc({
  id: "fefa24a549fda13733190ca814994298a3c0ad40a8465af647e87d5c14bf8aa6",
  name: "syncWaChatsFromZApi",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => syncWaChatsFromZApi.__executeServer(opts));
const syncWaChatsFromZApi = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(syncWaChatsFromZApi_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const config = getZApiConfig();
  if (!config) throw new Error("Z-API não configurada");
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await getZApiChats(config, page, 100);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  const synced = await syncZApiChatsToCrm(profile.tenant_id, all);
  return {
    synced,
    total: all.length
  };
});
const getWaTagRules_createServerFn_handler = createServerRpc({
  id: "ecbe918f1c6e07f50c80a89d22e4103d597b0dc60de48423d5547b857250ebbf",
  name: "getWaTagRules",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWaTagRules.__executeServer(opts));
const getWaTagRules = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getWaTagRules_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    data,
    error
  } = await context.supabase.from("wa_tag_rules").select("id, tag_id, name, trigger_type, trigger_value, active, wa_tags(name, color)").eq("tenant_id", profile.tenant_id).order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return data ?? [];
});
const upsertWaTagRule_createServerFn_handler = createServerRpc({
  id: "73f16b5d9a6f4a198fea001fbcef0a594213e1de50f1588b0a1dec74bc311e0e",
  name: "upsertWaTagRule",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => upsertWaTagRule.__executeServer(opts));
const upsertWaTagRule = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(upsertWaTagRule_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const row = {
    tenant_id: profile.tenant_id,
    tag_id: data.tagId,
    name: data.name.trim(),
    trigger_type: data.triggerType,
    trigger_value: data.triggerValue?.trim() || null,
    active: data.active ?? true
  };
  if (data.id) {
    const {
      error: error2
    } = await context.supabase.from("wa_tag_rules").update(row).eq("id", data.id);
    if (error2) throw new Error(error2.message);
    return {
      id: data.id
    };
  }
  const {
    data: created,
    error
  } = await context.supabase.from("wa_tag_rules").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  return {
    id: created.id
  };
});
const deleteWaTagRule_createServerFn_handler = createServerRpc({
  id: "849a3eb778b76b3b7879cc5d351307dfd5aa87c9553772c3b48dc49a01135ea5",
  name: "deleteWaTagRule",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => deleteWaTagRule.__executeServer(opts));
const deleteWaTagRule = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(deleteWaTagRule_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const {
    error
  } = await context.supabase.from("wa_tag_rules").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const getWaTasks_createServerFn_handler = createServerRpc({
  id: "a8f5ca3a324ec2e8b1b7d39d4408c53c9ca0581f87f42a5a6dd534cbe38de342",
  name: "getWaTasks",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWaTasks.__executeServer(opts));
const getWaTasks = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(getWaTasks_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  let q = context.supabase.from("wa_tasks").select("id, title, description, due_at, completed, completed_at, priority, task_type, conversation_id, assigned_to, assignee:assigned_to(full_name)").eq("tenant_id", profile.tenant_id).order("due_at", {
    ascending: true
  });
  if (data.conversationId) q = q.eq("conversation_id", data.conversationId);
  if (data.onlyOpen !== false) q = q.eq("completed", false);
  if (profile.role === "receptionist") q = q.eq("assigned_to", context.userId);
  const {
    data: rows,
    error
  } = await q.limit(100);
  if (error) throw new Error(error.message);
  return rows ?? [];
});
const createWaTask_createServerFn_handler = createServerRpc({
  id: "1495dc7ac68b5d74e1e195d41b0e82bd340b3a15ea9b653508ee3821a209371e",
  name: "createWaTask",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => createWaTask.__executeServer(opts));
const createWaTask = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createWaTask_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    data: task,
    error
  } = await context.supabase.from("wa_tasks").insert({
    tenant_id: profile.tenant_id,
    conversation_id: data.conversationId ?? null,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    assigned_to: data.assignedTo,
    due_at: data.dueAt,
    priority: data.priority ?? "normal",
    task_type: data.taskType ?? "follow_up",
    created_by: context.userId
  }).select("id").single();
  if (error) throw new Error(error.message);
  const taskId = task.id;
  if (data.createReminder !== false && data.conversationId) {
    await context.supabase.from("wa_reminders").insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      assigned_to: data.assignedTo,
      remind_at: data.dueAt,
      note: data.title.trim(),
      created_by: context.userId,
      task_id: taskId
    });
  }
  return {
    id: taskId
  };
});
const completeWaTask_createServerFn_handler = createServerRpc({
  id: "406e99b2d11572b6a337ecd70c5e39ea4c239edd9f1858ca31ac0158eafbd282",
  name: "completeWaTask",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => completeWaTask.__executeServer(opts));
const completeWaTask = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(completeWaTask_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    error
  } = await context.supabase.from("wa_tasks").update({
    completed: true,
    completed_at: now
  }).eq("id", data.taskId);
  if (error) throw new Error(error.message);
  await context.supabase.from("wa_reminders").update({
    completed: true
  }).eq("task_id", data.taskId);
  return {
    ok: true
  };
});
const DEFAULT_PIPELINE_STAGES = [{
  name: "Novo lead",
  color: "#6366f1",
  win_probability: 10
}, {
  name: "Contato feito",
  color: "#8b5cf6",
  win_probability: 25
}, {
  name: "Interesse",
  color: "#a855f7",
  win_probability: 40
}, {
  name: "Orçamento enviado",
  color: "#f59e0b",
  win_probability: 60
}, {
  name: "Negociação",
  color: "#f97316",
  win_probability: 75
}, {
  name: "Agendado",
  color: "#22c55e",
  win_probability: 90
}, {
  name: "Ganho",
  color: "#10b981",
  win_probability: 100
}, {
  name: "Perdido",
  color: "#ef4444",
  win_probability: 0
}];
async function ensurePipelineForTenant(supabase, tenantId) {
  const {
    data: existing
  } = await supabase.from("wa_pipelines").select("id").eq("tenant_id", tenantId).eq("is_default", true).maybeSingle();
  if (existing) return existing.id;
  const {
    data: pipeline,
    error: pErr
  } = await supabase.from("wa_pipelines").insert({
    tenant_id: tenantId,
    name: "Funil principal",
    is_default: true
  }).select("id").single();
  if (pErr) throw new Error(pErr.message);
  const pipelineId = pipeline.id;
  const stages = DEFAULT_PIPELINE_STAGES.map((s, i) => ({
    pipeline_id: pipelineId,
    ...s,
    sort_order: i
  }));
  const {
    error: sErr
  } = await supabase.from("wa_pipeline_stages").insert(stages);
  if (sErr) throw new Error(sErr.message);
  return pipelineId;
}
const ensureWaPipeline_createServerFn_handler = createServerRpc({
  id: "7423565d633f76094062bde7ca058901eaad6a4df5e08f995bb4c7daf1539caa",
  name: "ensureWaPipeline",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => ensureWaPipeline.__executeServer(opts));
const ensureWaPipeline = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(ensureWaPipeline_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const pipelineId = await ensurePipelineForTenant(context.supabase, profile.tenant_id);
  return {
    pipelineId
  };
});
const getWaPipelineBoard_createServerFn_handler = createServerRpc({
  id: "be72d6b913458bbf92cd2789f212eeb4e0cb4bf9c2e7da3f9fe8c25471701657",
  name: "getWaPipelineBoard",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getWaPipelineBoard.__executeServer(opts));
const getWaPipelineBoard = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getWaPipelineBoard_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    data: pipeline
  } = await context.supabase.from("wa_pipelines").select("id, name").eq("tenant_id", profile.tenant_id).eq("is_default", true).maybeSingle();
  if (!pipeline) return {
    pipeline: null,
    stages: [],
    deals: []
  };
  const pipelineId = pipeline.id;
  const [{
    data: stages
  }, {
    data: deals
  }] = await Promise.all([context.supabase.from("wa_pipeline_stages").select("id, name, color, sort_order, win_probability").eq("pipeline_id", pipelineId).order("sort_order"), context.supabase.from("wa_deals").select("id, title, value_cents, status, stage_id, conversation_id, assigned_to, updated_at, wa_conversations(contact_name, contact_phone, channel)").eq("pipeline_id", pipelineId).eq("status", "open").order("updated_at", {
    ascending: false
  })]);
  return {
    pipeline,
    stages: stages ?? [],
    deals: deals ?? []
  };
});
const createWaDeal_createServerFn_handler = createServerRpc({
  id: "83d4e1c06556eb56a5c8cd4a23d3e23f3b0cc905a532bc000fa76d12485fc802",
  name: "createWaDeal",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => createWaDeal.__executeServer(opts));
const createWaDeal = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createWaDeal_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const {
    data: conv
  } = await context.supabase.from("wa_conversations").select("id, contact_name, contact_phone, deal_id").eq("id", data.conversationId).maybeSingle();
  if (!conv) throw new Error("Conversa não encontrada");
  if (conv.deal_id) {
    throw new Error("Esta conversa já possui negócio no funil");
  }
  const pipelineId = await ensurePipelineForTenant(context.supabase, profile.tenant_id);
  let stageId = data.stageId;
  if (!stageId) {
    const {
      data: firstStage
    } = await context.supabase.from("wa_pipeline_stages").select("id").eq("pipeline_id", pipelineId).order("sort_order").limit(1).maybeSingle();
    stageId = firstStage?.id;
  }
  if (!stageId) throw new Error("Funil sem etapas");
  const convRow = conv;
  const title = data.title?.trim() || convRow.contact_name || convRow.contact_phone;
  const {
    data: deal,
    error
  } = await context.supabase.from("wa_deals").insert({
    tenant_id: profile.tenant_id,
    pipeline_id: pipelineId,
    stage_id: stageId,
    conversation_id: data.conversationId,
    title,
    value_cents: data.valueCents ?? 0,
    assigned_to: context.userId
  }).select("id").single();
  if (error) throw new Error(error.message);
  const dealId = deal.id;
  await context.supabase.from("wa_conversations").update({
    deal_id: dealId,
    pipeline_stage_id: stageId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", data.conversationId);
  return {
    dealId
  };
});
const moveWaDealStage_createServerFn_handler = createServerRpc({
  id: "86b5eba7e0dcdfd97b1c7c77336286134a006c550270d95faa7f00003a5ae910",
  name: "moveWaDealStage",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => moveWaDealStage.__executeServer(opts));
const moveWaDealStage = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(moveWaDealStage_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const {
    data: stage
  } = await context.supabase.from("wa_pipeline_stages").select("win_probability, name").eq("id", data.stageId).maybeSingle();
  const winProb = stage?.win_probability ?? 0;
  const stageName = stage?.name ?? "";
  const status = winProb >= 100 ? "won" : stageName.toLowerCase().includes("perdido") ? "lost" : "open";
  const {
    data: deal,
    error
  } = await context.supabase.from("wa_deals").update({
    stage_id: data.stageId,
    status,
    updated_at: now
  }).eq("id", data.dealId).select("conversation_id").single();
  if (error) throw new Error(error.message);
  const conversationId = deal.conversation_id;
  if (conversationId) {
    await context.supabase.from("wa_conversations").update({
      pipeline_stage_id: data.stageId,
      updated_at: now
    }).eq("id", conversationId);
  }
  return {
    ok: true,
    status
  };
});
const getMetaWaTemplates_createServerFn_handler = createServerRpc({
  id: "037cd96d37df64a6acf06ba5645a5a34fbb781929c32751cf20b297591b2b294",
  name: "getMetaWaTemplates",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getMetaWaTemplates.__executeServer(opts));
const getMetaWaTemplates = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getMetaWaTemplates_createServerFn_handler, async ({
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  if (getWhatsAppProvider() !== "meta") return [];
  const config = getWhatsAppConfig();
  if (!config) return [];
  return listWhatsAppTemplates(config);
});
const sendWaBroadcast_createServerFn_handler = createServerRpc({
  id: "bb4b4b67e796b3982a1c08d2329975a71a8f7a5fffcd64c76ba4aaa3e43d74cb",
  name: "sendWaBroadcast",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => sendWaBroadcast.__executeServer(opts));
const sendWaBroadcast = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(sendWaBroadcast_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  if (getWhatsAppProvider() !== "meta") {
    throw new Error("Broadcast com templates Meta requer WHATSAPP_PROVIDER=meta");
  }
  const config = getWhatsAppConfig();
  if (!config) throw new Error("Meta WhatsApp não configurado");
  const {
    data: broadcast,
    error: bErr
  } = await context.supabase.from("wa_broadcasts").insert({
    tenant_id: profile.tenant_id,
    name: data.name.trim(),
    template_name: data.templateName,
    template_language: data.templateLanguage ?? "pt_BR",
    template_variables: data.variables ?? [],
    status: "sending",
    created_by: context.userId
  }).select("id").single();
  if (bErr) throw new Error(bErr.message);
  const broadcastId = broadcast.id;
  let sent = 0;
  let failed = 0;
  const {
    data: convs
  } = await context.supabase.from("wa_conversations").select("id, contact_phone, channel").in("id", data.conversationIds).eq("channel", "whatsapp");
  for (const conv of convs ?? []) {
    const phone = normalizeBrazilPhone(conv.contact_phone);
    const {
      data: recipient
    } = await context.supabase.from("wa_broadcast_recipients").insert({
      broadcast_id: broadcastId,
      conversation_id: conv.id,
      phone,
      status: "pending"
    }).select("id").single();
    try {
      const {
        messageId
      } = await sendWhatsAppTemplate(config, phone, data.templateName, data.templateLanguage ?? "pt_BR", data.variables ?? []);
      sent++;
      await context.supabase.from("wa_broadcast_recipients").update({
        status: "sent",
        sent_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", recipient.id);
      await context.supabase.from("wa_messages").insert({
        tenant_id: profile.tenant_id,
        conversation_id: conv.id,
        wa_message_id: messageId,
        direction: "outbound",
        message_type: "template",
        body: `[Template] ${data.templateName}`,
        status: "sent",
        sent_by: context.userId
      });
    } catch (e) {
      failed++;
      await context.supabase.from("wa_broadcast_recipients").update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Erro"
      }).eq("id", recipient.id);
    }
  }
  await context.supabase.from("wa_broadcasts").update({
    status: failed > 0 && sent === 0 ? "failed" : "completed",
    completed_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", broadcastId);
  return {
    broadcastId,
    sent,
    failed
  };
});
const processWaFollowUps_createServerFn_handler = createServerRpc({
  id: "7a4c57afcfb8666fc0498bc3602b51af442f2995ba8bc288448239daaf3d5860",
  name: "processWaFollowUps",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => processWaFollowUps.__executeServer(opts));
const processWaFollowUps = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(processWaFollowUps_createServerFn_handler, async ({
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  return processDueFollowUps();
});
const setupPostConsultationFollowUp_createServerFn_handler = createServerRpc({
  id: "c7a96f2d1d245d3f01c8c4067b05ac75643729eb1b86853beee272b70d2b42e0",
  name: "setupPostConsultationFollowUp",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => setupPostConsultationFollowUp.__executeServer(opts));
const setupPostConsultationFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(setupPostConsultationFollowUp_createServerFn_handler, async ({
  data,
  context
}) => {
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
    secretaryNotes: data.secretaryNotes
  });
});
const triggerAppointmentFollowUp_createServerFn_handler = createServerRpc({
  id: "388f7c2a2e2922a711a118486bf3c7676db75d2575f986e976a1765f4a188e67",
  name: "triggerAppointmentFollowUp",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => triggerAppointmentFollowUp.__executeServer(opts));
const triggerAppointmentFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(triggerAppointmentFollowUp_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  await onAppointmentBooked({
    tenantId: profile.tenant_id,
    appointmentId: data.appointmentId,
    patientId: data.patientId,
    professionalId: data.professionalId,
    startsAt: new Date(data.startsAt),
    createdBy: context.userId
  });
  return {
    ok: true
  };
});
const triggerAppointmentStatusFollowUp_createServerFn_handler = createServerRpc({
  id: "768b4ba2b42860f66bba642e2c2c68c102603d27e4df3caab02de557637daac4",
  name: "triggerAppointmentStatusFollowUp",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => triggerAppointmentStatusFollowUp.__executeServer(opts));
const triggerAppointmentStatusFollowUp = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(triggerAppointmentStatusFollowUp_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  await onAppointmentStatusChange({
    tenantId: profile.tenant_id,
    appointmentId: data.appointmentId,
    patientId: data.patientId,
    professionalId: data.professionalId,
    status: data.status,
    startsAt: new Date(data.startsAt)
  });
  return {
    ok: true
  };
});
const markWaObjection_createServerFn_handler = createServerRpc({
  id: "e3dfb8cb8f9bc8ddd4bbda7fb3a2d4a00279564749dae2a047d879ba3230331c",
  name: "markWaObjection",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => markWaObjection.__executeServer(opts));
const markWaObjection = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(markWaObjection_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  const suggestedMessage = await markConversationObjection({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    objectionType: data.objectionType,
    userId: context.userId
  });
  return {
    suggestedMessage
  };
});
const FOLLOW_UP_QUICK_REPLIES = [{
  name: "Lead 15min",
  category: "lead_sem_resposta",
  shortcut: "/lead15",
  content: "Oi, {{primeiro_nome}}, tudo bem? Vi que você entrou em contato com a clínica. Para eu te direcionar melhor: você busca atendimento por emagrecimento, hormônios, menopausa, lipedema ou outro motivo?"
}, {
  name: "Lead 4h",
  category: "lead_sem_resposta",
  shortcut: "/lead4h",
  content: "{{primeiro_nome}}, passando só para não deixar sua mensagem perdida. Me diga qual é sua principal queixa hoje que eu te explico como funciona o atendimento."
}, {
  name: "Lead 24h",
  category: "lead_sem_resposta",
  shortcut: "/lead24h",
  content: "Vou encerrar seu atendimento por aqui para não te incomodar, {{primeiro_nome}}. Mas, se ainda quiser entender como funciona a consulta médica, é só me falar aqui."
}, {
  name: "Lead 3 dias",
  category: "lead_sem_resposta",
  shortcut: "/lead3d",
  content: "{{primeiro_nome}}, muitas pacientes procuram a clínica quando já tentaram dieta, treino ou tratamentos isolados e ainda sentem que o corpo não responde. Se esse for seu caso, posso te explicar o caminho da avaliação médica."
}, {
  name: "Lead 7 dias",
  category: "lead_sem_resposta",
  shortcut: "/lead7d",
  content: "Último contato por aqui, {{primeiro_nome}}. Caso ainda queira agendar sua avaliação, me avise — será um prazer ter você aqui com a gente."
}, {
  name: "Valor 30min",
  category: "lead_valor",
  shortcut: "/valor30",
  content: "{{primeiro_nome}}, ficou alguma dúvida sobre o valor ou sobre como funciona a consulta? Posso te explicar de forma simples."
}, {
  name: "Valor 24h",
  category: "lead_valor",
  shortcut: "/valor24h",
  content: "Só reforçando, {{primeiro_nome}}: a consulta não é apenas uma conversa rápida. A ideia é investigar exames, sintomas, rotina, composição corporal e montar uma conduta individualizada para o seu caso, está bem?"
}, {
  name: "Valor 48h",
  category: "lead_valor",
  shortcut: "/valor48h",
  content: "Oii, {{primeiro_nome}}. Se o que te travou foi o valor, me fala com sinceridade. Às vezes consigo te orientar sobre a melhor forma de iniciar sem você ficar perdida."
}, {
  name: "Valor 5 dias",
  category: "lead_valor",
  shortcut: "/valor5d",
  content: "Continuar tentando sozinha pode sair mais caro do que investigar corretamente. Quando quiser dar esse passo com estratégia, me chama por aqui. Muito obrigada, {{primeiro_nome}}."
}, {
  name: "Agendamento",
  category: "agendamento",
  shortcut: "/agendou",
  content: "Oi, {{primeiro_nome}}, sua consulta ficou agendada para {{data_consulta}} às {{hora_consulta}}. Para aproveitar melhor, traga seus exames recentes, lista de medicamentos/suplementos e anote suas principais queixas."
}, {
  name: "Confirma 24h",
  category: "agendamento",
  shortcut: "/conf24h",
  content: 'Confirmando sua consulta amanhã às {{hora_consulta}}, {{primeiro_nome}}. Responda "eu vou" para manter seu horário reservado.'
}, {
  name: "Confirma 3h",
  category: "agendamento",
  shortcut: "/conf3h",
  content: "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Chegue com alguns minutos de antecedência e traga seus exames, se tiver. Te vejo lá!"
}, {
  name: "Pós-consulta 24h",
  category: "pos_consulta",
  shortcut: "/pos24h",
  content: "Oi, {{primeiro_nome}}. Passando para saber como você ficou após a consulta de ontem com a {{nome_profissional}}. Conseguiu entender bem a conduta e os próximos passos? Se surgiu alguma dúvida inicial, pode me enviar por aqui."
}, {
  name: "Pós-consulta 7d",
  category: "pos_consulta",
  shortcut: "/pos7d",
  content: "Oi, {{primeiro_nome}}. Já se passaram alguns dias desde a consulta. Como você está se sentindo? Alguma dificuldade com alimentação, medicação, suplementação ou rotina?"
}, {
  name: "Pós-consulta 15d",
  category: "pos_consulta",
  shortcut: "/pos15d",
  content: "{{primeiro_nome}}, passando para acompanhar sua evolução. O mais importante nessa fase não é perfeição, é aderência. Me diga: de 0 a 10, quanto você está se sentindo? Me conte tudo."
}, {
  name: "Pós-consulta 30d",
  category: "pos_consulta",
  shortcut: "/pos30d",
  content: "Já temos um mês desde a consulta, {{primeiro_nome}}. Esse é um bom momento para ajustar o que não encaixou bem na rotina. Como estão energia, fome, sono, disposição e medidas?"
}, {
  name: "Falta 2h",
  category: "falta",
  shortcut: "/falta2h",
  content: "Oi, {{primeiro_nome}}. Vi que você não conseguiu comparecer à consulta de hoje. Aconteceu algum imprevisto?"
}, {
  name: "Falta remarcar",
  category: "falta",
  shortcut: "/faltarem",
  content: "{{primeiro_nome}}, posso verificar uma nova possibilidade de horário para você. Quer que eu veja a próxima agenda disponível?"
}, {
  name: "Obj. vou pensar",
  category: "objecao",
  shortcut: "/objpensa",
  content: "Claro. Só não deixa isso virar mais uma coisa que você adia enquanto continua insatisfeita com os mesmos sintomas. Quer que eu te ajude a entender se esse atendimento faz sentido para seu caso?"
}, {
  name: "Obj. caro",
  category: "objecao",
  shortcut: "/objcaro",
  content: "Entendo. Só vale comparar com o que está incluso: avaliação médica, investigação por exames, conduta individualizada e acompanhamento. Não é uma consulta genérica."
}, {
  name: "Obj. agenda",
  category: "objecao",
  shortcut: "/objagenda",
  content: "Perfeito. Posso te enviar duas opções de horário e você escolhe a melhor?"
}, {
  name: "Obj. hormônio",
  category: "objecao",
  shortcut: "/objmedo",
  content: "A consulta não significa sair usando hormônio ou medicação. Primeiro vem avaliação, exames e indicação correta. Conduta sem necessidade não faz sentido."
}, {
  name: "Reativação 30d",
  category: "reativacao",
  shortcut: "/reat30",
  content: "Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Como você está? Se quiser retomar seu acompanhamento, estou à disposição."
}, {
  name: "Reativação 60d",
  category: "reativacao",
  shortcut: "/reat60",
  content: "{{primeiro_nome}}, passando para saber se ainda faz sentido cuidarmos da sua saúde com estratégia. Posso te ajudar a retomar?"
}, {
  name: "Reativação 90d",
  category: "reativacao",
  shortcut: "/reat90",
  content: "Último contato por aqui, {{primeiro_nome}}. Quando quiser voltar a cuidar de você com acompanhamento médico, é só me chamar."
}];
const seedFollowUpQuickReplies_createServerFn_handler = createServerRpc({
  id: "f07a0a5ab4740d25788a20dcf547763aa55f4f577527fbdbf1b98941397b985a",
  name: "seedFollowUpQuickReplies",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => seedFollowUpQuickReplies.__executeServer(opts));
const seedFollowUpQuickReplies = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(seedFollowUpQuickReplies_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  let inserted = 0;
  for (const [i, r] of FOLLOW_UP_QUICK_REPLIES.entries()) {
    const {
      data: existing
    } = await context.supabase.from("wa_quick_replies").select("id").eq("tenant_id", profile.tenant_id).eq("shortcut", r.shortcut).maybeSingle();
    if (existing) continue;
    const {
      error
    } = await context.supabase.from("wa_quick_replies").insert({
      tenant_id: profile.tenant_id,
      name: r.name,
      content: r.content,
      category: r.category,
      shortcut: r.shortcut,
      sort_order: 100 + i,
      active: true
    });
    if (!error) inserted++;
  }
  return {
    inserted
  };
});
const getCrmAnalytics_createServerFn_handler = createServerRpc({
  id: "0966064fba5d0117e534488b29ec7b8cf77857bd5f3962d3df643901596a0d53",
  name: "getCrmAnalytics",
  filename: "src/lib/whatsapp-crm.functions.ts"
}, (opts) => getCrmAnalytics.__executeServer(opts));
const getCrmAnalytics = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getCrmAnalytics_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireCrmAccess(context.supabase, context.userId);
  if (profile.role !== "admin") throw new Error("Apenas administradores podem ver métricas completas");
  const tenantId = profile.tenant_id;
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [leadsRes, convRes, apptRes, priceRes, closeRes, dealsRes, staffRes] = await Promise.all([context.supabase.from("wa_crm_events").select("created_at").eq("tenant_id", tenantId).eq("event_type", "lead_received").gte("created_at", since30), context.supabase.from("wa_conversations").select("id, created_at, first_response_at, last_patient_reply_at, close_reason, assigned_to, price_sent_at").eq("tenant_id", tenantId).gte("created_at", since30), context.supabase.from("appointments").select("id, status, patient_id, professional_id, created_at, date, start_time").eq("tenant_id", tenantId).gte("created_at", since30), context.supabase.from("wa_conversations").select("id, patient_id, price_sent_at").eq("tenant_id", tenantId).not("price_sent_at", "is", null).gte("price_sent_at", since30), context.supabase.from("wa_conversations").select("close_reason, status").eq("tenant_id", tenantId).eq("status", "closed").gte("updated_at", since30), context.supabase.from("wa_deals").select("id, status, assigned_to, created_at").eq("tenant_id", tenantId).gte("created_at", since30), context.supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId).in("role", ["admin", "receptionist", "professional"])]);
  const leads = leadsRes.data ?? [];
  const convs = convRes.data ?? [];
  const appts = apptRes.data ?? [];
  const priced = priceRes.data ?? [];
  const closed = closeRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const staff = staffRes.data ?? [];
  const leadsPerDay = {};
  for (const l of leads) {
    const day = l.created_at.slice(0, 10);
    leadsPerDay[day] = (leadsPerDay[day] ?? 0) + 1;
  }
  const withResponse = convs.filter((c) => c.first_response_at);
  let avgFirstResponseMinutes = null;
  if (withResponse.length) {
    const total = withResponse.reduce((s, c) => s + (new Date(c.first_response_at).getTime() - new Date(c.created_at).getTime()), 0);
    avgFirstResponseMinutes = Math.round(total / withResponse.length / 6e4);
  }
  const repliedLeads = convs.filter((c) => c.last_patient_reply_at).length;
  const leadResponseRate = convs.length ? Math.round(repliedLeads / convs.length * 100) : 0;
  const scheduledAppts = appts.filter((a) => ["scheduled", "confirmed", "completed", "in_progress", "no_show"].includes(a.status)).length;
  const schedulingRate = convs.length ? Math.round(scheduledAppts / convs.length * 100) : 0;
  const completed = appts.filter((a) => a.status === "completed").length;
  const noShow = appts.filter((a) => a.status === "no_show").length;
  const attendanceRate = completed + noShow > 0 ? Math.round(completed / (completed + noShow) * 100) : null;
  const pricedPatientIds = new Set(priced.map((p) => p.patient_id).filter(Boolean));
  const bookedAfterPrice = appts.filter((a) => a.patient_id && pricedPatientIds.has(a.patient_id)).length;
  const closeRateAfterPrice = priced.length > 0 ? Math.round(bookedAfterPrice / priced.length * 100) : null;
  const lossReasons = {};
  for (const c of closed) {
    const reason = c.close_reason?.trim() || "Sem motivo";
    lossReasons[reason] = (lossReasons[reason] ?? 0) + 1;
  }
  const staffNames = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));
  const conversionByStaff = {};
  for (const d of deals.filter((x) => x.status === "won" && x.assigned_to)) {
    const id = d.assigned_to;
    if (!conversionByStaff[id]) conversionByStaff[id] = {
      name: staffNames[id] ?? "Equipe",
      deals: 0,
      appointments: 0
    };
    conversionByStaff[id].deals++;
  }
  for (const a of appts.filter((x) => ["completed", "confirmed", "scheduled"].includes(x.status))) {
    const id = a.professional_id;
    if (!conversionByStaff[id]) conversionByStaff[id] = {
      name: staffNames[id] ?? "Equipe",
      deals: 0,
      appointments: 0
    };
    conversionByStaff[id].appointments++;
  }
  const topConverters = Object.values(conversionByStaff).map((s) => ({
    ...s,
    score: s.deals * 3 + s.appointments
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  return {
    periodDays: 30,
    leadsPerDay: Object.entries(leadsPerDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
      date,
      count
    })),
    avgFirstResponseMinutes,
    leadResponseRate,
    schedulingRate,
    attendanceRate,
    closeRateAfterPrice,
    lossReasons: Object.entries(lossReasons).map(([reason, count]) => ({
      reason,
      count
    })).sort((a, b) => b.count - a.count),
    topConverters,
    totals: {
      leads: leads.length,
      conversations: convs.length,
      appointments: appts.length,
      pricedConversations: priced.length
    }
  };
});
export {
  assignWaConversation_createServerFn_handler,
  assignWaQueueToReception_createServerFn_handler,
  closeWaConversation_createServerFn_handler,
  completeWaTask_createServerFn_handler,
  createWaDeal_createServerFn_handler,
  createWaTask_createServerFn_handler,
  deleteWaQuickReply_createServerFn_handler,
  deleteWaTagRule_createServerFn_handler,
  ensureWaPipeline_createServerFn_handler,
  fetchWaContactPhoto_createServerFn_handler,
  getCrmAnalytics_createServerFn_handler,
  getCrmMetrics_createServerFn_handler,
  getMetaWaTemplates_createServerFn_handler,
  getWaPatientContext_createServerFn_handler,
  getWaPipelineBoard_createServerFn_handler,
  getWaQuickReplies_createServerFn_handler,
  getWaTagRules_createServerFn_handler,
  getWaTasks_createServerFn_handler,
  getWhatsAppConnection_createServerFn_handler,
  linkWaPatient_createServerFn_handler,
  markWaObjection_createServerFn_handler,
  moveWaDealStage_createServerFn_handler,
  processWaFollowUps_createServerFn_handler,
  reopenWaConversation_createServerFn_handler,
  searchWaMessagesGlobal_createServerFn_handler,
  searchWaMessages_createServerFn_handler,
  seedFollowUpQuickReplies_createServerFn_handler,
  seedWaQuickReplies_createServerFn_handler,
  sendWaAfterHoursTest_createServerFn_handler,
  sendWaBroadcast_createServerFn_handler,
  setupPostConsultationFollowUp_createServerFn_handler,
  syncWaChatsFromZApi_createServerFn_handler,
  toggleWaConversationTag_createServerFn_handler,
  triggerAppointmentFollowUp_createServerFn_handler,
  triggerAppointmentStatusFollowUp_createServerFn_handler,
  upsertWaQuickReply_createServerFn_handler,
  upsertWaTagRule_createServerFn_handler
};
