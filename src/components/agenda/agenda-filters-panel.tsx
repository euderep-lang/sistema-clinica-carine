import type { ComponentType } from "react";
import { Building2, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Printer, UserRound } from "lucide-react";
import { addMonthsISO, formatYMD, fmtDate, fmtMonthYear, parseDateOnly, todayISO } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Room = { id: string; name: string };
type Professional = { id: string; full_name: string };

function FilterChip({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/60",
        active && "border-primary/40 bg-primary/5 text-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </span>
      <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
    </span>
  );
}

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
  onPrint: () => void;
}) {
  const viewDate = parseDateOnly(date);
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();
  const monthLabel = fmtMonthYear(date);

  const shiftMonth = (delta: number) => {
    onDateChange(addMonthsISO(date, delta));
  };

  const pickDay = (day: number) => {
    onDateChange(formatYMD(year, month, day));
  };

  const professionalLabel =
    filterProfessional === "all"
      ? "Todos"
      : professionals.find((p) => p.id === filterProfessional)?.full_name ?? "Todos";

  const roomLabel =
    filterRoom === "all"
      ? "Todos"
      : filterRoom === "none"
        ? "Sem consultório"
        : rooms.find((r) => r.id === filterRoom)?.name ?? "Todos";

  const timeLabel = `${timeFrom.slice(0, 5)}–${timeTo.slice(0, 5)}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card/80 px-2 py-1.5 backdrop-blur-sm">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <FilterChip
              icon={CalendarDays}
              label="Data"
              value={fmtDate(date)}
              active={date !== todayISO()}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-3">
          <div>
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
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
                const iso = formatYMD(year, month, day);
                const selected = iso === date;
                const isToday = iso === todayISO();
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
          {date !== todayISO() ? (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onDateChange(todayISO())}>
              Ir para hoje
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <FilterChip
              icon={UserRound}
              label="Profissional"
              value={professionalLabel}
              active={filterProfessional !== "all"}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <Label className="text-xs text-muted-foreground">Profissional</Label>
          <Select value={filterProfessional} onValueChange={onFilterProfessionalChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <FilterChip
              icon={Building2}
              label="Consultório"
              value={roomLabel}
              active={filterRoom !== "all"}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <Label className="text-xs text-muted-foreground">Consultório</Label>
          <Select value={filterRoom} onValueChange={onFilterRoomChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="none">Sem consultório</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
            <FilterChip icon={Clock} label="Horário" value={timeLabel} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3 p-3">
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
          <p className="text-xs text-muted-foreground">
            Grade exibida de {timeFrom.slice(0, 5)} às {timeTo.slice(0, 5)}.
          </p>
        </PopoverContent>
      </Popover>

      <label
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/60",
          showCancelled && "border-primary/40 bg-primary/5",
        )}
      >
        <Checkbox checked={showCancelled} onCheckedChange={(v) => onShowCancelledChange(v === true)} />
        Desmarcados
      </label>

      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onPrint}>
          <Printer className="size-3.5" />
          <span className="hidden sm:inline">Imprimir</span>
        </Button>
      </div>
    </div>
  );
}
