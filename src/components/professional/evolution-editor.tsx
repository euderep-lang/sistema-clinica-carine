import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { EvolutionClinicalForm } from "@/components/professional/evolution-clinical-form";
import { emptyEvolutionForm, type EvolutionFormValues } from "@/lib/evolution-build";

type EditorMode = "form" | "write";

interface EvolutionEditorProps {
  saving: boolean;
  onSave: (
    form: EvolutionFormValues,
    options?: { writeMode?: boolean; freeText?: string },
  ) => Promise<void>;
}

export function EvolutionEditor({ saving, onSave }: EvolutionEditorProps) {
  const [mode, setMode] = useState<EditorMode>("form");
  const [form, setForm] = useState<EvolutionFormValues>(emptyEvolutionForm);
  const [freeText, setFreeText] = useState("");
  const [cidQuery, setCidQuery] = useState("");

  const patchForm = (patch: Partial<EvolutionFormValues>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const clear = () => {
    setForm(emptyEvolutionForm());
    setFreeText("");
    setMode("form");
    setCidQuery("");
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
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-primary/10 bg-card shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-primary/10 bg-primary/[0.04] px-4 py-2.5">
        <h2 className="font-display text-sm font-semibold">Nova evolução</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clear} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant={mode === "write" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setMode((m) => (m === "write" ? "form" : "write"))}
            disabled={saving}
          >
            Escrever
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
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
