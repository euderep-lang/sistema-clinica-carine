import { jsxs, jsx } from "react/jsx-runtime";
import { t as todayISO, V as fmtDateFull, s as supabase } from "../server.js";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PlayCircle, Eye, Plus, ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { N as NewAppointmentDialog } from "./new-appointment-dialog-BN_DVmUR.js";
import { q as Badge, F as APPOINTMENT_TYPE_LABEL, S as Select, l as SelectTrigger, m as SelectValue, V as APPOINTMENT_STATUS_LABEL, E as cn, a9 as PROFESSIONAL_AGENDA_STATUS_TRIGGER, n as SelectContent, aa as PROFESSIONAL_AGENDA_STATUS_OPTIONS, o as SelectItem, ab as PROFESSIONAL_AGENDA_STATUS_ITEM, ac as PROFESSIONAL_AGENDA_STATUS_VALUES, B as Button, g as Popover, h as PopoverTrigger, j as PopoverContent, u as useAuth, D as DashboardShell, I as Input, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell } from "./router-C3L3OxIm.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { A as AgendaContactActions } from "./agenda-contact-actions-CLMlWu0S.js";
import { b as buildHourSlots, c as currentTimePercent, d as formatAgendaDate, t as timeToMinutes, A as AGENDA_DAY_START, f as formatTimeInterval, e as AGENDA_SLOT_MINUTES, g as AGENDA_DAY_END, w as weekDaysFromMonday, h as formatWeekRange, s as startOfWeekMonday, i as shiftDate } from "./agenda-utils-CO-C_DbJ.js";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-0hB4loFs.js";
import "node:crypto";
import "@supabase/supabase-js";
import "./createSsrRpc-BRag-Yhq.js";
import "./server-COT59iTL.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "./whatsapp-crm.functions-BEmBnR-J.js";
import "./auth-middleware-Cn0DA8Cq.js";
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
const STATUS_CLASS$1 = {
  scheduled: "border-l-muted-foreground bg-muted/40",
  confirmed: "border-l-primary bg-primary/5",
  in_progress: "border-l-sky-500 bg-sky-500/10",
  completed: "border-l-emerald-500 bg-emerald-500/10",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/10",
  rescheduled: "border-l-violet-500 bg-violet-500/10"
};
function ProfessionalAgendaDayView({
  date,
  rows,
  loading,
  onStatusChange,
  onStart
}) {
  const navigate = useNavigate();
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsx("div", { className: "border-b bg-primary px-4 py-2.5 font-semibold capitalize text-primary-foreground", children: formatAgendaDate(date) }),
    loading ? /* @__PURE__ */ jsx("div", { className: "flex flex-1 items-center justify-center py-16 text-muted-foreground", children: "Carregando agenda…" }) : /* @__PURE__ */ jsxs("div", { className: "relative flex flex-1 overflow-auto", children: [
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
        rows.length === 0 && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-muted-foreground", children: "Nenhuma consulta neste dia" }),
        rows.map((row) => {
          const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
          const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
          const top = Math.max(0, startMin / totalMinutes * 100);
          const height = Math.max(
            4,
            (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100
          );
          const cancelled = row.status === "cancelled";
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: cn(
                "absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 p-2 shadow-sm",
                STATUS_CLASS$1[row.status] ?? STATUS_CLASS$1.scheduled,
                cancelled && "line-through opacity-50"
              ),
              style: { top: `${top}%`, height: `${height}%`, minHeight: "4.5rem" },
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-primary", children: formatTimeInterval(row.start_time, row.end_time) }),
                    /* @__PURE__ */ jsx("span", { className: "block truncate text-sm font-medium", children: row.patients?.full_name ?? "—" }),
                    /* @__PURE__ */ jsx("div", { className: "truncate text-xs text-muted-foreground", children: row.rooms?.name ?? "—" })
                  ] }),
                  /* @__PURE__ */ jsx(
                    AgendaContactActions,
                    {
                      phone: row.patients?.phone,
                      patientId: row.patient_id,
                      patientName: row.patients?.full_name,
                      size: "icon"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1", children: [
                  /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "h-5 px-1.5 text-[10px]", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" }),
                  /* @__PURE__ */ jsxs(
                    Select,
                    {
                      value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status) ? row.status : void 0,
                      onValueChange: (value) => void onStatusChange(row.id, value),
                      children: [
                        /* @__PURE__ */ jsx(
                          SelectTrigger,
                          {
                            className: cn(
                              "h-5 w-auto min-w-0 border px-1.5 text-[10px] font-medium shadow-none",
                              PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled
                            ),
                            children: /* @__PURE__ */ jsx(SelectValue, { placeholder: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status })
                          }
                        ),
                        /* @__PURE__ */ jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                          SelectItem,
                          {
                            value: opt.value,
                            className: cn("my-0.5 border text-xs font-medium", PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value]),
                            children: opt.label
                          },
                          opt.value
                        )) })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1", children: [
                  ["scheduled", "confirmed", "rescheduled"].includes(row.status) && row.patient_id && /* @__PURE__ */ jsxs(Button, { size: "sm", className: "h-6 px-2 text-xs", onClick: () => onStart(row), children: [
                    /* @__PURE__ */ jsx(PlayCircle, { className: "mr-1 size-3" }),
                    "Iniciar"
                  ] }),
                  row.patient_id && /* @__PURE__ */ jsxs(
                    Button,
                    {
                      size: "sm",
                      variant: "ghost",
                      className: "h-6 px-2 text-xs",
                      onClick: () => navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: row.patient_id }
                      }),
                      children: [
                        /* @__PURE__ */ jsx(Eye, { className: "mr-1 size-3" }),
                        "Prontuário"
                      ]
                    }
                  ),
                  row.status === "in_progress" && /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "sm",
                      variant: "secondary",
                      className: "h-6 px-2 text-xs",
                      onClick: () => void onStatusChange(row.id, "completed"),
                      children: "Concluir"
                    }
                  )
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
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const STATUS_CLASS = {
  scheduled: "border-l-muted-foreground bg-muted/50",
  confirmed: "border-l-primary bg-primary/10",
  in_progress: "border-l-sky-500 bg-sky-500/15",
  completed: "border-l-emerald-500 bg-emerald-500/15",
  cancelled: "border-l-destructive bg-destructive/10 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/15",
  rescheduled: "border-l-violet-500 bg-violet-500/15"
};
function ProfessionalAgendaWeekView({
  weekStart,
  rows,
  loading,
  onStatusChange,
  onStart,
  onDayClick
}) {
  const navigate = useNavigate();
  const days = weekDaysFromMonday(weekStart);
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const today = todayISO();
  const byDay = days.map((day) => rows.filter((r) => r.date === day));
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "border-b bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground", children: [
      "Semana · ",
      formatWeekRange(weekStart)
    ] }),
    loading ? /* @__PURE__ */ jsx("div", { className: "flex flex-1 items-center justify-center py-16 text-muted-foreground", children: "Carregando agenda…" }) : /* @__PURE__ */ jsxs("div", { className: "flex flex-1 flex-col overflow-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid min-w-[760px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30", children: [
        /* @__PURE__ */ jsx("div", { className: "border-r" }),
        days.map((day, i) => {
          const d = /* @__PURE__ */ new Date(`${day}T12:00:00`);
          const isWeekend = i >= 5;
          const isToday = day === today;
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => onDayClick?.(day),
              className: cn(
                "border-r px-2 py-2 text-center transition last:border-r-0",
                isWeekend && "bg-muted/50",
                isToday && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                onDayClick && "hover:bg-muted/70"
              ),
              children: [
                /* @__PURE__ */ jsx("div", { className: "text-[10px] font-medium uppercase tracking-wide text-muted-foreground", children: WEEKDAY_LABELS[i] }),
                /* @__PURE__ */ jsx("div", { className: cn("text-lg font-semibold leading-tight", isToday && "text-primary"), children: d.getDate() })
              ]
            },
            day
          );
        })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative flex min-w-[760px] flex-1", children: [
        /* @__PURE__ */ jsx("div", { className: "w-14 shrink-0 border-r bg-muted/20", children: slots.map((slot) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex h-14 items-start justify-end border-b pr-1.5 pt-0.5 text-[10px] text-muted-foreground",
            children: [
              slot.slice(0, 2),
              "h"
            ]
          },
          slot
        )) }),
        /* @__PURE__ */ jsx("div", { className: "grid flex-1 grid-cols-7", children: days.map((day, colIndex) => {
          const isWeekend = colIndex >= 5;
          const dayRows = byDay[colIndex];
          const nowPercent = day === today ? currentTimePercent() : null;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: cn(
                "relative border-r last:border-r-0",
                isWeekend && "bg-muted/30"
              ),
              children: [
                slots.map((slot) => /* @__PURE__ */ jsx("div", { className: "h-14 border-b border-dashed border-border/50" }, slot)),
                nowPercent !== null && /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500",
                    style: { top: `${nowPercent}%` },
                    children: /* @__PURE__ */ jsx("span", { className: "absolute -left-0.5 -top-1 size-2 rounded-full bg-sky-500" })
                  }
                ),
                dayRows.length === 0 && /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center p-1", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/60", children: "—" }) }),
                dayRows.map((row) => {
                  const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
                  const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
                  const top = Math.max(0, startMin / totalMinutes * 100);
                  const height = Math.max(
                    3,
                    (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100
                  );
                  return /* @__PURE__ */ jsxs(Popover, { children: [
                    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        className: cn(
                          "absolute left-0.5 right-0.5 z-[1] overflow-hidden rounded border border-l-[3px] p-1 text-left shadow-sm transition hover:ring-2 hover:ring-primary/25",
                          STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled,
                          row.status === "cancelled" && "opacity-50 line-through"
                        ),
                        style: { top: `${top}%`, height: `${height}%`, minHeight: "2.75rem" },
                        children: [
                          /* @__PURE__ */ jsx("div", { className: "text-[9px] font-semibold leading-tight text-primary", children: row.start_time.slice(0, 5) }),
                          /* @__PURE__ */ jsx("div", { className: "truncate text-[10px] font-medium leading-tight", children: row.patients?.full_name ?? "—" })
                        ]
                      }
                    ) }),
                    /* @__PURE__ */ jsx(PopoverContent, { className: "w-72 p-3", align: "start", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsx("p", { className: "font-medium", children: row.patients?.full_name ?? "—" }),
                        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                          formatTimeInterval(row.start_time, row.end_time),
                          row.rooms?.name ? ` · ${row.rooms.name}` : ""
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
                        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-[10px]", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" }),
                        /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px]", children: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status })
                      ] }),
                      /* @__PURE__ */ jsxs(
                        Select,
                        {
                          value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status) ? row.status : void 0,
                          onValueChange: (value) => void onStatusChange(row.id, value),
                          children: [
                            /* @__PURE__ */ jsx(
                              SelectTrigger,
                              {
                                className: cn(
                                  "h-8 w-full border text-xs font-medium shadow-none",
                                  PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled
                                ),
                                children: /* @__PURE__ */ jsx(
                                  SelectValue,
                                  {
                                    placeholder: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status
                                  }
                                )
                              }
                            ),
                            /* @__PURE__ */ jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsx(
                              SelectItem,
                              {
                                value: opt.value,
                                className: cn(
                                  "text-xs font-medium",
                                  PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value]
                                ),
                                children: opt.label
                              },
                              opt.value
                            )) })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
                        /* @__PURE__ */ jsx(
                          AgendaContactActions,
                          {
                            phone: row.patients?.phone,
                            patientId: row.patient_id,
                            patientName: row.patients?.full_name,
                            size: "icon"
                          }
                        ),
                        ["scheduled", "confirmed", "rescheduled"].includes(row.status) && row.patient_id && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => onStart(row), children: [
                          /* @__PURE__ */ jsx(PlayCircle, { className: "mr-1 size-3.5" }),
                          "Iniciar"
                        ] }),
                        row.patient_id && /* @__PURE__ */ jsxs(
                          Button,
                          {
                            size: "sm",
                            variant: "ghost",
                            onClick: () => navigate({
                              to: "/professional/patients/$id/record",
                              params: { id: row.patient_id }
                            }),
                            children: [
                              /* @__PURE__ */ jsx(Eye, { className: "mr-1 size-3.5" }),
                              "Prontuário"
                            ]
                          }
                        )
                      ] })
                    ] }) })
                  ] }, row.id);
                })
              ]
            },
            day
          );
        }) })
      ] })
    ] })
  ] });
}
function ProfessionalAgendaPage() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("weekly");
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const weekStart = useMemo(() => startOfWeekMonday(date), [date]);
  const weekEnd = useMemo(() => shiftDate(weekStart, 6), [weekStart]);
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from("appointments").select("id,date,start_time,end_time,status,type,patient_id,patients(full_name,phone),rooms(name)").eq("professional_id", profile.id).order("date").order("start_time");
    if (viewMode === "weekly") {
      q = q.gte("date", weekStart).lte("date", weekEnd);
    } else {
      q = q.eq("date", date);
    }
    const {
      data,
      error
    } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [profile, date, viewMode, weekStart, weekEnd]);
  const visibleRows = useMemo(() => {
    if (viewMode === "weekly") return rows;
    return rows.filter((r) => r.date === date);
  }, [rows, viewMode, date]);
  const summary = useMemo(() => {
    const source = viewMode === "weekly" ? rows : visibleRows;
    const total = source.filter((r) => r.status !== "cancelled").length;
    const done = source.filter((r) => r.status === "completed").length;
    const pending = source.filter((r) => !["completed", "cancelled", "no_show"].includes(r.status)).length;
    return {
      total,
      done,
      pending
    };
  }, [rows, visibleRows, viewMode]);
  const updateStatus = async (id, status) => {
    const {
      data,
      error
    } = await supabase.from("appointments").update({
      status
    }).eq("id", id).select("id, status").maybeSingle();
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!data) {
      toast.error("Não foi possível atualizar a consulta.");
      return false;
    }
    setRows((prev) => prev.map((r) => r.id === id ? {
      ...r,
      status: data.status
    } : r));
    return true;
  };
  const startAppointment = async (appointment) => {
    if (!appointment.patient_id) return;
    const ok = await updateStatus(appointment.id, "in_progress");
    if (!ok) return;
    navigate({
      to: "/professional/patients/$id/record",
      params: {
        id: appointment.patient_id
      }
    });
  };
  const handleStatusChange = async (id, status) => {
    const ok = await updateStatus(id, status);
    if (ok) toast.success("Situação atualizada");
    return ok;
  };
  const shiftPeriod = (days) => setDate((d) => shiftDate(d, days));
  const dateLabel = viewMode === "weekly" ? formatWeekRange(weekStart) : fmtDateFull(date);
  const summaryScope = viewMode === "weekly" ? "na semana" : "no dia";
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Minha Agenda", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "Minha Agenda", description: "Consultas do seu consultório. Atualize a situação e acesse prontuários.", actions: /* @__PURE__ */ jsxs(Button, { onClick: () => setNewApptOpen(true), children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Novo agendamento"
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "icon", onClick: () => shiftPeriod(viewMode === "weekly" ? -7 : -1), children: /* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }) }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-40" }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "icon", onClick: () => shiftPeriod(viewMode === "weekly" ? 7 : 1), children: /* @__PURE__ */ jsx(ChevronRight, { className: "size-4" }) }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDate(todayISO()), children: "Hoje" }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: () => setNewApptOpen(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            "Agendar"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-sm capitalize text-muted-foreground", children: dateLabel })
        ] }),
        /* @__PURE__ */ jsx(Tabs, { value: viewMode, onValueChange: (v) => setViewMode(v), children: /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsxs(TabsTrigger, { value: "weekly", className: "gap-1.5", children: [
            /* @__PURE__ */ jsx(CalendarDays, { className: "size-4" }),
            "Semanal"
          ] }),
          /* @__PURE__ */ jsxs(TabsTrigger, { value: "daily", className: "gap-1.5", children: [
            /* @__PURE__ */ jsx(LayoutGrid, { className: "size-4" }),
            "Diária"
          ] }),
          /* @__PURE__ */ jsxs(TabsTrigger, { value: "list", className: "gap-1.5", children: [
            /* @__PURE__ */ jsx(List, { className: "size-4" }),
            "Lista"
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Consultas ",
            summaryScope
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: summary.total })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Atendidas" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-emerald-600", children: summary.done })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Pendentes" }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-amber-600", children: summary.pending })
        ] }) })
      ] }),
      viewMode === "weekly" && /* @__PURE__ */ jsx(ProfessionalAgendaWeekView, { weekStart, rows, loading, onStatusChange: handleStatusChange, onStart: (a) => void startAppointment(a), onDayClick: (day) => {
        setDate(day);
        setViewMode("daily");
      } }),
      viewMode === "daily" && /* @__PURE__ */ jsx(ProfessionalAgendaDayView, { date, rows: visibleRows, loading, onStatusChange: handleStatusChange, onStart: (a) => void startAppointment(a) }),
      viewMode === "list" && /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Horário" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Consultório" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Tipo" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Situação" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : visibleRows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Nenhuma consulta neste dia." }) }) : visibleRows.map((a) => /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { className: "text-center font-mono text-sm", children: formatTimeInterval(a.start_time, a.end_time) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center font-medium", children: a.patients?.full_name ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center text-sm text-muted-foreground", children: a.rooms?.name ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center text-sm", children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs(Select, { value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(a.status) ? a.status : void 0, onValueChange: async (value) => {
            await handleStatusChange(a.id, value);
          }, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: cn("w-36 border font-medium shadow-none", PROFESSIONAL_AGENDA_STATUS_TRIGGER[a.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled), children: /* @__PURE__ */ jsx(SelectValue, { placeholder: APPOINTMENT_STATUS_LABEL[a.status] ?? a.status }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsx(SelectItem, { value: opt.value, className: cn("my-0.5 border font-medium", PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value]), children: opt.label }, opt.value)) })
          ] }) }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-1", children: [
            /* @__PURE__ */ jsx(AgendaContactActions, { phone: a.patients?.phone, patientId: a.patient_id, patientName: a.patients?.full_name, size: "icon" }),
            ["scheduled", "confirmed", "rescheduled"].includes(a.status) && a.patient_id && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => void startAppointment(a), children: [
              /* @__PURE__ */ jsx(PlayCircle, { className: "mr-1 size-4" }),
              "Iniciar"
            ] }),
            a.patient_id && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", onClick: () => navigate({
              to: "/professional/patients/$id/record",
              params: {
                id: a.patient_id
              }
            }), children: [
              /* @__PURE__ */ jsx(Eye, { className: "mr-1 size-4" }),
              "Prontuário"
            ] }),
            a.status === "in_progress" && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "secondary", onClick: () => void handleStatusChange(a.id, "completed"), children: "Concluir" })
          ] }) })
        ] }, a.id)) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(NewAppointmentDialog, { open: newApptOpen, onOpenChange: setNewApptOpen, defaultProfessionalId: profile?.role === "professional" ? profile.id : void 0, defaultDate: date, onSaved: (savedDate) => {
      setDate(savedDate);
      void load();
    } })
  ] });
}
export {
  ProfessionalAgendaPage as component
};
