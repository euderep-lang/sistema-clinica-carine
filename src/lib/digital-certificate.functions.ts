import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCertificateValid, parsePfxMetadata } from "@/lib/certificate.server";
import { decryptSecret, encryptSecret } from "@/lib/crypto.server";
import { signPdfBuffer } from "@/lib/pdf-sign.server";
import {
  buildSafeIdAuthorizeUrl,
  createPkcePair,
  discoverSafeIdCertificates,
  exchangeSafeIdAuthorizationCode,
  getSafeIdRedirectUri,
  getSafeIdRedirectUris,
  signPdfWithSafeIdCloud,
} from "@/lib/safeid-cloud.server";
import {
  beginPendingSafeIdAuth,
  clearPendingSafeIdAuth,
  getPendingSafeIdAuth,
} from "@/lib/safeid-pending-auth.server";
import {
  buildSafeIdSessionUpdate,
  clearSafeIdSessionUpdate,
  getSafeIdAccessToken,
  isSafeIdSessionActive,
} from "@/lib/safeid-session.server";

export type SigningMode = "a1_file" | "safeid_cloud";

export interface DigitalCertificateStatus {
  configured: boolean;
  signingMode: SigningMode | null;
  provider: string | null;
  certificateCn: string | null;
  certificateCpf: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  cloudSlotAlias: string | null;
  cloudSlotLabel: string | null;
  cloudProvider: string | null;
  safeIdSessionActive: boolean;
  safeIdSessionExpiresAt: string | null;
}

function toStatus(row: {
  signing_mode?: string | null;
  provider: string;
  certificate_cn: string | null;
  certificate_cpf: string | null;
  valid_from: string | null;
  valid_until: string | null;
  certificate_slot_alias?: string | null;
  cloud_slot_label?: string | null;
  cloud_provider?: string | null;
  safeid_token_expires_at?: string | null;
  safeid_access_token_encrypted?: string | null;
} | null): DigitalCertificateStatus {
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
      safeIdSessionExpiresAt: null,
    };
  }

  const signingMode = (row.signing_mode ?? "a1_file") as SigningMode;
  const validUntil = row.valid_until ? new Date(row.valid_until) : null;
  const now = new Date();
  const daysUntilExpiry = validUntil
    ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    configured: true,
    signingMode,
    provider: row.provider,
    certificateCn: row.certificate_cn,
    certificateCpf: row.certificate_cpf,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    isExpired: signingMode === "a1_file" ? (validUntil ? validUntil < now : false) : false,
    daysUntilExpiry: signingMode === "a1_file" ? daysUntilExpiry : null,
    cloudSlotAlias: row.certificate_slot_alias ?? null,
    cloudSlotLabel: row.cloud_slot_label ?? null,
    cloudProvider: row.cloud_provider ?? null,
    safeIdSessionActive: isSafeIdSessionActive(row),
    safeIdSessionExpiresAt: row.safeid_token_expires_at ?? null,
  };
}

async function requireProfessional(supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, tenant_id, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) throw new Error("Perfil não encontrado");
  if (profile.role !== "professional") throw new Error("Apenas profissionais podem usar certificado digital");
  if (!profile.tenant_id) throw new Error("Tenant não encontrado");
  return profile;
}

export const getDigitalCertificateStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("professional_digital_certificates")
      .select(
        "signing_mode, provider, certificate_cn, certificate_cpf, valid_from, valid_until, certificate_slot_alias, cloud_slot_label, cloud_provider, safeid_access_token_encrypted, safeid_token_expires_at",
      )
      .eq("professional_id", profile.id)
      .maybeSingle();

    return toStatus(data);
  });

export const discoverCloudCertificates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ cpf: z.string().min(11) }))
  .handler(async ({ data, context }) => {
    await requireProfessional(context.supabase, context.userId);
    const slots = await discoverSafeIdCertificates(data.cpf);
    return { slots };
  });

