import { jsxs, jsx } from "react/jsx-runtime";
import { c as getZonedTimeParts, M as tomorrowISO, t as todayISO, s as supabase } from "../server.js";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Cake, CalendarCheck, MessageSquare } from "lucide-react";
import { D as DashboardShell, B as Button } from "./router-D_mhnWOa.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-Cn2QgvH5.js";
import { S as StatCard } from "./stat-card-DrVVYHGP.js";
import "node:crypto";
import "@supabase/supabase-js";
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
import "./letterhead-pdf-8X66Bk4t.js";
function ReceptionDashboard() {
  const [birthdaysToday, setBirthdaysToday] = useState(0);
  const [unconfirmed, setUnconfirmed] = useState(0);
  const [sentToday, setSentToday] = useState(0);
  useEffect(() => {
    (async () => {
      const {
        month,
        day
      } = getZonedTimeParts();
      const tomorrow = tomorrowISO();
      const startOfDay = `${todayISO()}T03:00:00.000Z`;
      const {
        data: pts
      } = await supabase.from("patients").select("birth_date").not("birth_date", "is", null);
      const bday = (pts ?? []).filter((p) => {
        const bd = p.birth_date.slice(5, 10);
        const [m, d] = bd.split("-").map(Number);
        return m === month && d === day;
      }).length;
      setBirthdaysToday(bday);
      const {
        count: unc
      } = await supabase.from("appointments").select("id", {
        count: "exact",
        head: true
      }).eq("date", tomorrow).eq("status", "scheduled");
      setUnconfirmed(unc ?? 0);
      const {
        count: msgs
      } = await supabase.from("message_logs").select("id", {
        count: "exact",
        head: true
      }).gte("sent_at", startOfDay);
      setSentToday(msgs ?? 0);
    })();
  }, []);
  const greeting = (() => {
    const h = getZonedTimeParts().hour;
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Painel da Recepção", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: `${greeting}!`, description: "Acompanhe comunicações e pendências do dia na recepção." }),
    /* @__PURE__ */ jsx(PageSection, { title: "Comunicações", description: "Métricas de engajamento e lembretes para pacientes.", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Aniversariantes hoje", value: birthdaysToday, icon: Cake, tone: "default", action: /* @__PURE__ */ jsx(Link, { to: "/reception/marketing", className: "text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80", children: "Ver campanhas →" }) }),
      /* @__PURE__ */ jsx(StatCard, { label: "Sem confirmação (amanhã)", value: unconfirmed, icon: CalendarCheck, tone: unconfirmed > 0 ? "warning" : "default", action: /* @__PURE__ */ jsx(Link, { to: "/reception/mensagens", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", children: "Enviar lembretes" }) }) }),
      /* @__PURE__ */ jsx(StatCard, { label: "Mensagens enviadas hoje", value: sentToday, icon: MessageSquare, tone: "success", action: /* @__PURE__ */ jsx(Link, { to: "/reception/mensagens", className: "text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80", children: "Ver histórico →" }) })
    ] }) })
  ] });
}
export {
  ReceptionDashboard as component
};
