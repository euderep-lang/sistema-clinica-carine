import { describe, expect, it } from "vitest";
import { getPublicAppUrl } from "@/lib/app-url";

describe("getPublicAppUrl", () => {
  it("usa fallback de produção quando PUBLIC_APP_URL não está definida", () => {
    expect(getPublicAppUrl()).toBe("https://sistema-clinicos.vercel.app");
  });
});
