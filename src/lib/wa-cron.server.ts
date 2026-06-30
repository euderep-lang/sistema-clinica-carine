import { verifyCronAuth } from "@/lib/internal-api-auth.server";
import { processAppointmentNotifyQueue } from "@/lib/wa-appointment-notify.server";
import { processDueFollowUps } from "@/lib/wa-follow-up.server";
import { processScheduledMessages } from "@/lib/wa-scheduled.server";

export { verifyCronAuth };

export async function handleWaFollowUpsCron(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!verifyCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const queue = await processAppointmentNotifyQueue(25);
    const followUps = await processDueFollowUps(50);
    const scheduled = await processScheduledMessages(25);
    // Limpeza da lixeira: remove itens com mais de 30 dias (ou já restaurados).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("purge_expired_trash" as never);
    } catch (e) {
      console.error("[cron purge_expired_trash]", e);
    }
    console.info("[cron wa-follow-ups]", { queue, followUps, scheduled });
    return Response.json({ ok: true, queue, followUps, scheduled });
  } catch (e) {
    console.error("[cron wa-follow-ups]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
