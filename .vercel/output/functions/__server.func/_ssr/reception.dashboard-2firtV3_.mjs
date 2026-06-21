import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { c as getZonedTimeParts, M as tomorrowISO, t as todayISO, s as supabase } from "./index.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { D as DashboardShell, B as Button } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { P as PageSection } from "./page-section-B6uCwEd5.mjs";
import { S as StatCard } from "./stat-card-BAwtn22B.mjs";
import "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { r as Cake, j as CalendarCheck, M as MessageSquare } from "../_libs/lucide-react.mjs";
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
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
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
function ReceptionDashboard() {
  const [birthdaysToday, setBirthdaysToday] = reactExports.useState(0);
  const [unconfirmed, setUnconfirmed] = reactExports.useState(0);
  const [sentToday, setSentToday] = reactExports.useState(0);
  reactExports.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Painel da Recepção", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: `${greeting}!`, description: "Acompanhe comunicações e pendências do dia na recepção." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "Comunicações", description: "Métricas de engajamento e lembretes para pacientes.", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Aniversariantes hoje", value: birthdaysToday, icon: Cake, tone: "default", action: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/reception/marketing", className: "text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80", children: "Ver campanhas →" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Sem confirmação (amanhã)", value: unconfirmed, icon: CalendarCheck, tone: unconfirmed > 0 ? "warning" : "default", action: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/reception/mensagens", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", children: "Enviar lembretes" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Mensagens enviadas hoje", value: sentToday, icon: MessageSquare, tone: "success", action: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/reception/mensagens", className: "text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80", children: "Ver histórico →" }) })
    ] }) })
  ] });
}
export {
  ReceptionDashboard as component
};
