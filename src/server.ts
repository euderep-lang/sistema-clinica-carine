import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { verifyInternalApiAuth } from "./lib/internal-api-auth.server";
import { getPublicHealthStatus } from "./lib/production-env.server";
import { handleWaFollowUpsCron } from "./lib/wa-cron.server";
import { handleWhatsAppWebhook } from "./lib/whatsapp-webhook.server";
import { getWhatsAppWebhookStatus } from "./lib/whatsapp-webhook-status.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/whatsapp/webhook") {
        return handleWhatsAppWebhook(request);
      }
      if (pathname === "/api/health") {
        const health = getPublicHealthStatus();
        return Response.json(health, { status: health.ok ? 200 : 503 });
      }
      if (pathname === "/api/whatsapp/webhook-status") {
        if (!verifyInternalApiAuth(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const status = await getWhatsAppWebhookStatus();
        return Response.json(status, { status: status.ok ? 200 : 503 });
      }
      if (pathname === "/api/cron/wa-follow-ups") {
        return handleWaFollowUpsCron(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
