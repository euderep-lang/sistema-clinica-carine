import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { u as useServerFn } from "./createSsrRpc-BRag-Yhq.js";
import { Users, Clock, MessageCircle, CalendarCheck, UserCheck, Target, TrendingUp } from "lucide-react";
import { u as useAuth, D as DashboardShell, C as Card, b as CardHeader, e as CardTitle, f as CardContent } from "./router-C3L3OxIm.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { G as getCrmAnalytics } from "./whatsapp-crm.functions-BEmBnR-J.js";
import "./server-COT59iTL.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-query";
import "../server.js";
import "node:crypto";
import "@supabase/supabase-js";
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
import "./letterhead-pdf-8X66Bk4t.js";
import "./auth-middleware-Cn0DA8Cq.js";
function MetricCard({
  title,
  value,
  hint,
  icon: Icon
}) {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [
      /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: title }),
      /* @__PURE__ */ jsx(Icon, { className: "size-4 text-muted-foreground" })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl font-bold tabular-nums", children: value }),
      hint ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: hint }) : null
    ] })
  ] });
}
function CrmAnalyticsPage() {
  const { profile } = useAuth();
  const analyticsFn = useServerFn(getCrmAnalytics);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    void analyticsFn().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [analyticsFn]);
  if (profile?.role !== "admin") {
    return /* @__PURE__ */ jsxs(DashboardShell, { children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "Métricas CRM", description: "Acesso restrito ao administrador." }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Você não tem permissão para ver esta página." })
    ] });
  }
  return /* @__PURE__ */ jsxs(DashboardShell, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Métricas CRM",
        description: "Indicadores dos últimos 30 dias — leads, conversão e desempenho da equipe.",
        actions: /* @__PURE__ */ jsx(
          Link,
          {
            to: "/crm/inbox",
            className: "inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted/60",
            children: "Voltar ao inbox"
          }
        )
      }
    ),
    loading ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando métricas…" }) : error ? /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: error }) : data ? /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4", children: [
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Leads recebidos",
            value: String(data.totals.leads),
            hint: `${data.totals.conversations} conversas no período`,
            icon: Users
          }
        ),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "1ª resposta (média)",
            value: data.avgFirstResponseMinutes != null ? `${data.avgFirstResponseMinutes} min` : "—",
            hint: "Tempo até primeiro contato da equipe",
            icon: Clock
          }
        ),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Taxa resposta do lead",
            value: `${data.leadResponseRate}%`,
            hint: "Pacientes que responderam após contato",
            icon: MessageCircle
          }
        ),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Taxa de agendamento",
            value: `${data.schedulingRate}%`,
            hint: "Consultas vs conversas",
            icon: CalendarCheck
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3", children: [
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Comparecimento",
            value: data.attendanceRate != null ? `${data.attendanceRate}%` : "—",
            hint: "Realizadas vs faltas",
            icon: UserCheck
          }
        ),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Fechamento pós-valor",
            value: data.closeRateAfterPrice != null ? `${data.closeRateAfterPrice}%` : "—",
            hint: "Agendaram após receber valor",
            icon: Target
          }
        ),
        /* @__PURE__ */ jsx(
          MetricCard,
          {
            title: "Agendamentos",
            value: String(data.totals.appointments),
            hint: `${data.totals.pricedConversations} conversas com valor enviado`,
            icon: TrendingUp
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Leads por dia" }) }),
          /* @__PURE__ */ jsx(CardContent, { children: data.leadsPerDay.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Nenhum lead no período." }) : /* @__PURE__ */ jsx("ul", { className: "max-h-64 space-y-1 overflow-y-auto text-sm", children: data.leadsPerDay.map(({ date, count }) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between rounded-md px-2 py-1 hover:bg-muted/40", children: [
            /* @__PURE__ */ jsx("span", { children: date.split("-").reverse().join("/") }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold tabular-nums", children: count })
          ] }, date)) }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Motivos de perda" }) }),
          /* @__PURE__ */ jsx(CardContent, { children: data.lossReasons.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Nenhuma conversa fechada no período." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2 text-sm", children: data.lossReasons.map(({ reason, count }) => /* @__PURE__ */ jsxs("li", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "truncate", children: reason }),
            /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold", children: count })
          ] }, reason)) }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Maior conversão (equipe)" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: data.topConverters.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Sem dados de conversão ainda." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2 text-sm", children: data.topConverters.map((s, i) => /* @__PURE__ */ jsxs(
          "li",
          {
            className: "flex items-center justify-between rounded-lg border px-3 py-2",
            children: [
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsxs("span", { className: "mr-2 text-muted-foreground", children: [
                  "#",
                  i + 1
                ] }),
                s.name
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                s.deals,
                " ganhos · ",
                s.appointments,
                " agendamentos"
              ] })
            ]
          },
          s.name
        )) }) })
      ] })
    ] }) : null
  ] });
}
const SplitComponent = CrmAnalyticsPage;
export {
  SplitComponent as component
};
