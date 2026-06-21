import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
let lastCapturedError;
const TTL_MS = 5e3;
function record(error) {
  lastCapturedError = { error, at: Date.now() };
}
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record(event.error ?? event));
  globalThis.addEventListener(
    "unhandledrejection",
    (event) => record(event.reason)
  );
}
function consumeLastCapturedError() {
  if (!lastCapturedError) return void 0;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = void 0;
    return void 0;
  }
  const { error } = lastCapturedError;
  lastCapturedError = void 0;
  return error;
}
function renderErrorPage() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Algo deu errado do nosso lado. Você pode atualizar a página ou voltar ao início.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}
function digitsOnly(phone) {
  return phone.replace(/@.+$/i, "").replace(/\D/g, "");
}
function phoneTail11(phone) {
  const normalized = normalizeBrazilPhone(phone);
  if (normalized) return normalized.slice(-11);
  return digitsOnly(phone).slice(-11);
}
function normalizeBrazilPhone(input) {
  let d = digitsOnly(input);
  if (!d) return d;
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("55")) d = `55${d}`;
  if (d.length === 12) {
    const ddd = d.slice(2, 4);
    const local = d.slice(4);
    if (local.length === 8 && /^[6789]/.test(local)) {
      d = `55${ddd}9${local}`;
    }
  }
  return d;
}
function phonesMatch(a, b) {
  const na = normalizeBrazilPhone(a);
  const nb = normalizeBrazilPhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return phoneTail11(na) === phoneTail11(nb);
}
function findConversationByPhone(rows, phone) {
  if (!rows?.length) return null;
  const canonical = normalizeBrazilPhone(phone);
  phoneTail11(canonical);
  const matches = rows.filter((r) => phonesMatch(r.contact_phone, canonical));
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];
  return [...matches].sort((a, b) => {
    const score = (r) => (r.patient_id ? 4 : 0) + (r.contact_name && !/^\d+$/.test(r.contact_name.replace(/\D/g, "")) ? 2 : 0) + (r.last_message_at ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  })[0];
}
function dedupeConversationsByPhone(rows) {
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const tail = phoneTail11(normalizeBrazilPhone(row.contact_phone));
    const list = groups.get(tail) ?? [];
    list.push(row);
    groups.set(tail, list);
  }
  const deduped = [];
  for (const group of groups.values()) {
    const keeper = findConversationByPhone(group, group[0].contact_phone);
    if (keeper) deduped.push(keeper);
  }
  return deduped.sort(
    (a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
  );
}
const GRAPH_API = "https://graph.facebook.com/v21.0";
function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken,
    phoneNumberId,
    appSecret: process.env.WHATSAPP_APP_SECRET
  };
}
function isWhatsAppConfigured$1() {
  return getWhatsAppConfig() !== null;
}
async function graphRequest(config, path, init) {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      ...init?.headers ?? {}
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json?.error?.message ?? res.statusText;
    throw new Error(err);
  }
  return json;
}
async function sendWhatsAppText(config, toPhoneDigits, text) {
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhoneDigits,
    type: "text",
    text: { preview_url: true, body: text }
  };
  const json = await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}
