import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { ba as Route, D as DashboardShell, C as Card, c as CardContent, m as Badge, B as Button, L as Label, I as Input, T as Textarea, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, Y as Switch } from "./router-wbAJq94_.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BmrE13vK.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { toast } from "sonner";
import { s as stockStatus, S as STATUS_LABEL, a as STATUS_CLASS, U as UNITS, M as MOVEMENT_LABEL, f as fmtDT, c as MOVEMENT_CLASS, b as StockMovementDialog } from "./stock-movement-dialog-DRyfY7_o.js";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, ReferenceLine, Line } from "recharts";
import "@tanstack/react-query";
import "@tanstack/react-router";
import "lucide-react";
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
import "@radix-ui/react-tabs";
import "@supabase/supabase-js";
function Page() {
  const {
    id
  } = Route.useParams();
  const [item, setItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [cats, setCats] = useState([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveType, setMoveType] = useState("in");
  const [filterType, setFilterType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const load = async () => {
    const {
      data
    } = await supabase.from("inventory_items").select("id,name,description,brand,category_id,unit,current_stock,min_stock,max_stock,cost_price,sell_price,sku,active,inventory_categories(name,color)").eq("id", id).maybeSingle();
    setItem(data ?? null);
    const {
      data: m
    } = await supabase.from("inventory_movements").select("id,date,type,quantity,reason,notes,profiles:professional_id(full_name),patients(full_name)").eq("item_id", id).order("date", {
      ascending: false
    });
    setMovements(m ?? []);
    const {
      data: c
    } = await supabase.from("inventory_categories").select("id,name").order("name");
    setCats(c ?? []);
  };
  useEffect(() => {
    load();
  }, [id]);
  const filteredMov = useMemo(() => movements.filter((m) => {
    if (filterType !== "all" && m.type !== filterType) return false;
    if (from && m.date < from) return false;
    if (to && m.date > to + "T23:59:59") return false;
    return true;
  }), [movements, filterType, from, to]);
  const pageMov = filteredMov.slice(page * 20, page * 20 + 20);
  const openMov = (t) => {
    setMoveType(t);
    setMoveOpen(true);
  };
  const save = async () => {
    if (!item) return;
    const {
      error
    } = await supabase.from("inventory_items").update({
      name: item.name,
      description: item.description,
      brand: item.brand,
      category_id: item.category_id,
      unit: item.unit,
      min_stock: Number(item.min_stock),
      max_stock: item.max_stock != null ? Number(item.max_stock) : null,
      cost_price: Number(item.cost_price),
      sell_price: Number(item.sell_price),
      sku: item.sku,
      active: item.active
    }).eq("id", id);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Item atualizado");
  };
  const days = useMemo(() => {
    const out = [];
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      out.push({
        day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        ts: d.getTime(),
        in: 0,
        out: 0
      });
    }
    movements.forEach((m) => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      const slot = out.find((s) => s.ts === d.getTime());
      if (!slot) return;
      if (m.type === "in") slot.in += Number(m.quantity);
      else if (m.type === "out" || m.type === "waste") slot.out += Number(m.quantity);
    });
    return out;
  }, [movements]);
  const stockSeries = useMemo(() => {
    if (!item) return [];
    const sorted = [...movements].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const result = [];
    let stock = Number(item.current_stock);
    const dayMap = /* @__PURE__ */ new Map();
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap.set(d.getTime(), 0);
    }
    const movByDay = {};
    sorted.forEach((m) => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      const t = d.getTime();
      const q = Number(m.quantity);
      const eff = m.type === "in" ? q : m.type === "out" || m.type === "waste" ? -q : 0;
      movByDay[t] = (movByDay[t] ?? 0) + eff;
    });
    const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
    let s = stock;
    for (let i = sortedDays.length - 1; i >= 0; i--) s -= movByDay[sortedDays[i]] ?? 0;
    for (const t of sortedDays) {
      s += movByDay[t] ?? 0;
      const d = new Date(t);
      result.push({
        day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        ts: t,
        stock: s
      });
    }
    return result;
  }, [movements, item]);
  if (!item) return /* @__PURE__ */ jsx(DashboardShell, { title: "Item", children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Carregando…" }) });
  const st = stockStatus(Number(item.current_stock), Number(item.min_stock));
  return /* @__PURE__ */ jsxs(DashboardShell, { title: item.name, children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex flex-wrap items-center gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: item.name }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
            item.inventory_categories && /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full text-white", style: {
              background: item.inventory_categories.color
            }, children: item.inventory_categories.name }),
            item.sku && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
              "Código interno: ",
              item.sku
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "ml-auto flex items-center gap-4", children: /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-4xl font-bold", children: [
            Number(item.current_stock),
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-base text-muted-foreground", children: item.unit })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: STATUS_CLASS[st], children: STATUS_LABEL[st] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "w-full flex gap-2", children: [
          /* @__PURE__ */ jsx(Button, { onClick: () => openMov("in"), children: "Registrar Entrada" }),
          /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: () => openMov("out"), children: "Registrar Saída" }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => openMov("adjustment"), children: "Ajuste de Estoque" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "info", children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "info", children: "Informações" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "movements", children: "Movimentações" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "analytics", children: "Análise" })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "info", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Nome" }),
            /* @__PURE__ */ jsx(Input, { value: item.name, onChange: (e) => setItem({
              ...item,
              name: e.target.value
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Descrição" }),
            /* @__PURE__ */ jsx(Textarea, { value: item.description ?? "", onChange: (e) => setItem({
              ...item,
              description: e.target.value
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Marca" }),
            /* @__PURE__ */ jsx(Input, { value: item.brand ?? "", onChange: (e) => setItem({
              ...item,
              brand: e.target.value
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Código interno" }),
            /* @__PURE__ */ jsx(Input, { value: item.sku ?? "", onChange: (e) => setItem({
              ...item,
              sku: e.target.value
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Categoria" }),
            /* @__PURE__ */ jsxs(Select, { value: item.category_id ?? "", onValueChange: (v) => setItem({
              ...item,
              category_id: v
            }), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "—" }) }),
              /* @__PURE__ */ jsx(SelectContent, { children: cats.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Unidade" }),
            /* @__PURE__ */ jsxs(Select, { value: item.unit, onValueChange: (v) => setItem({
              ...item,
              unit: v
            }), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsx(SelectContent, { children: UNITS.map((u) => /* @__PURE__ */ jsx(SelectItem, { value: u, children: u }, u)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Estoque mínimo" }),
            /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: String(item.min_stock), onChange: (e) => setItem({
              ...item,
              min_stock: Number(e.target.value)
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Estoque máximo" }),
            /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: item.max_stock ?? "", onChange: (e) => setItem({
              ...item,
              max_stock: e.target.value ? Number(e.target.value) : null
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Preço de custo (R$)" }),
            /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: String(item.cost_price), onChange: (e) => setItem({
              ...item,
              cost_price: Number(e.target.value)
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Preço de venda (R$)" }),
            /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: String(item.sell_price), onChange: (e) => setItem({
              ...item,
              sell_price: Number(e.target.value)
            }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Switch, { checked: item.active, onCheckedChange: (v) => setItem({
              ...item,
              active: v
            }), id: "active" }),
            /* @__PURE__ */ jsx(Label, { htmlFor: "active", children: "Ativo" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2 flex justify-end", children: /* @__PURE__ */ jsx(Button, { onClick: save, children: "Salvar alterações" }) })
        ] }) }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "movements", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
            /* @__PURE__ */ jsxs(Select, { value: filterType, onValueChange: (v) => {
              setPage(0);
              setFilterType(v);
            }, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos tipos" }),
                Object.keys(MOVEMENT_LABEL).map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t, children: MOVEMENT_LABEL[t] }, t))
              ] })
            ] }),
            /* @__PURE__ */ jsx(Input, { type: "date", value: from, onChange: (e) => {
              setPage(0);
              setFrom(e.target.value);
            }, className: "w-40" }),
            /* @__PURE__ */ jsx(Input, { type: "date", value: to, onChange: (e) => {
              setPage(0);
              setTo(e.target.value);
            }, className: "w-40" })
          ] }),
          pageMov.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground py-4", children: "Nenhuma movimentação" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: pageMov.map((m) => {
            const sign = m.type === "in" ? "+" : m.type === "out" || m.type === "waste" ? "-" : "=";
            return /* @__PURE__ */ jsxs("div", { className: "border rounded-md p-3 flex flex-wrap gap-2 items-center", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground w-32", children: fmtDT(m.date) }),
              /* @__PURE__ */ jsx(Badge, { variant: "outline", className: MOVEMENT_CLASS[m.type], children: MOVEMENT_LABEL[m.type] }),
              /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
                sign,
                Number(m.quantity),
                " ",
                item.unit
              ] }),
              m.reason && /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: m.reason }),
              m.profiles?.full_name && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground ml-auto", children: [
                "por ",
                m.profiles.full_name
              ] }),
              m.patients?.full_name && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                "paciente: ",
                m.patients.full_name
              ] }),
              m.notes && /* @__PURE__ */ jsx("div", { className: "w-full text-xs text-muted-foreground pl-32", children: m.notes })
            ] }, m.id);
          }) }),
          filteredMov.length > 20 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage(page - 1), children: "Anterior" }),
            /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
              "Página ",
              page + 1
            ] }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: (page + 1) * 20 >= filteredMov.length, onClick: () => setPage(page + 1), children: "Próxima" })
          ] })
        ] }) }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "analytics", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-semibold mb-2", children: "Movimentações (últimos 30 dias)" }),
            /* @__PURE__ */ jsx("div", { style: {
              height: 240
            }, children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(BarChart, { data: days, children: [
              /* @__PURE__ */ jsx(XAxis, { dataKey: "day" }),
              /* @__PURE__ */ jsx(YAxis, {}),
              /* @__PURE__ */ jsx(Tooltip, {}),
              /* @__PURE__ */ jsx(Legend, {}),
              /* @__PURE__ */ jsx(Bar, { dataKey: "in", name: "Entradas", fill: "#10b981" }),
              /* @__PURE__ */ jsx(Bar, { dataKey: "out", name: "Saídas", fill: "#ef4444" })
            ] }) }) })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-semibold mb-2", children: "Nível de estoque" }),
            /* @__PURE__ */ jsx("div", { style: {
              height: 240
            }, children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxs(LineChart, { data: stockSeries, children: [
              /* @__PURE__ */ jsx(XAxis, { dataKey: "day" }),
              /* @__PURE__ */ jsx(YAxis, {}),
              /* @__PURE__ */ jsx(Tooltip, {}),
              /* @__PURE__ */ jsx(ReferenceLine, { y: Number(item.min_stock), stroke: "#ef4444", strokeDasharray: "4 4", label: "Mínimo" }),
              /* @__PURE__ */ jsx(Line, { type: "monotone", dataKey: "stock", stroke: "#3b82f6", dot: false })
            ] }) }) })
          ] }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(StockMovementDialog, { open: moveOpen, onOpenChange: setMoveOpen, itemId: id, fixedType: moveType, onSaved: load })
  ] });
}
export {
  Page as component
};
