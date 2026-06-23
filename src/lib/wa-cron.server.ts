import { verifyCronAuth } from "@/lib/internal-api-auth.server";
import { processAppointmentNotifyQueue } from "@/lib/wa-appointment-notify.server";
import { processDueFollowUps } from "@/lib/wa-follow-up.server";

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
    console.info("[cron wa-follow-ups]", { queue, followUps });
    return Response.json({ ok: true, queue, followUps });
  } catch (e) {
    console.error("[cron wa-follow-ups]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