async function uploadWhatsAppMedia(config, file, mimeType, filename) {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", file, filename);
  const res = await fetch(`${GRAPH_API}/${config.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  if (!json.id) throw new Error("Meta não retornou ID da mídia");
  return { mediaId: json.id };
}
async function sendWhatsAppMedia(config, toPhoneDigits, type, mediaId, options) {
  const mediaPayload = { id: mediaId };
  if (options?.caption && (type === "image" || type === "video" || type === "document")) {
    mediaPayload.caption = options.caption;
  }
  if (options?.filename && type === "document") {
    mediaPayload.filename = options.filename;
  }
  const body = {
    messaging_product: "whatsapp",
    to: toPhoneDigits,
    type,
    [type]: mediaPayload
  };
  const json = await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}
async function getWhatsAppMediaUrl(config, mediaId) {
  const json = await graphRequest(config, `/${mediaId}`);
  if (!json.url) throw new Error("URL da mídia não encontrada");
  return { url: json.url, mimeType: json.mime_type ?? "application/octet-stream" };
}
function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const hash = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
  } catch {
    return false;
  }
}
async function listWhatsAppTemplates(config) {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!wabaId) return [];
  const json = await graphRequest(config, `/${wabaId}/message_templates?limit=100`);
  return (json.data ?? []).filter((t) => t.status === "APPROVED");
}
async function sendWhatsAppTemplate(config, toPhoneDigits, templateName, languageCode, bodyVariables = []) {
  const components = bodyVariables.length > 0 ? [
    {
      type: "body",
      parameters: bodyVariables.map((text) => ({ type: "text", text }))
    }
  ] : void 0;
  const body = {
    messaging_product: "whatsapp",
    to: toPhoneDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...components ? { components } : {}
    }
  };
  const json = await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}
async function sendMetaSocialText(recipientId, text, channel) {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;
  if (!pageId || !accessToken) {
    throw new Error("Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN para Instagram/Messenger");
  }
  const body = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: "RESPONSE"
  };
  const endpoint = channel === "instagram" ? `${GRAPH_API}/${pageId}/messages?access_token=${accessToken}` : `${GRAPH_API}/${pageId}/messages?access_token=${accessToken}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  const messageId = json.message_id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem social");
  return { messageId };
}
const ZAPI_BASE = "https://api.z-api.io/instances";
function getZApiConfig() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) return null;
  return {
    instanceId,
    token,
    clientToken: process.env.ZAPI_CLIENT_TOKEN
  };
}
function zapiUrl(config, path) {
  const base = `${ZAPI_BASE}/${config.instanceId}/token/${config.token}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
function zapiHeaders(config, extra) {
  const headers = {
    "Content-Type": "application/json",
    ...{}
  };
  if (config.clientToken) headers["Client-Token"] = config.clientToken;
  return headers;
}
async function zapiRequest(config, path, body, method = "POST") {
  const res = await fetch(zapiUrl(config, path), {
    method,
    headers: zapiHeaders(config),
    body: method === "POST" && body ? JSON.stringify(body) : void 0
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error ?? json.message ?? res.statusText;
    throw new Error(typeof err === "string" ? err : "Erro na Z-API");
  }
  return json;
}
async function getZApiStatus(config) {
  try {
    const json = await zapiRequest(config, "/status", void 0, "GET");
    const connected = json.connected === true || json.smartphoneConnected === true || json.status === "connected";
    return { connected, smartphoneConnected: json.smartphoneConnected };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : "Erro ao consultar Z-API" };
  }
}
function toDataUri(base64, mimeType) {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}
function fileExtension(filename, fallback = "bin") {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 6 ? ext : fallback;
}
async function getZApiContactPhoto(config, phone) {
  try {
    const json = await zapiRequest(
      config,
      `/contacts/get-profile-picture?phone=${encodeURIComponent(phone)}`,
      void 0,
      "GET"
    );
    const link = json.link?.trim();
    return link || null;
  } catch {
    return null;
  }
}
async function sendZApiText(config, phone, message, options) {
  const json = await zapiRequest(config, "/send-text", {
    phone,
    message,
    ...options?.replyToWaMessageId ? { messageId: options.replyToWaMessageId } : {}
  });
  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}
async function sendZApiMedia(config, phone, mediaType, base64, mimeType, filename, caption) {
  const dataUri = toDataUri(base64, mimeType);
  let json;
  if (mediaType === "image") {
    const imageMime = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "image/jpeg" : mimeType.includes("png") ? "image/png" : mimeType.includes("webp") ? "image/webp" : mimeType.startsWith("image/") ? mimeType : "image/jpeg";
    json = await zapiRequest(config, "/send-image", {
      phone,
      image: toDataUri(base64, imageMime),
      caption: caption ?? ""
    });
  } else if (mediaType === "audio") {
    const audioMime = mimeType.includes("mpeg") || mimeType.includes("mp3") ? "audio/mpeg" : mimeType.includes("ogg") ? "audio/ogg" : mimeType;
    json = await zapiRequest(config, "/send-audio", {
      phone,
      audio: toDataUri(base64, audioMime),
      waveform: true,
      delayTyping: 2
    });
  } else if (mediaType === "video") {
    json = await zapiRequest(config, "/send-video", {
      phone,
      video: dataUri,
      caption: caption ?? ""
    });
  } else {
    const ext = fileExtension(filename, "pdf");
    json = await zapiRequest(config, `/send-document/${ext}`, {
      phone,
      document: dataUri,
      fileName: filename,
      caption: caption ?? ""
    });
  }
  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}
function resolveZApiMediaUrl(mediaRef, mimeType) {
  if (mediaRef.startsWith("http://") || mediaRef.startsWith("https://")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  throw new Error("Mídia indisponível");
}
async function getZApiChats(config, page = 1, pageSize = 100) {
  const json = await zapiRequest(
    config,
    `/chats?page=${page}&pageSize=${pageSize}`,
    void 0,
    "GET"
  );
  const list = Array.isArray(json) ? json : json.chats ?? [];
  return list.filter((c) => c.phone && !c.isGroup);
}
function getWhatsAppProvider() {
  const explicit = (process.env.WHATSAPP_PROVIDER ?? "").toLowerCase();
  if (explicit === "zapi") return getZApiConfig() ? "zapi" : null;
  if (explicit === "meta") return isWhatsAppConfigured$1() ? "meta" : null;
  if (getZApiConfig()) return "zapi";
  if (isWhatsAppConfigured$1()) return "meta";
  return null;
}
function isWhatsAppConfigured() {
  return getWhatsAppProvider() !== null;
}
function getWhatsAppStatusPayload() {
  const provider = getWhatsAppProvider();
  return {
    configured: provider !== null,
    provider,
    webhookUrl: "/api/whatsapp/webhook"
  };
}
async function getWhatsAppConnectionStatus() {
  const base = getWhatsAppStatusPayload();
  if (!base.configured) return { ...base, connected: false };
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) return { ...base, connected: false };
    const status = await getZApiStatus(config);
    return { ...base, connected: status.connected, connectionError: status.error ?? null };
  }
  return { ...base, connected: true, connectionError: null };
}
async function providerSendText(phone, text, options) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    return sendZApiText(config, phone, text, options);
  }
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    return sendWhatsAppText(config, phone, text);
  }
  throw new Error("WhatsApp não configurado");
}
async function providerSendMedia(phone, mediaType, base64, mimeType, filename, caption) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    const { messageId } = await sendZApiMedia(config, phone, mediaType, base64, mimeType, filename, caption);
    return { messageId, mediaRef: null };
  }
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    const { mediaId } = await uploadWhatsAppMedia(config, blob, mimeType, filename);
    const { messageId } = await sendWhatsAppMedia(config, phone, mediaType, mediaId, {
      caption,
      filename
    });
    return { messageId, mediaRef: mediaId };
  }
  throw new Error("WhatsApp não configurado");
}
async function providerResolveMediaUrl(mediaRef, mimeType) {
  if (mediaRef.startsWith("data:")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  if (mediaRef.startsWith("http://") || mediaRef.startsWith("https://")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  const provider = getWhatsAppProvider();
  if (provider === "zapi") return resolveZApiMediaUrl(mediaRef, mimeType);
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    return getWhatsAppMediaUrl(config, mediaRef);
  }
  throw new Error("WhatsApp não configurado");
}
async function providerGetContactPhoto(phone) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) return null;
    return getZApiContactPhoto(config, phone);
  }
  return null;
}
function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...!SUPABASE_URL ? ["SUPABASE_URL"] : [],
      ...!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []
    ];
    const message = `Variável(is) de ambiente do Supabase ausente(s): ${missing.join(", ")}. Configure-as no arquivo .env (veja .env.example).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: void 0,
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
let _supabaseAdmin;
const supabaseAdmin = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  }
});
const client_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  supabaseAdmin
}, Symbol.toStringTag, { value: "Module" }));
function createSupabaseClient() {
  const SUPABASE_URL = "https://jglzghujpxbakqqmmple.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbHpnaHVqcHhiYWtxcW1tcGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDAwMDIsImV4cCI6MjA5MjExNjAwMn0.7b3dH0KScK_J0Kjwp1Qnno1_Ll-dFeqgbFMtA8_9VQ4";
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : void 0,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
let _supabase;
const supabase = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  }
});
async function getTenantSetting(tenantId, key) {
  const { data } = await supabase.from("tenant_settings").select("value").eq("tenant_id", tenantId).eq("key", key).maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return data.value;
  }
}
async function setTenantSetting(tenantId, key, value) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  const { error } = await supabase.from("tenant_settings").upsert({ tenant_id: tenantId, key, value: v }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}
function maskCNPJ(v) {
  return v.replace(/\D/g, "").slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}
