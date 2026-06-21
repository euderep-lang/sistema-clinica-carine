import { jsxs, jsx } from "react/jsx-runtime";
import { Q as parseDateOnly, R as fmtMonthYear, S as formatYMD, t as todayISO, e as addMonthsISO, s as supabase, T as fmtDateLong } from "../server.js";
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { u as useServerFn } from "./createSsrRpc-tPKO4KfQ.js";
import { CalendarClock, Plus, Printer, ChevronLeft, ChevronRight, LayoutGrid, Building2, List, CalendarDays, Search } from "lucide-react";
import { toast } from "sonner";
import { B as Button, E as cn, L as Label, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, r as Checkbox, u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, q as Badge, F as APPOINTMENT_TYPE_LABEL, y as DialogFooter, G as resolveAppointmentTypes, H as APPOINTMENT_TYPE_OPTIONS, D as DashboardShell, C as Card, b as CardHeader, e as CardTitle, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, V as APPOINTMENT_STATUS_LABEL, T as Textarea } from "./router-DKQJQoSP.js";
import { A as AgendaContactActions } from "./agenda-contact-actions-Bd-N7D1j.js";
import { a as addOneHour, f as formatTimeInterval, t as timeToMinutes, b as buildHourSlots, c as currentTimePercent, d as formatAgendaDate, A as AGENDA_DAY_START, e as AGENDA_SLOT_MINUTES, g as AGENDA_DAY_END } from "./agenda-utils-CO-C_DbJ.js";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-BKWVL3n-.js";
import { p as printWithLetterhead } from "./letterhead-print-Dh_45PUI.js";
import { t as triggerAppointmentFollowUp, a as triggerAppointmentStatusFollowUp } from "./whatsapp-crm.functions-ymrxBlWd.js";
import "node:crypto";
import "@supabase/supabase-js";
import "./server-CAXiU2vY.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-query";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "@radix-ui/react-dropdown-menu";
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "./crm-navigation-CSMuJWnR.js";
import "@radix-ui/react-tabs";
import "./auth-middleware-BBfyoGmP.js";
function AgendaRescheduleButton({
  row,
  onReschedule,
  className,
  size = "icon"
}) {
  return /* @__PURE__ */ jsxs(
    Button,
    {
      type: "button",
      variant: "ghost",
      size,
      className: cn(
        size === "icon" ? "size-7 shrink-0" : "h-8 gap-1.5",
        className
      ),
      title: "Reagendar",
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onReschedule(row);
      },
      children: [
        /* @__PURE__ */ jsx(CalendarClock, { className: size === "icon" ? "size-3.5" : "size-4" }),
        size === "sm" && /* @__PURE__ */ jsx("span", { children: "Reagendar" })
      ]
    }
  );
}
function AgendaFiltersPanel({
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
  onPrint
}) {
  const viewDate = parseDateOnly(date);
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();
  const monthLabel = fmtMonthYear(date);
  const shiftMonth = (delta) => {
    onDateChange(addMonthsISO(date, delta));
  };
  const pickDay = (day) => {
    onDateChange(formatYMD(year, month, day));
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex w-full shrink-0 flex-col gap-4 lg:w-72", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "h-auto flex-col gap-1 py-3", onClick: onNewAppointment, children: [
        /* @__PURE__ */ jsx(Plus, { className: "size-5" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Novo" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "h-auto flex-col gap-1 py-3", onClick: onPrint, children: [
        /* @__PURE__ */ jsx(Printer, { className: "size-5" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Imprimir" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-card p-3 space-y-3", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs text-muted-foreground", children: "Data" }),
      /* @__PURE__ */ jsx(Input, { type: "date", value: date, onChange: (e) => onDateChange(e.target.value) }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-md border p-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-7", onClick: () => shiftMonth(-1), children: /* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium capitalize", children: monthLabel }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-7", onClick: () => shiftMonth(1), children: /* @__PURE__ */ jsx(ChevronRight, { className: "size-4" }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground", children: ["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => /* @__PURE__ */ jsx("span", { children: d }, `${d}-${i}`)) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 grid grid-cols-7 gap-0.5", children: [
          Array.from({ length: startWeekday }).map((_, i) => /* @__PURE__ */ jsx("span", {}, `empty-${i}`)),
          Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = formatYMD(year, month, day);
            const selected = iso === date;
            const isToday = iso === todayISO();
            return /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => pickDay(day),
                className: cn(
                  "rounded p-1 text-xs transition hover:bg-muted",
                  selected && "bg-primary text-primary-foreground hover:bg-primary",
                  isToday && !selected && "ring-1 ring-primary"
                ),
                children: day
              },
              day
            );
          })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-card p-3 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Profissional" }),
        /* @__PURE__ */ jsxs(Select, { value: filterProfessional, onValueChange: onFilterProfessionalChange, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
            professionals.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id, children: p.full_name }, p.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Consultório" }),
        /* @__PURE__ */ jsxs(Select, { value: filterRoom, onValueChange: onFilterRoomChange, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Sem consultório" }),
            rooms.map((r) => /* @__PURE__ */ jsx(SelectItem, { value: r.id, children: r.name }, r.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Das" }),
          /* @__PURE__ */ jsx(Input, { type: "time", value: timeFrom, onChange: (e) => onTimeFromChange(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Até" }),
          /* @__PURE__ */ jsx(Input, { type: "time", value: timeTo, onChange: (e) => onTimeToChange(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsx(Checkbox, { checked: showCancelled, onCheckedChange: (v) => onShowCancelledChange(v === true) }),
        "Ver desmarcados"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Horário de ",
        timeFrom.slice(0, 5),
        " às ",
        timeTo.slice(0, 5)
      ] })
    ] })
  ] });
}
const STATUS_LABEL$2 = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou"
};
function AgendaRescheduleDialog({
  open,
  onOpenChange,
  appointment,
  rooms,
  onSaved
}) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "",
    start_time: "",
    end_time: "",
    room_id: "none"
  });
  useEffect(() => {
    if (!appointment || !open) return;
    setForm({
      date: appointment.date,
      start_time: appointment.start_time.slice(0, 5),
      end_time: (appointment.end_time ?? addOneHour(appointment.start_time)).slice(0, 5),
      room_id: appointment.room_id ?? "none"
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
    const { error } = await supabase.from("appointments").update({
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      room_id: form.room_id === "none" ? null : form.room_id
    }).eq("id", appointment.id);
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
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Reagendar consulta" }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-muted/30 p-3 text-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: appointment.patients?.full_name ?? "Paciente" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 text-muted-foreground", children: [
          appointment.profiles?.full_name ?? "—",
          appointment.rooms?.name ? ` · ${appointment.rooms.name}` : ""
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap gap-1.5", children: [
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: APPOINTMENT_TYPE_LABEL[appointment.type ?? ""] ?? appointment.type ?? "Consulta" }),
          /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-xs", children: STATUS_LABEL$2[appointment.status] ?? appointment.status })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 text-xs text-muted-foreground", children: [
          "Horário atual: ",
          formatTimeInterval(appointment.start_time, appointment.end_time)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Data" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            type: "date",
            value: form.date,
            onChange: (e) => setForm((f) => ({ ...f, date: e.target.value }))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Início" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "time",
              value: form.start_time,
              onChange: (e) => setForm((f) => ({
                ...f,
                start_time: e.target.value,
                end_time: addOneHour(e.target.value)
              }))
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Fim" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "time",
              value: form.end_time,
              onChange: (e) => setForm((f) => ({ ...f, end_time: e.target.value }))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Consultório" }),
        /* @__PURE__ */ jsxs(Select, { value: form.room_id, onValueChange: (value) => setForm((f) => ({ ...f, room_id: value })), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Sem consultório" }),
            rooms.map((room) => /* @__PURE__ */ jsx(SelectItem, { value: room.id, children: room.name }, room.id))
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
      /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, children: saving ? "Salvando..." : "Salvar alterações" })
    ] })
  ] }) });
}
const STATUS_LABEL$1 = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou"
};
const STATUS_CLASS$2 = {
  scheduled: "border-l-muted-foreground bg-muted/40",
  confirmed: "border-l-primary bg-primary/5",
  completed: "border-l-emerald-500 bg-emerald-500/10",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/10"
};
function roomMatches(row, columnId) {
  if (columnId === "none") return !row.room_id;
  return row.room_id === columnId;
}
function AgendaRoomsOverview({
  date,
  rows,
  rooms,
  loading,
  onReschedule
}) {
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;
  const columns = (() => {
    const cols = rooms.map((r) => ({ id: r.id, name: r.name, color: r.color }));
    if (rows.some((r) => !r.room_id)) {
      cols.push({ id: "none", name: "Sem consultório", color: null });
    }
    return cols;
  })();
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex min-h-[520px] items-center justify-center rounded-lg border bg-card text-muted-foreground", children: "Carregando agenda..." });
  }
  if (rooms.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center text-muted-foreground", children: [
      /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: "Nenhum consultório cadastrado" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Cadastre consultórios em Configurações → Consultórios para usar esta visão." })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b bg-primary px-4 py-2.5 text-primary-foreground", children: [
      /* @__PURE__ */ jsxs("div", { className: "font-semibold capitalize", children: [
        "Visão geral · ",
        formatAgendaDate(date)
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-normal opacity-90", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          columns.length,
          " ",
          columns.length === 1 ? "coluna" : "colunas",
          " · ",
          rows.length,
          " agendamentos"
        ] }),
        columns.length > 3 && /* @__PURE__ */ jsx("span", { className: "rounded bg-primary-foreground/15 px-2 py-0.5 text-xs", children: "Arraste horizontalmente para ver todos os consultórios" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-x-auto overflow-y-auto", children: /* @__PURE__ */ jsxs(
      "div",
      {
        className: "inline-grid w-max min-w-full",
        style: { gridTemplateColumns: `4rem repeat(${columns.length}, 12rem)` },
        children: [
          /* @__PURE__ */ jsx("div", { className: "sticky left-0 z-20 border-b border-r bg-muted/40 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]" }),
          columns.map((col) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "min-w-[12rem] border-b px-2 py-2 text-center text-sm font-semibold",
              style: col.color ? { borderTop: `3px solid ${col.color}` } : void 0,
              children: [
                /* @__PURE__ */ jsx("span", { className: "line-clamp-2", children: col.name }),
                /* @__PURE__ */ jsxs("span", { className: "mt-0.5 block text-xs font-normal text-muted-foreground", children: [
                  rows.filter((r) => roomMatches(r, col.id)).length,
                  " horários"
                ] })
              ]
            },
            col.id
          )),
          /* @__PURE__ */ jsx("div", { className: "sticky left-0 z-10 border-r bg-muted/30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]", children: slots.map((slot) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex h-16 items-start justify-end border-b pr-2 pt-1 text-xs text-muted-foreground",
              children: [
                slot.slice(0, 2),
                "h"
              ]
            },
            slot
          )) }),
          columns.map((col) => {
            const colRows = rows.filter((r) => roomMatches(r, col.id));
            return /* @__PURE__ */ jsxs("div", { className: "relative min-w-[12rem] border-r last:border-r-0", children: [
              slots.map((slot) => /* @__PURE__ */ jsx("div", { className: "h-16 border-b border-dashed border-border/60" }, slot)),
              nowPercent !== null && /* @__PURE__ */ jsx(
                "div",
                {
                  className: "pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500",
                  style: { top: `${nowPercent}%` }
                }
              ),
              colRows.length === 0 && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground", children: "Livre" }),
              colRows.map((row) => {
                const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
                const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
                const top = Math.max(0, startMin / totalMinutes * 100);
                const height = Math.max(5, (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100);
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    role: onReschedule ? "button" : void 0,
                    tabIndex: onReschedule ? 0 : void 0,
                    onClick: onReschedule ? () => onReschedule(row) : void 0,
                    onKeyDown: onReschedule ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onReschedule(row);
                      }
                    } : void 0,
                    className: cn(
                      "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 p-1.5 text-left shadow-sm",
                      STATUS_CLASS$2[row.status] ?? STATUS_CLASS$2.scheduled,
                      onReschedule && "cursor-pointer transition hover:ring-2 hover:ring-primary/30"
                    ),
                    style: { top: `${top}%`, height: `${height}%`, minHeight: "3.25rem" },
                    children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[10px] font-semibold text-primary", children: formatTimeInterval(row.start_time, row.end_time) }),
                      row.patient_id ? /* @__PURE__ */ jsx(
                        Link,
                        {
                          to: "/reception/pacientes/$id",
                          params: { id: row.patient_id },
                          className: "block truncate text-xs font-medium hover:underline",
                          onClick: (e) => e.stopPropagation(),
                          children: row.patients?.full_name ?? "Paciente"
                        }
                      ) : /* @__PURE__ */ jsx("span", { className: "text-xs font-medium", children: "—" }),
                      /* @__PURE__ */ jsx("div", { className: "truncate text-[10px] text-muted-foreground", children: row.profiles?.full_name ?? "—" }),
                      /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center justify-between gap-1", children: [
                        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "h-4 px-1 text-[9px]", children: STATUS_LABEL$1[row.status] ?? row.status }),
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-0.5", onClick: (e) => e.stopPropagation(), children: [
                          onReschedule && /* @__PURE__ */ jsx(AgendaRescheduleButton, { row, onReschedule }),
                          /* @__PURE__ */ jsx(
                            AgendaContactActions,
                            {
                              phone: row.patients?.phone,
                              patientId: row.patient_id,
                              patientName: row.patients?.full_name,
                              size: "icon"
                            }
                          )
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: "truncate text-[9px] text-muted-foreground", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" })
                    ]
                  },
                  row.id
                );
              })
            ] }, col.id);
          })
        ]
      }
    ) })
  ] });
}
const STATUS_LABEL = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou"
};
const STATUS_CLASS$1 = {
  scheduled: "border-l-muted-foreground bg-muted/40",
  confirmed: "border-l-primary bg-primary/5",
  completed: "border-l-emerald-500 bg-emerald-500/10",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/10"
};
function AgendaTimelineView({
  date,
  rows,
  loading,
  activeProfessionalId,
  onProfessionalChange,
  professionals,
  headerExtra,
  onReschedule
}) {
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;
  const activePro = professionals.find((p) => p.id === activeProfessionalId);
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b bg-primary px-4 py-2.5 text-primary-foreground", children: [
      /* @__PURE__ */ jsxs("div", { className: "font-semibold capitalize", children: [
        activeProfessionalId === "all" ? "Todos os profissionais" : activePro?.full_name ?? "Profissional",
        /* @__PURE__ */ jsx("span", { className: "mx-2 opacity-60", children: "·" }),
        /* @__PURE__ */ jsx("span", { className: "font-normal", children: formatAgendaDate(date) })
      ] }),
      headerExtra
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1 border-b bg-muted/30 px-3 py-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => onProfessionalChange("all"),
          className: cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            activeProfessionalId === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          ),
          children: "Todos"
        }
      ),
      professionals.map((p) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => onProfessionalChange(p.id),
          className: cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            activeProfessionalId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          ),
          children: p.full_name.split(" ").slice(0, 2).join(" ")
        },
        p.id
      ))
    ] }),
    loading ? /* @__PURE__ */ jsx("div", { className: "flex flex-1 items-center justify-center py-16 text-muted-foreground", children: "Carregando agenda..." }) : /* @__PURE__ */ jsxs("div", { className: "relative flex flex-1 overflow-auto", children: [
      /* @__PURE__ */ jsx("div", { className: "w-16 shrink-0 border-r bg-muted/20", children: slots.map((slot) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex h-16 items-start justify-end border-b pr-2 pt-1 text-xs text-muted-foreground",
          children: [
            slot.slice(0, 2),
            "h"
          ]
        },
        slot
      )) }),
      /* @__PURE__ */ jsxs("div", { className: "relative min-w-0 flex-1", children: [
        slots.map((slot) => /* @__PURE__ */ jsx("div", { className: "h-16 border-b border-dashed border-border/60" }, slot)),
        nowPercent !== null && /* @__PURE__ */ jsx(
          "div",
          {
            className: "pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500",
            style: { top: `${nowPercent}%` },
            children: /* @__PURE__ */ jsx("span", { className: "absolute -left-1 -top-1.5 size-2.5 rounded-full bg-sky-500" })
          }
        ),
        rows.length === 0 && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-muted-foreground", children: "Nenhum agendamento neste período" }),
        rows.map((row) => {
          const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
          const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
          const top = Math.max(0, startMin / totalMinutes * 100);
          const height = Math.max(4, (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100);
          const cancelled = row.status === "cancelled";
          return /* @__PURE__ */ jsxs(
            "div",
            {
              role: onReschedule ? "button" : void 0,
              tabIndex: onReschedule ? 0 : void 0,
              onClick: onReschedule ? () => onReschedule(row) : void 0,
              onKeyDown: onReschedule ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onReschedule(row);
                }
              } : void 0,
              className: cn(
                "absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 p-2 shadow-sm",
                STATUS_CLASS$1[row.status] ?? STATUS_CLASS$1.scheduled,
                cancelled && "line-through opacity-50",
                onReschedule && "cursor-pointer transition hover:ring-2 hover:ring-primary/30"
              ),
              style: { top: `${top}%`, height: `${height}%`, minHeight: "3.5rem" },
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-primary", children: formatTimeInterval(row.start_time, row.end_time) }),
                    row.patient_id ? /* @__PURE__ */ jsx(
                      Link,
                      {
                        to: "/reception/pacientes/$id",
                        params: { id: row.patient_id },
                        className: "block truncate text-sm font-medium hover:underline",
                        onClick: (e) => e.stopPropagation(),
                        children: row.patients?.full_name ?? "Paciente"
                      }
                    ) : /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: "—" }),
                    /* @__PURE__ */ jsxs("div", { className: "truncate text-xs text-muted-foreground", children: [
                      row.profiles?.full_name,
                      row.rooms?.name ? ` · ${row.rooms.name}` : ""
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-0.5", onClick: (e) => e.stopPropagation(), children: [
                    onReschedule && /* @__PURE__ */ jsx(AgendaRescheduleButton, { row, onReschedule }),
                    /* @__PURE__ */ jsx(
                      AgendaContactActions,
                      {
                        phone: row.patients?.phone,
                        patientId: row.patient_id,
                        patientName: row.patients?.full_name,
                        size: "icon"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap gap-1", children: [
                  /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "h-5 px-1.5 text-[10px]", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" }),
                  /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "h-5 px-1.5 text-[10px]", children: STATUS_LABEL[row.status] ?? row.status })
                ] })
              ]
            },
            row.id
          );
        })
      ] })
    ] })
  ] });
}
const STATUS_CLASS = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-700 dark:text-amber-400"
};
function AgendaPage() {
  const {
    profile
  } = useAuth();
  const followUpFn = useServerFn(triggerAppointmentFollowUp);
  const statusFollowUpFn = useServerFn(triggerAppointmentStatusFollowUp);
  const [viewMode, setViewMode] = useState("timeline");
  const [date, setDate] = useState(todayISO());
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [timeTo, setTimeTo] = useState("22:00");
  const [filterProfessional, setFilterProfessional] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleRow, setRescheduleRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const patientPickerRef = useRef(null);
  const [form, setForm] = useState({
    patient_id: "",
    professional_id: "",
    room_id: "none",
    date: todayISO(),
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    specialty: "",
    notes: ""
  });
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("appointments").select("id,date,start_time,end_time,status,type,specialty,notes,patient_id,professional_id,room_id,patients(full_name,phone),profiles!appointments_professional_id_fkey(full_name),rooms(name,color)").eq("tenant_id", profile.tenant_id).eq("date", date).order("start_time");
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [patientsRes, professionalsRes, roomsRes] = await Promise.all([supabase.from("patients").select("id,full_name,phone").eq("tenant_id", profile.tenant_id).eq("active", true).order("full_name"), supabase.from("profiles").select("id,full_name,specialty,appointment_types").eq("tenant_id", profile.tenant_id).eq("role", "professional").eq("active", true).order("full_name"), supabase.from("rooms").select("id,name,color").eq("tenant_id", profile.tenant_id).eq("active", true).order("name")]);
      setPatients(patientsRes.data ?? []);
      setProfessionals(professionalsRes.data ?? []);
      setRooms(roomsRes.data ?? []);
    })();
  }, [profile]);
  useEffect(() => {
    load();
  }, [profile, date]);
  const filteredRows = useMemo(() => {
    const fromMin = timeToMinutes(timeFrom);
    const toMin = timeToMinutes(timeTo);
    return rows.filter((row) => {
      if (!showCancelled && row.status === "cancelled") return false;
      if (filterProfessional !== "all" && row.professional_id !== filterProfessional) return false;
      if (filterRoom === "none" && row.room_id) return false;
      if (filterRoom !== "all" && filterRoom !== "none" && row.room_id !== filterRoom) return false;
      const startMin = timeToMinutes(row.start_time.slice(0, 5));
      return startMin >= fromMin && startMin < toMin;
    });
  }, [rows, showCancelled, filterProfessional, filterRoom, timeFrom, timeTo]);
  const filteredRowsForRooms = useMemo(() => {
    const fromMin = timeToMinutes(timeFrom);
    const toMin = timeToMinutes(timeTo);
    return rows.filter((row) => {
      if (!showCancelled && row.status === "cancelled") return false;
      if (filterProfessional !== "all" && row.professional_id !== filterProfessional) return false;
      const startMin = timeToMinutes(row.start_time.slice(0, 5));
      return startMin >= fromMin && startMin < toMin;
    });
  }, [rows, showCancelled, filterProfessional, timeFrom, timeTo]);
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients.filter((p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))).slice(0, 25);
  }, [patients, patientSearch]);
  useEffect(() => {
    if (!patientPickerOpen) return;
    const onPointerDown = (event) => {
      if (!patientPickerRef.current?.contains(event.target)) {
        setPatientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patientPickerOpen]);
  const availableAppointmentTypes = useMemo(() => {
    const professional = professionals.find((p) => p.id === form.professional_id);
    const allowed = resolveAppointmentTypes(professional?.appointment_types);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [professionals, form.professional_id]);
  const statsRows = viewMode === "rooms" ? filteredRowsForRooms : filteredRows;
  const totals = useMemo(() => ({
    all: statsRows.length,
    confirmed: statsRows.filter((r) => r.status === "confirmed").length,
    completed: statsRows.filter((r) => r.status === "completed").length,
    pending: statsRows.filter((r) => r.status === "scheduled").length
  }), [statsRows]);
  const openNew = () => {
    setPatientSearch("");
    setPatientPickerOpen(false);
    setForm((f) => ({
      ...f,
      patient_id: "",
      date,
      end_time: addOneHour(f.start_time)
    }));
    setOpen(true);
  };
  const openReschedule = (row) => {
    setRescheduleRow(row);
    setRescheduleOpen(true);
  };
  const handleRescheduled = (newDate) => {
    if (newDate !== date) setDate(newDate);
    else load();
  };
  const save = async () => {
    if (!profile || !form.patient_id || !form.professional_id || !form.date || !form.start_time) {
      toast.error("Preencha paciente, profissional, data e horário.");
      return;
    }
    setSaving(true);
    const {
      data: created,
      error
    } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_id: form.patient_id,
      professional_id: form.professional_id,
      room_id: form.room_id === "none" ? null : form.room_id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      type: form.type || "consultation",
      specialty: form.specialty || null,
      notes: form.notes || null,
      status: "scheduled",
      created_by: profile.id
    }).select("id").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void followUpFn({
      data: {
        appointmentId: created.id,
        patientId: form.patient_id,
        professionalId: form.professional_id,
        startsAt: (/* @__PURE__ */ new Date(`${form.date}T${form.start_time}:00`)).toISOString()
      }
    }).catch(() => {
    });
    toast.success("Consulta agendada");
    setOpen(false);
    setDate(form.date);
    load();
  };
  const updateStatus = async (id, status) => {
    const row = rows.find((r) => r.id === id);
    const {
      error
    } = await supabase.from("appointments").update({
      status
    }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((current) => current.map((r) => r.id === id ? {
        ...r,
        status
      } : r));
      toast.success("Situação atualizada");
      if (row?.patient_id && row.professional_id && (status === "completed" || status === "no_show")) {
        void statusFollowUpFn({
          data: {
            appointmentId: id,
            patientId: row.patient_id,
            professionalId: row.professional_id,
            status,
            startsAt: (/* @__PURE__ */ new Date(`${row.date}T${row.start_time}:00`)).toISOString()
          }
        }).catch(() => {
        });
      }
    }
  };
  const handlePrint = () => {
    const profId = filterProfessional !== "all" ? filterProfessional : null;
    void printWithLetterhead(profId);
  };
  const filtersPanel = /* @__PURE__ */ jsx(AgendaFiltersPanel, { date, onDateChange: setDate, timeFrom, timeTo, onTimeFromChange: setTimeFrom, onTimeToChange: setTimeTo, filterProfessional, onFilterProfessionalChange: setFilterProfessional, filterRoom, onFilterRoomChange: setFilterRoom, showCancelled, onShowCancelledChange: setShowCancelled, professionals, rooms, onNewAppointment: openNew, onPrint: handlePrint });
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Agenda", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4 print:space-y-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Agenda" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Visualize em grade ou lista, com filtros por data, horário, profissional e consultório." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(Tabs, { value: viewMode, onValueChange: (v) => setViewMode(v), children: /* @__PURE__ */ jsxs(TabsList, { children: [
            /* @__PURE__ */ jsxs(TabsTrigger, { value: "timeline", className: "gap-1.5", children: [
              /* @__PURE__ */ jsx(LayoutGrid, { className: "size-4" }),
              " Grade"
            ] }),
            /* @__PURE__ */ jsxs(TabsTrigger, { value: "rooms", className: "gap-1.5", children: [
              /* @__PURE__ */ jsx(Building2, { className: "size-4" }),
              " Consultórios"
            ] }),
            /* @__PURE__ */ jsxs(TabsTrigger, { value: "list", className: "gap-1.5", children: [
              /* @__PURE__ */ jsx(List, { className: "size-4" }),
              " Lista"
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(Button, { onClick: openNew, className: "print:hidden", children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            "Novo agendamento"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-4 print:hidden", children: [
        /* @__PURE__ */ jsx(SummaryCard, { label: "Total", value: totals.all }),
        /* @__PURE__ */ jsx(SummaryCard, { label: "Pendentes", value: totals.pending }),
        /* @__PURE__ */ jsx(SummaryCard, { label: "Confirmados", value: totals.confirmed }),
        /* @__PURE__ */ jsx(SummaryCard, { label: "Concluídos", value: totals.completed })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 lg:flex-row-reverse", children: [
        /* @__PURE__ */ jsx("div", { className: "print:hidden", children: filtersPanel }),
        /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children: viewMode === "timeline" ? /* @__PURE__ */ jsx(AgendaTimelineView, { date, rows: filteredRows, loading, activeProfessionalId: filterProfessional, onProfessionalChange: setFilterProfessional, professionals, headerExtra: /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "bg-primary-foreground/15 text-primary-foreground", children: [
          filteredRows.length,
          " horários"
        ] }), onReschedule: openReschedule }) : viewMode === "rooms" ? /* @__PURE__ */ jsx(AgendaRoomsOverview, { date, rows: filteredRowsForRooms, rooms, loading, onReschedule: openReschedule }) : /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base capitalize", children: [
              /* @__PURE__ */ jsx(CalendarDays, { className: "size-4" }),
              fmtDateLong(date)
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", children: [
              filteredRows.length,
              " horários"
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0 overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Horário" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Contato" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Consultório" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Tipo" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
              /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Carregando agenda..." }) }) : filteredRows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Nenhum agendamento para os filtros selecionados." }) }) : filteredRows.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { className: "whitespace-nowrap font-medium", children: formatTimeInterval(row.start_time, row.end_time) }),
              /* @__PURE__ */ jsxs(TableCell, { children: [
                row.patient_id ? /* @__PURE__ */ jsx(Link, { to: "/reception/pacientes/$id", params: {
                  id: row.patient_id
                }, className: "font-medium hover:underline", children: row.patients?.full_name ?? "Paciente" }) : "—",
                row.patients?.phone && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: row.patients.phone })
              ] }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(AgendaContactActions, { phone: row.patients?.phone, patientId: row.patient_id, patientName: row.patients?.full_name, size: "icon" }) }),
              /* @__PURE__ */ jsx(TableCell, { children: row.profiles?.full_name ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: row.rooms?.name ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? row.specialty ?? "Consulta" }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled, children: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
                /* @__PURE__ */ jsx(AgendaRescheduleButton, { row, onReschedule: openReschedule, size: "sm" }),
                /* @__PURE__ */ jsxs(Select, { value: row.status, onValueChange: (value) => updateStatus(row.id, value), children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { className: "w-36", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsx(SelectContent, { children: Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => /* @__PURE__ */ jsx(SelectItem, { value, children: label }, value)) })
                ] })
              ] }) })
            ] }, row.id)) })
          ] }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (value) => {
      setOpen(value);
      if (!value) {
        setPatientSearch("");
        setPatientPickerOpen(false);
      }
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Novo agendamento" }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 space-y-2", ref: patientPickerRef, children: [
          /* @__PURE__ */ jsx(Label, { children: "Paciente" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Input, { value: patientSearch, onChange: (e) => {
              setPatientSearch(e.target.value);
              setPatientPickerOpen(true);
              setForm((f) => ({
                ...f,
                patient_id: ""
              }));
            }, onFocus: () => setPatientPickerOpen(true), placeholder: "Digite o nome ou telefone do paciente", className: "pl-9", autoComplete: "off" }),
            patientPickerOpen && patientSearch.trim() && /* @__PURE__ */ jsx("div", { className: "absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md", children: filteredPatients.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm text-muted-foreground", children: "Nenhum paciente encontrado" }) : filteredPatients.map((patient) => /* @__PURE__ */ jsxs("button", { type: "button", className: "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none", onMouseDown: (e) => e.preventDefault(), onClick: () => {
              setForm((f) => ({
                ...f,
                patient_id: patient.id
              }));
              setPatientSearch(patient.full_name);
              setPatientPickerOpen(false);
            }, children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: patient.full_name }),
              patient.phone && /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: patient.phone })
            ] }, patient.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Profissional" }),
          /* @__PURE__ */ jsxs(Select, { value: form.professional_id, onValueChange: (value) => {
            const professional = professionals.find((p) => p.id === value);
            const types = resolveAppointmentTypes(professional?.appointment_types);
            setForm((f) => ({
              ...f,
              professional_id: value,
              specialty: professional?.specialty ?? f.specialty,
              type: types.includes(f.type) ? f.type : types[0]
            }));
          }, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: professionals.map((professional) => /* @__PURE__ */ jsx(SelectItem, { value: professional.id, children: professional.full_name }, professional.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Consultório" }),
          /* @__PURE__ */ jsxs(Select, { value: form.room_id, onValueChange: (value) => setForm((f) => ({
            ...f,
            room_id: value
          })), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Sem consultório" }),
              rooms.map((room) => /* @__PURE__ */ jsx(SelectItem, { value: room.id, children: room.name }, room.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Data" }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: form.date, onChange: (e) => setForm((f) => ({
            ...f,
            date: e.target.value
          })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Início" }),
            /* @__PURE__ */ jsx(Input, { type: "time", value: form.start_time, onChange: (e) => setForm((f) => ({
              ...f,
              start_time: e.target.value,
              end_time: addOneHour(e.target.value)
            })) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Fim" }),
            /* @__PURE__ */ jsx(Input, { type: "time", value: form.end_time, onChange: (e) => setForm((f) => ({
              ...f,
              end_time: e.target.value
            })) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Tipo" }),
          /* @__PURE__ */ jsxs(Select, { value: form.type, onValueChange: (value) => setForm((f) => ({
            ...f,
            type: value
          })), disabled: !form.professional_id, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: form.professional_id ? "Selecione" : "Escolha o profissional" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: availableAppointmentTypes.map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t.value, children: t.label }, t.value)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Especialidade" }),
          /* @__PURE__ */ jsx(Input, { value: form.specialty, onChange: (e) => setForm((f) => ({
            ...f,
            specialty: e.target.value
          })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Observações" }),
          /* @__PURE__ */ jsx(Textarea, { value: form.notes, onChange: (e) => setForm((f) => ({
            ...f,
            notes: e.target.value
          })) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, children: saving ? "Salvando..." : "Salvar agendamento" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(AgendaRescheduleDialog, { open: rescheduleOpen, onOpenChange: setRescheduleOpen, appointment: rescheduleRow, rooms, onSaved: handleRescheduled })
  ] });
}
function SummaryCard({
  label,
  value
}) {
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: value })
  ] }) });
}
export {
  AgendaPage as component
};
