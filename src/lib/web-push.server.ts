/**
 * Web Push server-side (notificações 24/7 no PWA do CRM, mesmo com o app fechado).
 * Usa VAPID. As chaves ficam em VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (.env / Vercel).
 */
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:contato@clinica.local";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (e) {
    console.error("[web-push] configuração VAPID inválida:", e);
    configured = false;
  }
  return configured;
}

export function isWebPushConfigured(): boolean {
  return ensureConfigured();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export type PushPayload = {
  title: string;
  body: string;
  conversationId?: string;
  tag?: string;
  url?: string;
  /** Contagem para badge no ícone do PWA. */
  unreadCount?: number;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Total de mensagens não lidas no tenant (admin/recepção). */
export async function getTenantWaUnreadBadgeCount(tenantId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("unread_count")
    .eq("tenant_id", tenantId)
    .gt("unread_count", 0);

  return ((data ?? []) as { unread_count: number }[]).reduce(
    (sum, row) => sum + (row.unread_count ?? 0),
    0,
  );
}

/** Badge para profissional: conversas atribuídas + transferências pendentes. */
export async function getProfessionalWaUnreadBadgeCount(
  tenantId: string,
  userId: string,
): Promise<number> {
  const [convRes, transferRes] = await Promise.all([
    supabaseAdmin
      .from("wa_conversations" as never)
      .select("unread_count")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", userId)
      .gt("unread_count", 0),
    supabaseAdmin
      .from("wa_transfers" as never)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("to_user_id", userId)
      .is("seen_at", null),
  ]);

  const convUnread = ((convRes.data ?? []) as { unread_count: number }[]).reduce(
    (sum, row) => sum + (row.unread_count ?? 0),
    0,
  );
  return convUnread + (transferRes.count ?? 0);
}

/** Envia push para um conjunto de usuários. Remove assinaturas expiradas (404/410). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!ensureConfigured()) return { sent: 0, pruned: 0 };
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return { sent: 0, pruned: 0 };

  const { data } = await supabaseAdmin
    .from("push_subscriptions" as never)
    .select("id, endpoint, p256dh, auth")
    .in("user_id", ids);

  const subs = (data ?? []) as SubscriptionRow[];
  if (!subs.length) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expired.push(sub.id);
        } else {
          console.error("[web-push] falha ao enviar:", status, (e as Error).message);
        }
      }
    }),
  );

  if (expired.length) {
    await supabaseAdmin.from("push_subscriptions" as never).delete().in("id", expired);
  }

  return { sent, pruned: expired.length };
}

/** IDs de usuários que recebem push de TODA mensagem nova: admin e recepção. */
export async function getInboundPushUserIds(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, role, active")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "receptionist"]);

  return ((data ?? []) as { id: string; active?: boolean | null }[])
    .filter((p) => p.active !== false)
    .map((p) => p.id);
}