function maskCEP(v) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}
const DEFAULT_HOURS = {
  mon: { active: true, open: "08:00", close: "18:00" },
  tue: { active: true, open: "08:00", close: "18:00" },
  wed: { active: true, open: "08:00", close: "18:00" },
  thu: { active: true, open: "08:00", close: "18:00" },
  fri: { active: true, open: "08:00", close: "18:00" },
  sat: { active: true, open: "08:00", close: "13:00" },
  sun: { active: false, open: "08:00", close: "12:00" }
};
const DAY_LABELS = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom"
};
const DEFAULT_SPECIALTIES = [
  "Nutrologia",
  "Dentista",
  "Psiquiatria",
  "Psicóloga",
  "Fisioterapeuta"
];
const LEGACY_SPECIALTIES = /* @__PURE__ */ new Set([
  "Clínica Geral",
  "Dermatologia",
  "Pediatria",
  "Ginecologia",
  "Cardiologia",
  "Ortopedia",
  "Neurologia",
  "Psiquiatria",
  "Nutrição",
  "Fisioterapia"
]);
function isLegacySpecialtyList(list) {
  return list.length === LEGACY_SPECIALTIES.size && list.every((item) => LEGACY_SPECIALTIES.has(item));
}
function resolveSpecialties(list) {
  if (!list || list.length === 0) return [...DEFAULT_SPECIALTIES];
  if (isLegacySpecialtyList(list)) return [...DEFAULT_SPECIALTIES];
  return list;
}
function formatClinicAddressLines(addr) {
  if (!addr) return { line1: null, line2: null };
  const line1 = [addr.logradouro, addr.numero].filter(Boolean).join(", ") || null;
  const line2 = [addr.bairro, addr.cidade, addr.estado].filter(Boolean).join(", ") || null;
  return { line1, line2 };
}
function formatClinicAddress(addr) {
  const { line1, line2 } = formatClinicAddressLines(addr);
  const parts = [line1, line2, addr?.cep].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}
