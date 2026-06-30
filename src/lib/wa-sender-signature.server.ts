import type { SupabaseClient } from "@supabase/supabase-js";

export interface WaSenderProfileRow {
  full_name: string;
  display_name?: string | null;
  profession?: string | null;
}

/** Nome exibido ao paciente (ex.: "Dra. Carine Cassol"). */
export function waStaffSenderLabel(profile: WaSenderProfileRow | null | undefined): string | null {
  if (!profile) return null;
  const display = profile.display_name?.trim();
  if (display) return display;
  const name = profile.full_name?.trim();
  return name || null;
}

/** Prefixo WhatsApp (*negrito*) + corpo — só para mensagens de atendente humano. */
export function formatStaffWaTextForPatient(
  body: string,
  profile: WaSenderProfileRow | null | undefined,
): string {
  const text = body.trim();
  if (!text) return text;

  const label = waStaffSenderLabel(profile);
  if (!label) return text;

  const prefix = `*${label}:*`;
  if (text.startsWith(prefix) || text.startsWith(`${prefix}\n`)) return text;

  return `${prefix}\n\n${text}`;
}

export async function loadWaSenderProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<WaSenderProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, display_name, profession")
    .eq("id", userId)
    .maybeSingle();
  return (data as WaSenderProfileRow | null) ?? null;
}
