import { jsx, jsxs } from "react/jsx-runtime";
import { useRouterState, Link, Outlet } from "@tanstack/react-router";
import { w as cn, D as DashboardShell } from "./router-wbAJq94_.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { Wallet, Landmark, TrendingDown, BarChart3 } from "lucide-react";
const ITEMS = [
  { label: "Cobranças", to: "/professional/financial", icon: Wallet },
  { label: "Caixa", to: "/professional/financial/caixa", icon: Landmark },
  { label: "Despesas", to: "/professional/financial/despesas", icon: TrendingDown },
  { label: "Relatórios", to: "/professional/financial/relatorios", icon: BarChart3 }
];
function FinancialNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return /* @__PURE__ */ jsx("nav", { className: "flex flex-wrap gap-2 border-b pb-4", children: ITEMS.map((item) => {
    const active = item.to === "/professional/financial" ? pathname === "/professional/financial" || pathname === "/professional/financial/" : pathname.startsWith(item.to);
    return /* @__PURE__ */ jsxs(
      Link,
      {
        to: item.to,
        className: cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
          active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        ),
        children: [
          /* @__PURE__ */ jsx(item.icon, { className: "size-4" }),
          item.label
        ]
      },
      item.to
    );
  }) });
}
function FinancialShell({ children }) {
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Financeiro", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Meu financeiro",
        description: "Cobranças, caixa do dia, despesas e relatórios do seu consultório."
      }
    ),
    /* @__PURE__ */ jsx(FinancialNav, {}),
    children
  ] }) });
}
function FinancialLayout() {
  return /* @__PURE__ */ jsx(Outlet, {});
}
export {
  FinancialLayout as F,
  FinancialShell as a
};
