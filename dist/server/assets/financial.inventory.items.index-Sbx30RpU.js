import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ArrowDownToLine, Plus } from "lucide-react";
import { u as useAuth, o as Dialog, p as DialogContent, q as DialogHeader, r as DialogTitle, L as Label, I as Input, T as Textarea, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, s as DialogFooter, B as Button, D as DashboardShell, Y as Switch, C as Card, c as CardContent, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, X as fmt, m as Badge } from "./router-wbAJq94_.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { U as UNITS, s as stockStatus, S as STATUS_LABEL, a as STATUS_CLASS, b as StockMovementDialog } from "./stock-movement-dialog-DRyfY7_o.js";
import { toast } from "sonner";
import "@tanstack/react-query";
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
import "@supabase/supabase-js";
function InventoryItemDialog({ open, onOpenChange, onSaved }) {
  const { profile } = useAuth();
  const [cats, setCats] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("un");
  const [current, setCurrent] = useState("0");
  const [min, setMin] = useState("0");
  const [cost, setCost] = useState("0");
  const [sell, setSell] = useState("0");
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setBrand("");
    setCategory("");
    setUnit("un");
    setCurrent("0");
    setMin("0");
    setCost("0");
    setSell("0");
    setSku("");
    (async () => {
      const { data } = await supabase.from("inventory_categories").select("id,name").order("name");
      setCats(data ?? []);
    })();
  }, [open]);
  const save = async () => {
    if (!profile || !name) {
      toast.error("Nome obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("inventory_items").insert({
      tenant_id: profile.tenant_id,
      name,
      description: description || null,
      brand: brand || null,
      category_id: category || null,
      unit,
      current_stock: Number(current),
      min_stock: Number(min),
      cost_price: Number(cost),
      sell_price: Number(sell),
      sku: sku || null
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar item");
      return;
    }
    toast.success("Item criado");
    onOpenChange(false);
    onSaved?.();
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-xl", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Novo Item" }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Nome" }),
        /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Descrição" }),
        /* @__PURE__ */ jsx(Textarea, { rows: 2, value: description, onChange: (e) => setDescription(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Marca" }),
        /* @__PURE__ */ jsx(Input, { value: brand, onChange: (e) => setBrand(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Código interno" }),
        /* @__PURE__ */ jsx(Input, { value: sku, onChange: (e) => setSku(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Categoria" }),
        /* @__PURE__ */ jsxs(Select, { value: category, onValueChange: setCategory, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "—" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: cats.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Unidade" }),
        /* @__PURE__ */ jsxs(Select, { value: unit, onValueChange: setUnit, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: UNITS.map((u) => /* @__PURE__ */ jsx(SelectItem, { value: u, children: u }, u)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Estoque atual" }),
        /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: current, onChange: (e) => setCurrent(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Estoque mínimo" }),
        /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: min, onChange: (e) => setMin(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Preço de custo (R$)" }),
        /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: cost, onChange: (e) => setCost(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Preço de venda (R$)" }),
        /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", value: sell, onChange: (e) => setSell(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
      /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, children: "Salvar" })
    ] })
  ] }) });
}
function Page() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [stat, setStat] = useState("all");
  const [onlyActive, setOnlyActive] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const load = async () => {
    const {
      data
    } = await supabase.from("inventory_items").select("id,name,sku,unit,current_stock,min_stock,cost_price,sell_price,active,category_id,inventory_categories(name,color)").order("name");
    setItems(data ?? []);
    const {
      data: c
    } = await supabase.from("inventory_categories").select("id,name").order("name");
    setCats(c ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(() => items.filter((i) => {
    if (onlyActive && !i.active) return false;
    if (cat !== "all" && i.category_id !== cat) return false;
    const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
    if (stat !== "all" && st !== stat) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!i.name.toLowerCase().includes(s) && !(i.sku ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  }), [items, q, cat, stat, onlyActive]);
  const exportCsv = () => {
    const head = "Nome,Código interno,Unidade,Estoque,Minimo,Custo,Venda\n";
    const body = filtered.map((i) => [i.name, i.sku ?? "", i.unit, i.current_stock, i.min_stock, i.cost_price, i.sell_price].join(",")).join("\n");
    const blob = new Blob([head + body], {
      type: "text/csv"
    });
    window.open(URL.createObjectURL(blob), "_blank");
  };
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Itens de Estoque", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-2 justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
          /* @__PURE__ */ jsx(Input, { placeholder: "Buscar nome ou código interno", value: q, onChange: (e) => setQ(e.target.value), className: "w-56" }),
          /* @__PURE__ */ jsxs(Select, { value: cat, onValueChange: setCat, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas categorias" }),
              cats.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.id, children: c.name }, c.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Select, { value: stat, onValueChange: setStat, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos status" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "healthy", children: "Saudável" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "low", children: "Estoque Baixo" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "zero", children: "Zerado" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Switch, { checked: onlyActive, onCheckedChange: setOnlyActive, id: "act" }),
            /* @__PURE__ */ jsx(Label, { htmlFor: "act", children: "Somente ativos" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: exportCsv, children: [
            /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 mr-2" }),
            "Planilha"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setMoveOpen(true), children: [
            /* @__PURE__ */ jsx(ArrowDownToLine, { className: "h-4 w-4 mr-2" }),
            "Entrada de Estoque"
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: () => setNewOpen(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }),
            "Novo Item"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Nome" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Código interno" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Un." }),
          /* @__PURE__ */ jsx(TableHead, { children: "Atual" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Mín." }),
          /* @__PURE__ */ jsx(TableHead, { children: "Custo" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Venda" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 9, className: "text-center text-muted-foreground py-10", children: "Nenhum item" }) }) : filtered.map((i) => {
          const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
          return /* @__PURE__ */ jsxs(TableRow, { className: "cursor-pointer", children: [
            /* @__PURE__ */ jsx(TableCell, { children: i.inventory_categories && /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-0.5 rounded-full text-white", style: {
              background: i.inventory_categories.color
            }, children: i.inventory_categories.name }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Link, { to: "/financial/inventory/items/$id", params: {
              id: i.id
            }, className: "font-medium hover:underline", children: i.name }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-muted-foreground", children: i.sku ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: i.unit }),
            /* @__PURE__ */ jsx(TableCell, { children: Number(i.current_stock) }),
            /* @__PURE__ */ jsx(TableCell, { children: Number(i.min_stock) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(Number(i.cost_price)) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(Number(i.sell_price)) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", className: STATUS_CLASS[st], children: STATUS_LABEL[st] }) })
          ] }, i.id);
        }) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(InventoryItemDialog, { open: newOpen, onOpenChange: setNewOpen, onSaved: load }),
    /* @__PURE__ */ jsx(StockMovementDialog, { open: moveOpen, onOpenChange: setMoveOpen, fixedType: "in", onSaved: load })
  ] });
}
export {
  Page as component
};
