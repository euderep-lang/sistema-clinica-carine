import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CalendarCheck,
  DollarSign,
  MessageCircle,
  Stethoscope,
  User,
  type LucideIcon,
} from "lucide-react";
import { whatsappUrl } from "@/lib/agenda-utils";
import { cn } from "@/lib/utils";

type ShortcutLink = {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  search?: Record<string, string>;
  className: string;
};

type ShortcutAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  action: "sessions";
  className: string;
};

type Shortcut = ShortcutLink | ShortcutAction;

const RECEPTION_SHORTCUTS: Shortcut[] = [
  {
    key: "ficha",
    label: "Ficha cadastral",
    icon: User,
    to: "/reception/pacientes/$id",
    search: { tab: "dados" },
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  {
    key: "prontuario",
    label: "Prontuário / evolução",
    icon: Stethoscope,
    to: "/reception/pacientes/$id",
    search: { tab: "prontuarios" },
    className: "bg-red-100 text-red-700 hover:bg-red-200",
  },
  {
    key: "sessoes",
    label: "Sessões do paciente",
    icon: CalendarCheck,
    action: "sessions",
    className: "bg-violet-100 text-violet-800 hover:bg-violet-200",
  },
  {
    key: "financeiro",
    label: "Financeiro do cliente",
    icon: DollarSign,
    to: "/reception/pacientes/$id",
    search: { tab: "financeiro" },
    className: "bg-sky-100 text-sky-800 hover:bg-sky-200",
  },
  {
    key: "agenda",
    label: "Agendamento do cliente",
    icon: Calendar,
    to: "/reception/pacientes/$id",
    search: { tab: "consultas" },
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
];

const PROFESSIONAL_SHORTCUTS: Shortcut[] = [
  {
    key: "ficha",
    label: "Cadastro do paciente",
    icon: User,
    to: "/professional/patients/$id",
    search: { tab: "dados" },
    className: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  },
  {
    key: "prontuario",
    label: "Prontuário",
    icon: Stethoscope,
    to: "/professional/patients/$id/record",
    className: "bg-red-100 text-red-700 hover:bg-red-200",
  },
  {
    key: "sessoes",
    label: "Sessões de procedimento",
    icon: CalendarCheck,
    action: "sessions",
    className: "bg-violet-100 text-violet-800 hover:bg-violet-200",
  },
  {
    key: "financeiro",
    label: "Financeiro do paciente",
    icon: DollarSign,
    to: "/professional/patients/$id",
    search: { tab: "financeiro" },
    className: "bg-sky-100 text-sky-800 hover:bg-sky-200",
  },
  {
    key: "agenda",
    label: "Agendamentos do paciente",
    icon: Calendar,
    to: "/professional/patients/$id",
    search: { tab: "consultas" },
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  },
];

function isAction(s: Shortcut): s is ShortcutAction {
  return "action" in s;
}

export function PatientShortcuts({
  patientId,
  phone,
  className,
  variant = "reception",
  onSessionsClick,
}: {
  patientId: string;
  phone?: string | null;
  className?: string;
  variant?: "reception" | "professional";
  onSessionsClick?: (patientId: string) => void;
}) {
  const wa = whatsappUrl(phone);
  const shortcuts = variant === "professional" ? PROFESSIONAL_SHORTCUTS : RECEPTION_SHORTCUTS;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {shortcuts.map((s) =>
        isAction(s) ? (
          <button
            key={s.key}
            type="button"
            title={s.label}
            aria-label={s.label}
            onClick={() => onSessionsClick?.(patientId)}
            className={cn(
              "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
              s.className,
            )}
          >
            <s.icon className="size-4" strokeWidth={2.25} />
          </button>
        ) : (
          <Link
            key={s.key}
            to={s.to}
            params={{ id: patientId }}
            search={s.search}
            title={s.label}
            aria-label={s.label}
            className={cn(
              "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
              s.className,
            )}
          >
            <s.icon className="size-4" strokeWidth={2.25} />
          </Link>
        ),
      )}
      {wa && (
        <button
          type="button"
          title="WhatsApp"
          aria-label="Abrir WhatsApp do paciente"
          onClick={() => window.open(wa, "_blank", "noopener,noreferrer")}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors duration-200 hover:bg-green-200"
        >
          <MessageCircle className="size-4" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
