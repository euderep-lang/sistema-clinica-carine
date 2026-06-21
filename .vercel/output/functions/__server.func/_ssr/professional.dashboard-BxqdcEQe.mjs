import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as todayISO, s as supabase } from "./index.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { N as NewAppointmentDialog } from "./new-appointment-dialog-CfHDiHS3.mjs";
import { u as useAuth, D as DashboardShell, B as Button, C as Card, b as CardHeader, e as CardTitle, E as cn, q as Badge, f as CardContent, V as APPOINTMENT_STATUS_LABEL } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { P as PageSection } from "./page-section-B6uCwEd5.mjs";
import { S as StatCard } from "./stat-card-BAwtn22B.mjs";
import "../_libs/seroval.mjs";
import "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, h as Calendar, i as Users, s as CircleAlert, q as CircleCheck, t as Clock, ad as CirclePlay, a7 as Eye, F as FileText } from "../_libs/lucide-react.mjs";
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
import "./agenda-utils-DAU-4XZp.mjs";
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
function ProfessionalDashboard() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = reactExports.useState([]);
  const [monthCount, setMonthCount] = reactExports.useState(0);
  const [pendingRecords, setPendingRecords] = reactExports.useState(0);
  const [nextAppt, setNextAppt] = reactExports.useState(null);
  const [newApptOpen, setNewApptOpen] = reactExports.useState(false);
  const load = async () => {
    if (!profile) return;
    const todayStr = todayISO();
    const firstOfMonth = todayStr.slice(0, 8) + "01";
    const {
      data: ap
    } = await supabase.from("appointments").select("id, patient_id, start_time, status, patients(full_name), rooms(name)").eq("professional_id", profile.id).eq("date", todayStr).order("start_time");
    const list = ap ?? [];
    setToday(list);
    const now = (/* @__PURE__ */ new Date()).toTimeString().slice(0, 5);
    const upcoming2 = list.find((a) => (a.start_time ?? "") >= now && a.status !== "completed" && a.status !== "cancelled");
    setNextAppt(upcoming2 ?? null);
    const {
      count: mc
    } = await supabase.from("appointments").select("*", {
      count: "exact",
      head: true
    }).eq("professional_id", profile.id).eq("status", "completed").gte("date", firstOfMonth);
    setMonthCount(mc ?? 0);
    const {
      data: completed
    } = await supabase.from("appointments").select("id").eq("professional_id", profile.id).eq("status", "completed");
    const ids = (completed ?? []).map((c) => c.id);
    if (ids.length === 0) {
      setPendingRecords(0);
      return;
    }
    const {
      data: linked
    } = await supabase.from("medical_records").select("appointment_id").in("appointment_id", ids);
    const linkedSet = new Set((linked ?? []).map((l) => l.appointment_id));
    setPendingRecords(ids.filter((i) => !linkedSet.has(i)).length);
  };
  reactExports.useEffect(() => {
    void load();
  }, [profile]);
  const {
    upcoming,
    attended
  } = reactExports.useMemo(() => {
    const done = /* @__PURE__ */ new Set(["completed", "cancelled", "no_show"]);
    return {
      upcoming: today.filter((a) => !done.has(a.status ?? "")),
      attended: today.filter((a) => a.status === "completed")
    };
  }, [today]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Profissional";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Painel do Profissional", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: `Olá, ${firstName}`, description: [profile?.specialty, profile?.crm].filter(Boolean).join(" · ") || "Sua agenda e pendências do dia.", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setNewApptOpen(true), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
      "Novo agendamento"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "Indicadores do dia", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Consultas hoje", value: today.length, icon: Calendar }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Próxima consulta", value: nextAppt ? nextAppt.start_time.slice(0, 5) : "—", sub: nextAppt ? `${nextAppt.patients?.full_name ?? "Paciente"} · ${nextAppt.rooms?.name ?? ""}` : "Sem agendamentos", icon: Users }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Atendidos este mês", value: monthCount, icon: Users }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Prontuários pendentes", value: pendingRecords, icon: CircleAlert, tone: pendingRecords > 0 ? "danger" : "default" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "Agenda de hoje", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => setNewApptOpen(true), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
      "Adicionar agendamento"
    ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AgendaGroup, { title: "A ser atendidos", count: upcoming.length, emptyMessage: "Nenhum paciente aguardando atendimento hoje", appointments: upcoming, navigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AgendaGroup, { title: "Já atendidos", count: attended.length, emptyMessage: "Nenhum paciente atendido ainda hoje", appointments: attended, navigate, attended: true })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(NewAppointmentDialog, { open: newApptOpen, onOpenChange: setNewApptOpen, defaultProfessionalId: profile?.role === "professional" ? profile.id : void 0, onSaved: () => void load() })
  ] });
}
function AgendaGroup({
  title,
  count,
  emptyMessage,
  appointments,
  navigate,
  attended = false
}) {
  const Icon = attended ? CircleCheck : Clock;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: cn("overflow-hidden ring-1 ring-inset", attended ? "border-emerald-200/70 bg-emerald-50/30 ring-emerald-100" : "border-sky-200/70 bg-sky-50/40 ring-sky-100"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: cn("border-b pb-4", attended ? "border-emerald-200/60 bg-emerald-50/80" : "border-sky-200/60 bg-sky-50/80"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center justify-between text-base font-medium", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("grid size-7 place-items-center rounded-full", attended ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: attended ? "text-emerald-900" : "text-sky-900", children: title })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", className: cn("font-mono tabular-nums", attended ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-sky-200 bg-sky-100 text-sky-800"), children: count })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: appointments.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("py-10 text-center text-sm", attended ? "text-emerald-700/70" : "text-sky-700/70"), children: emptyMessage }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: cn("divide-y", attended ? "divide-emerald-200/50" : "divide-sky-200/50"), children: appointments.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: cn("flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-5", attended ? "hover:bg-emerald-50/80" : "hover:bg-sky-50/80"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("time", { className: "w-14 shrink-0 font-mono text-sm tabular-nums text-muted-foreground", children: a.start_time.slice(0, 5) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-medium text-foreground", children: a.patients?.full_name ?? "Paciente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: a.rooms?.name ?? "—" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: cn("shrink-0", attended ? "border-emerald-200 bg-emerald-50 text-emerald-800" : a.status === "in_progress" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-sky-200 bg-white/70 text-sky-800"), children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status }),
      a.patient_id && a.status === "in_progress" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CirclePlay, { className: "mr-1 size-4" }),
        "Iniciar"
      ] }),
      a.patient_id && attended && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "mr-1 size-4" }),
        "Prontuário"
      ] }),
      a.patient_id && !attended && a.status !== "in_progress" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", "aria-label": "Ver prontuário", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-4" }) })
    ] }, a.id)) }) })
  ] });
}
export {
  ProfessionalDashboard as component
};
