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

  const ok = supabase.ready && Boolean(tenantId) && provider === "zapi" && Boolean(zapi);

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
    hints: [
      !supabase.hasUrl ? "Configure SUPABASE_URL na Vercel (ou VITE_SUPABASE_URL)." : null,
      !supabase.hasServiceRoleKey
        ? "Configure SUPABASE_SERVICE_ROLE_KEY na Vercel — obrigatório para o webhook gravar mensagens."
        : null,
      provider !== "zapi" ? "Configure WHATSAPP_PROVIDER=zapi na Vercel." : null,
      !zapi ? "Configure ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN na Vercel." : null,
      supabase.ready && !tenantId && !tenantError ? "Nenhum tenant encontrado no banco." : null,
    ].filter(Boolean),
  };
}
