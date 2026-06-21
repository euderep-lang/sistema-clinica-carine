import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as todayISO, V as fmtDateFull, s as supabase } from "./index.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { N as NewAppointmentDialog } from "./new-appointment-dialog-CfHDiHS3.mjs";
import { u as useAuth, D as DashboardShell, B as Button, I as Input, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, F as APPOINTMENT_TYPE_LABEL, S as Select, l as SelectTrigger, m as SelectValue, V as APPOINTMENT_STATUS_LABEL, E as cn, a9 as PROFESSIONAL_AGENDA_STATUS_TRIGGER, n as SelectContent, aa as PROFESSIONAL_AGENDA_STATUS_OPTIONS, o as SelectItem, ab as PROFESSIONAL_AGENDA_STATUS_ITEM, ac as PROFESSIONAL_AGENDA_STATUS_VALUES, g as Popover, h as PopoverTrigger, j as PopoverContent, q as Badge } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { A as AgendaContactActions } from "./agenda-contact-actions-BLP39QcP.mjs";
import { s as startOfWeekMonday, i as shiftDate, j as formatWeekRange, f as formatTimeInterval, w as weekDaysFromMonday, b as buildHourSlots, c as currentTimePercent, t as timeToMinutes, A as AGENDA_DAY_START, d as formatAgendaDate, e as AGENDA_SLOT_MINUTES, g as AGENDA_DAY_END } from "./agenda-utils-DAU-4XZp.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-BH0EiCRX.mjs";
import "../_libs/seroval.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, x as ChevronLeft, w as ChevronRight, Y as CalendarDays, O as LayoutGrid, V as List, ad as CirclePlay, a7 as Eye } from "../_libs/lucide-react.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "./createSsrRpc-fdWaaOKT.mjs";
import "./server-GGhSSPgi.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "./whatsapp-crm.functions-Dmtynik5.mjs";
import "./auth-middleware-DmvhAnC4.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-dialog.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/radix-ui__react-tooltip.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/radix-ui__react-avatar.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__react-dropdown-menu.mjs";
import "../_libs/radix-ui__react-menu.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "./patient-utils-YNqCHR6o.mjs";
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
import "fs";
import "path";
import "../_libs/fflate.mjs";
import "../_libs/fast-png.mjs";
import "../_libs/iobuffer.mjs";
import "../_libs/pako.mjs";
import "../_libs/html2canvas.mjs";
import "../_libs/dompurify.mjs";
import "../_libs/canvg.mjs";
import "../_libs/core-js.mjs";
import "../_libs/babel__runtime.mjs";
import "../_libs/raf.mjs";
import "../_libs/performance-now.mjs";
import "../_libs/rgbcolor.mjs";
import "../_libs/svg-pathdata.mjs";
import "../_libs/stackblur-canvas.mjs";
import "./crm-navigation-CWVrTkjz.mjs";
import "../_libs/radix-ui__react-tabs.mjs";
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b bg-primary px-4 py-2.5 font-semibold capitalize text-primary-foreground", children: formatAgendaDate(date) }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-1 items-center justify-center py-16 text-muted-foreground", children: "Carregando agenda…" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-1 overflow-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 shrink-0 border-r bg-muted/20", children: slots.map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1", children: [
        slots.map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-16 border-b border-dashed border-border/60" }, slot)),
        nowPercent !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500",
            style: { top: `${nowPercent}%` },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-1 -top-1.5 size-2.5 rounded-full bg-sky-500" })
          }
        ),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 flex items-center justify-center text-sm text-muted-foreground", children: "Nenhuma consulta neste dia" }),
        rows.map((row) => {
          const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
          const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
          const top = Math.max(0, startMin / totalMinutes * 100);
          const height = Math.max(
            4,
            (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100
          );
          const cancelled = row.status === "cancelled";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 p-2 shadow-sm",
                STATUS_CLASS$1[row.status] ?? STATUS_CLASS$1.scheduled,
                cancelled && "line-through opacity-50"
              ),
              style: { top: `${top}%`, height: `${height}%`, minHeight: "4.5rem" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-primary", children: formatTimeInterval(row.start_time, row.end_time) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-sm font-medium", children: row.patients?.full_name ?? "—" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-xs text-muted-foreground", children: row.rooms?.name ?? "—" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AgendaContactActions,
                    {
                      phone: row.patients?.phone,
                      patientId: row.patient_id,
                      patientName: row.patients?.full_name,
                      size: "icon"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "h-5 px-1.5 text-[10px]", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    Select,
                    {
                      value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status) ? row.status : void 0,
                      onValueChange: (value) => void onStatusChange(row.id, value),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          SelectTrigger,
                          {
                            className: cn(
                              "h-5 w-auto min-w-0 border px-1.5 text-[10px] font-medium shadow-none",
                              PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled
                            ),
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
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
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1", children: [
                  ["scheduled", "confirmed", "rescheduled"].includes(row.status) && row.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "h-6 px-2 text-xs", onClick: () => onStart(row), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, { className: "mr-1 size-3" }),
                    "Iniciar"
                  ] }),
                  row.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "mr-1 size-3" }),
                        "Prontuário"
                      ]
                    }
                  ),
                  row.status === "in_progress" && /* @__PURE__ */ jsxRuntimeExports.jsx(
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground", children: [
      "Semana · ",
      formatWeekRange(weekStart)
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-1 items-center justify-center py-16 text-muted-foreground", children: "Carregando agenda…" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col overflow-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-[760px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-r" }),
        days.map((day, i) => {
          const d = /* @__PURE__ */ new Date(`${day}T12:00:00`);
          const isWeekend = i >= 5;
          const isToday = day === today;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-medium uppercase tracking-wide text-muted-foreground", children: WEEKDAY_LABELS[i] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-lg font-semibold leading-tight", isToday && "text-primary"), children: d.getDate() })
              ]
            },
            day
          );
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex min-w-[760px] flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 shrink-0 border-r bg-muted/20", children: slots.map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid flex-1 grid-cols-7", children: days.map((day, colIndex) => {
          const isWeekend = colIndex >= 5;
          const dayRows = byDay[colIndex];
          const nowPercent = day === today ? currentTimePercent() : null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "relative border-r last:border-r-0",
                isWeekend && "bg-muted/30"
              ),
              children: [
                slots.map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-14 border-b border-dashed border-border/50" }, slot)),
                nowPercent !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500",
                    style: { top: `${nowPercent}%` },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-0.5 -top-1 size-2 rounded-full bg-sky-500" })
                  }
                ),
                dayRows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground/60", children: "—" }) }),
                dayRows.map((row) => {
                  const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
                  const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
                  const top = Math.max(0, startMin / totalMinutes * 100);
                  const height = Math.max(
                    3,
                    (Math.max(endMin, startMin + 30) - startMin) / totalMinutes * 100
                  );
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[9px] font-semibold leading-tight text-primary", children: row.start_time.slice(0, 5) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate text-[10px] font-medium leading-tight", children: row.patients?.full_name ?? "—" })
                        ]
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { className: "w-72 p-3", align: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: row.patients?.full_name ?? "—" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                          formatTimeInterval(row.start_time, row.end_time),
                          row.rooms?.name ? ` · ${row.rooms.name}` : ""
                        ] })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-[10px]", children: APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: "text-[10px]", children: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Select,
                        {
                          value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status) ? row.status : void 0,
                          onValueChange: (value) => void onStatusChange(row.id, value),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              SelectTrigger,
                              {
                                className: cn(
                                  "h-8 w-full border text-xs font-medium shadow-none",
                                  PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled
                                ),
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  SelectValue,
                                  {
                                    placeholder: APPOINTMENT_STATUS_LABEL[row.status] ?? row.status
                                  }
                                )
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
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
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          AgendaContactActions,
                          {
                            phone: row.patients?.phone,
                            patientId: row.patient_id,
                            patientName: row.patients?.full_name,
                            size: "icon"
                          }
                        ),
                        ["scheduled", "confirmed", "rescheduled"].includes(row.status) && row.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => onStart(row), children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, { className: "mr-1 size-3.5" }),
                          "Iniciar"
                        ] }),
                        row.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          Button,
                          {
                            size: "sm",
                            variant: "ghost",
                            onClick: () => navigate({
                              to: "/professional/patients/$id/record",
                              params: { id: row.patient_id }
                            }),
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "mr-1 size-3.5" }),
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
  const [viewMode, setViewMode] = reactExports.useState("weekly");
  const [date, setDate] = reactExports.useState(todayISO());
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [newApptOpen, setNewApptOpen] = reactExports.useState(false);
  const weekStart = reactExports.useMemo(() => startOfWeekMonday(date), [date]);
  const weekEnd = reactExports.useMemo(() => shiftDate(weekStart, 6), [weekStart]);
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
  reactExports.useEffect(() => {
    void load();
  }, [profile, date, viewMode, weekStart, weekEnd]);
  const visibleRows = reactExports.useMemo(() => {
    if (viewMode === "weekly") return rows;
    return rows.filter((r) => r.date === date);
  }, [rows, viewMode, date]);
  const summary = reactExports.useMemo(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Minha Agenda", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Minha Agenda", description: "Consultas do seu consultório. Atualize a situação e acesse prontuários.", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setNewApptOpen(true), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
        "Novo agendamento"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "icon", onClick: () => shiftPeriod(viewMode === "weekly" ? -7 : -1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "icon", onClick: () => shiftPeriod(viewMode === "weekly" ? 7 : 1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDate(todayISO()), children: "Hoje" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => setNewApptOpen(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
            "Agendar"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm capitalize text-muted-foreground", children: dateLabel })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { value: viewMode, onValueChange: (v) => setViewMode(v), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "weekly", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { className: "size-4" }),
            "Semanal"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "daily", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutGrid, { className: "size-4" }),
            "Diária"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsTrigger, { value: "list", className: "gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(List, { className: "size-4" }),
            "Lista"
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Consultas ",
            summaryScope
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold", children: summary.total })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Atendidas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-emerald-600", children: summary.done })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Pendentes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-bold text-amber-600", children: summary.pending })
        ] }) })
      ] }),
      viewMode === "weekly" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProfessionalAgendaWeekView, { weekStart, rows, loading, onStatusChange: handleStatusChange, onStart: (a) => void startAppointment(a), onDayClick: (day) => {
        setDate(day);
        setViewMode("daily");
      } }),
      viewMode === "daily" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProfessionalAgendaDayView, { date, rows: visibleRows, loading, onStatusChange: handleStatusChange, onStart: (a) => void startAppointment(a) }),
      viewMode === "list" && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Horário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Paciente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Consultório" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Situação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : visibleRows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Nenhuma consulta neste dia." }) }) : visibleRows.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center font-mono text-sm", children: formatTimeInterval(a.start_time, a.end_time) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center font-medium", children: a.patients?.full_name ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center text-sm text-muted-foreground", children: a.rooms?.name ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center text-sm", children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: PROFESSIONAL_AGENDA_STATUS_VALUES.has(a.status) ? a.status : void 0, onValueChange: async (value) => {
            await handleStatusChange(a.id, value);
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: cn("w-36 border font-medium shadow-none", PROFESSIONAL_AGENDA_STATUS_TRIGGER[a.status] ?? PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: APPOINTMENT_STATUS_LABEL[a.status] ?? a.status }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: opt.value, className: cn("my-0.5 border font-medium", PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value]), children: opt.label }, opt.value)) })
          ] }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(AgendaContactActions, { phone: a.patients?.phone, patientId: a.patient_id, patientName: a.patients?.full_name, size: "icon" }),
            ["scheduled", "confirmed", "rescheduled"].includes(a.status) && a.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => void startAppointment(a), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, { className: "mr-1 size-4" }),
              "Iniciar"
            ] }),
            a.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: () => navigate({
              to: "/professional/patients/$id/record",
              params: {
                id: a.patient_id
              }
            }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "mr-1 size-4" }),
              "Prontuário"
            ] }),
            a.status === "in_progress" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "secondary", onClick: () => void handleStatusChange(a.id, "completed"), children: "Concluir" })
          ] }) })
        ] }, a.id)) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(NewAppointmentDialog, { open: newApptOpen, onOpenChange: setNewApptOpen, defaultProfessionalId: profile?.role === "professional" ? profile.id : void 0, defaultDate: date, onSaved: (savedDate) => {
      setDate(savedDate);
      void load();
    } })
  ] });
}
export {
  ProfessionalAgendaPage as component
};
