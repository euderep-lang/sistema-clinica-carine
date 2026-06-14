import type { EvolutionEntry } from "@/components/professional/evolution-history-types";

export interface MediaHistoryEntry {
  id: string;
  created_at: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_kb: number;
  caption: string | null;
  professional_id: string | null;
  profiles: { full_name: string; specialty: string | null } | null;
}

export type HistoryRecord =
  | { kind: "evolution"; data: EvolutionEntry }
  | { kind: "media"; data: MediaHistoryEntry };

export function mergeHistory(
  evolutions: EvolutionEntry[],
  media: MediaHistoryEntry[],
): HistoryRecord[] {
  const items: HistoryRecord[] = [
    ...evolutions.map((data) => ({ kind: "evolution" as const, data })),
    ...media.map((data) => ({ kind: "media" as const, data })),
  ];
  return items.sort(
    (a, b) =>
      new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime(),
  );
}

export function historyHighlightKey(kind: "evolution" | "media", id: string) {
  return `${kind}:${id}`;
}

export function parseHistoryHighlight(key: string | null) {
  if (!key) return null;
  const [kind, id] = key.split(":");
  if ((kind === "evolution" || kind === "media") && id) return { kind, id };
  return null;
}
