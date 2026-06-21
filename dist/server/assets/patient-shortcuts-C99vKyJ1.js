import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { User, Stethoscope, CalendarCheck, DollarSign, Calendar, MessageCircle } from "lucide-react";
import { E as cn } from "./router-D_mhnWOa.js";
const RECEPTION_SHORTCUTS = [
  {
    key: "ficha",
    label: "Ficha cadastral",
    icon: User,
    to: "/reception/pacientes/$id",
    search: { tab: "dados" },
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200"
  },
  {
    key: "prontuario",
    label: "Prontuário / evolução",
    icon: Stethoscope,
    to: "/reception/pacientes/$id",
    search: { tab: "prontuarios" },
    className: "bg-red-100 text-red-700 hover:bg-red-200"
  },
  {
    key: "sessoes",
    label: "Sessões do paciente",
    icon: CalendarCheck,
    action: "sessions",
    className: "bg-violet-100 text-violet-800 hover:bg-violet-200"
  },
  {
    key: "financeiro",
    label: "Financeiro do cliente",
    icon: DollarSign,
    to: "/reception/pacientes/$id",
    search: { tab: "financeiro" },
    className: "bg-sky-100 text-sky-800 hover:bg-sky-200"
  },
  {
    key: "agenda",
    label: "Agendamento do cliente",
    icon: Calendar,
    to: "/reception/pacientes/$id",
    search: { tab: "consultas" },
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
  }
];
const PROFESSIONAL_SHORTCUTS = [
  {
    key: "ficha",
    label: "Cadastro do paciente",
    icon: User,
    to: "/professional/patients/$id",
    search: { tab: "dados" },
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200"
  },
  {
    key: "prontuario",
    label: "Prontuário",
    icon: Stethoscope,
    to: "/professional/patients/$id/record",
    className: "bg-red-100 text-red-700 hover:bg-red-200"
  },
  {
    key: "sessoes",
    label: "Sessões de procedimento",
    icon: CalendarCheck,
    action: "sessions",
    className: "bg-violet-100 text-violet-800 hover:bg-violet-200"
  },
  {
    key: "financeiro",
    label: "Financeiro do paciente",
    icon: DollarSign,
    to: "/professional/patients/$id",
    search: { tab: "financeiro" },
    className: "bg-sky-100 text-sky-800 hover:bg-sky-200"
  },
  {
    key: "agenda",
    label: "Agendamentos do paciente",
    icon: Calendar,
    to: "/professional/patients/$id",
    search: { tab: "consultas" },
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
  }
];
function isAction(s) {
  return "action" in s;
}
function PatientShortcuts({
  patientId,
  phone,
  className,
  variant = "reception",
  onSessionsClick
}) {
  const shortcuts = variant === "professional" ? PROFESSIONAL_SHORTCUTS : RECEPTION_SHORTCUTS;
  return /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-1.5", className), children: [
    shortcuts.map(
      (s) => isAction(s) ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          title: s.label,
          "aria-label": s.label,
          onClick: () => onSessionsClick?.(patientId),
          className: cn(
            "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
            s.className
          ),
          children: /* @__PURE__ */ jsx(s.icon, { className: "size-4", strokeWidth: 2.25 })
        },
        s.key
      ) : /* @__PURE__ */ jsx(
        Link,
        {
          to: s.to,
          params: { id: patientId },
          search: s.search,
          title: s.label,
          "aria-label": s.label,
          className: cn(
            "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
            s.className
          ),
          children: /* @__PURE__ */ jsx(s.icon, { className: "size-4", strokeWidth: 2.25 })
        },
        s.key
      )
    ),
    /* @__PURE__ */ jsx(
      Link,
      {
        to: "/crm/inbox",
        search: { patient: patientId },
        title: "CRM WhatsApp",
        "aria-label": "Abrir conversa no CRM WhatsApp",
        className: "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors duration-200 hover:bg-green-200",
        children: /* @__PURE__ */ jsx(MessageCircle, { className: "size-4", strokeWidth: 2.25 })
      }
    )
  ] });
}
export {
  PatientShortcuts as P
};
