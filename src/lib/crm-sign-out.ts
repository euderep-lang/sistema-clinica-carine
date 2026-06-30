import { clearKeepAliveCache } from "@/components/keep-alive-outlet";
import { teardownWaMessageNotifications } from "@/hooks/use-wa-message-notifications";
import { clearCrmAppBadge } from "@/lib/crm-app-badge";
import { removeWaPushSubscription } from "@/lib/wa-push-subscribe";

/** Encerra sessão e limpa push/badge do CRM neste dispositivo. */
export async function performAppSignOut(signOut: () => Promise<void>): Promise<void> {
  clearKeepAliveCache();
  teardownWaMessageNotifications();
  clearCrmAppBadge();
  await removeWaPushSubscription();
  await signOut();
}
