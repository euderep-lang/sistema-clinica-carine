import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgendaRow } from "@/components/agenda/agenda-timeline-view";

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
