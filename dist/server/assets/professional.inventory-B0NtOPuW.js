import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Package, AlertTriangle, ShoppingCart, Settings2 } from "lucide-react";
import { D as DashboardShell, C as Card, c as CardContent, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, B as Button, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, m as Badge } from "./router-CL5eFCiw.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { s as stockStatus, S as STATUS_LABEL, a as STATUS_CLASS, b as StockMovementDialog } from "./stock-movement-dialog-ZfRIdtTU.js";
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
function Page() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [selItem, setSelItem] = useState();
  const [mode, setMode] = useState(null);
  const load = async () => {
    const {
      data
    } = await supabase.from("inventory_items").select("id,name,unit,current_stock,min_stock,category_id,inventory_categories(name,color)").eq("active", true).order("name");
    setItems(data ?? []);
    const {
      data: c
    } = await supabase.from("inventory_categories").select("id,name").order("name");
    setCats(c ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  const openMovement = (movementMode, itemId) => {
    setMode(movementMode);
    setSelItem(itemId);
    setOpen(true);
  };
  const filtered = useMemo(() => items.filter((i) => {
    if (cat !== "all" && i.category_id !== cat) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, q, cat]);
  const lowCount = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length;
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Estoque", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-muted grid place-items-center", children: /* @__PURE__ */ jsx(Package, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Itens Disponíveis" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold", children: items.length })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 grid place-items-center", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-amber-600" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Estoque Baixo" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-amber-600", children: lowCount })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
        /* @__PURE__ */ jsx(Input, { placeholder: "Buscar item", value: q, onChange: (e) => setQ(e.target.value), className: "w-56" }),
        /* @__PURE__ */ jsxs(Select, { value: cat, onValueChange: setCat, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas categorias" }),
            cats.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { onClick: () => openMovement("purchase"), children: [
          /* @__PURE__ */ jsx(ShoppingCart, { className: "mr-2 size-4" }),
          "Nova compra"
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/financial/inventory/items", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", children: [
          /* @__PURE__ */ jsx(Settings2, { className: "mr-2 size-4" }),
          "Gerenciar itens"
        ] }) }),
        /* @__PURE__ */ jsx(Link, { to: "/financial/inventory/categories", children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Categorias" }) })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Nome" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Unidade" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Disponível" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-10", children: "Nenhum item" }) }) : filtered.map((i) => {
          const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: i.inventory_categories && /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full text-white", style: {
              background: i.inventory_categories.color
            }, children: i.inventory_categories.name }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: i.name }),
            /* @__PURE__ */ jsx(TableCell, { children: i.unit }),
            /* @__PURE__ */ jsx(TableCell, { children: Number(i.current_stock) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", className: STATUS_CLASS[st], children: STATUS_LABEL[st] }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-1", children: [
              /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => openMovement("purchase", i.id), children: "Registrar compra" }),
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => openMovement("consumption", i.id), children: "Registrar consumo" })
            ] }) })
          ] }, i.id);
        }) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(StockMovementDialog, { open, onOpenChange: setOpen, itemId: selItem, fixedType: mode === "purchase" ? "in" : mode === "consumption" ? "out" : void 0, fixedReason: mode === "purchase" ? "Compra" : mode === "consumption" ? "Uso em procedimento" : void 0, title: mode === "purchase" ? "Registrar compra" : mode === "consumption" ? "Registrar consumo" : void 0, hidePatient: mode === "purchase", onSaved: load })
  ] });
}
export {
  Page as component
};
