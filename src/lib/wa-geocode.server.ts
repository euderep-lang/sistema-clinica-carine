/** Geocodifica endereço textual (OpenStreetMap Nominatim). */
export async function geocodeAddressLine(address: string): Promise<{ lat: number; lng: number } | null> {
  const query = address.trim();
  if (!query) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "ClinicOS-CRM/1.0 (whatsapp-crm)" },
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as { lat?: string; lon?: string }[];
    const first = rows[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
