import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "@/lib/production-env.server";

describe("checkProductionEnv", () => {
  it("reporta variáveis ausentes em ambiente de teste", () => {
    const result = checkProductionEnv();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("missing");
    expect(result).toHaveProperty("warnings");
    expect(Array.isArray(result.missing)).toBe(true);
  });
});
