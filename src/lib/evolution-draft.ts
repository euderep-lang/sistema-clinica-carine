import { supabase } from "@/integrations/supabase/client";
import {
  emptyEvolutionForm,
  evolutionFormHasContent,
  type EvolutionFormValues,
} from "@/lib/evolution-build";

export type EvolutionDraftMode = "form" | "write";

export interface EvolutionDraft {
  patientId: string;
  patientName: string;
  mode: EvolutionDraftMode;
  form: EvolutionFormValues;
  freeText: string;
  updatedAt: string;
}

export interface OpenEvolutionDraft {
  patientId: string;
  patientName: string;
  updatedAt: string;
}

interface DraftRow {
  patient_id: string;
  patient_name: string | null;
  mode: string | null;
  form: Partial<EvolutionFormValues> | null;
  free_text: string | null;
  updated_at: string | null;
}

/** Indica se o rascunho tem algo digitado (formulário ou texto livre). */
export function draftHasContent(draft: {
  mode: EvolutionDraftMode;
  form: EvolutionFormValues;
  freeText: string;
}): boolean {
  if (draft.freeText.trim()) return true;
  return evolutionFormHasContent(draft.form);
}

function rowToDraft(row: DraftRow): EvolutionDraft {
  return {
    patientId: row.patient_id,
    patientName: row.patient_name ?? "",
    mode: row.mode === "write" ? "write" : "form",
    form: { ...emptyEvolutionForm(), ...(row.form ?? {}) } as EvolutionFormValues,
    freeText: row.free_text ?? "",
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export async function loadEvolutionDraft(
  professionalId: string,
  patientId: string,
): Promise<EvolutionDraft | null> {
  const { data, error } = await supabase
    .from("evolution_drafts" as never)
    .select("patient_id, patient_name, mode, form, free_text, updated_at")
    .eq("professional_id", professionalId)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error || !data) return null;
  const draft = rowToDraft(data as unknown as DraftRow);
  if (!draftHasContent(draft)) return null;
  return draft;
}

export async function saveEvolutionDraft(
  tenantId: string,
  professionalId: string,
  draft: Omit<EvolutionDraft, "updatedAt">,
): Promise<void> {
  // Sem conteúdo: garante que não fique rascunho vazio no banco.
  if (!draftHasContent(draft)) {
    await clearEvolutionDraft(professionalId, draft.patientId);
    return;
  }
  const row = {
    tenant_id: tenantId,
    professional_id: professionalId,
    patient_id: draft.patientId,
    patient_name: draft.patientName,
    mode: draft.mode,
    form: draft.form,
    free_text: draft.freeText,
    updated_at: new Date().toISOString(),
  };
  await supabase
    .from("evolution_drafts" as never)
    .upsert(row as never, { onConflict: "professional_id,patient_id" });
}

export async function clearEvolutionDraft(
  professionalId: string,
  patientId: string,
): Promise<void> {
  await supabase
    .from("evolution_drafts" as never)
    .delete()
    .eq("professional_id", professionalId)
    .eq("patient_id", patientId);
}

/** Lista todos os prontuários em aberto (rascunhos com conteúdo) do profissional. */
export async function listOpenEvolutionDrafts(
  professionalId: string,
): Promise<OpenEvolutionDraft[]> {
  const { data, error } = await supabase
    .from("evolution_drafts" as never)
    .select("patient_id, patient_name, mode, form, free_text, updated_at")
    .eq("professional_id", professionalId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  const rows = data as unknown as DraftRow[];
  const out: OpenEvolutionDraft[] = [];
  for (const row of rows) {
    const draft = rowToDraft(row);
    if (!draftHasContent(draft)) continue;
    out.push({
      patientId: draft.patientId,
      patientName: draft.patientName || "Paciente",
      updatedAt: draft.updatedAt,
    });
  }
  return out;
}
