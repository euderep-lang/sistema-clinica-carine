import { afterEach, describe, expect, it } from "vitest";
import { verifyZApiWebhookAuth } from "@/lib/zapi-webhook-auth.server";

const cfg = { instanceId: "i", token: "t", clientToken: "c" };

afterEach(() => {
  delete process.env.ZAPI_WEBHOOK_SECRET;
});

describe("verifyZApiWebhookAuth", () => {
  it("aceita quando nenhum segredo está configurado", () => {
    const req = new Request("https://example.com/api/whatsapp/webhook", { method: "POST" });
    expect(verifyZApiWebhookAuth(req, cfg)).toBeNull();
  });

  it("aceita quando o segredo confere na query", () => {
    process.env.ZAPI_WEBHOOK_SECRET = "s3cr3t";
    const req = new Request("https://example.com/api/whatsapp/webhook?token=s3cr3t", {
      method: "POST",
    });
    expect(verifyZApiWebhookAuth(req, cfg)).toBeNull();
  });

  it("rejeita quando o segredo está configurado mas ausente/incorreto", () => {
    process.env.ZAPI_WEBHOOK_SECRET = "s3cr3t";
    const req = new Request("https://example.com/api/whatsapp/webhook?token=errado", {
      method: "POST",
    });
    expect(verifyZApiWebhookAuth(req, cfg)?.status).toBe(401);
  });
});
