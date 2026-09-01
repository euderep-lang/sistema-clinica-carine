import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncCrmAppBadge } from "@/lib/crm-app-badge";
import { isCrmStaff } from "@/lib/roles";
import { useAuth } from "@/lib/mock-auth";
import { fetchWaUnreadBadgeCount } from "@/lib/wa-unread-badge";

const badgeState = {
  channel: null as RealtimeChannel | null,
  tenantId: null as string | null,
};

function teardownBadgeChannel() {
  if (!badgeState.channel) return;
  void supabase.removeChannel(badgeState.channel);
  badgeState.channel = null;
  badgeState.tenantId = null;
}

/** Mantém o badge do ícone do PWA sincronizado com mensagens não lidas. */
export function useWaUnreadBadge() {
  const { profile, tenant } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const refreshRef = useRef<() => void>(() => {});
  const debounceRef = useRef<number | null>(null);
  const onInboxRef = useRef(false);
  onInboxRef.current = pathname.startsWith("/crm/inbox");

  refreshRef.current = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const delay = onInboxRef.current ? 1200 : 400;
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      if (!profile || !tenant || !isCrmStaff(profile.role)) {
        syncCrmAppBadge(0);
        return;
      }
      // No inbox aberto a lista já reflete não lidas — evita query extra a cada mensagem.
      if (onInboxRef.current && document.visibilityState === "visible") return;
      void fetchWaUnreadBadgeCount(tenant.id, profile.id, profile.role).then(syncCrmAppBadge);
    }, delay);
  };

  useEffect(() => {
    if (!profile || !tenant || !isCrmStaff(profile.role)) {
      teardownBadgeChannel();
      syncCrmAppBadge(0);
      return;
    }

    refreshRef.current();

    if (badgeState.channel && badgeState.tenantId === tenant.id) {
      return;
    }

    teardownBadgeChannel();
    badgeState.tenantId = tenant.id;
    badgeState.channel = supabase
      .channel(`wa-badge:${tenant.id}:${Date.now().toString(36)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversations", filter: `tenant_id=eq.${tenant.id}` },
        () => refreshRef.current(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_transfers", filter: `tenant_id=eq.${tenant.id}` },
        () => refreshRef.current(),
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      teardownBadgeChannel();
    };
  }, [profile?.id, profile?.role, tenant?.id]);
}
