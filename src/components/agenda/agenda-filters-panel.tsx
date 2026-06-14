import { ChevronLeft, ChevronRight, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Room = { id: string; name: string };
type Professional = { id: string; full_name: string };

export function AgendaFiltersPanel({
  date,
  onDateChange,
  timeFrom,
  timeTo,
  onTimeFromChange,
  onTimeToChange,
  filterProfessional,
  onFilterProfessionalChange,
  filterRoom,
  onFilterRoomChange,
  showCancelled,
  onShowCancelledChange,
  professionals,
  rooms,
  onNewAppointment,
  onPrint,
}: {
  date: string;
  onDateChange: (d: string) => void;
  timeFrom: string;
  timeTo: string;
  onTimeFromChange: (t: string) => void;
  onTimeToChange: (t: string) => void;
  filterProfessional: string;
  onFilterProfessionalChange: (v: string) => void;
  filterRoom: string;
  onFilterRoomChange: (v: string) => void;
  showCancelled: boolean;
  onShowCancelledChange: (v: boolean) => void;
  professionals: Professional[];
  rooms: Room[];
  onNewAppointment: () => void;
  onPrint: () => void;
}) {
  const viewDate = new Date(`${date}T12:00:00`);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const monthLabel = viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, viewDate.getDate());
    onDateChange(d.toISOString().slice(0, 10));
  };

  const pickDay = (day: number) => {
    onDateChange(new Date(year, month, day).toISOString().slice(0, 10));
  };

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onNewAppointment}>
          <Plus className="size-5" />
          <span className="text-xs">Novo</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-3" onClick={onPrint}>
          <Printer className="size-5" />
          <span className="text-xs">Imprimir</span>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-3 space-y-3">
        <Label className="text-xs text-muted-foreground">Data</Label>
        <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />

        <div className="rounded-md border p-2">
          <div className="mb-2 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {Array.from({ length: startWeekday }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = new Date(year, month, day).toISOString().slice(0, 10);
              const selected = iso === date;
              const isToday = iso === new Date().toISOString().slice(0, 10);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={cn(
                    "rounded p-1 text-xs transition hover:bg-muted",
                    selected && "bg-primary text-primary-foreground hover:bg-primary",
                    isToday && !selected && "ring-1 ring-primary",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 space-y-3">
        <div>
          <Label className="text-xs">Profissional</Label>
          <Select value={filterProfessional} onValueChange={onFilterProfessionalChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Consultório</Label>
          <Select value={filterRoom} onValueChange={onFilterRoomChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Sem consultório</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Das</Label>
            <Input type="time" value={timeFrom} onChange={(e) => onTimeFromChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="time" value={timeTo} onChange={(e) => onTimeToChange(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showCancelled} onCheckedChange={(v) => onShowCancelledChange(v === true)} />
          Ver desmarcados
        </label>
        <p className="text-xs text-muted-foreground">
          Horário de {timeFrom.slice(0, 5)} às {timeTo.slice(0, 5)}
        </p>
      </div>
    </div>
  );
}
