import { processDueFollowUps } from "@/lib/wa-follow-up.server";

/** Valida Authorization: Bearer <CRON_SECRET> (enviado automaticamente pelo Vercel Cron). */
export function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function handleWaFollowUpsCron(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!verifyCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await processDueFollowUps(50);
    console.info("[cron wa-follow-ups]", result);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron wa-follow-ups]", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
