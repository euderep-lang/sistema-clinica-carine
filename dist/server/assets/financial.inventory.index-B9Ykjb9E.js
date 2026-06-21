import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Package, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import { D as DashboardShell, B as Button, C as Card, f as CardContent, b as CardHeader, e as CardTitle, q as Badge } from "./router-DKQJQoSP.js";
import { d as fmt, s as supabase } from "../server.js";
import { b as StockMovementDialog } from "./stock-movement-dialog-BvlQdpnJ.js";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
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
import "node:crypto";
import "@supabase/supabase-js";
function Page() {
  const [items, setItems] = useState([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState();
  const load = async () => {
    const {
      data
    } = await supabase.from("inventory_items").select("id,name,current_stock,min_stock,cost_price,unit,active,category_id,inventory_categories(name,color)").eq("active", true);
    setItems(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  const total = items.length;
  const low = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock) && Number(i.current_stock) > 0).length;
  const zero = items.filter((i) => Number(i.current_stock) <= 0).length;
  const totalValue = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_price), 0);
  const alerts = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).sort((a, b) => Number(a.current_stock) - Number(b.current_stock));
  const byCategory = Object.values(items.reduce((acc, i) => {
    const k = i.inventory_categories?.name ?? "Sem categoria";
    const c = i.inventory_categories?.color ?? "#9ca3af";
    acc[k] = acc[k] ?? {
      name: k,
      color: c,
      value: 0
    };
    acc[k].value += Number(i.current_stock) * Number(i.cost_price);
    return acc;
  }, {})).filter((d) => d.value > 0);
  const openMove = (id) => {
    setMoveItem(id);
    setMoveOpen(true);
  };
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Estoque", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/financial/inventory/categories", children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Categorias" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/financial/inventory/items", children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Gerenciar Itens" }) }),
        /* @__PURE__ */ jsx(Button, { onClick: () => openMove(void 0), children: "Nova Movimentação" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-muted grid place-items-center", children: /* @__PURE__ */ jsx(Package, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Total de Itens" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: total })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 grid place-items-center", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-amber-600" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Estoque Baixo" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-amber-600", children: low })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 grid place-items-center", children: /* @__PURE__ */ jsx(XCircle, { className: "h-5 w-5 text-red-600" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Itens Zerados" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-red-600", children: zero })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 grid place-items-center", children: /* @__PURE__ */ jsx(DollarSign, { className: "h-5 w-5 text-blue-600" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Valor em Estoque" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-blue-600", children: fmt(totalValue) })
          ] })
        ] }) })
      ] }),
      alerts.length > 0 && /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-amber-600" }),
          "Alertas de Estoque"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-2", children: alerts.map((a) => {
          const isZero = Number(a.current_stock) <= 0;
          return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3 border rounded-md p-3", children: [
            a.inventory_categories && /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full text-white", style: {
              background: a.inventory_categories.color
            }, children: a.inventory_categories.name }),
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: a.name }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: isZero ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600", children: isZero ? "ZERADO" : "BAIXO" }),
            /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
              "Atual: ",
              Number(a.current_stock),
              " ",
              a.unit,
              " · Mínimo: ",
              Number(a.min_stock),
              " ",
              a.unit
            ] }),
            /* @__PURE__ */ jsx(Button, { size: "sm", className: "ml-auto", onClick: () => openMove(a.id), children: "Repor Estoque" })
          ] }, a.id);
        }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Valor em Estoque por Categoria" }) }),
        /* @__PURE__ */ jsx(CardContent, { style: {
          height: 280
        }, children: byCategory.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Sem dados" }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(PieChart, { children: [
          /* @__PURE__ */ jsx(Pie, { data: byCategory, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 100, label: true, children: byCategory.map((d, i) => /* @__PURE__ */ jsx(Cell, { fill: d.color }, i)) }),
          /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmt(v) }),
          /* @__PURE__ */ jsx(Legend, {})
        ] }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(StockMovementDialog, { open: moveOpen, onOpenChange: setMoveOpen, itemId: moveItem, onSaved: load })
  ] });
}
export {
  Page as component
};
