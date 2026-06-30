import { describe, expect, it } from "vitest";
import { extractWaContact, extractWaLocation, parseVCardPhone } from "./wa-message-content";

describe("parseVCardPhone", () => {
  it("extrai telefone do vCard", () => {
    const vcard = "BEGIN:VCARD\nFN:Nubia\nTEL;type=CELL;waid=5533999887766:+55 33 99988-7766\nEND:VCARD";
    expect(parseVCardPhone(vcard)).toBe("5533999887766");
  });
});

describe("extractWaContact", () => {
  it("lê contato do raw_payload", () => {
    const contact = extractWaContact({
      message_type: "contact",
      body: "👤 Contato: Nubia Eleno",
      raw_payload: {
        contact: {
          displayName: "Nubia Eleno",
          vCard: "BEGIN:VCARD\nTEL:5533999887766\nEND:VCARD",
        },
      },
    });
    expect(contact?.name).toBe("Nubia Eleno");
    expect(contact?.phone).toBe("5533999887766");
  });
});

describe("extractWaLocation", () => {
  it("lê localização do raw_payload", () => {
    const loc = extractWaLocation({
      message_type: "location",
      body: "📍 Clínica",
      raw_payload: {
        location: {
          name: "Clínica",
          address: "Rua A, 1",
          latitude: -18.91,
          longitude: -48.27,
        },
      },
    });
    expect(loc?.title).toBe("Clínica");
    expect(loc?.latitude).toBe(-18.91);
  });
});
