import { c as createServerRpc } from "./createServerRpc-8IBrgApm.js";
import { a as createServerFn } from "./server-BMngozWm.js";
import { z } from "zod";
import { r as requireSupabaseAuth } from "./auth-middleware-DK07Zx0-.js";
import forge from "node-forge";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, createHash } from "node:crypto";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import process$1 from "node:process";
import { I as ITI_VALIDATOR_URL, S as SIGNATURE_STAMP_GAP_MM } from "./prescription-pdf-BEoUnrBo.js";
import QRCode from "qrcode";
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
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "./patient-utils-YNqCHR6o.js";
function extractCpfFromSubject(cert) {
  const fields = cert.subject.attributes;
  for (const attr of fields) {
    const val = String(attr.value ?? "");
    const digits = val.replace(/\D/g, "");
    if (digits.length === 11) return digits;
  }
  const cn = cert.subject.getField("CN")?.value;
  if (typeof cn === "string") {
    const match = cn.match(/(\d{11})/);
    if (match) return match[1];
  }
  return null;
}
function parsePfxMetadata(pfxBuffer, password) {
  const binary = pfxBuffer.toString("binary");
  const asn1 = forge.asn1.fromDer(binary);
  let p12;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Error("Senha do certificado incorreta ou arquivo inválido.");
  }
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = bags[forge.pki.oids.certBag]?.[0];
  const cert = certBag?.cert;
  if (!cert) throw new Error("Nenhum certificado encontrado no arquivo .pfx.");
  const cnField = cert.subject.getField("CN");
  const issuerField = cert.issuer.getField("CN");
  return {
    cn: cnField?.value ? String(cnField.value) : null,
    cpf: extractCpfFromSubject(cert),
    validFrom: cert.validity.notBefore,
    validUntil: cert.validity.notAfter,
    issuer: issuerField?.value ? String(issuerField.value) : null
  };
}
function assertCertificateValid(meta) {
  const now = /* @__PURE__ */ new Date();
  if (now < meta.validFrom) {
    throw new Error("Certificado ainda não é válido.");
  }
  if (now > meta.validUntil) {
    throw new Error("Certificado expirado. Renove seu certificado SafeID A1.");
  }
}
const SALT = "clinicos-cert-v1";
function getEncryptionKey() {
  const raw = process.env.CERTIFICATE_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      "CERTIFICATE_ENCRYPTION_KEY não configurada. Defina uma chave secreta longa no .env do servidor."
    );
  }
  return scryptSync(raw, SALT, 32);
}
function encryptSecret(plaintext) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, "utf8");
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
function decryptSecret(ciphertext) {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
async function signPdfBuffer(pdfBuffer, opts) {
  const withPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: opts.reason ?? "Assinatura de receita médica",
    contactInfo: opts.contactInfo ?? "",
    name: opts.name ?? "Profissional de saúde",
    location: opts.location ?? "Brasil"
  });
  const signer = new P12Signer(opts.pfxBuffer, { passphrase: opts.password });
  const signPdf = new SignPdf();
  return signPdf.sign(withPlaceholder, signer);
}
async function createValidationQrBase64(url = ITI_VALIDATOR_URL) {
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M"
  });
  return buffer.toString("base64");
}
const DEFAULT_API_BASE_URL = "https://pscsafeweb.safewebpss.com.br/Service/Microservice/OAuth/api/v0/oauth";
const SAFEID_SESSION_LIFETIME_SECONDS = 12 * 60 * 60;
function normalizeCpf(cpf) {
  return cpf.replace(/\D/g, "").padStart(11, "0");
}
function endpoint(base, path) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function getSafeIdRedirectUris() {
  const raw = process$1.env.SAFEID_REDIRECT_URI?.trim();
  if (!raw) {
    throw new Error(
      "SAFEID_REDIRECT_URI não configurada. Cadastre a mesma URL no painel SafeID Integração (ex.: http://SEU-IP:8080/professional/safeid/callback)."
    );
  }
  return raw.split(",").map((u) => u.trim()).filter(Boolean);
}
function getSafeIdRedirectUri(origin) {
  const uris = getSafeIdRedirectUris();
  if (origin) {
    const normalized = origin.replace(/\/+$/, "");
    const match = uris.find((u) => u.replace(/\/professional\/safeid\/callback\/?$/, "") === normalized);
    if (match) return match;
    throw new Error(
      `Nenhuma SAFEID_REDIRECT_URI corresponde a ${origin}. Cadastre ${normalized}/professional/safeid/callback no painel SafeID e no .env.`
    );
  }
  if (uris.length === 1) return uris[0];
  throw new Error(
    "SAFEID_REDIRECT_URI tem várias URLs. O app precisa informar a origem atual (window.location.origin)."
  );
}
function getSafeIdConfig() {
  const clientId = process$1.env.SAFEID_CLIENT_ID?.trim();
  const clientSecret = process$1.env.SAFEID_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "SafeID Integração não configurado no servidor. Defina SAFEID_CLIENT_ID e SAFEID_CLIENT_SECRET no .env."
    );
  }
  return {
    clientId,
    clientSecret,
    apiBaseUrl: (process$1.env.SAFEID_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "")
  };
}
function createPkcePair() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}
function buildSafeIdAuthorizeUrl(opts) {
  const config = getSafeIdConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: opts.redirectUri,
    lifetime: String(SAFEID_SESSION_LIFETIME_SECONDS),
    scope: "signature_session",
    code_challenge_method: "S256",
    code_challenge: opts.codeChallenge,
    login_hint: normalizeCpf(opts.cpf),
    state: opts.state
  });
  return `${endpoint(config.apiBaseUrl, "authorize")}?${params.toString()}`;
}
async function safeIdFetch(url, init, context) {
  try {
    return await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Não foi possível conectar à API SafeID (${context}). Verifique SAFEID_API_BASE_URL no .env. — ${msg}`
    );
  }
}
async function safeIdJson(res, context) {
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const record = typeof body === "object" && body !== null ? body : null;
    const detail = typeof record?.Message === "string" && record.Message || typeof record?.message === "string" && record.message || (record ? JSON.stringify(body) : String(body ?? res.statusText));
    throw new Error(`SafeID (${context}): ${detail}`);
  }
  return body;
}
async function discoverSafeIdCertificates(cpf) {
  const config = getSafeIdConfig();
  const cpfDigits = normalizeCpf(cpf);
  const url = endpoint(config.apiBaseUrl, "user-discovery");
  const res = await safeIdFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        user_cpf_cnpj: "CPF",
        val_cpf_cnpj: cpfDigits
      })
    },
    "descoberta de certificado"
  );
  const data = await safeIdJson(res, "descoberta de certificado");
  if (data.status !== "S") {
    throw new Error("Nenhum certificado SafeID em nuvem encontrado para este CPF.");
  }
  const slots = (data.slots ?? []).filter((s) => s.slot_alias).map((s) => ({
    slotAlias: s.slot_alias,
    label: s.label ?? s.slot_alias
  }));
  if (!slots.length) {
    return [{ slotAlias: cpfDigits, label: "Certificado SafeID em nuvem (e-CPF)" }];
  }
  return slots;
}
async function exchangeSafeIdAuthorizationCode(opts) {
  const config = getSafeIdConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier
  });
  const res = await safeIdFetch(
    endpoint(config.apiBaseUrl, "token"),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString()
    },
    "token de acesso"
  );
  const data = await safeIdJson(res, "token de acesso");
  if (!data.access_token) {
    throw new Error("SafeID não retornou token de acesso.");
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? SAFEID_SESSION_LIFETIME_SECONDS
  };
}
function safeIdAuthHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}
const MM_TO_PT = 72 / 25.4;
const DEFAULT_BOTTOM_MARGIN_MM = 25;
function buildVisibleSignatureAnnotations(page, pageNumber, qrImageBase64, bottomMarginMm, signatureLineMmFromTop, referencePageHeightMm = 297) {
  const stampW = Math.min(170, page.width * 0.42);
  const stampH = Math.min(85, page.height * 0.11);
  const qrSize = Math.min(52, stampH);
  const gap = 5;
  const blockW = qrSize + gap + stampW;
  const blockX = (page.width - blockW) / 2;
  const pageHeightMm = page.height / MM_TO_PT;
  const y = signatureLineMmFromTop != null ? (pageHeightMm - signatureLineMmFromTop * (pageHeightMm / referencePageHeightMm) + SIGNATURE_STAMP_GAP_MM) * MM_TO_PT : bottomMarginMm * MM_TO_PT + 8;
  return [
    {
      x: blockX,
      y: y + (stampH - qrSize) / 2,
      width: qrSize,
      height: qrSize,
      page: pageNumber,
      image: qrImageBase64
    },
    {
      x: blockX + qrSize + gap,
      y,
      width: stampW,
      height: stampH,
      page: pageNumber
    }
  ];
}
async function fetchPadesDocumentInfo(config, accessToken, documentId) {
  const infoUrl = `${endpoint(config.apiBaseUrl, "pades-signature/info")}?documentId=${encodeURIComponent(documentId)}`;
  const infoRes = await safeIdFetch(
    infoUrl,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    },
    "informações do documento PAdES"
  );
  return safeIdJson(infoRes, "informações do documento PAdES");
}
async function signPdfWithSafeIdCloud(opts) {
  const config = getSafeIdConfig();
  const pdfBase64 = opts.pdfBuffer.toString("base64");
  const headers = safeIdAuthHeaders(opts.accessToken);
  const startRes = await safeIdFetch(
    endpoint(config.apiBaseUrl, "pades-signature/start"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ file: { content: pdfBase64 } })
    },
    "início da assinatura PAdES"
  );
  const startData = await safeIdJson(startRes, "início da assinatura PAdES");
  if (!startData.id) {
    throw new Error("SafeID não retornou identificador do documento para assinatura.");
  }
  const docInfo = await fetchPadesDocumentInfo(config, opts.accessToken, startData.id);
  const pages = docInfo.pages ?? [];
  const pageCount = docInfo.pagesCount ?? docInfo.pageCount ?? (pages.length || 1);
  const fallbackPage = { width: 596, height: 842 };
  const bottomMarginMm = opts.bottomMarginMm ?? DEFAULT_BOTTOM_MARGIN_MM;
  const referencePageHeightMm = opts.referencePageHeightMm ?? 297;
  const qrImageBase64 = await createValidationQrBase64();
  const annotations = Array.from({ length: pageCount }, (_, index) => {
    const page = pages[index] ?? pages[pages.length - 1] ?? fallbackPage;
    return buildVisibleSignatureAnnotations(
      page,
      index + 1,
      qrImageBase64,
      bottomMarginMm,
      opts.signatureLineMmFromTop,
      referencePageHeightMm
    );
  }).flat();
  const applyRes = await safeIdFetch(
    endpoint(config.apiBaseUrl, "pades-signature/apply"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: startData.id,
        signature_policy: 1,
        alias: opts.certificateAlias,
        annotations
      })
    },
    "aplicação da assinatura PAdES"
  );
  await safeIdJson(applyRes, "aplicação da assinatura PAdES");
  const finishUrl = `${endpoint(config.apiBaseUrl, "pades-signature/finish")}?documentId=${encodeURIComponent(startData.id)}`;
  const finishRes = await safeIdFetch(
    finishUrl,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${opts.accessToken}`
      }
    },
    "finalização da assinatura PAdES"
  );
  const finishData = await safeIdJson(finishRes, "finalização da assinatura PAdES");
  if (!finishData.content) {
    throw new Error("SafeID não retornou o PDF assinado.");
  }
  return Buffer.from(finishData.content, "base64");
}
const pending = /* @__PURE__ */ new Map();
function beginPendingSafeIdAuth(professionalId, codeVerifier, redirectUri) {
  pending.set(professionalId, {
    professionalId,
    codeVerifier,
    redirectUri,
    expiresAt: Date.now() + 15 * 60 * 1e3
  });
}
function getPendingSafeIdAuth(professionalId) {
  const row = pending.get(professionalId);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    pending.delete(professionalId);
    return null;
  }
  return row;
}
function clearPendingSafeIdAuth(professionalId) {
  pending.delete(professionalId);
}
function isSafeIdSessionActive(row) {
  if (!row?.safeid_access_token_encrypted || !row.safeid_token_expires_at) return false;
  return new Date(row.safeid_token_expires_at).getTime() > Date.now();
}
function getSafeIdAccessToken(row) {
  if (!isSafeIdSessionActive(row) || !row?.safeid_access_token_encrypted) return null;
  return decryptSecret(row.safeid_access_token_encrypted).toString("utf8");
}
function buildSafeIdSessionUpdate(accessToken, expiresInSeconds) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1e3).toISOString();
  return {
    safeid_access_token_encrypted: encryptSecret(accessToken),
    safeid_token_expires_at: expiresAt
  };
}
function clearSafeIdSessionUpdate() {
  return {
    safeid_access_token_encrypted: null,
    safeid_token_expires_at: null
  };
}
function toStatus(row) {
  if (!row) {
    return {
      configured: false,
      signingMode: null,
      provider: null,
      certificateCn: null,
      certificateCpf: null,
      validFrom: null,
      validUntil: null,
      isExpired: false,
      daysUntilExpiry: null,
      cloudSlotAlias: null,
      cloudSlotLabel: null,
      cloudProvider: null,
      safeIdSessionActive: false,
      safeIdSessionExpiresAt: null
    };
  }
  const signingMode = row.signing_mode ?? "a1_file";
  const validUntil = row.valid_until ? new Date(row.valid_until) : null;
  const now = /* @__PURE__ */ new Date();
  const daysUntilExpiry = validUntil ? Math.ceil((validUntil.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : null;
  return {
    configured: true,
    signingMode,
    provider: row.provider,
    certificateCn: row.certificate_cn,
    certificateCpf: row.certificate_cpf,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    isExpired: signingMode === "a1_file" ? validUntil ? validUntil < now : false : false,
    daysUntilExpiry: signingMode === "a1_file" ? daysUntilExpiry : null,
    cloudSlotAlias: row.certificate_slot_alias ?? null,
    cloudSlotLabel: row.cloud_slot_label ?? null,
    cloudProvider: row.cloud_provider ?? null,
    safeIdSessionActive: isSafeIdSessionActive(row),
    safeIdSessionExpiresAt: row.safeid_token_expires_at ?? null
  };
}
async function requireProfessional(supabase, userId) {
  const {
    data: profile,
    error
  } = await supabase.from("profiles").select("id, role, tenant_id, full_name").eq("id", userId).maybeSingle();
  if (error || !profile) throw new Error("Perfil não encontrado");
  if (profile.role !== "professional") throw new Error("Apenas profissionais podem usar certificado digital");
  if (!profile.tenant_id) throw new Error("Tenant não encontrado");
  return profile;
}
const getDigitalCertificateStatus_createServerFn_handler = createServerRpc({
  id: "71c750d70428e3315d5e6f7f5e07b03902a142c18010374780185f08aca58114",
  name: "getDigitalCertificateStatus",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => getDigitalCertificateStatus.__executeServer(opts));
const getDigitalCertificateStatus = createServerFn({
  method: "GET"
}).middleware([requireSupabaseAuth]).handler(getDigitalCertificateStatus_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data
  } = await supabaseAdmin.from("professional_digital_certificates").select("signing_mode, provider, certificate_cn, certificate_cpf, valid_from, valid_until, certificate_slot_alias, cloud_slot_label, cloud_provider, safeid_access_token_encrypted, safeid_token_expires_at").eq("professional_id", profile.id).maybeSingle();
  return toStatus(data);
});
const discoverCloudCertificates_createServerFn_handler = createServerRpc({
  id: "97e11653be0aad1f47ca8ad1ca69c6615004ab8bd52076ba5ed19a98fd1326f5",
  name: "discoverCloudCertificates",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => discoverCloudCertificates.__executeServer(opts));
const discoverCloudCertificates = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  cpf: z.string().min(11)
})).handler(discoverCloudCertificates_createServerFn_handler, async ({
  data,
  context
}) => {
  await requireProfessional(context.supabase, context.userId);
  const slots = await discoverSafeIdCertificates(data.cpf);
  return {
    slots
  };
});
const saveDigitalCertificate_createServerFn_handler = createServerRpc({
  id: "3e5795ac05a0b4b4ed7b4908631ab620d52082a388db13a3632a1a444637a940",
  name: "saveDigitalCertificate",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => saveDigitalCertificate.__executeServer(opts));
const saveDigitalCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  pfxBase64: z.string().min(1),
  password: z.string().min(1),
  provider: z.enum(["safeid"]).default("safeid")
})).handler(saveDigitalCertificate_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  let pfxBuffer;
  try {
    pfxBuffer = Buffer.from(data.pfxBase64, "base64");
  } catch {
    throw new Error("Arquivo do certificado inválido.");
  }
  if (pfxBuffer.length < 100) throw new Error("Arquivo .pfx muito pequeno ou corrompido.");
  const meta = parsePfxMetadata(pfxBuffer, data.password);
  assertCertificateValid(meta);
  const row = {
    professional_id: profile.id,
    tenant_id: profile.tenant_id,
    signing_mode: "a1_file",
    provider: data.provider,
    certificate_cn: meta.cn,
    certificate_cpf: meta.cpf,
    valid_from: meta.validFrom.toISOString(),
    valid_until: meta.validUntil.toISOString(),
    pfx_encrypted: encryptSecret(pfxBuffer),
    password_encrypted: encryptSecret(data.password),
    cloud_cpf: null,
    certificate_slot_alias: null,
    cloud_provider: null,
    cloud_slot_label: null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const {
    error
  } = await supabaseAdmin.from("professional_digital_certificates").upsert(row, {
    onConflict: "professional_id"
  });
  if (error) throw new Error(error.message);
  return toStatus({
    signing_mode: row.signing_mode,
    provider: row.provider,
    certificate_cn: row.certificate_cn,
    certificate_cpf: row.certificate_cpf,
    valid_from: row.valid_from,
    valid_until: row.valid_until
  });
});
const saveCloudCertificate_createServerFn_handler = createServerRpc({
  id: "8ed8e718e1defd8fbdc2db81b3eff5b68f2d3737fbc98b026b662c3954510dc7",
  name: "saveCloudCertificate",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => saveCloudCertificate.__executeServer(opts));
const saveCloudCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  cpf: z.string().min(11),
  slotAlias: z.string().min(1),
  slotLabel: z.string().optional(),
  cloudProvider: z.string().optional(),
  certificateCn: z.string().optional()
})).handler(saveCloudCertificate_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const cpfDigits = data.cpf.replace(/\D/g, "");
  const row = {
    professional_id: profile.id,
    tenant_id: profile.tenant_id,
    signing_mode: "safeid_cloud",
    provider: "safeid",
    certificate_cn: data.certificateCn ?? data.slotLabel ?? data.slotAlias,
    certificate_cpf: cpfDigits,
    valid_from: null,
    valid_until: null,
    pfx_encrypted: null,
    password_encrypted: null,
    cloud_cpf: cpfDigits,
    certificate_slot_alias: data.slotAlias,
    cloud_provider: data.cloudProvider ?? null,
    cloud_slot_label: data.slotLabel ?? data.slotAlias,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const {
    error
  } = await supabaseAdmin.from("professional_digital_certificates").upsert(row, {
    onConflict: "professional_id"
  });
  if (error) throw new Error(error.message);
  return toStatus({
    signing_mode: row.signing_mode,
    provider: row.provider,
    certificate_cn: row.certificate_cn,
    certificate_cpf: row.certificate_cpf,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    certificate_slot_alias: row.certificate_slot_alias,
    cloud_slot_label: row.cloud_slot_label,
    cloud_provider: row.cloud_provider
  });
});
const removeDigitalCertificate_createServerFn_handler = createServerRpc({
  id: "868198d6e2dc50f3e3e2fe6e45a4facec2ebfc98db3febf596546e43ef3d24c3",
  name: "removeDigitalCertificate",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => removeDigitalCertificate.__executeServer(opts));
const removeDigitalCertificate = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(removeDigitalCertificate_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    error
  } = await supabaseAdmin.from("professional_digital_certificates").delete().eq("professional_id", profile.id);
  if (error) throw new Error(error.message);
  return toStatus(null);
});
const safeIdRedirectUriSchema = z.string().url().refine((u) => u.endsWith("/professional/safeid/callback"), {
  message: "redirectUri inválida"
});
function resolveSafeIdRedirectUri(origin) {
  const redirectUri = getSafeIdRedirectUri(origin);
  safeIdRedirectUriSchema.parse(redirectUri);
  return redirectUri;
}
const safeIdOriginSchema = z.string().url().optional();
const initiateSafeIdSignatureAuth_createServerFn_handler = createServerRpc({
  id: "0cd4afa449a29eabe1f29776d69596bd1feb4d0927417bfdae398c4b84de1aa1",
  name: "initiateSafeIdSignatureAuth",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => initiateSafeIdSignatureAuth.__executeServer(opts));
const initiateSafeIdSignatureAuth = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  origin: safeIdOriginSchema
}).optional()).handler(initiateSafeIdSignatureAuth_createServerFn_handler, async ({
  data,
  context
}) => {
  const redirectUri = resolveSafeIdRedirectUri(data?.origin);
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: certRow
  } = await supabaseAdmin.from("professional_digital_certificates").select("signing_mode, cloud_cpf, safeid_access_token_encrypted, safeid_token_expires_at").eq("professional_id", profile.id).maybeSingle();
  if (certRow?.signing_mode !== "safeid_cloud" || !certRow.cloud_cpf) {
    throw new Error("Certificado em nuvem não configurado.");
  }
  if (isSafeIdSessionActive(certRow)) {
    return {
      alreadyAuthorized: true,
      expiresAt: certRow.safeid_token_expires_at,
      authorizeUrl: null,
      redirectUri
    };
  }
  clearPendingSafeIdAuth(profile.id);
  const {
    codeVerifier,
    codeChallenge
  } = createPkcePair();
  beginPendingSafeIdAuth(profile.id, codeVerifier, redirectUri);
  const authorizeUrl = buildSafeIdAuthorizeUrl({
    cpf: certRow.cloud_cpf,
    state: profile.id,
    codeChallenge,
    redirectUri
  });
  return {
    alreadyAuthorized: false,
    authorizeUrl,
    redirectUri,
    expiresAt: null
  };
});
const completeSafeIdOAuthCallback_createServerFn_handler = createServerRpc({
  id: "f97c850bd9b7f03b57bd5e053e2ebafc02acb9651c52ccb36111979ccc57f1fd",
  name: "completeSafeIdOAuthCallback",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => completeSafeIdOAuthCallback.__executeServer(opts));
const completeSafeIdOAuthCallback = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  code: z.string().min(1),
  state: z.string().uuid()
})).handler(completeSafeIdOAuthCallback_createServerFn_handler, async ({
  data
}) => {
  const pending2 = getPendingSafeIdAuth(data.state);
  if (!pending2) {
    throw new Error("Sessão de autorização expirada. Volte à receita e tente novamente.");
  }
  const {
    accessToken,
    expiresIn
  } = await exchangeSafeIdAuthorizationCode({
    code: data.code,
    codeVerifier: pending2.codeVerifier,
    redirectUri: pending2.redirectUri
  });
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    error
  } = await supabaseAdmin.from("professional_digital_certificates").update(buildSafeIdSessionUpdate(accessToken, expiresIn)).eq("professional_id", data.state);
  if (error) throw new Error(error.message);
  clearPendingSafeIdAuth(data.state);
  return {
    ok: true
  };
});
const getSafeIdSignatureAuthStatus_createServerFn_handler = createServerRpc({
  id: "828a3520a35bda80f540dcd768bdb1d1b70d6792f0cd8a58fabbeef723af6252",
  name: "getSafeIdSignatureAuthStatus",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => getSafeIdSignatureAuthStatus.__executeServer(opts));
const getSafeIdSignatureAuthStatus = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  origin: safeIdOriginSchema
}).optional()).handler(getSafeIdSignatureAuthStatus_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: certRow
  } = await supabaseAdmin.from("professional_digital_certificates").select("signing_mode, safeid_access_token_encrypted, safeid_token_expires_at").eq("professional_id", profile.id).maybeSingle();
  const isCloud = certRow?.signing_mode === "safeid_cloud";
  const active = isCloud && isSafeIdSessionActive(certRow);
  const sessionExpired = isCloud && !active && Boolean(certRow?.safeid_token_expires_at || certRow?.safeid_access_token_encrypted);
  let redirectUri = null;
  let redirectUris = [];
  let redirectError = null;
  try {
    redirectUris = getSafeIdRedirectUris();
    if (data?.origin) {
      redirectUri = resolveSafeIdRedirectUri(data.origin);
    } else if (redirectUris.length === 1) {
      redirectUri = redirectUris[0];
    }
  } catch (e) {
    redirectError = e.message;
  }
  return {
    ready: active,
    needsAuth: isCloud && !active,
    sessionExpired,
    expiresAt: active ? certRow?.safeid_token_expires_at ?? null : null,
    redirectUri,
    redirectUris,
    redirectError
  };
});
const revokeSafeIdSession_createServerFn_handler = createServerRpc({
  id: "8c275d432a9b490e80534a90558ab273209eb6ea9fb3c5aea358c7b6f07e2911",
  name: "revokeSafeIdSession",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => revokeSafeIdSession.__executeServer(opts));
const revokeSafeIdSession = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(revokeSafeIdSession_createServerFn_handler, async ({
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  clearPendingSafeIdAuth(profile.id);
  const {
    error
  } = await supabaseAdmin.from("professional_digital_certificates").update(clearSafeIdSessionUpdate()).eq("professional_id", profile.id);
  if (error) throw new Error(error.message);
  return {
    ok: true
  };
});
const signPrescriptionPdf_createServerFn_handler = createServerRpc({
  id: "f520501ed7d2ac7dfbf33c4e34afe538ab2e3bf9f7fbb97d7ddf80056da6fbb0",
  name: "signPrescriptionPdf",
  filename: "src/lib/digital-certificate.functions.ts"
}, (opts) => signPrescriptionPdf.__executeServer(opts));
const signPrescriptionPdf = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator(z.object({
  pdfBase64: z.string().min(1),
  reason: z.string().optional(),
  location: z.string().optional(),
  bottomMarginMm: z.number().min(0).max(80).optional(),
  signatureLineMmFromTop: z.number().min(0).max(400).optional(),
  referencePageHeightMm: z.number().min(100).max(500).optional()
})).handler(signPrescriptionPdf_createServerFn_handler, async ({
  data,
  context
}) => {
  const profile = await requireProfessional(context.supabase, context.userId);
  const {
    supabaseAdmin
  } = await import("./client.server-B9NNBQUt.js");
  const {
    data: certRow,
    error: certErr
  } = await supabaseAdmin.from("professional_digital_certificates").select("*").eq("professional_id", profile.id).maybeSingle();
  if (certErr || !certRow) {
    throw new Error("Certificado digital não configurado. Configure em Minhas configurações → Certificado digital.");
  }
  const signingMode = certRow.signing_mode ?? "a1_file";
  const pdfBuffer = Buffer.from(data.pdfBase64, "base64");
  if (signingMode === "safeid_cloud") {
    const accessToken = getSafeIdAccessToken(certRow);
    if (!accessToken) {
      throw new Error("Sessão SafeID expirada. Autorize novamente no app (válido por 12 horas após aprovação).");
    }
    const certificateAlias = certRow.certificate_slot_alias?.trim() || certRow.cloud_cpf?.replace(/\D/g, "") || "";
    if (!certificateAlias) {
      throw new Error("Certificado em nuvem incompleto. Reconfigure em Minhas configurações.");
    }
    let signed2;
    try {
      signed2 = await signPdfWithSafeIdCloud({
        accessToken,
        pdfBuffer,
        certificateAlias,
        bottomMarginMm: data.bottomMarginMm,
        signatureLineMmFromTop: data.signatureLineMmFromTop,
        referencePageHeightMm: data.referencePageHeightMm
      });
    } catch (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes("401") || msg.includes("token") || msg.includes("unauthorized") || msg.includes("expirad")) {
        await supabaseAdmin.from("professional_digital_certificates").update(clearSafeIdSessionUpdate()).eq("professional_id", profile.id);
      }
      throw err;
    }
    return {
      pdfBase64: signed2.toString("base64"),
      signedAt: (/* @__PURE__ */ new Date()).toISOString(),
      signatureCn: certRow.certificate_cn
    };
  }
  assertCertificateValid({
    cn: certRow.certificate_cn,
    cpf: certRow.certificate_cpf,
    validFrom: new Date(certRow.valid_from),
    validUntil: new Date(certRow.valid_until)
  });
  const pfxBuffer = decryptSecret(certRow.pfx_encrypted);
  const password = decryptSecret(certRow.password_encrypted).toString("utf8");
  const signed = await signPdfBuffer(pdfBuffer, {
    pfxBuffer,
    password,
    reason: data.reason ?? "Assinatura de receita médica",
    location: data.location ?? "Brasil",
    name: profile.full_name,
    contactInfo: certRow.certificate_cpf ?? ""
  });
  return {
    pdfBase64: signed.toString("base64"),
    signedAt: (/* @__PURE__ */ new Date()).toISOString(),
    signatureCn: certRow.certificate_cn
  };
});
export {
  completeSafeIdOAuthCallback_createServerFn_handler,
  discoverCloudCertificates_createServerFn_handler,
  getDigitalCertificateStatus_createServerFn_handler,
  getSafeIdSignatureAuthStatus_createServerFn_handler,
  initiateSafeIdSignatureAuth_createServerFn_handler,
  removeDigitalCertificate_createServerFn_handler,
  revokeSafeIdSession_createServerFn_handler,
  saveCloudCertificate_createServerFn_handler,
  saveDigitalCertificate_createServerFn_handler,
  signPrescriptionPdf_createServerFn_handler
};
