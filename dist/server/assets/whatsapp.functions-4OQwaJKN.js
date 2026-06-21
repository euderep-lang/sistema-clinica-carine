import { c as createServerRpc } from "./createServerRpc-DL4H5mKZ.js";
import { a as createServerFn } from "./server-CAXiU2vY.js";
import { r as requireSupabaseAuth } from "./auth-middleware-BBfyoGmP.js";
import { B as getWhatsAppStatusPayload, m as isWhatsAppConfigured, C as sendMetaSocialText, n as normalizeBrazilPhone, o as providerSendText, D as providerSendMedia, E as providerResolveMediaUrl, F as supabaseAdmin, G as findConversationByPhone } from "../server.js";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { b as onOutboundMessageForFollowUp } from "./wa-follow-up.server-BWth3L5S.js";
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
const execFileAsync = promisify(execFile);
async function convertAudioBase64ToMp3(base64, inputMime) {
  const mime = inputMime.toLowerCase();
  if (mime.includes("mpeg") || mime.includes("mp3") || mime.includes("ogg")) {
    return null;
  }
  const ext = mime.includes("webm") ? "webm" : mime.includes("wav") ? "wav" : mime.includes("mp4") ? "m4a" : "bin";
  const dir = await mkdtemp(join(tmpdir(), "wa-audio-"));
  const inputPath = join(dir, `in.${ext}`);
  const outputPath = join(dir, "out.mp3");
  try {
    await writeFile(inputPath, Buffer.from(base64, "base64"));
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "44100",
      "-b:a",
      "128k",
      outputPath
    ]);
    const out = await readFile(outputPath);
    return {
      base64: out.toString("base64"),
      mimeType: "audio/mpeg",
      filename: "audio.mp3"
    };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
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
function configError() {
  const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase();
  if (provider === "zapi" || process.env.ZAPI_INSTANCE_ID) {
    return "WhatsApp não configurado. Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env";
  }
  return "WhatsApp não configurado. Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no .env";
}
const getWhatsAppStatus_createServerFn_handler = createServerRpc({
  id: "a5fc2b8cb05e19a518ccc78c00d97d1583e6a384df746e541b6d771697f9f644",
  name: "getWhatsAppStatus",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => getWhatsAppStatus.__executeServer(opts));
const getWhatsAppStatus = createServerFn({
  method: "GET"
}).handler(getWhatsAppStatus_createServerFn_handler, async () => getWhatsAppStatusPayload());
const sendWaText_createServerFn_handler = createServerRpc({
  id: "e7ec6a62d61b180d0c96650810171af0f2a3ea489a0c8a9a9baaf030f1301499",
  name: "sendWaText",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => sendWaText.__executeServer(opts));
const sendWaText = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(sendWaText_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const profile = await requireCrmAccess(supabase, userId);
  if (!isWhatsAppConfigured()) throw new Error(configError());
  const {
    data: conv,
    error
  } = await supabase.from("wa_conversations").select("id, contact_phone, first_response_at, status, channel, external_user_id").eq("id", data.conversationId).maybeSingle();
  if (error || !conv) throw new Error("Conversa não encontrada");
  const convRow = conv;
  let replyToWaId;
  if (data.replyToMessageId) {
    const {
      data: replyMsg
    } = await supabase.from("wa_messages").select("wa_message_id").eq("id", data.replyToMessageId).eq("conversation_id", data.conversationId).maybeSingle();
    replyToWaId = replyMsg?.wa_message_id;
  }
  const channel = convRow.channel ?? "whatsapp";
  let messageId;
  if (channel === "instagram" || channel === "messenger") {
    const recipientId = convRow.external_user_id ?? convRow.contact_phone;
    const result = await sendMetaSocialText(recipientId, data.text, channel);
    messageId = result.messageId;
  } else {
    const phone = normalizeBrazilPhone(convRow.contact_phone);
    const result = await providerSendText(phone, data.text, {
      replyToWaMessageId: replyToWaId
    });
    messageId = result.messageId;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabase.from("wa_messages").insert({
    tenant_id: profile.tenant_id,
    conversation_id: data.conversationId,
    wa_message_id: messageId,
    direction: "outbound",
    message_type: "text",
    body: data.text,
    status: "sent",
    sent_by: userId,
    reply_to_message_id: data.replyToMessageId ?? null
  });
  const convUpdate = {
    last_message_at: now,
    last_message_preview: data.text.slice(0, 120),
    updated_at: now
  };
  if (!convRow.first_response_at) convUpdate.first_response_at = now;
  if (convRow.status === "closed") {
    convUpdate.status = "open";
    convUpdate.close_reason = null;
    convUpdate.closed_at = null;
    convUpdate.closed_by = null;
  }
  await supabase.from("wa_conversations").update(convUpdate).eq("id", data.conversationId);
  void onOutboundMessageForFollowUp({
    tenantId: profile.tenant_id,
    conversationId: data.conversationId,
    text: data.text,
    userId
  }).catch((e) => console.error("[CRM] follow-up outbound error:", e));
  return {
    ok: true
  };
});
const sendWaMedia_createServerFn_handler = createServerRpc({
  id: "86c43e18f9d0c9ec68e538086d093545fb298fdff3e6d4540632fc3d6de58194",
  name: "sendWaMedia",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => sendWaMedia.__executeServer(opts));
const sendWaMedia = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(sendWaMedia_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const profile = await requireCrmAccess(supabase, userId);
  if (!isWhatsAppConfigured()) throw new Error(configError());
  const {
    data: conv,
    error
  } = await supabase.from("wa_conversations").select("id, contact_phone").eq("id", data.conversationId).maybeSingle();
  if (error || !conv) throw new Error("Conversa não encontrada");
  const phone = normalizeBrazilPhone(conv.contact_phone);
  let base64 = data.base64;
  let mimeType = data.mimeType;
  let filename = data.filename;
  if (data.mediaType === "audio" && !/mpeg|mp3|ogg/i.test(mimeType)) {
    const converted = await convertAudioBase64ToMp3(base64, mimeType);
    if (converted) {
      base64 = converted.base64;
      mimeType = converted.mimeType;
      filename = converted.filename;
    }
  }
  const {
    messageId,
    mediaRef
  } = await providerSendMedia(phone, data.mediaType, base64, mimeType, filename, data.caption);
  const preview = data.mediaType === "audio" ? "🎤 Áudio" : data.mediaType === "image" ? "📷 Imagem" : `📎 ${filename}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let storedMediaRef = mediaRef;
  if (!storedMediaRef && data.mediaType === "image") {
    const dataUri = `data:${mimeType};base64,${base64}`;
    if (dataUri.length <= 6e5) storedMediaRef = dataUri;
  }
  await supabase.from("wa_messages").insert({
    tenant_id: profile.tenant_id,
    conversation_id: data.conversationId,
    wa_message_id: messageId,
    direction: "outbound",
    message_type: data.mediaType,
    body: data.caption ?? preview,
    media_id: storedMediaRef,
    media_mime: mimeType,
    media_filename: filename,
    status: "sent",
    sent_by: userId
  });
  await supabase.from("wa_conversations").update({
    last_message_at: now,
    last_message_preview: preview,
    updated_at: now
  }).eq("id", data.conversationId);
  return {
    ok: true
  };
});
const transferWaConversation_createServerFn_handler = createServerRpc({
  id: "efe697151b75f2e1faec7ac4ff3fec0c3389ee466b2988bbe73d9f8f8347e92e",
  name: "transferWaConversation",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => transferWaConversation.__executeServer(opts));
const transferWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(transferWaConversation_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const profile = await requireCrmAccess(supabase, userId);
  const {
    data: conv
  } = await supabase.from("wa_conversations").select("unread_count").eq("id", data.conversationId).maybeSingle();
  const unread = conv?.unread_count ?? 0;
  await supabase.from("wa_conversations").update({
    assigned_to: data.toUserId,
    unread_count: unread > 0 ? unread : 1,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", data.conversationId);
  await supabase.from("wa_transfers").insert({
    tenant_id: profile.tenant_id,
    conversation_id: data.conversationId,
    from_user_id: userId,
    to_user_id: data.toUserId,
    note: data.note ?? null
  });
  return {
    ok: true
  };
});
const markWaConversationRead_createServerFn_handler = createServerRpc({
  id: "4aaaa01d9d5daf6718651677c2427623eb3e7bd9deb6befc1eb2e430d46fb455",
  name: "markWaConversationRead",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => markWaConversationRead.__executeServer(opts));
const markWaConversationRead = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(markWaConversationRead_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  await supabase.from("wa_conversations").update({
    unread_count: 0
  }).eq("id", data.conversationId);
  await supabase.from("wa_transfers").update({
    seen_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("conversation_id", data.conversationId).eq("to_user_id", userId).is("seen_at", null);
  return {
    ok: true
  };
});
const fetchWaMediaUrl_createServerFn_handler = createServerRpc({
  id: "17342be8d286ce6c9268ff69e85868a1f4495e85ae0db32e0706e504312c21b2",
  name: "fetchWaMediaUrl",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => fetchWaMediaUrl.__executeServer(opts));
const fetchWaMediaUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(fetchWaMediaUrl_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireCrmAccess(context.supabase, context.userId);
  if (!isWhatsAppConfigured()) throw new Error(configError());
  return providerResolveMediaUrl(data.mediaId, data.mimeType ?? null);
});
const startWaConversation_createServerFn_handler = createServerRpc({
  id: "53061f53ec775a2a7e9f2d7571ce345f807daaad7671225015b2b46567c0159d",
  name: "startWaConversation",
  filename: "src/lib/whatsapp.functions.ts"
}, (opts) => startWaConversation.__executeServer(opts));
const startWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(startWaConversation_createServerFn_handler, async ({
  data,
  context
}) => {
  const {
    supabase,
    userId
  } = context;
  const profile = await requireCrmAccess(supabase, userId);
  if (!isWhatsAppConfigured()) throw new Error(configError());
  if (data.patientId) {
    const {
      data: patient
    } = await supabase.from("patients").select("id").eq("id", data.patientId).eq("tenant_id", profile.tenant_id).maybeSingle();
    if (!patient) throw new Error("Paciente não encontrado");
  }
  const phone = normalizeBrazilPhone(data.phone);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const displayName = data.name ?? phone;
  const {
    data: tenantConvs
  } = await supabaseAdmin.from("wa_conversations").select("id, contact_phone, contact_name, patient_id, last_message_at, created_at").eq("tenant_id", profile.tenant_id);
  const existing = findConversationByPhone(tenantConvs ?? [], phone);
  let conversationId;
  if (existing) {
    const {
      error: updateErr
    } = await supabaseAdmin.from("wa_conversations").update({
      contact_phone: phone,
      patient_id: data.patientId ?? existing.patient_id ?? null,
      contact_name: data.patientId ? displayName : existing.contact_name ?? displayName,
      assigned_to: userId,
      last_message_at: now,
      last_message_preview: data.text.slice(0, 120),
      status: "open",
      updated_at: now
    }).eq("id", existing.id);
    if (updateErr) throw new Error(updateErr.message);
    conversationId = existing.id;
  } else {
    const {
      data: conv,
      error: insertErr
    } = await supabaseAdmin.from("wa_conversations").insert({
      tenant_id: profile.tenant_id,
      contact_phone: phone,
      patient_id: data.patientId ?? null,
      contact_name: displayName,
      assigned_to: userId,
      last_message_at: now,
      last_message_preview: data.text.slice(0, 120),
      status: "open",
      updated_at: now
    }).select("id").single();
    if (insertErr || !conv) throw new Error(insertErr?.message ?? "Falha ao criar conversa");
    conversationId = conv.id;
  }
  const {
    messageId
  } = await providerSendText(phone, data.text);
  await supabaseAdmin.from("wa_messages").insert({
    tenant_id: profile.tenant_id,
    conversation_id: conversationId,
    wa_message_id: messageId,
    direction: "outbound",
    message_type: "text",
    body: data.text,
    status: "sent",
    sent_by: userId
  });
  return {
    conversationId
  };
});
export {
  fetchWaMediaUrl_createServerFn_handler,
  getWhatsAppStatus_createServerFn_handler,
  markWaConversationRead_createServerFn_handler,
  sendWaMedia_createServerFn_handler,
  sendWaText_createServerFn_handler,
  startWaConversation_createServerFn_handler,
  transferWaConversation_createServerFn_handler
};
