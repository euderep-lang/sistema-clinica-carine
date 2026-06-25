import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push.server";

/** Chave pública VAPID + flag de configuração (para o client assinar push). */
export const getWebPushConfig = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: isWebPushConfigured(),
  publicKey: getVapidPublicKey(),
}));

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.tenant_id) throw new Error("Perfil não encontrado");

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("push_subscriptions" as never)
      .upsert(
        {
          tenant_id: profile.tenant_id,
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          last_seen_at: now,
        } as never,
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("push_subscriptions" as never)
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", userId);
    return { ok: true };
  });
