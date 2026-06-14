import { createHash, randomBytes } from "node:crypto";
import process from "node:process";
import { SIGNATURE_STAMP_GAP_MM } from "@/lib/prescription-pdf";
import { createValidationQrBase64 } from "@/lib/validation-qr.server";

/** URL oficial — https://pscsafeweb.safewebpss.com.br/docs/variables.json */
const DEFAULT_API_BASE_URL =
  "https://pscsafeweb.safewebpss.com.br/Service/Microservice/OAuth/api/v0/oauth";

/** Sessão de assinatura: scope signature_session + lifetime em segundos (12 horas). */
export const SAFEID_SESSION_LIFETIME_SECONDS = 12 * 60 * 60;

export interface SafeIdConfig {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
}

export interface SafeIdCertificateSlot {
  slotAlias: string;
  label: string;
}

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "").padStart(11, "0");
}

function endpoint(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getSafeIdRedirectUri(): string {
  const uri = process.env.SAFEID_REDIRECT_URI?.trim();
  if (!uri) {
    throw new Error(
      "SAFEID_REDIRECT_URI não configurada. Cadastre a mesma URL no painel SafeID Integração (ex.: http://SEU-IP:8081/professional/safeid/callback).",
    );
  }
  return uri;
}

export function getSafeIdConfig(): SafeIdConfig {
  const clientId = process.env.SAFEID_CLIENT_ID?.trim();
  const clientSecret = process.env.SAFEID_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "SafeID Integração não configurado no servidor. Defina SAFEID_CLIENT_ID e SAFEID_CLIENT_SECRET no .env.",
    );
  }

  return {
    clientId,
    clientSecret,
    apiBaseUrl: (process.env.SAFEID_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, ""),
  };
}

export function createPkcePair() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildSafeIdAuthorizeUrl(opts: {
  cpf: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
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
    state: opts.state,
  });
  return `${endpoint(config.apiBaseUrl, "authorize")}?${params.toString()}`;
}