export const saveDigitalCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      pfxBase64: z.string().min(1),
      password: z.string().min(1),
      provider: z.enum(["safeid"]).default("safeid"),
    }),
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let pfxBuffer: Buffer;
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
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("professional_digital_certificates")
      .upsert(row, { onConflict: "professional_id" });
    if (error) throw new Error(error.message);

    return toStatus({
      signing_mode: row.signing_mode,
      provider: row.provider,
      certificate_cn: row.certificate_cn,
      certificate_cpf: row.certificate_cpf,
      valid_from: row.valid_from,
      valid_until: row.valid_until,
    });
  });

export const saveCloudCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      cpf: z.string().min(11),
      slotAlias: z.string().min(1),
      slotLabel: z.string().optional(),
      cloudProvider: z.string().optional(),
      certificateCn: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("professional_digital_certificates")
      .upsert(row, { onConflict: "professional_id" });
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
      cloud_provider: row.cloud_provider,
    });
  });

export const removeDigitalCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("professional_digital_certificates")
      .delete()
      .eq("professional_id", profile.id);
    if (error) throw new Error(error.message);

    return toStatus(null);
  });

const safeIdRedirectUriSchema = z
  .string()
  .url()
  .refine((u) => u.endsWith("/professional/safeid/callback"), {
    message: "redirectUri inválida",
  });

function resolveSafeIdRedirectUri(origin?: string): string {
  const redirectUri = getSafeIdRedirectUri(origin);
  safeIdRedirectUriSchema.parse(redirectUri);
  return redirectUri;
}

const safeIdOriginSchema = z.string().url().optional();

export const initiateSafeIdSignatureAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ origin: safeIdOriginSchema }).optional())
  .handler(async ({ data, context }) => {
    const redirectUri = resolveSafeIdRedirectUri(data?.origin);
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: certRow } = await supabaseAdmin
      .from("professional_digital_certificates")
      .select(
        "signing_mode, cloud_cpf, safeid_access_token_encrypted, safeid_token_expires_at",
      )
      .eq("professional_id", profile.id)
      .maybeSingle();

    if (certRow?.signing_mode !== "safeid_cloud" || !certRow.cloud_cpf) {
      throw new Error("Certificado em nuvem não configurado.");
    }

    if (isSafeIdSessionActive(certRow)) {
      return {
        alreadyAuthorized: true,
        expiresAt: certRow.safeid_token_expires_at,
        authorizeUrl: null,
        redirectUri,
      };
    }

    clearPendingSafeIdAuth(profile.id);
    const { codeVerifier, codeChallenge } = createPkcePair();
    beginPendingSafeIdAuth(profile.id, codeVerifier, redirectUri);
    const authorizeUrl = buildSafeIdAuthorizeUrl({
      cpf: certRow.cloud_cpf,
      state: profile.id,
      codeChallenge,
      redirectUri,
    });
    return { alreadyAuthorized: false, authorizeUrl, redirectUri, expiresAt: null };
  });

export const completeSafeIdOAuthCallback = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(1),
      state: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const pending = getPendingSafeIdAuth(data.state);
    if (!pending) {
      throw new Error("Sessão de autorização expirada. Volte à receita e tente novamente.");
    }
    const { accessToken, expiresIn } = await exchangeSafeIdAuthorizationCode({
      code: data.code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("professional_digital_certificates")
      .update(buildSafeIdSessionUpdate(accessToken, expiresIn))
      .eq("professional_id", data.state);
    if (error) throw new Error(error.message);
    clearPendingSafeIdAuth(data.state);
    return { ok: true };
  });

export const getSafeIdSignatureAuthStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ origin: safeIdOriginSchema }).optional())
  .handler(async ({ data, context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: certRow } = await supabaseAdmin
      .from("professional_digital_certificates")
      .select("signing_mode, safeid_access_token_encrypted, safeid_token_expires_at")
      .eq("professional_id", profile.id)
      .maybeSingle();
    const isCloud = certRow?.signing_mode === "safeid_cloud";
    const active = isCloud && isSafeIdSessionActive(certRow);
    const sessionExpired =
      isCloud &&
      !active &&
      Boolean(certRow?.safeid_token_expires_at || certRow?.safeid_access_token_encrypted);
    let redirectUri: string | null = null;
    let redirectUris: string[] = [];
    let redirectError: string | null = null;
    try {
      redirectUris = getSafeIdRedirectUris();
      if (data?.origin) {
        redirectUri = resolveSafeIdRedirectUri(data.origin);
      } else if (redirectUris.length === 1) {
        redirectUri = redirectUris[0];
      }
    } catch (e) {
      redirectError = (e as Error).message;
    }
    return {
      ready: active,
      needsAuth: isCloud && !active,
      sessionExpired,
      expiresAt: active ? certRow?.safeid_token_expires_at ?? null : null,
      redirectUri,
      redirectUris,
      redirectError,
    };
  });

export const revokeSafeIdSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    clearPendingSafeIdAuth(profile.id);
    const { error } = await supabaseAdmin
      .from("professional_digital_certificates")
      .update(clearSafeIdSessionUpdate())
      .eq("professional_id", profile.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signPrescriptionPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      pdfBase64: z.string().min(1),
      reason: z.string().optional(),
      location: z.string().optional(),
      bottomMarginMm: z.number().min(0).max(80).optional(),
      signatureLineMmFromTop: z.number().min(0).max(400).optional(),
      referencePageHeightMm: z.number().min(100).max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfessional(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: certRow, error: certErr } = await supabaseAdmin
      .from("professional_digital_certificates")
      .select("*")
      .eq("professional_id", profile.id)
      .maybeSingle();
    if (certErr || !certRow) {
      throw new Error("Certificado digital não configurado. Configure em Minhas configurações → Certificado digital.");
    }

    const signingMode = (certRow.signing_mode ?? "a1_file") as SigningMode;
    const pdfBuffer = Buffer.from(data.pdfBase64, "base64");

    if (signingMode === "safeid_cloud") {
      const accessToken = getSafeIdAccessToken(certRow);
      if (!accessToken) {
        throw new Error(
          "Sessão SafeID expirada. Autorize novamente no app (válido por 12 horas após aprovação).",
        );
      }

      const certificateAlias =
        certRow.certificate_slot_alias?.trim() ||
        certRow.cloud_cpf?.replace(/\D/g, "") ||
        "";
      if (!certificateAlias) {
        throw new Error("Certificado em nuvem incompleto. Reconfigure em Minhas configurações.");
      }

      let signed: Buffer;
      try {
        signed = await signPdfWithSafeIdCloud({
          accessToken,
          pdfBuffer,
          certificateAlias,
          bottomMarginMm: data.bottomMarginMm,
          signatureLineMmFromTop: data.signatureLineMmFromTop,
          referencePageHeightMm: data.referencePageHeightMm,
        });
      } catch (err) {
        const msg = (err as Error).message.toLowerCase();
        if (msg.includes("401") || msg.includes("token") || msg.includes("unauthorized") || msg.includes("expirad")) {
          await supabaseAdmin
            .from("professional_digital_certificates")
            .update(clearSafeIdSessionUpdate())
            .eq("professional_id", profile.id);
        }
        throw err;
      }

      return {
        pdfBase64: signed.toString("base64"),
        signedAt: new Date().toISOString(),
        signatureCn: certRow.certificate_cn,
      };
    }

    assertCertificateValid({
      cn: certRow.certificate_cn,
      cpf: certRow.certificate_cpf,
      validFrom: new Date(certRow.valid_from!),
      validUntil: new Date(certRow.valid_until!),
      issuer: null,
    });

    const pfxBuffer = decryptSecret(certRow.pfx_encrypted!);
    const password = decryptSecret(certRow.password_encrypted!).toString("utf8");

    const signed = await signPdfBuffer(pdfBuffer, {
      pfxBuffer,
      password,
      reason: data.reason ?? "Assinatura de receita médica",
      location: data.location ?? "Brasil",
      name: profile.full_name,
      contactInfo: certRow.certificate_cpf ?? "",
    });

    return {
      pdfBase64: signed.toString("base64"),
      signedAt: new Date().toISOString(),
      signatureCn: certRow.certificate_cn,
    };
  });
