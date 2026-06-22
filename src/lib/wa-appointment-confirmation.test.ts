import { describe, expect, it } from "vitest";
import {
  isAppointmentConfirmationMessage,
  isAppointmentDeclineMessage,
} from "@/lib/wa-appointment-confirmation.server";

describe("wa-appointment-confirmation", () => {
  it("detects confirmation phrases", () => {
    expect(isAppointmentConfirmationMessage("eu vou")).toBe(true);
    expect(isAppointmentConfirmationMessage("Confirmo sim!")).toBe(true);
    expect(isAppointmentConfirmationMessage("sim")).toBe(true);
    expect(isAppointmentConfirmationMessage("talvez")).toBe(false);
  });

  it("detects decline phrases", () => {
    expect(isAppointmentDeclineMessage("não vou poder")).toBe(true);
    expect(isAppointmentDeclineMessage("preciso cancelar")).toBe(true);
    expect(isAppointmentDeclineMessage("eu vou")).toBe(false);
  });
});
