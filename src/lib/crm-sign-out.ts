import { clearKeepAliveCache } from "@/components/keep-alive-outlet";
import { teardownWaMessageNotifications } from "@/hooks/use-wa-message-notifications";
import { clearCrmAppBadge } from "@/lib/crm-app-badge";
import { removeWaPushSubscription } from "@/lib/wa-push-subscribe";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    }),
  ]);
}

/** Encerra sessão e limpa push/badge do CRM neste dispositivo. */
export async function performAppSignOut(signOut: () => Promise<void>): Promise<void> {
  clearKeepAliveCache();
  teardownWaMessageNotifications();
  clearCrmAppBadge();
  // Limpeza de push não pode bloquear o logout (SW.ready / rede podem travar).
  await withTimeout(removeWaPushSubscription(), 1500).catch(() => {});
  await signOut();
}
