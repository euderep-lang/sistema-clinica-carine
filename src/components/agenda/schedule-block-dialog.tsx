import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { addOneHour, todayISO } from "@/lib/agenda-utils";
import { checkAppointmentConflicts } from "@/lib/appointment-conflicts";
import { APPOINTMENT_BLOCK_TYPE } from "@/lib/appointment-types";

interface ScheduleBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (date: string) => void;
  defaultDate?: string;
  defaultProfessionalId?: string;
}

type Professional = { id: string; full_name: string };

const BLOCK_REASONS = [
  "Almoço",
  "Reunião",
  "Intervalo",
  "Ausência",
  "Manutenção",
  "Outro",
];

export function ScheduleBlockDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
  defaultProfessionalId,
}: ScheduleBlockDialogProps) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: todayISO(),
    start_time: "12:00",
    end_time: "13:00",
    reason: "Almoço",
    notes: "",
  });

  useEffect(() => {
    if (!open || !profile) return;
    setForm((f) => ({ ...f, date: defaultDate ?? todayISO() }));
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "professional")
        .eq("active", true)
        .order("full_name");
      const profs = (data ?? []) as Professional[];
      setProfessionals(profs);
      const initial =
        defaultProfessionalId ??
        (profile.role === "professional" ? profile.id : profs[0]?.id ?? "");
      setProfessionalId(initial);
    })();
  }, [open, profile, defaultDate, defaultProfessionalId]);

  const save = async () => {
    if (!profile || !professionalId || !form.date || !form.start_time) {
      toast.error("Preencha profissional, data e horário.");
      return;
    }
    setSaving(true);

    try {
      const conflict = await checkAppointmentConflicts({
        tenantId: profile.tenant_id,
        date: form.date,
        startTime: form.start_time,
        endTime: form.end_time || addOneHour(form.start_time),
        professionalId,
      });
      if (conflict.hasConflict) {
        setSaving(false);
        toast.error(conflict.message);
        return;
      }
    } catch (e) {
      setSaving(false);
      toast.error(`Não foi possível verificar disponibilidade: ${(e as Error).message}`);
      return;
    }

    const label = [form.reason, form.notes].filter(Boolean).join(" — ");
    const { error } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_id: null,
      professional_id: professionalId,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      type: APPOINTMENT_BLOCK_TYPE,
      status: "blocked",
      notes: label || "Horário bloqueado",
      created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Horário bloqueado.");
    onOpenChange(false);
    onSaved?.(form.date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <Label>Início</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, end_time: addOneHour(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
          </div>
          <div>
            <Label>Motivo</Label>
            <Select value={form.reason} onValueChange={(v) => setForm((f) => ({ ...f, reason: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Bloquear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
