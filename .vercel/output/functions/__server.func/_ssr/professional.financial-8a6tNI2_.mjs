import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { D as DashboardShell, E as cn } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import "./index.mjs";
import "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { E as LoaderCircle, W as Wallet, ac as Landmark, d as TrendingDown, g as ChartColumn } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/tanstack__react-router.mjs";
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
import "tslib";
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
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "../_libs/supabase__functions-js.mjs";
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
const ITEMS = [
  { id: "cobrancas", label: "Cobranças", icon: Wallet },
  { id: "caixa", label: "Caixa", icon: Landmark },
  { id: "despesas", label: "Despesas", icon: TrendingDown },
  { id: "relatorios", label: "Relatórios", icon: ChartColumn }
];
function FinancialNav({
  activeTab,
  onTabChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex flex-wrap gap-2 border-b pb-4", children: ITEMS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: () => onTabChange(item.id),
      className: cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
        activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { className: "size-4" }),
        item.label
      ]
    },
    item.id
  )) });
}
function FinancialShell({
  activeTab,
  onTabChange,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Financeiro", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: "Meu financeiro",
        description: "Cobranças, caixa do dia, despesas e relatórios do seu consultório."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialNav, { activeTab, onTabChange }),
    children
  ] }) });
}
const FinancialCobrancasTab = reactExports.lazy(() => import("./financial-cobrancas-tab-DOrQLI_t.mjs").then((m) => ({
  default: m.FinancialCobrancasTab
})));
const FinancialCaixaTab = reactExports.lazy(() => import("./financial-caixa-tab-B09hkVlb.mjs").then((m) => ({
  default: m.FinancialCaixaTab
})));
const FinancialDespesasTab = reactExports.lazy(() => import("./financial-despesas-tab-DU8x2bxu.mjs").then((m) => ({
  default: m.FinancialDespesasTab
})));
const ProfessionalFinancialReports = reactExports.lazy(() => import("./professional-financial-reports-Cg38jSxu.mjs").then((m) => ({
  default: m.ProfessionalFinancialReports
})));
function TabFallback() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-8 animate-spin text-muted-foreground" }) });
}
function ProfessionalFinancialPage() {
  const [tab, setTab] = reactExports.useState("cobrancas");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialShell, { activeTab: tab, onTabChange: setTab, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(TabFallback, {}), children: [
    tab === "cobrancas" && /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialCobrancasTab, {}),
    tab === "caixa" && /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialCaixaTab, {}),
    tab === "despesas" && /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialDespesasTab, {}),
    tab === "relatorios" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProfessionalFinancialReports, {})
  ] }) });
}
export {
  ProfessionalFinancialPage as component
};
