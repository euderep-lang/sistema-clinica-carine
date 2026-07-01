import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { ClinicOsIcon } from "@/components/clinicos-icon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitNpsResponse } from "@/lib/platform.functions";

export const Route = createFileRoute("/nps/$token")({
  component: NpsPage,
});

const SCORE_LABELS: Record<number, string> = {
  0: "Muito improvável",
  10: "Muito provável",
};

function NpsPage() {
  const { token } = Route.useParams();
  const submitFn = useServerFn(submitNpsResponse);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (score === null) {
      toast.error("Selecione uma nota de 0 a 10.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({ data: { token, score, feedback } });
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <ClinicOsIcon variant="on-light" size="md" />
          <div>
            <h1 className="font-display text-xl font-semibold">Pesquisa de satisfação</h1>
            <p className="text-sm text-muted-foreground">Sua opinião nos ajuda a melhorar</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm">
            Obrigado pelo feedback!
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 rounded-lg border bg-card p-6">
            <div className="space-y-3">
              <Label>
                De 0 a 10, o quanto você recomendaria nossa clínica a um amigo?
              </Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className={`size-10 rounded-md border text-sm font-medium transition-colors ${
                      score === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                0 = {SCORE_LABELS[0]} · 10 = {SCORE_LABELS[10]}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Conte como foi sua experiência…"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Enviar resposta"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
