import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { D as DashboardShell, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, _ as Switch, L as Label, B as Button, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, T as Textarea, y as DialogFooter } from "./router-DcWaovdP.mjs";
import { d as fmt, s as supabase } from "./index.mjs";
import { s as stockStatus, S as STATUS_LABEL, a as STATUS_CLASS, b as StockMovementDialog, U as UNITS } from "./stock-movement-dialog-TR6yTlA7.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { D as Download, aP as ArrowDownToLine, P as Plus } from "../_libs/lucide-react.mjs";
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
function InventoryItemDialog({ open, onOpenChange, onSaved }) {
  const { profile } = useAuth();
  const [cats, setCats] = reactExports.useState([]);
  const [name, setName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [brand, setBrand] = reactExports.useState("");
  const [category, setCategory] = reactExports.useState("");
  const [unit, setUnit] = reactExports.useState("un");
  const [current, setCurrent] = reactExports.useState("0");
  const [min, setMin] = reactExports.useState("0");
  const [cost, setCost] = reactExports.useState("0");
  const [sell, setSell] = reactExports.useState("0");
  const [sku, setSku] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Novo Item" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Descrição" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { rows: 2, value: description, onChange: (e) => setDescription(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Marca" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: brand, onChange: (e) => setBrand(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Código interno" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: sku, onChange: (e) => setSku(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Categoria" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: category, onValueChange: setCategory, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Unidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: unit, onValueChange: setUnit, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: UNITS.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: u, children: u }, u)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Estoque atual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: current, onChange: (e) => setCurrent(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Estoque mínimo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: min, onChange: (e) => setMin(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Preço de custo (R$)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: cost, onChange: (e) => setCost(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Preço de venda (R$)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", value: sell, onChange: (e) => setSell(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving, children: "Salvar" })
    ] })
  ] }) });
}
function Page() {
  const [items, setItems] = reactExports.useState([]);
  const [cats, setCats] = reactExports.useState([]);
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("all");
  const [stat, setStat] = reactExports.useState("all");
  const [onlyActive, setOnlyActive] = reactExports.useState(true);
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const [moveOpen, setMoveOpen] = reactExports.useState(false);
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
  reactExports.useEffect(() => {
    load();
  }, []);
  const filtered = reactExports.useMemo(() => items.filter((i) => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Itens de Estoque", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-2 justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Buscar nome ou código interno", value: q, onChange: (e) => setQ(e.target.value), className: "w-56" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: cat, onValueChange: setCat, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-48", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas categorias" }),
              cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.id, children: c.name }, c.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: stat, onValueChange: setStat, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "healthy", children: "Saudável" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "low", children: "Estoque Baixo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "zero", children: "Zerado" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: onlyActive, onCheckedChange: setOnlyActive, id: "act" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "act", children: "Somente ativos" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: exportCsv, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4 mr-2" }),
            "Planilha"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => setMoveOpen(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownToLine, { className: "h-4 w-4 mr-2" }),
            "Entrada de Estoque"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setNewOpen(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
            "Novo Item"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Categoria" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Código interno" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Un." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Atual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Mín." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Custo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Venda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 9, className: "text-center text-muted-foreground py-10", children: "Nenhum item" }) }) : filtered.map((i) => {
          const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "cursor-pointer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: i.inventory_categories && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-full text-white", style: {
              background: i.inventory_categories.color
            }, children: i.inventory_categories.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/financial/inventory/items/$id", params: {
              id: i.id
            }, className: "font-medium hover:underline", children: i.name }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-muted-foreground", children: i.sku ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: i.unit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: Number(i.current_stock) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: Number(i.min_stock) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(Number(i.cost_price)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(Number(i.sell_price)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: STATUS_CLASS[st], children: STATUS_LABEL[st] }) })
          ] }, i.id);
        }) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(InventoryItemDialog, { open: newOpen, onOpenChange: setNewOpen, onSaved: load }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StockMovementDialog, { open: moveOpen, onOpenChange: setMoveOpen, fixedType: "in", onSaved: load })
  ] });
}
export {
  Page as component
};
