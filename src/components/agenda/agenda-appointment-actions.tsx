import { CalendarClock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canCancelAppointment, isAppointmentEditable } from "@/lib/appointment-types";
import type { AgendaRow } from "@/components/agenda/agenda-timeline-view";

export function AgendaEditButton({
  row,
  onEdit,
  className,
  size = "icon",
}: {
  row: AgendaRow;
  onEdit: (row: AgendaRow) => void;
  className?: string;
  size?: "icon" | "sm";
}) {
  if (!isAppointmentEditable(row)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        size === "icon" ? "size-7 shrink-0" : "h-8 gap-1.5",
        className,
      )}
      title="Editar"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(row);
      }}
    >
      <Pencil className={size === "icon" ? "size-3.5" : "size-4"} />
      {size === "sm" && <span>Editar</span>}
    </Button>
  );
}

export function AgendaRescheduleButton({
  row,
  onReschedule,
  className,
  size = "icon",
}: {
  row: AgendaRow;
  onReschedule: (row: AgendaRow) => void;
  className?: string;
  size?: "icon" | "sm";
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        size === "icon" ? "size-7 shrink-0" : "h-8 gap-1.5",
        className,
      )}
      title="Reagendar"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReschedule(row);
      }}
    >
      <CalendarClock className={size === "icon" ? "size-3.5" : "size-4"} />
      {size === "sm" && <span>Reagendar</span>}
    </Button>
  );
}

export function AgendaCancelButton({
  row,
  onCancel,
  className,
  size = "icon",
}: {
  row: AgendaRow;
  onCancel: (row: AgendaRow) => void;
  className?: string;
  size?: "icon" | "sm";
}) {
  if (!canCancelAppointment(row.status)) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        size === "icon" ? "size-7 shrink-0" : "h-8 gap-1.5",
        "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      title="Cancelar"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCancel(row);
      }}
    >
      <X className={size === "icon" ? "size-3.5" : "size-4"} />
      {size === "sm" && <span>Cancelar</span>}
    </Button>
  );
}