async function fetchViaCEP(cep) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      logradouro: j.logradouro,
      bairro: j.bairro,
      cidade: j.localidade,
      estado: j.uf
    };
  } catch {
    return null;
  }
}
function parseHexColor(input) {
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return null;
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}
function relativeLuminance(rgb) {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function foregroundForBackground(color) {
  const rgb = parseHexColor(color);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) < 0.45 ? "#ffffff" : "oklch(0.28 0.03 250)";
}
function applyThemeColors(primary, secondary) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", foregroundForBackground(primary));
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-primary-foreground", foregroundForBackground(primary));
  }
  if (secondary) {
    root.style.setProperty("--accent", secondary);
    root.style.setProperty("--accent-foreground", foregroundForBackground(secondary));
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--secondary-foreground", foregroundForBackground(secondary));
    root.style.setProperty("--ring", secondary);
  }
}
const FONT_OPTIONS = [
  { id: "system", label: "Padrão", stack: "system-ui, -apple-system, sans-serif" },
  { id: "inter", label: "Moderna", stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;500;600;700" },
  { id: "playfair", label: "Elegante", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
  { id: "jetbrains", label: "Técnica", stack: '"JetBrains Mono", ui-monospace, monospace', google: "JetBrains+Mono:wght@400;500;700" }
];
function loadGoogleFont(id) {
  if (typeof document === "undefined") return;
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (!opt || !("google" in opt) || !opt.google) return;
  const linkId = `gfont-${id}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
  document.head.appendChild(link);
}
function applyFont(id) {
  if (typeof document === "undefined") return;
  loadGoogleFont(id);
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (opt) document.documentElement.style.setProperty("--font-sans", opt.stack);
}
function renderTemplate(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
const TEMPLATE_VARS = [
  "primeiro_nome",
  "nome_paciente",
  "data_consulta",
  "hora_consulta",
  "nome_profissional",
  "nome_clinica",
  "link_confirmacao"
];
const SAMPLE_VARS = {
  nome_paciente: "Maria Silva",
  data_consulta: "15/07/2025",
  hora_consulta: "14:30",
  nome_profissional: "Dr. Carlos Silva",
  nome_clinica: "Sua Clínica",
  link_confirmacao: "https://app.clinicos.com/c/abc123"
};
const LOCALE = "pt-BR";
const TIMEZONE = "America/Sao_Paulo";
const CURRENCY_CODE = "BRL";
const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE
});
function datePartsInTimezone(date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second")
  };
}
function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(/* @__PURE__ */ new Date());
}
function firstDayOfMonthISO(ref) {
  const base = todayISO();
  return `${base.slice(0, 7)}-01`;
}
function tomorrowISO() {
  return shiftDateISO(todayISO(), 1);
}
function shiftDateISO(iso, days) {
  const d = parseDateOnly(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnlyUTC(d);
}
function parseDateOnly(iso) {
  return /* @__PURE__ */ new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
}
function formatDateOnlyUTC(date) {
  return date.toISOString().slice(0, 10);
}
function currentYearMonth() {
  return todayISO().slice(0, 7);
}
function getZonedTimeParts(date = /* @__PURE__ */ new Date()) {
  return datePartsInTimezone(date);
}
function getZonedWeekday(date = /* @__PURE__ */ new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}
function isSameDayInTimezone(a, b = /* @__PURE__ */ new Date()) {
  const pa = datePartsInTimezone(a);
  const pb = datePartsInTimezone(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}
function fmtMoney(n) {
  return moneyFormatter.format(Number(n ?? 0));
}
const fmt = fmtMoney;
function parseBRLInput(s) {
  const clean = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}
const defaultDateOptions = {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
};
function fmtDate(s) {
  if (!s) return "—";
  const raw = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parseDateOnly(raw).toLocaleDateString(LOCALE, defaultDateOptions);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, defaultDateOptions);
}
function fmtDateFromDate(date, options = defaultDateOptions) {
  return date.toLocaleDateString(LOCALE, { timeZone: TIMEZONE, ...options });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function fmtDateTimeFromDate(date, options = {}) {
  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  });
}
function fmtTimeFromDate(date = /* @__PURE__ */ new Date(), options = {}) {
  return date.toLocaleTimeString(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options
  });
}
function formatYMD(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function addMonthsISO(iso, months) {
  const d = parseDateOnly(iso.slice(0, 10));
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDateOnlyUTC(d);
}
function fmtDateLong(iso) {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
}
function fmtDateFull(iso) {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
function fmtDateShortWeekday(iso) {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function fmtDateTimeLocalInput(date = /* @__PURE__ */ new Date()) {
  const p = datePartsInTimezone(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
function fmtMonthYear(date) {
  const d = typeof date === "string" ? parseDateOnly(date.slice(0, 10)) : date;
  return d.toLocaleDateString(LOCALE, {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric"
  });
}
function fmtRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 6e4);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return fmtDateFromDate(date, { day: "2-digit", month: "short" });
}
function fmtMessageTime(iso) {
  const date = new Date(iso);
  if (isSameDayInTimezone(date)) {
    return fmtTimeFromDate(date);
  }
  return fmtDateTimeFromDate(date);
}
function isOverdue(due, status) {
  if (status !== "pending" && status !== "partial") return false;
  return due.slice(0, 10) < todayISO();
}
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DEFAULT_AFTER_HOURS_MESSAGE = "Olá! Recebemos sua mensagem. Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e sábado das 8h às 13h. Responderemos assim que possível.";
function parseTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function isWithinBusinessHours(hours, at = /* @__PURE__ */ new Date()) {
  const schedule = hours ?? DEFAULT_HOURS;
  const { hour, minute } = getZonedTimeParts(at);
  const dayKey = DAY_KEYS[getZonedWeekday(at)];
  const day = schedule[dayKey];
  if (!day?.active) return false;
  const nowMin = hour * 60 + minute;
  const openMin = parseTime(day.open);
  const closeMin = parseTime(day.close);
  return nowMin >= openMin && nowMin < closeMin;
}
function shouldSendAfterHoursReply(lastReplyAt, at = /* @__PURE__ */ new Date()) {
  if (!lastReplyAt) return true;
  const last = new Date(lastReplyAt).getTime();
  return at.getTime() - last >= 12 * 60 * 60 * 1e3;
}
async function logWaAudit(input) {
  await supabaseAdmin.from("wa_audit_log").insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    details: input.details ?? null
  });
}
async function getDefaultReceptionAssignee(tenantId) {
  const { data } = await supabaseAdmin.from("profiles").select("id").eq("tenant_id", tenantId).eq("role", "receptionist").order("full_name").limit(1).maybeSingle();
  return data?.id ?? null;
}
async function assignOpenConversationsToReception(tenantId, options) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  if (!receptionistId) {
    return { updated: 0, receptionistId: null };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let q = supabaseAdmin.from("wa_conversations").update({ assigned_to: receptionistId, updated_at: now }).eq("tenant_id", tenantId).eq("status", "open");
  if (options?.onlyUnassigned !== false) {
    q = q.is("assigned_to", null);
  }
  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);
  return { updated: data?.length ?? 0, receptionistId };
}
async function ensureConversationAssignedToReception(tenantId, conversationId) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  if (!receptionistId) return false;
  const { data: conv } = await supabaseAdmin.from("wa_conversations").select("assigned_to, status").eq("id", conversationId).eq("tenant_id", tenantId).maybeSingle();
  const row = conv;
  if (!row || row.status !== "open" || row.assigned_to) return false;
  await supabaseAdmin.from("wa_conversations").update({ assigned_to: receptionistId, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", conversationId);
  return true;
}
async function getTenantSettingServer(tenantId, key) {
  const { data } = await supabaseAdmin.from("tenant_settings").select("value").eq("tenant_id", tenantId).eq("key", key).maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return data.value;
  }
}
async function getBusinessHoursServer(tenantId) {
  return getTenantSettingServer(tenantId, "business_hours");
}
async function getAfterHoursMessageServer(tenantId) {
  return getTenantSettingServer(tenantId, "wa_after_hours_message");
}
async function applyWaTagRules(input) {
  const { data: rules } = await supabaseAdmin.from("wa_tag_rules").select("id, tag_id, trigger_type, trigger_value").eq("tenant_id", input.tenantId).eq("active", true);
  if (!rules?.length) return;
  const bodyLower = input.messageBody.toLowerCase();
  const tagsToApply = /* @__PURE__ */ new Set();
  for (const rule of rules) {
    switch (rule.trigger_type) {
      case "keyword": {
        const kw = (rule.trigger_value ?? "").trim().toLowerCase();
        if (kw && bodyLower.includes(kw)) tagsToApply.add(rule.tag_id);
        break;
      }
      case "first_message":
        if (input.isFirstInbound) tagsToApply.add(rule.tag_id);
        break;
      case "channel": {
        const ch = (rule.trigger_value ?? "").trim().toLowerCase();
        if (ch && ch === input.channel) tagsToApply.add(rule.tag_id);
        break;
      }
      case "pipeline_stage":
        if (rule.trigger_value && rule.trigger_value === input.pipelineStageId) {
          tagsToApply.add(rule.tag_id);
        }
        break;
    }
  }
  for (const tagId of tagsToApply) {
    await supabaseAdmin.from("wa_conversation_tags").upsert({ conversation_id: input.conversationId, tag_id: tagId }, {
      onConflict: "conversation_id,tag_id",
      ignoreDuplicates: true
    });
  }
}
async function isFirstInboundMessage(conversationId) {
  const { count } = await supabaseAdmin.from("wa_messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversationId).eq("direction", "inbound");
  return (count ?? 0) <= 1;
}
async function resolveTenantId() {
  const { data } = await supabaseAdmin.from("tenants").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}
async function findPatientByPhone(tenantId, phoneDigits) {
  const matches = await findPatientsByPhone(tenantId, phoneDigits);
  return matches.length === 1 ? matches[0] : null;
}
async function findPatientsByPhone(tenantId, phoneDigits) {
  const { data: patients } = await supabaseAdmin.from("patients").select("id, full_name, phone").eq("tenant_id", tenantId).eq("active", true);
  if (!patients?.length) return [];
  const normalized = normalizeBrazilPhone(phoneDigits);
  return patients.filter((p) => phonesMatch(p.phone ?? "", normalized));
}
async function findConversationByPhoneTail(tenantId, phone) {
  const tail = phoneTail11(phone);
  if (!tail) return null;
  const { data: byTail } = await supabaseAdmin.from("wa_conversations").select(
    "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at"
  ).eq("tenant_id", tenantId).eq("phone_tail", tail).maybeSingle();
  if (byTail) return byTail;
  const { data: allConvs } = await supabaseAdmin.from("wa_conversations").select(
    "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at"
  ).eq("tenant_id", tenantId);
  return findConversationByPhone(allConvs ?? [], phone);
}
async function mergeDuplicateConversations(tenantId, keeperId, phone) {
  const tail = phoneTail11(phone);
  const { data: dupes } = await supabaseAdmin.from("wa_conversations").select("id, contact_phone, unread_count, last_message_at, last_message_preview").eq("tenant_id", tenantId).neq("id", keeperId);
  const toMerge = (dupes ?? []).filter((d) => phonesMatch(d.contact_phone, phone) || tail && phoneTail11(d.contact_phone) === tail);
  if (!toMerge.length) return keeperId;
  let extraUnread = 0;
  let bestLastAt = null;
  let bestPreview = null;
  for (const dupe of toMerge) {
    extraUnread += dupe.unread_count ?? 0;
    if (dupe.last_message_at && (!bestLastAt || dupe.last_message_at > bestLastAt)) {
      bestLastAt = dupe.last_message_at;
      bestPreview = dupe.last_message_preview;
    }
    await supabaseAdmin.from("wa_messages").update({ conversation_id: keeperId }).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_notes").update({ conversation_id: keeperId }).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_reminders").update({ conversation_id: keeperId }).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_transfers").update({ conversation_id: keeperId }).eq("conversation_id", dupe.id);
    const { data: tagRows } = await supabaseAdmin.from("wa_conversation_tags").select("tag_id").eq("conversation_id", dupe.id);
    for (const row of tagRows ?? []) {
      await supabaseAdmin.from("wa_conversation_tags").upsert({ conversation_id: keeperId, tag_id: row.tag_id }, { onConflict: "conversation_id,tag_id", ignoreDuplicates: true });
    }
    await supabaseAdmin.from("wa_conversation_tags").delete().eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_conversations").delete().eq("id", dupe.id);
  }
  const { data: keeper } = await supabaseAdmin.from("wa_conversations").select("unread_count, last_message_at, last_message_preview").eq("id", keeperId).maybeSingle();
  const k = keeper;
  const mergedLastAt = [k?.last_message_at, bestLastAt].filter(Boolean).sort().reverse()[0] ?? null;
  await supabaseAdmin.from("wa_conversations").update({
    contact_phone: phone,
    unread_count: (k?.unread_count ?? 0) + extraUnread,
    last_message_at: mergedLastAt,
    last_message_preview: mergedLastAt === bestLastAt ? bestPreview ?? k?.last_message_preview : k?.last_message_preview,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", keeperId);
  return keeperId;
}
async function upsertConversation(tenantId, fromPhone, contactName, preview, timestamp, options) {
  const phone = normalizeBrazilPhone(fromPhone);
  const autoPatient = await findPatientByPhone(tenantId, phone);
  const existing = await findConversationByPhoneTail(tenantId, phone);
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  if (existing) {
    const row = existing;
    const incrementUnread = options?.incrementUnread ?? true;
    const wasClosed = row.status === "closed";
    const resolvedPatientId = row.patient_id ?? autoPatient?.id ?? null;
    let displayName = row.contact_name ?? contactName ?? phone;
    if (resolvedPatientId) {
      const { data: linked } = await supabaseAdmin.from("patients").select("full_name").eq("id", resolvedPatientId).maybeSingle();
      displayName = linked?.full_name ?? displayName;
    } else if (autoPatient) {
      displayName = autoPatient.full_name;
    }
    await supabaseAdmin.from("wa_conversations").update({
      patient_id: resolvedPatientId,
      contact_name: displayName,
      contact_phone: phone,
      contact_wa_id: fromPhone,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: incrementUnread ? row.unread_count + 1 : row.unread_count,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "open",
      ...row.assigned_to ? {} : receptionistId ? { assigned_to: receptionistId } : {},
      ...wasClosed ? { close_reason: null, closed_at: null, closed_by: null } : {}
    }).eq("id", row.id);
    await mergeDuplicateConversations(tenantId, row.id, phone);
    if (!row.assigned_to) await ensureConversationAssignedToReception(tenantId, row.id);
    return { id: row.id, lastAfterHoursReplyAt: row.last_after_hours_reply_at };
  }
  const { data: created, error } = await supabaseAdmin.from("wa_conversations").insert({
    tenant_id: tenantId,
    patient_id: autoPatient?.id ?? null,
    contact_phone: phone,
    contact_name: autoPatient?.full_name ?? contactName ?? phone,
    contact_wa_id: fromPhone,
    assigned_to: receptionistId,
    last_message_at: timestamp.toISOString(),
    last_message_preview: preview,
    unread_count: options?.incrementUnread === false ? 0 : 1,
    status: "open"
  }).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const retry = await findConversationByPhoneTail(tenantId, phone);
      if (retry) {
        await supabaseAdmin.from("wa_conversations").update({
          patient_id: retry.patient_id ?? autoPatient?.id ?? null,
          contact_name: retry.contact_name ?? autoPatient?.full_name ?? contactName ?? phone,
          contact_phone: phone,
          contact_wa_id: fromPhone,
          last_message_at: timestamp.toISOString(),
          last_message_preview: preview,
          unread_count: options?.incrementUnread ?? true ? retry.unread_count + 1 : retry.unread_count,
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          status: "open"
        }).eq("id", retry.id);
        await mergeDuplicateConversations(tenantId, retry.id, phone);
        return { id: retry.id, lastAfterHoursReplyAt: retry.last_after_hours_reply_at };
      }
    }
    throw new Error(error.message);
  }
  const id = created.id;
  await mergeDuplicateConversations(tenantId, id, phone);
  return { id, lastAfterHoursReplyAt: null };
}
async function maybeSendAfterHoursAutoReply(tenantId, conversationId, phone, lastAfterHoursReplyAt) {
  if (!isWhatsAppConfigured()) return;
  const [hours, customMessage] = await Promise.all([
    getBusinessHoursServer(tenantId),
    getAfterHoursMessageServer(tenantId)
  ]);
  const now = /* @__PURE__ */ new Date();
  if (isWithinBusinessHours(hours, now)) return;
  if (!shouldSendAfterHoursReply(lastAfterHoursReplyAt, now)) return;
  const message = customMessage?.trim() || DEFAULT_AFTER_HOURS_MESSAGE;
  try {
    const normalized = normalizeBrazilPhone(phone);
    const { messageId } = await providerSendText(normalized, message);
    const ts = now.toISOString();
    await supabaseAdmin.from("wa_messages").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "text",
      body: message,
      status: "sent",
      sent_by: null,
      created_at: ts
    });
    await supabaseAdmin.from("wa_conversations").update({
      last_after_hours_reply_at: ts,
      last_message_at: ts,
      last_message_preview: message.slice(0, 120),
      updated_at: ts
    }).eq("id", conversationId);
    await logWaAudit({
      tenantId,
      conversationId,
      action: "after_hours_auto_reply",
      details: { preview: message.slice(0, 80) }
    });
  } catch (e) {
    console.error("[CRM] after-hours auto-reply failed:", e);
  }
}
async function trackStaffFirstResponse(conversationId) {
  const { data } = await supabaseAdmin.from("wa_conversations").select("first_response_at").eq("id", conversationId).maybeSingle();
  if (data?.first_response_at) return;
  await supabaseAdmin.from("wa_conversations").update({ first_response_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", conversationId);
}
async function messageExists(waMessageId) {
  const { data } = await supabaseAdmin.from("wa_messages").select("id").eq("wa_message_id", waMessageId).maybeSingle();
  return !!data;
}
async function insertWaMessage(input) {
  if (await messageExists(input.waMessageId)) return false;
  const sentAt = (input.sentAt ?? /* @__PURE__ */ new Date()).toISOString();
  const { error } = await supabaseAdmin.from("wa_messages").insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    wa_message_id: input.waMessageId,
    direction: input.direction,
    message_type: input.messageType,
    body: input.body,
    media_id: input.mediaId ?? null,
    media_mime: input.mediaMime ?? null,
    media_filename: input.mediaFilename ?? null,
    status: input.status ?? (input.direction === "inbound" ? "delivered" : "sent"),
    sent_by: input.sentBy ?? null,
    created_at: sentAt,
    raw_payload: input.rawPayload
  });
  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);
  if (input.direction === "inbound") {
    const { data: conv } = await supabaseAdmin.from("wa_conversations").select("channel, pipeline_stage_id").eq("id", input.conversationId).maybeSingle();
    const convRow = conv;
    const firstInbound = await isFirstInboundMessage(input.conversationId);
    void applyWaTagRules({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      channel: convRow?.channel ?? "whatsapp",
      messageBody: input.body,
      isFirstInbound: firstInbound,
      pipelineStageId: convRow?.pipeline_stage_id
    }).catch((e) => console.error("[CRM] tag rules error:", e));
    const { data: convMeta } = await supabaseAdmin.from("wa_conversations").select("contact_name").eq("id", input.conversationId).maybeSingle();
    void onInboundMessageForFollowUp({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      patientName: convMeta?.contact_name,
      isFirstInbound: firstInbound
    }).catch((e) => console.error("[CRM] follow-up inbound error:", e));
  }
  return true;
}
async function updateMessageStatus(waMessageId, status, errorMessage) {
  const mapped = status === "sent" || status === "SENT" ? "sent" : status === "delivered" || status === "RECEIVED" ? "delivered" : status === "read" || status === "READ" || status === "PLAYED" ? "read" : status === "failed" || status === "FAILED" ? "failed" : null;
  if (!mapped) return;
  await supabaseAdmin.from("wa_messages").update({
    status: mapped,
    error_message: errorMessage ?? null
  }).eq("wa_message_id", waMessageId);
}
function zapiChatPreview(chat) {
  const text = chat.lastMessageText ?? chat.lastMessage ?? chat.message;
  if (typeof text === "string" && text.trim()) return text.trim().slice(0, 120);
  return "Aguardando mensagens (webhook)";
}
async function syncZApiChatsToCrm(tenantId, chats) {
  let synced = 0;
  for (const chat of chats) {
    if (chat.isGroup) continue;
    if (!chat.phone) continue;
    const tsRaw = chat.lastMessageTime;
    const ts = tsRaw ? new Date(typeof tsRaw === "string" ? Number(tsRaw) * (tsRaw.length <= 10 ? 1e3 : 1) : tsRaw) : /* @__PURE__ */ new Date();
    const preview = zapiChatPreview(chat);
    const unread = Number(chat.messagesUnread ?? 0);
    const conv = await upsertConversation(tenantId, chat.phone, chat.name ?? null, preview, ts, {
      incrementUnread: false
    });
    const updates = {};
    if (unread > 0) updates.unread_count = unread;
    updates.channel = "whatsapp";
    if (Object.keys(updates).length) {
      await supabaseAdmin.from("wa_conversations").update(updates).eq("id", conv.id);
    }
    synced++;
  }
  await assignOpenConversationsToReception(tenantId, { onlyUnassigned: true });
  return synced;
}
async function upsertSocialConversation(tenantId, channel, externalUserId, contactName, preview, timestamp) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  const { data: existing } = await supabaseAdmin.from("wa_conversations").select("id, unread_count, status, contact_name").eq("tenant_id", tenantId).eq("channel", channel).eq("external_user_id", externalUserId).maybeSingle();
  if (existing) {
    const row = existing;
    await supabaseAdmin.from("wa_conversations").update({
      contact_name: row.contact_name,
      contact_phone: externalUserId,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: row.unread_count + 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "open",
      ...row.assigned_to || !receptionistId ? {} : { assigned_to: receptionistId }
    }).eq("id", row.id);
    return { id: row.id };
  }
  const { data: created, error } = await supabaseAdmin.from("wa_conversations").insert({
    tenant_id: tenantId,
    channel,
    external_user_id: externalUserId,
    contact_phone: externalUserId,
    contact_name: externalUserId,
    assigned_to: receptionistId,
    last_message_at: timestamp.toISOString(),
    last_message_preview: preview,
    unread_count: 1,
    status: "open"
  }).select("id").single();
  if (error) throw new Error(error.message);
  return { id: created.id };
}
function previewFromMessage(msg) {
  if (msg.type === "text" && msg.text?.body) return msg.text.body.slice(0, 120);
  if (msg.type === "image") return msg.image?.caption ? `📷 ${msg.image.caption}` : "📷 Imagem";
  if (msg.type === "audio") return "🎤 Áudio";
  if (msg.type === "video") return msg.video?.caption ? `🎬 ${msg.video.caption}` : "🎬 Vídeo";
  if (msg.type === "document") return `📎 ${msg.document?.filename ?? "Documento"}`;
  if (msg.type === "sticker") return "🙂 Figurinha";
  return `[${msg.type}]`;
}
function mediaFromMessage(msg) {
  if (msg.type === "text") return { body: msg.text?.body };
  if (msg.type === "image")
    return { mediaId: msg.image?.id, mediaMime: msg.image?.mime_type, body: msg.image?.caption };
  if (msg.type === "audio") return { mediaId: msg.audio?.id, mediaMime: msg.audio?.mime_type };
  if (msg.type === "video")
    return { mediaId: msg.video?.id, mediaMime: msg.video?.mime_type, body: msg.video?.caption };
  if (msg.type === "document")
    return {
      mediaId: msg.document?.id,
      mediaMime: msg.document?.mime_type,
      mediaFilename: msg.document?.filename,
      body: msg.document?.caption
    };
  if (msg.type === "sticker")
    return { mediaId: msg.sticker?.id, mediaMime: msg.sticker?.mime_type };
  return {};
}
async function processInboundMessage(tenantId, msg, contactName) {
  const preview = previewFromMessage(msg);
  const ts = new Date(Number(msg.timestamp) * 1e3);
  const conversation = await upsertConversation(tenantId, msg.from, contactName ?? null, preview, ts);
  const media = mediaFromMessage(msg);
  await insertWaMessage({
    tenantId,
    conversationId: conversation.id,
    waMessageId: msg.id,
    direction: "inbound",
    messageType: msg.type,
    body: media.body ?? preview,
    mediaId: media.mediaId ?? null,
    mediaMime: media.mediaMime ?? null,
    mediaFilename: media.mediaFilename ?? null,
    sentAt: ts,
    rawPayload: msg
  });
}
async function processSocialInbound(tenantId, channel, senderId, senderName, message, timestamp) {
  const ts = new Date(timestamp);
  let preview = message.text?.slice(0, 120) ?? "";
  let messageType = "text";
  let body = message.text ?? "";
  let mediaUrl = null;
  const attachment = message.attachments?.[0];
  if (attachment) {
    messageType = attachment.type === "image" ? "image" : attachment.type === "audio" ? "audio" : "document";
    preview = attachment.type === "image" ? "📷 Imagem" : attachment.type === "audio" ? "🎤 Áudio" : attachment.type === "video" ? "🎬 Vídeo" : "📎 Anexo";
    body = preview;
    mediaUrl = attachment.payload?.url ?? null;
  }
  if (!preview) preview = "Nova mensagem";
  const conversation = await upsertSocialConversation(tenantId, channel, senderId, senderName, preview, ts);
  await insertWaMessage({
    tenantId,
    conversationId: conversation.id,
    waMessageId: message.mid,
    direction: "inbound",
    messageType,
    body,
    mediaId: mediaUrl,
    sentAt: ts,
    rawPayload: message
  });
}
async function handleMetaWhatsAppWebhook(request) {
  const url = new URL(request.url);
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "clinicos_whatsapp";
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const rawBody = await request.text();
  const config = getWhatsAppConfig();
  if (config?.appSecret) {
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, sig, config.appSecret)) {
      return new Response("Invalid signature", { status: 403 });
    }
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const tenantId = await resolveTenantId();
  if (!tenantId) return new Response("OK", { status: 200 });
  const socialObject = payload.object;
  const isSocial = socialObject === "page" || socialObject === "instagram";
  const socialChannel = socialObject === "instagram" ? "instagram" : "messenger";
  for (const entry of payload.entry ?? []) {
    if (isSocial) {
      for (const evt of entry.messaging ?? []) {
        if (!evt.message?.mid || !evt.sender?.id) continue;
        try {
          await processSocialInbound(
            tenantId,
            socialChannel,
            evt.sender.id,
            null,
            evt.message,
            (evt.timestamp ?? Date.now()) * (String(evt.timestamp).length <= 10 ? 1e3 : 1)
          );
        } catch (e) {
          console.error("[Meta webhook] social inbound error:", e);
        }
      }
      continue;
    }
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      if (config && value.metadata?.phone_number_id && value.metadata.phone_number_id !== config.phoneNumberId) {
        continue;
      }
      const contactName = value.contacts?.[0]?.profile?.name;
      for (const msg of value.messages ?? []) {
        try {
          await processInboundMessage(tenantId, msg, contactName);
        } catch (e) {
          console.error("[Meta webhook] inbound error:", e);
        }
      }
      for (const st of value.statuses ?? []) {
        try {
          await updateMessageStatus(st.id, st.status, st.errors?.[0]?.message);
        } catch (e) {
          console.error("[Meta webhook] status error:", e);
        }
      }
    }
  }
  return new Response("OK", { status: 200 });
}
function previewFromZApi(payload) {
  if (payload.text?.message) return payload.text.message.slice(0, 120);
  if (payload.image) return payload.image.caption ? `📷 ${payload.image.caption}` : "📷 Imagem";
  if (payload.audio) return "🎤 Áudio";
  if (payload.video) return payload.video.caption ? `🎬 ${payload.video.caption}` : "🎬 Vídeo";
  if (payload.document) return `📎 ${payload.document.fileName ?? "Documento"}`;
  if (payload.sticker) return "🙂 Figurinha";
  return "[mensagem]";
}
function mediaFromZApi(payload) {
  if (payload.text?.message) {
    return { messageType: "text", body: payload.text.message };
  }
  if (payload.image) {
    return {
      messageType: "image",
      body: payload.image.caption ?? "📷 Imagem",
      mediaUrl: payload.image.imageUrl,
      mediaMime: payload.image.mimeType
    };
  }
  if (payload.audio) {
    return {
      messageType: "audio",
      body: "🎤 Áudio",
      mediaUrl: payload.audio.audioUrl,
      mediaMime: payload.audio.mimeType
    };
  }
  if (payload.video) {
    return {
      messageType: "video",
      body: payload.video.caption ?? "🎬 Vídeo",
      mediaUrl: payload.video.videoUrl,
      mediaMime: payload.video.mimeType
    };
  }
  if (payload.document) {
    return {
      messageType: "document",
      body: payload.document.caption ?? `📎 ${payload.document.fileName ?? "Documento"}`,
      mediaUrl: payload.document.documentUrl,
      mediaMime: payload.document.mimeType,
      mediaFilename: payload.document.fileName
    };
  }
  if (payload.sticker) {
    return {
      messageType: "sticker",
      body: "🙂 Figurinha",
      mediaUrl: payload.sticker.stickerUrl,
      mediaMime: payload.sticker.mimeType
    };
  }
  return { messageType: "unknown", body: previewFromZApi(payload) };
}
async function processZApiReceived(tenantId, payload) {
  if (!payload.phone || !payload.messageId) {
    console.warn("[Z-API webhook] ignorado: sem phone ou messageId", payload.type);
    return;
  }
  if (payload.isGroup) return;
  const media = mediaFromZApi(payload);
  const preview = previewFromZApi(payload);
  const ts = new Date(payload.momment ?? Date.now());
  const contactName = payload.fromMe ? null : payload.senderName ?? payload.chatName ?? null;
  const direction = payload.fromMe ? "outbound" : "inbound";
  const conversationId = await upsertConversation(
    tenantId,
    payload.phone,
    contactName,
    preview,
    ts,
    { incrementUnread: direction === "inbound" }
  );
  const convId = conversationId.id;
  await insertWaMessage({
    tenantId,
    conversationId: convId,
    waMessageId: payload.messageId,
    direction,
    messageType: media.messageType,
    body: media.body,
    mediaId: media.mediaUrl ?? null,
    mediaMime: media.mediaMime ?? null,
    mediaFilename: media.mediaFilename ?? null,
    status: direction === "inbound" ? "delivered" : "sent",
    sentAt: ts,
    rawPayload: payload
  });
  if (direction === "inbound") {
    await maybeSendAfterHoursAutoReply(
      tenantId,
      convId,
      payload.phone,
      conversationId.lastAfterHoursReplyAt
    );
  } else {
    await trackStaffFirstResponse(convId);
  }
}
function isZApiWebhookPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const p = payload;
  return typeof p.type === "string" && /callback$/i.test(p.type);
}
async function handleZApiWebhook(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const config = getZApiConfig();
  if (config?.instanceId && payload.instanceId && payload.instanceId !== config.instanceId) {
    return new Response("OK", { status: 200 });
  }
  const tenantId = await resolveTenantId();
  if (!tenantId) return new Response("OK", { status: 200 });
  try {
    if (/^receivedcallback$/i.test(payload.type ?? "")) {
      await processZApiReceived(tenantId, payload);
    } else if (/^(messagestatuscallback|deliverycallback)$/i.test(payload.type ?? "")) {
      if (payload.messageId && payload.status) {
        await updateMessageStatus(payload.messageId, payload.status);
      }
    }
  } catch (e) {
    console.error("[Z-API webhook] error:", e);
  }
  return new Response("OK", { status: 200 });
}
function isMetaWebhookPayload(payload) {
  const object = payload?.object;
  return object === "whatsapp_business_account" || object === "page" || object === "instagram";
}
async function handleWhatsAppWebhook(request) {
  if (request.method === "GET") {
    return handleMetaWhatsAppWebhook(request);
  }
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  if (isZApiWebhookPayload(payload)) {
    return handleZApiWebhook(
      new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: rawBody
      })
    );
  }
  if (isMetaWebhookPayload(payload)) {
    return handleMetaWhatsAppWebhook(
      new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: rawBody
      })
    );
  }
  if (getWhatsAppProvider() === "zapi") {
    return new Response("OK", { status: 200 });
  }
  return new Response("Bad Request", { status: 400 });
}
let serverEntryPromise;
async function getServerEntry() {
  if (!serverEntryPromise) {
    serverEntryPromise = import("./assets/server-CAXiU2vY.js").then((n) => n.s).then(
      (m) => m.default ?? m
    );
  }
  return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
const server = {
  async fetch(request, env, ctx) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/whatsapp/webhook") {
        return handleWhatsAppWebhook(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
  }
};
export {
  TEMPLATE_VARS as $,
  sendWhatsAppTemplate as A,
  getWhatsAppStatusPayload as B,
  sendMetaSocialText as C,
  providerSendMedia as D,
  providerResolveMediaUrl as E,
  supabaseAdmin as F,
  findConversationByPhone as G,
  getDefaultReceptionAssignee as H,
  insertWaMessage as I,
  renderTemplate as J,
  fmtTimeFromDate as K,
  fmtDateFromDate as L,
  tomorrowISO as M,
  fmtDateTime as N,
  shiftDateISO as O,
  fmtDateTimeFromDate as P,
  parseDateOnly as Q,
  fmtMonthYear as R,
  formatYMD as S,
  fmtDateLong as T,
  formatClinicAddress as U,
  fmtDateFull as V,
  fmtDateTimeLocalInput as W,
  fmtDateShortWeekday as X,
  firstDayOfMonthISO as Y,
  fmtMoney as Z,
  fmtMessageTime as _,
  applyThemeColors as a,
  dedupeConversationsByPhone as a0,
  fmtRelativeTime as a1,
  DEFAULT_HOURS as a2,
  maskCNPJ as a3,
  maskPhone as a4,
  maskCEP as a5,
  DAY_LABELS as a6,
  fetchViaCEP as a7,
  setTenantSetting as a8,
  FONT_OPTIONS as a9,
  loadGoogleFont as aa,
  resolveSpecialties as ab,
  isLegacySpecialtyList as ac,
  SAMPLE_VARS as ad,
  currentYearMonth as ae,
  formatClinicAddressLines as af,
  client_server as ag,
  applyFont as b,
  getZonedTimeParts as c,
  fmt as d,
  server as default,
  addMonthsISO as e,
  fmtDate as f,
  getTenantSetting as g,
  getWhatsAppConnectionStatus as h,
  isOverdue as i,
  assignOpenConversationsToReception as j,
  phonesMatch as k,
  logWaAudit as l,
  isWhatsAppConfigured as m,
  normalizeBrazilPhone as n,
  providerSendText as o,
  parseBRLInput as p,
  providerGetContactPhoto as q,
  renderErrorPage as r,
  supabase as s,
  todayISO as t,
  getZApiConfig as u,
  getZApiChats as v,
  syncZApiChatsToCrm as w,
  getWhatsAppProvider as x,
  getWhatsAppConfig as y,
  listWhatsAppTemplates as z
};