async function safeIdFetch(url: string, init: RequestInit, context: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Não foi possível conectar à API SafeID (${context}). Verifique SAFEID_API_BASE_URL no .env. — ${msg}`,
    );
  }
}

async function safeIdJson<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
    const detail =
      (typeof record?.Message === "string" && record.Message) ||
      (typeof record?.message === "string" && record.message) ||
      (record ? JSON.stringify(body) : String(body ?? res.statusText));
    throw new Error(`SafeID (${context}): ${detail}`);
  }

  return body as T;
}

export async function discoverSafeIdCertificates(cpf: string): Promise<SafeIdCertificateSlot[]> {
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
        val_cpf_cnpj: cpfDigits,
      }),
    },
    "descoberta de certificado",
  );

  const data = await safeIdJson<{
    status?: string;
    slots?: Array<{ slot_alias?: string; label?: string }>;
  }>(res, "descoberta de certificado");

  if (data.status !== "S") {
    throw new Error("Nenhum certificado SafeID em nuvem encontrado para este CPF.");
  }

  const slots = (data.slots ?? [])
    .filter((s) => s.slot_alias)
    .map((s) => ({
      slotAlias: s.slot_alias!,
      label: s.label ?? s.slot_alias!,
    }));

  if (!slots.length) {
    return [{ slotAlias: cpfDigits, label: "Certificado SafeID em nuvem (e-CPF)" }];
  }

  return slots;
}

export async function exchangeSafeIdAuthorizationCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const config = getSafeIdConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });

  const res = await safeIdFetch(
    endpoint(config.apiBaseUrl, "token"),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    },
    "token de acesso",
  );

  const data = await safeIdJson<{ access_token?: string; expires_in?: number }>(res, "token de acesso");
  if (!data.access_token) {
    throw new Error("SafeID não retornou token de acesso.");
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? SAFEID_SESSION_LIFETIME_SECONDS,
  };
}

function safeIdAuthHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

interface PadesPageInfo {
  width: number;
  height: number;
}

interface PadesDocumentInfo {
  pages?: PadesPageInfo[];
  pageCount?: number;
  pagesCount?: number;
}

interface PadesAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  image?: string;
}

const MM_TO_PT = 72 / 25.4;
const DEFAULT_BOTTOM_MARGIN_MM = 25;

/** Carimbo SafeID + QR do validador ITI (coordenadas: origem no canto inferior esquerdo). */
function buildVisibleSignatureAnnotations(
  page: PadesPageInfo,
  pageNumber: number,
  qrImageBase64: string,
  bottomMarginMm: number,
  signatureLineMmFromTop?: number,
  referencePageHeightMm = 297,
): PadesAnnotation[] {
  const stampW = Math.min(170, page.width * 0.42);
  const stampH = Math.min(85, page.height * 0.11);
  const qrSize = Math.min(52, stampH);
  const gap = 5;
  const blockW = qrSize + gap + stampW;
  const blockX = (page.width - blockW) / 2;
  const pageHeightMm = page.height / MM_TO_PT;

  const y =
    signatureLineMmFromTop != null
      ? ((pageHeightMm -
          signatureLineMmFromTop * (pageHeightMm / referencePageHeightMm) +
          SIGNATURE_STAMP_GAP_MM) *
          MM_TO_PT)
      : bottomMarginMm * MM_TO_PT + 8;

  return [
    {
      x: blockX,
      y: y + (stampH - qrSize) / 2,
      width: qrSize,
      height: qrSize,
      page: pageNumber,
      image: qrImageBase64,
    },
    {
      x: blockX + qrSize + gap,
      y,
      width: stampW,
      height: stampH,
      page: pageNumber,
    },
  ];
}

async function fetchPadesDocumentInfo(
  config: SafeIdConfig,
  accessToken: string,
  documentId: string,
): Promise<PadesDocumentInfo> {
  const infoUrl = `${endpoint(config.apiBaseUrl, "pades-signature/info")}?documentId=${encodeURIComponent(documentId)}`;
  const infoRes = await safeIdFetch(
    infoUrl,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    "informações do documento PAdES",
  );
  return safeIdJson<PadesDocumentInfo>(infoRes, "informações do documento PAdES");
}

/** Fluxo oficial PAdES: start → info → apply (com carimbo) → finish */
export async function signPdfWithSafeIdCloud(opts: {
  accessToken: string;
  pdfBuffer: Buffer;
  certificateAlias: string;
  /** Margem inferior do timbrado (mm), para posicionar o carimbo acima dela. */
  bottomMarginMm?: number;
  /** Linha de assinatura manual (mm do topo), para ancorar o carimbo acima dela. */
  signatureLineMmFromTop?: number;
  referencePageHeightMm?: number;
}): Promise<Buffer> {
  const config = getSafeIdConfig();
  const pdfBase64 = opts.pdfBuffer.toString("base64");
  const headers = safeIdAuthHeaders(opts.accessToken);

  const startRes = await safeIdFetch(
    endpoint(config.apiBaseUrl, "pades-signature/start"),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ file: { content: pdfBase64 } }),
    },
    "início da assinatura PAdES",
  );
  const startData = await safeIdJson<{ id?: string }>(startRes, "início da assinatura PAdES");
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
      referencePageHeightMm,
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
        annotations,
      }),
    },
    "aplicação da assinatura PAdES",
  );
  await safeIdJson(applyRes, "aplicação da assinatura PAdES");

  const finishUrl = `${endpoint(config.apiBaseUrl, "pades-signature/finish")}?documentId=${encodeURIComponent(startData.id)}`;
  const finishRes = await safeIdFetch(
    finishUrl,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${opts.accessToken}`,
      },
    },
    "finalização da assinatura PAdES",
  );
  const finishData = await safeIdJson<{ content?: string }>(finishRes, "finalização da assinatura PAdES");
  if (!finishData.content) {
    throw new Error("SafeID não retornou o PDF assinado.");
  }

  return Buffer.from(finishData.content, "base64");
}
