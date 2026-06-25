import { useEffect, useRef } from "react";
import { useNavigate, useRouterState, type NavigateFn } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/mock-auth";
import { isCrmStaff, shouldReceiveWaInboundNotification } from "@/lib/roles";
import {
  conversationDisplayName,
  type WaMessage,
  waMessagePreview,
} from "@/lib/whatsapp-crm";
import {
  getWaNotificationPermission,
  isSecureNotificationContext,
  playWaNotificationSound,
  requestWaNotificationPermission,
  showWaBrowserNotification,
  vibrateWaNotification,
  waInboxFocus,
} from "@/lib/wa-notifications";
import { listenWaSwNavigation, registerWaServiceWorker } from "@/lib/wa-pwa";
import { ensureWaPushSubscription } from "@/lib/wa-push-subscribe";

type InboundRow = WaMessage & { tenant_id: string };

type TransferRow = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  from_user_id: string | null;
  to_user_id: string;
  note: string | null;
};

type ProfileSlice = { id: string; role: Role };

const notifyCtx = {
  profile: null as ProfileSlice | null,
  pathname: "",
  navigate: null as NavigateFn | null,
  notifiedIds: new Set<string>(),
};

const notifyState = {
  channel: null as RealtimeChannel | null,
  tenantId: null as string | null,
};

function teardownWaNotifyChannel() {
  if (!notifyState.channel) return;
  void supabase.removeChannel(notifyState.channel);
  notifyState.channel = null;
  notifyState.tenantId = null;
}

async function handleInboundMessage(row: InboundRow) {
  const profile = notifyCtx.profile;
  const navigate = notifyCtx.navigate;
  if (!profile || !navigate) return;
  if (row.direction !== "inbound") return;
  if (notifyCtx.notifiedIds.has(row.id)) return;

  notifyCtx.notifiedIds.add(row.id);
  if (notifyCtx.notifiedIds.size > 300) {
    const oldest = notifyCtx.notifiedIds.values().next().value;
    if (oldest) notifyCtx.notifiedIds.delete(oldest);
  }

  const onInbox =
    notifyCtx.pathname === "/crm/inbox" || notifyCtx.pathname.startsWith("/crm/");
  const viewingSameChat =
    onInbox &&
    waInboxFocus.selectedConversationId === row.conversation_id &&
    document.visibilityState === "visible";

  if (viewingSameChat) return;

  const { data: conv } = await supabase
    .from("wa_conversations" as never)
    .select("contact_name, contact_phone, assigned_to, patients(full_name)")
    .eq("id", row.conversation_id)
    .maybeSingle();

  if (!conv) return;

  const assignedTo = (conv as { assigned_to: string | null }).assigned_to;
  if (!shouldReceiveWaInboundNotification(profile.role, profile.id, assignedTo)) return;

  const title = conversationDisplayName(conv as Parameters<typeof conversationDisplayName>[0]);
  const body = waMessagePreview(row);
  const openConversation = () => {
    navigate({
      to: "/crm/inbox",
      search: { conversation: row.conversation_id },
    });
  };

  playWaNotificationSound();
  vibrateWaNotification();

  const showedBrowser = showWaBrowserNotification({
    title: `WhatsApp · ${title}`,
    body,
    conversationId: row.conversation_id,
    onOpen: openConversation,
  });

  if (!showedBrowser && document.visibilityState === "visible") {
    toast.message(`WhatsApp · ${title}`, {
      description: body,
      duration: 8000,
      action: {
        label: "Abrir",
        onClick: openConversation,
      },
    });
  }
}

async function handleTransfer(row: TransferRow) {
  const profile = notifyCtx.profile;
  const navigate = notifyCtx.navigate;
  if (!profile || !navigate) return;
  // Só notifica quem recebeu a transferência.
  if (row.to_user_id !== profile.id) return;

  const dedupeKey = `transfer:${row.id}`;
  if (notifyCtx.notifiedIds.has(dedupeKey)) return;
  notifyCtx.notifiedIds.add(dedupeKey);
  if (notifyCtx.notifiedIds.size > 300) {
    const oldest = notifyCtx.notifiedIds.values().next().value;
    if (oldest) notifyCtx.notifiedIds.delete(oldest);
  }

  const { data: conv } = await supabase
    .from("wa_conversations" as never)
    .select("contact_name, contact_phone, patients(full_name)")
    .eq("id", row.conversation_id)
    .maybeSingle();

  if (!conv) return;

  const name = conversationDisplayName(conv as Parameters<typeof conversationDisplayName>[0]);
  const body = row.note
    ? `Conversa transferida para você · ${row.note}`
    : "Conversa transferida para você";
  const openConversation = () => {
    navigate({
      to: "/crm/inbox",
      search: { conversation: row.conversation_id },
    });
  };

  playWaNotificationSound();
  vibrateWaNotification();

  const showedBrowser = showWaBrowserNotification({
    title: `WhatsApp · ${name}`,
    body,
    conversationId: row.conversation_id,
    onOpen: openConversation,
  });

  if (!showedBrowser && document.visibilityState === "visible") {
    toast.message(`WhatsApp · ${name}`, {
      description: body,
      duration: 8000,
      action: {
        label: "Abrir",
        onClick: openConversation,
      },
    });
  }
}

function ensureWaNotifyChannel(tenantId: string) {
  if (notifyState.channel && notifyState.tenantId === tenantId) return;

  teardownWaNotifyChannel();

  for (const ch of supabase.getChannels()) {
    if (ch.topic.startsWith(`wa-notify:${tenantId}`)) {
      void supabase.removeChannel(ch);
    }
  }

  notifyState.tenantId = tenantId;
  notifyState.channel = supabase
    .channel(`wa-notify:${tenantId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "wa_messages", filter: `tenant_id=eq.${tenantId}` },
      (payload) => {
        void handleInboundMessage(payload.new as InboundRow);
      },
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "wa_transfers", filter: `tenant_id=eq.${tenantId}` },
      (payload) => {
        void handleTransfer(payload.new as TransferRow);
      },
    )
    .subscribe();
}

/** Uma única assinatura Realtime por sessão — chamar só no layout autenticado. */
export function useWaMessageNotifications() {
  const { profile, tenant } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigateRef = useRef(navigate);

  navigateRef.current = navigate;
  notifyCtx.pathname = pathname;
  notifyCtx.navigate = navigateRef.current;
  notifyCtx.profile = profile ? { id: profile.id, role: profile.role } : null;

  useEffect(() => {
    if (!profile || !tenant || !isCrmStaff(profile.role)) {
      teardownWaNotifyChannel();
      return;
    }

    if (getWaNotificationPermission() === "default" && isSecureNotificationContext()) {
      void requestWaNotificationPermission().then((perm) => {
        if (perm === "granted") void ensureWaPushSubscription();
      });
    }

    void registerWaServiceWorker().then(() => {
      // Assina Web Push 24/7 (idempotente) quando já há permissão concedida.
      if (getWaNotificationPermission() === "granted") void ensureWaPushSubscription();
    });
    const offSwNav = listenWaSwNavigation((conversationId) => {
      if (conversationId) {
        navigateRef.current({
          to: "/crm/inbox",
          search: { conversation: conversationId },
        });
      }
    });

    ensureWaNotifyChannel(tenant.id);

    return () => {
      offSwNav();
      teardownWaNotifyChannel();
    };
  }, [profile?.id, profile?.role, tenant?.id]);
}

export function teardownWaMessageNotifications() {
  teardownWaNotifyChannel();
  notifyCtx.notifiedIds.clear();
}
