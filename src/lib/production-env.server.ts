import { getPublicAppUrl } from "@/lib/app-url";
import { getSupabaseServerEnvStatus } from "@/lib/supabase-env.server";
import { getWhatsAppProvider } from "@/lib/whatsapp-provider.server";
import { getZApiConfig } from "@/lib/whatsapp-zapi.server";

export type ProductionEnvCheck = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

/** Valida variáveis críticas para operação em produção (WhatsApp, NPS, cron). */
export function checkProductionEnv(): ProductionEnvCheck {
  const missing: string[] = [];
  const warnings: string[] = [];

  const supabase = getSupabaseServerEnvStatus();
  if (!supabase.hasUrl) missing.push("SUPABASE_URL");
  if (!supabase.hasServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase.hasPublishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");

  if (!process.env.CRON_SECRET?.trim()) missing.push("CRON_SECRET");

  const publicUrl = process.env.PUBLIC_APP_URL?.trim();
  if (!publicUrl) {
    warnings.push("PUBLIC_APP_URL não definida — usando fallback fixo do app");
  } else if (publicUrl.includes("vercel.app") && /-[a-z0-9]{6,}\.vercel\.app/i.test(publicUrl)) {
    warnings.push("PUBLIC_APP_URL parece ser preview da Vercel, não produção");
  }

  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const zapi = getZApiConfig();
    if (!zapi) {
      missing.push("ZAPI_INSTANCE_ID / ZAPI_TOKEN");
    } else if (!zapi.clientToken?.trim()) {
      warnings.push("ZAPI_CLIENT_TOKEN ausente — necessário se o token de segurança da conta Z-API estiver ativo");
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

export function getPublicHealthStatus() {
  const env = checkProductionEnv();
  const supabase = getSupabaseServerEnvStatus();
  return {
    ok: env.ok && supabase.ready,
    appUrl: getPublicAppUrl(),
    supabaseReady: supabase.ready,
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    whatsappProvider: getWhatsAppProvider(),
    issues: [...env.missing, ...env.warnings],
  };
}
