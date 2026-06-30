import { useEffect, useRef, useState } from "react";
import { Check, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { EvolutionClinicalForm } from "@/components/professional/evolution-clinical-form";
import { emptyEvolutionForm, type EvolutionFormValues } from "@/lib/evolution-build";
import {
  clearEvolutionDraft,
  draftHasContent,
  loadEvolutionDraft,
  saveEvolutionDraft,
} from "@/lib/evolution-draft";

type EditorMode = "form" | "write";

interface EvolutionEditorProps {
  saving: boolean;
  patientId: string;
  patientName: string;
  professionalId?: string | null;
  tenantId?: string | null;
  onSave: (
    form: EvolutionFormValues,
    options?: { writeMode?: boolean; freeText?: string },
  ) => Promise<void>;
  /** Chamado quando o rascunho muda (para o pai atualizar avisos). */
  onDraftChange?: () => void;
}

export function EvolutionEditor({
  saving,
  patientId,
  patientName,
  professionalId,
  tenantId,
  onSave,
  onDraftChange,
}: EvolutionEditorProps) {
  const [mode, setMode] = useState<EditorMode>("form");
  const [form, setForm] = useState<EvolutionFormValues>(emptyEvolutionForm);
  const [freeText, setFreeText] = useState("");
  const [cidQuery, setCidQuery] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const hydratedRef = useRef(false);

  const canPersist = Boolean(professionalId && tenantId);

  const patchForm = (patch: Partial<EvolutionFormValues>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  // Restaura rascunho ao abrir a ficha deste paciente.
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setDraftSaved(false);
    setForm(emptyEvolutionForm());
    setFreeText("");
    setMode("form");

    if (!professionalId) {
      hydratedRef.current = true;
      return;
    }

    (async () => {
      const draft = await loadEvolutionDraft(professionalId, patientId);
      if (cancelled) return;
      if (draft) {
        setForm(draft.form);
        setFreeText(draft.freeText);
        setMode(draft.mode);
        setDraftSaved(true);
      }
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [professionalId, patientId]);

  // Salva rascunho automaticamente (debounced) sempre que o conteúdo muda.
  useEffect(() => {
    if (!hydratedRef.current || !canPersist || !professionalId || !tenantId) return;
    const handle = setTimeout(() => {
      const hasContent = draftHasContent({ mode, form, freeText });
      void saveEvolutionDraft(tenantId, professionalId, {
        patientId,
        patientName,
        mode,
        form,
        freeText,
      }).then(() => {
        setDraftSaved(hasContent);
        onDraftChange?.();
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [form, freeText, mode, canPersist, professionalId, tenantId, patientId, patientName, onDraftChange]);

  const clear = () => {
    setForm(emptyEvolutionForm());
    setFreeText("");
    setMode("form");
    setCidQuery("");
    setDraftSaved(false);
    if (professionalId) {
      void clearEvolutionDraft(professionalId, patientId).then(() => onDraftChange?.());
    }
  };

  const handleSave = async () => {
    if (mode === "write") {
      if (!freeText.trim()) {
        toast.error("Escreva a evolução antes de salvar.");
        return;
      }
      await onSave(form, { writeMode: true, freeText: freeText.trim() });
    } else {
      if (!form.consultReason.trim()) {
        toast.error("O motivo da consulta é obrigatório.");
        return;
      }
      await onSave(form);
    }
    clear();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border-2 border-primary/25 bg-card shadow-md ring-1 ring-primary/10">
      <div className="flex shrink-0 flex-col gap-3 border-b border-primary/15 bg-primary/[0.07] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 shadow-sm">
            <PenLine className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
              Nova evolução
            </h2>
            {draftSaved ? (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3" />
                Rascunho salvo automaticamente
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Preencha o formulário ou escreva em texto livre
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={clear}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant={mode === "write" ? "secondary" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setMode((m) => (m === "write" ? "form" : "write"))}
            disabled={saving}
          >
            Escrever
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {mode === "write" ? (
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Digite a evolução do paciente…"
            className="min-h-[280px] resize-none rounded-none border-0 border-b px-4 py-3 text-sm shadow-none focus-visible:ring-0"
          />
        ) : (
          <EvolutionClinicalForm
            values={form}
            onChange={patchForm}
            cidQuery={cidQuery}
            onCidQueryChange={setCidQuery}
          />
        )}

        {mode === "write" && (
          <div className="px-4 py-2 text-right text-xs text-muted-foreground">
            {freeText.length} caracteres
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
