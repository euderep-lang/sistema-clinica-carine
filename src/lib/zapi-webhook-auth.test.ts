import { describe, expect, it } from "vitest";
import { verifyZApiWebhookAuth } from "@/lib/zapi-webhook-auth.server";

describe("verifyZApiWebhookAuth", () => {
  it("aceita quando Client-Token confere", () => {
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      headers: { "Client-Token": "secret-token" },
    });
    expect(
      verifyZApiWebhookAuth(req, {
        instanceId: "i",
        token: "t",
        clientToken: "secret-token",
      }),
    ).toBeNull();
  });

  it("rejeita token incorreto", () => {
    const req = new Request("https://example.com/webhook", {
      method: "POST",
      headers: { "Client-Token": "wrong" },
    });
    const res = verifyZApiWebhookAuth(req, {
      instanceId: "i",
      token: "t",
      clientToken: "secret-token",
    });
    expect(res?.status).toBe(401);
  });
});
