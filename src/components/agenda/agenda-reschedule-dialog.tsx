import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { addOneHour, formatTimeInterval, timeToMinutes } from "@/lib/agenda-utils";
import { checkAppointmentConflicts } from "@/lib/appointment-conflicts";
import { APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import { useAuth } from "@/lib/mock-auth";
import type { AgendaRow } from "@/components/agenda/agenda-timeline-view";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

type Room = { id: string; name: string };

export function AgendaRescheduleDialog({
  open,
  onOpenChange,
  appointment,
  rooms,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaRow | null;
  rooms: Room[];
  onSaved: (newDate: string) => void;
}) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    room_id: "none",
  });

  useEffect(() => {
    if (!appointment || !open) return;
    setForm({
      date: appointment.date,
      start_time: appointment.start_time.slice(0, 5),
      end_time: (appointment.end_time ?? addOneHour(appointment.start_time)).slice(0, 5),
      room_id: appointment.room_id ?? "none",
    });
  }, [appointment, open]);

  const save = async () => {
    if (!profile || !appointment) return;
    if (!form.date || !form.start_time) {
      toast.error("Informe data e horário de início.");
      return;
    }
    if (form.end_time && timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      toast.error("O horário de fim deve ser depois do início.");
      return;
    }

    setSaving(true);

    try {
      const conflict = await checkAppointmentConflicts({
        tenantId: profile.tenant_id,
        date: form.date,
        startTime: form.start_time,
        endTime: form.end_time || addOneHour(form.start_time),
        professionalId: appointment.professional_id,
        roomId: form.room_id,
        excludeAppointmentId: appointment.id,
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

    const { error } = await supabase
      .from("appointments")
      .update({
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || addOneHour(form.start_time),
        room_id: form.room_id === "none" ? null : form.room_id,
      })
      .eq("id", appointment.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Agendamento reagendado");
    onOpenChange(false);
    onSaved(form.date);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar consulta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{appointment.patients?.full_name ?? "Paciente"}</div>
            <div className="mt-1 text-muted-foreground">
              {appointment.profiles?.full_name ?? "—"}
              {appointment.rooms?.name ? ` · ${appointment.rooms.name}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">
                {APPOINTMENT_TYPE_LABEL[appointment.type ?? ""] ?? appointment.type ?? "Consulta"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {STATUS_LABEL[appointment.status] ?? appointment.status}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Horário atual: {formatTimeInterval(appointment.start_time, appointment.end_time)}
            </div>
          </div>

          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    start_time: e.target.value,
                    end_time: addOneHour(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Consultório</Label>
            <Select value={form.room_id} onValueChange={(value) => setForm((f) => ({ ...f, room_id: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem consultório</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
