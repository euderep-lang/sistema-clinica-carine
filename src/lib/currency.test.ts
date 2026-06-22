import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/currency";

describe("currency fmt", () => {
  it("formats BRL values", () => {
    expect(fmt(1500)).toMatch(/1\.500|1,500/);
    expect(fmt(0)).toMatch(/0/);
  });
});
