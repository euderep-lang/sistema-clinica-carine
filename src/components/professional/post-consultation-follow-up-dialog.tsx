import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setupPostConsultationFollowUp } from "@/lib/whatsapp-crm.functions";
import { todayISO } from "@/lib/agenda-utils";

interface PostConsultationFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  appointmentId?: string | null;
  onComplete: () => void;
}

export function PostConsultationFollowUpDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  appointmentId,
  onComplete,
}: PostConsultationFollowUpDialogProps) {
  const setupFn = useServerFn(setupPostConsultationFollowUp);
  const [contactDate, setContactDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!contactDate) {
      toast.error("Selecione a data para a secretária entrar em contato.");
      return;
    }
    setSaving(true);
    try {
      await setupFn({
        data: {
          patientId,
          appointmentId: appointmentId ?? null,
          contactDate,
          secretaryNotes: notes,
        },
      });
      toast.success("Follow-up agendado para a recepção");
      onOpenChange(false);
      onComplete();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível agendar o follow-up");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-up pós-consulta</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Consulta de <span className="font-medium text-foreground">{patientName}</span> finalizada.
          Quando a secretária deve entrar em contato?
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-date">Data do contato</Label>
            <Input
              id="follow-up-date"
              type="date"
              min={todayISO()}
              value={contactDate}
              onChange={(e) => setContactDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-notes">O que a secretária deve abordar</Label>
            <Textarea
              id="follow-up-notes"
              rows={4}
              placeholder="Ex.: confirmar adesão à conduta, tirar dúvidas sobre medicação, convidar para retorno…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Será criado um lembrete para a recepção, a tag{" "}
            <span className="font-medium text-emerald-800">Follow-up Pós-Consulta</span> no WhatsApp
            (se houver conversa) e a sequência automática pós-consulta (24h, 7d, 15d, 30d).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={skip} disabled={saving}>
            Pular
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Agendar follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
