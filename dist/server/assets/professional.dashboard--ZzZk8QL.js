import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Users, AlertCircle, CheckCircle2, Clock, PlayCircle, Eye, FileText } from "lucide-react";
import { u as useAuth, D as DashboardShell, C as Card, a as CardHeader, b as CardTitle, w as cn, m as Badge, c as CardContent, N as APPOINTMENT_STATUS_LABEL, B as Button } from "./router-CL5eFCiw.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-H2GO3e-V.js";
import { S as StatCard } from "./stat-card-CTpiONgn.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import "@tanstack/react-query";
import "sonner";
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
import "./letterhead-pdf-4K2s0GWH.js";
import "@supabase/supabase-js";
function ProfessionalDashboard() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = useState([]);
  const [monthCount, setMonthCount] = useState(0);
  const [pendingRecords, setPendingRecords] = useState(0);
  const [nextAppt, setNextAppt] = useState(null);
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
    load();
  }, [profile]);
  const {
    upcoming,
    attended
  } = useMemo(() => {
    const done = /* @__PURE__ */ new Set(["completed", "cancelled", "no_show"]);
    return {
      upcoming: today.filter((a) => !done.has(a.status ?? "")),
      attended: today.filter((a) => a.status === "completed")
    };
  }, [today]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Profissional";
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Painel do Profissional", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: `Olá, ${firstName}`, description: [profile?.specialty, profile?.crm].filter(Boolean).join(" · ") || "Sua agenda e pendências do dia." }),
    /* @__PURE__ */ jsx(PageSection, { title: "Indicadores do dia", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Consultas hoje", value: today.length, icon: Calendar }),
      /* @__PURE__ */ jsx(StatCard, { label: "Próxima consulta", value: nextAppt ? nextAppt.start_time.slice(0, 5) : "—", sub: nextAppt ? `${nextAppt.patients?.full_name ?? "Paciente"} · ${nextAppt.rooms?.name ?? ""}` : "Sem agendamentos", icon: Users }),
      /* @__PURE__ */ jsx(StatCard, { label: "Atendidos este mês", value: monthCount, icon: Users }),
      /* @__PURE__ */ jsx(StatCard, { label: "Prontuários pendentes", value: pendingRecords, icon: AlertCircle, tone: pendingRecords > 0 ? "danger" : "default" })
    ] }) }),
    /* @__PURE__ */ jsx(PageSection, { title: "Agenda de hoje", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsx(AgendaGroup, { title: "A ser atendidos", count: upcoming.length, emptyMessage: "Nenhum paciente aguardando atendimento hoje", appointments: upcoming, navigate }),
      /* @__PURE__ */ jsx(AgendaGroup, { title: "Já atendidos", count: attended.length, emptyMessage: "Nenhum paciente atendido ainda hoje", appointments: attended, navigate, attended: true })
    ] }) })
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
  const Icon = attended ? CheckCircle2 : Clock;
  return /* @__PURE__ */ jsxs(Card, { className: cn("overflow-hidden ring-1 ring-inset", attended ? "border-emerald-200/70 bg-emerald-50/30 ring-emerald-100" : "border-sky-200/70 bg-sky-50/40 ring-sky-100"), children: [
    /* @__PURE__ */ jsx(CardHeader, { className: cn("border-b pb-4", attended ? "border-emerald-200/60 bg-emerald-50/80" : "border-sky-200/60 bg-sky-50/80"), children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center justify-between text-base font-medium", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: cn("grid size-7 place-items-center rounded-full", attended ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"), children: /* @__PURE__ */ jsx(Icon, { className: "size-4" }) }),
        /* @__PURE__ */ jsx("span", { className: attended ? "text-emerald-900" : "text-sky-900", children: title })
      ] }),
      /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: cn("font-mono tabular-nums", attended ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-sky-200 bg-sky-100 text-sky-800"), children: count })
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: appointments.length === 0 ? /* @__PURE__ */ jsx("p", { className: cn("py-10 text-center text-sm", attended ? "text-emerald-700/70" : "text-sky-700/70"), children: emptyMessage }) : /* @__PURE__ */ jsx("ul", { className: cn("divide-y", attended ? "divide-emerald-200/50" : "divide-sky-200/50"), children: appointments.map((a) => /* @__PURE__ */ jsxs("li", { className: cn("flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-5", attended ? "hover:bg-emerald-50/80" : "hover:bg-sky-50/80"), children: [
      /* @__PURE__ */ jsx("time", { className: "w-14 shrink-0 font-mono text-sm tabular-nums text-muted-foreground", children: a.start_time.slice(0, 5) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "truncate font-medium text-foreground", children: a.patients?.full_name ?? "Paciente" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: a.rooms?.name ?? "—" })
      ] }),
      /* @__PURE__ */ jsx(Badge, { variant: "outline", className: cn("shrink-0", attended ? "border-emerald-200 bg-emerald-50 text-emerald-800" : a.status === "in_progress" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-sky-200 bg-white/70 text-sky-800"), children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status }),
      a.patient_id && a.status === "in_progress" && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: [
        /* @__PURE__ */ jsx(PlayCircle, { className: "mr-1 size-4" }),
        "Iniciar"
      ] }),
      a.patient_id && attended && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: [
        /* @__PURE__ */ jsx(Eye, { className: "mr-1 size-4" }),
        "Prontuário"
      ] }),
      a.patient_id && !attended && a.status !== "in_progress" && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", "aria-label": "Ver prontuário", onClick: () => navigate({
        to: "/professional/patients/$id/record",
        params: {
          id: a.patient_id
        }
      }), children: /* @__PURE__ */ jsx(FileText, { className: "size-4" }) })
    ] }, a.id)) }) })
  ] });
}
export {
  ProfessionalDashboard as component
};
