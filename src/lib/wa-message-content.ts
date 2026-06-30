import { formatPhoneBR } from "@/lib/whatsapp-crm";

export interface WaContactContent {
  name: string;
  phone: string | null;
}

export interface WaLocationContent {
  title: string;
  address: string | null;
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

export function parseVCardPhone(vcard: string | null | undefined): string | null {
  if (!vcard?.trim()) return null;
  const match = vcard.match(/(?:TEL|tel)[^:\n]*:([+\d][\d\s().-]{7,})/);
  if (!match?.[1]) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function contactFromRawObject(raw: Record<string, unknown>): WaContactContent | null {
  const single = raw.contact as { displayName?: string; vCard?: string; vcard?: string; contactPhone?: string } | undefined;
  if (single) {
    const name = single.displayName?.trim();
    const phone =
      single.contactPhone?.replace(/\D/g, "") ||
      parseVCardPhone(single.vCard ?? single.vcard) ||
      null;
    if (name || phone) return { name: name || formatPhoneBR(phone ?? "") || "Contato", phone };
  }

  const list = raw.contacts;
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0] as { displayName?: string; vCard?: string; vcard?: string };
    const name = first.displayName?.trim();
    const phone = parseVCardPhone(first.vCard ?? first.vcard);
    if (name || phone) return { name: name || formatPhoneBR(phone ?? "") || "Contato", phone };
  }

  const nested = raw.contacts as { contacts?: { displayName?: string; vCard?: string; vcard?: string }[] } | undefined;
  const nestedFirst = nested?.contacts?.[0];
  if (nestedFirst) {
    const name = nestedFirst.displayName?.trim();
    const phone = parseVCardPhone(nestedFirst.vCard ?? nestedFirst.vcard);
    if (name || phone) return { name: name || formatPhoneBR(phone ?? "") || "Contato", phone };
  }

  return null;
}

export function extractWaContact(input: {
  message_type: string;
  body: string | null;
  raw_payload?: unknown;
}): WaContactContent | null {
  if (input.message_type !== "contact") return null;

  if (input.raw_payload && typeof input.raw_payload === "object") {
    const parsed = contactFromRawObject(input.raw_payload as Record<string, unknown>);
    if (parsed) return parsed;
  }

  const body = input.body?.trim() ?? "";
  const named = body.match(/^👤\s*Contato(?::\s*(.+))?$/i);
  if (named) {
    const name = named[1]?.trim();
    return { name: name || "Contato compartilhado", phone: null };
  }

  return body ? { name: body.replace(/^👤\s*/, "").trim() || "Contato", phone: null } : null;
}

export function extractWaLocation(input: {
  message_type: string;
  body: string | null;
  raw_payload?: unknown;
}): WaLocationContent | null {
  if (input.message_type !== "location") return null;

  const raw = input.raw_payload as { location?: Record<string, unknown> } | undefined;
  const loc = raw?.location;
  if (loc) {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const title = String(loc.name ?? loc.title ?? "Localização").trim() || "Localização";
      const address = String(loc.address ?? "").trim() || null;
      const mapsUrl =
        String(loc.url ?? "").trim() ||
        `https://www.google.com/maps?q=${lat},${lng}`;
      return { title, address, latitude: lat, longitude: lng, mapsUrl };
    }
  }

  const body = input.body?.trim() ?? "";
  const urlMatch = body.match(/https?:\/\/[^\s]+/);
  const mapsUrl = urlMatch?.[0] ?? null;
  const titleLine = body.replace(/^📍\s*/, "").split("\n")[0]?.trim() || "Localização";
  if (mapsUrl) {
    const qMatch = mapsUrl.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        title: titleLine,
        address: null,
        latitude: Number(qMatch[1]),
        longitude: Number(qMatch[2]),
        mapsUrl,
      };
    }
    return {
      title: titleLine,
      address: null,
      latitude: 0,
      longitude: 0,
      mapsUrl,
    };
  }

  return titleLine ? { title: titleLine, address: null, latitude: 0, longitude: 0, mapsUrl: "#" } : null;
}

export function isContactPlaceholderBody(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  return /^👤\s*Contato/i.test(body.trim());
}

export function isLocationPlaceholderBody(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  return /^📍/.test(body.trim());
}

export function isStickerPlaceholderBody(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  const t = body.trim();
  return t === "🙂 Figurinha" || t === "Figurinha";
}

export function isDocumentPlaceholderBody(body: string | null | undefined, filename?: string | null): boolean {
  if (!body?.trim()) return true;
  const t = body.trim();
  if (filename && (t === `📎 ${filename}` || t === filename)) return true;
  return /^📎\s/.test(t) && !t.includes("\n");
}

export function isPdfMime(mime: string | null | undefined, filename?: string | null): boolean {
  if (mime?.includes("pdf")) return true;
  return (filename ?? "").toLowerCase().endsWith(".pdf");
}
