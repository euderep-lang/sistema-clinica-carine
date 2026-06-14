import { supabase } from "@/integrations/supabase/client";

export interface BeforeAfterPhoto {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  caption: string | null;
}

export interface BeforeAfterDateGroup {
  dateLabel: string;
  sortKey: number;
  evolutionId: string;
  createdAt: string;
  photos: BeforeAfterPhoto[];
}

const PHOTO_GROUP_RE = /^Foto do dia (\d{2}\/\d{2}\/\d{4})$/;

export function parsePhotoGroupDateLabel(evolutionText: string): string | null {
  const match = evolutionText.trim().match(PHOTO_GROUP_RE);
  return match ? match[1] : null;
}

export function parseBRDateLabel(label: string): number {
  const [day, month, year] = label.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

export async function signedPhotoUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .createSignedUrl(storagePath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function loadBeforeAfterDateGroups(
  patientId: string,
): Promise<BeforeAfterDateGroup[]> {
  const { data, error } = await supabase
    .from("patient_evolutions")
    .select(
      "id, created_at, evolution_text, evolution_attachments(id, storage_path, file_name, mime_type, caption)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const byDate = new Map<string, BeforeAfterDateGroup>();

  for (const row of data ?? []) {
    const dateLabel = parsePhotoGroupDateLabel(row.evolution_text);
    if (!dateLabel) continue;

    const attachments = (row.evolution_attachments ?? []) as BeforeAfterPhoto[];
    const images = attachments.filter((att) => att.mime_type.startsWith("image/"));
    if (images.length === 0) continue;

    const existing = byDate.get(dateLabel);
    if (!existing || new Date(row.created_at) > new Date(existing.createdAt)) {
      byDate.set(dateLabel, {
        dateLabel,
        sortKey: parseBRDateLabel(dateLabel),
        evolutionId: row.id,
        createdAt: row.created_at,
        photos: images.slice(0, 2),
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => b.sortKey - a.sortKey);
}

export function pickComparisonDates(
  groups: BeforeAfterDateGroup[],
  dateX: string,
  dateY: string,
): { top: BeforeAfterDateGroup; bottom: BeforeAfterDateGroup } | null {
  const a = groups.find((g) => g.dateLabel === dateX);
  const b = groups.find((g) => g.dateLabel === dateY);
  if (!a || !b || dateX === dateY) return null;

  if (a.sortKey <= b.sortKey) {
    return { top: a, bottom: b };
  }
  return { top: b, bottom: a };
}
