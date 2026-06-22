import { getSupabaseServerEnvStatus } from "@/lib/supabase-env.server";
import { resolveTenantId } from "@/lib/whatsapp-crm-storage.server";
import { getWhatsAppProvider } from "@/lib/whatsapp-provider.server";
import { getZApiConfig } from "@/lib/whatsapp-zapi.server";

export async function getWhatsAppWebhookStatus() {
  const supabase = getSupabaseServerEnvStatus();
  const zapi = getZApiConfig();
  const provider = getWhatsAppProvider();

  let tenantId: string | null = null;
  let tenantError: string | null = null;

  if (supabase.ready) {
    try {
      tenantId = await resolveTenantId();
    } catch (e) {
      tenantError = e instanceof Error ? e.message : "Erro ao resolver tenant";
    }
  }

  const ok = supabase.ready && supabase.authReady && Boolean(tenantId) && provider === "zapi" && Boolean(zapi);

  return {
    ok,
    provider,
    supabase,
    zapi: {
      configured: Boolean(zapi),
      instanceId: zapi?.instanceId ?? null,
    },
    tenant: {
      resolved: Boolean(tenantId),
      error: tenantError,
    },
    webhookPath: "/api/whatsapp/webhook",
    cron: {
      followUpsPath: "/api/cron/wa-follow-ups",
      secretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      schedule: "*/5 * * * *",
    },
    hints: [
      !supabase.hasUrl ? "Configure SUPABASE_URL na Vercel (ou VITE_SUPABASE_URL)." : null,
      !supabase.hasServiceRoleKey
        ? "Configure SUPABASE_SERVICE_ROLE_KEY na Vercel — obrigatório para o webhook gravar mensagens."
        : null,
      !supabase.hasPublishableKey
        ? "Configure SUPABASE_PUBLISHABLE_KEY na Vercel (ou VITE_SUPABASE_PUBLISHABLE_KEY) — necessário para enviar mensagens pelo CRM."
        : null,
      provider !== "zapi" ? "Configure WHATSAPP_PROVIDER=zapi na Vercel." : null,
      !zapi ? "Configure ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN na Vercel." : null,
      supabase.ready && !tenantId && !tenantError ? "Nenhum tenant encontrado no banco." : null,
      !process.env.CRON_SECRET?.trim()
        ? "Configure CRON_SECRET na Vercel para o cron de follow-ups automáticos (/api/cron/wa-follow-ups)."
        : null,
    ].filter(Boolean),
  };
}
