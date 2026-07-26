import { useCallback, useEffect, useState } from "react";
import { Cake, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BIRTHDAY_STEP_KEY } from "@/lib/wa-birthday-settings";
import { todayISO } from "@/lib/locale";
import { cn } from "@/lib/utils";

export type BirthdayTodayPatient = {
  id: string;
  full_name: string;
  phone: string | null;
};

type SendStatus = "sent" | "failed" | "pending" | "skipped" | "cancelled" | "none" | "no_phone";

const STATUS_UI: Record<
  SendStatus,
  { label: string; className: string }
> = {
  sent: { label: "Enviado", className: "bg-success/15 text-success border-transparent" },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive border-transparent" },
  pending: { label: "Agendado", className: "bg-warning/15 text-warning border-transparent" },
  skipped: { label: "Não enviado", className: "bg-muted text-muted-foreground border-transparent" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-transparent" },
  none: { label: "Aguardando", className: "bg-muted text-muted-foreground border-transparent" },
  no_phone: { label: "Sem WhatsApp", className: "bg-muted text-muted-foreground border-transparent" },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  patients: BirthdayTodayPatient[];
};

export function BirthdayTodayDialog({ open, onOpenChange, tenantId, patients }: Props) {
  const [loading, setLoading] = useState(false);
  const [statusByPatient, setStatusByPatient] = useState<Record<string, SendStatus>>({});
  const [errorByPatient, setErrorByPatient] = useState<Record<string, string>>({});

  const loadStatuses = useCallback(async () => {
    if (!tenantId || patients.length === 0) {
      setStatusByPatient({});
      setErrorByPatient({});
      return;
    }

    setLoading(true);
    const year = todayISO().slice(0, 4);
    const ids = patients.map((p) => p.id);

    const { data } = await supabase
      .from("wa_follow_up_schedules" as never)
      .select("patient_id, status, error_message, sent_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("step_key", BIRTHDAY_STEP_KEY)
      .in("patient_id", ids)
      .gte("created_at", `${year}-01-01T00:00:00.000Z`)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as {
      patient_id: string | null;
      status: string;
      error_message: string | null;
    }[];

    const nextStatus: Record<string, SendStatus> = {};
    const nextError: Record<string, string> = {};

    for (const p of patients) {
      if (!p.phone?.trim()) {
        nextStatus[p.id] = "no_phone";
        continue;
      }
      const row = rows.find((r) => r.patient_id === p.id);
      if (!row) {
        nextStatus[p.id] = "none";
        continue;
      }
      const st = row.status as SendStatus;
      nextStatus[p.id] =
        st === "sent" || st === "failed" || st === "pending" || st === "skipped" || st === "cancelled"
          ? st
          : "none";
      if (row.error_message?.trim()) nextError[p.id] = row.error_message.trim();
    }

    setStatusByPatient(nextStatus);
    setErrorByPatient(nextError);
    setLoading(false);
  }, [tenantId, patients]);

  useEffect(() => {
    if (!open) return;
    void loadStatuses();
    const interval = window.setInterval(() => void loadStatuses(), 15_000);
    return () => window.clearInterval(interval);
  }, [open, loadStatuses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="size-5 text-primary" />
            Aniversariantes de hoje
          </DialogTitle>
          <DialogDescription>
            A mensagem desejando feliz aniversário será enviada automaticamente pelo WhatsApp
            (entre 7h e 20h). Ao lado de cada nome, o status do envio.
          </DialogDescription>
        </DialogHeader>

        {patients.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum aniversariante hoje.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {patients.map((p) => {
              const status = statusByPatient[p.id] ?? (loading ? "none" : "none");
              const ui = STATUS_UI[status];
              return (
                <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.full_name}</p>
                    {errorByPatient[p.id] && status === "failed" ? (
                      <p className="mt-0.5 text-xs text-destructive line-clamp-2">
                        {errorByPatient[p.id]}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {loading && !statusByPatient[p.id] ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Badge variant="outline" className={cn("font-normal", ui.className)}>
                        {ui.label}
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
