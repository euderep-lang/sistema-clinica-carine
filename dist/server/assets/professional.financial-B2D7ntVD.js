import { jsx, jsxs } from "react/jsx-runtime";
import { useState, Suspense, lazy } from "react";
import { Wallet, Landmark, TrendingDown, BarChart3, Loader2 } from "lucide-react";
import { E as cn, D as DashboardShell } from "./router-D_mhnWOa.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import "@tanstack/react-query";
import "@tanstack/react-router";
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
const ITEMS = [
  { id: "cobrancas", label: "Cobranças", icon: Wallet },
  { id: "caixa", label: "Caixa", icon: Landmark },
  { id: "despesas", label: "Despesas", icon: TrendingDown },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 }
];
function FinancialNav({
  activeTab,
  onTabChange
}) {
  return /* @__PURE__ */ jsx("nav", { className: "flex flex-wrap gap-2 border-b pb-4", children: ITEMS.map((item) => /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => onTabChange(item.id),
      className: cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
        activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      ),
      children: [
        /* @__PURE__ */ jsx(item.icon, { className: "size-4" }),
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
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Financeiro", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Meu financeiro",
        description: "Cobranças, caixa do dia, despesas e relatórios do seu consultório."
      }
    ),
    /* @__PURE__ */ jsx(FinancialNav, { activeTab, onTabChange }),
    children
  ] }) });
}
const FinancialCobrancasTab = lazy(() => import("./financial-cobrancas-tab-k_E_Mzga.js").then((m) => ({
  default: m.FinancialCobrancasTab
})));
const FinancialCaixaTab = lazy(() => import("./financial-caixa-tab-C-c5izG1.js").then((m) => ({
  default: m.FinancialCaixaTab
})));
const FinancialDespesasTab = lazy(() => import("./financial-despesas-tab-BK8q7R6_.js").then((m) => ({
  default: m.FinancialDespesasTab
})));
const ProfessionalFinancialReports = lazy(() => import("./professional-financial-reports-BNNegOtr.js").then((m) => ({
  default: m.ProfessionalFinancialReports
})));
function TabFallback() {
  return /* @__PURE__ */ jsx("div", { className: "flex justify-center py-16", children: /* @__PURE__ */ jsx(Loader2, { className: "size-8 animate-spin text-muted-foreground" }) });
}
function ProfessionalFinancialPage() {
  const [tab, setTab] = useState("cobrancas");
  return /* @__PURE__ */ jsx(FinancialShell, { activeTab: tab, onTabChange: setTab, children: /* @__PURE__ */ jsxs(Suspense, { fallback: /* @__PURE__ */ jsx(TabFallback, {}), children: [
    tab === "cobrancas" && /* @__PURE__ */ jsx(FinancialCobrancasTab, {}),
    tab === "caixa" && /* @__PURE__ */ jsx(FinancialCaixaTab, {}),
    tab === "despesas" && /* @__PURE__ */ jsx(FinancialDespesasTab, {}),
    tab === "relatorios" && /* @__PURE__ */ jsx(ProfessionalFinancialReports, {})
  ] }) });
}
export {
  ProfessionalFinancialPage as component
};
