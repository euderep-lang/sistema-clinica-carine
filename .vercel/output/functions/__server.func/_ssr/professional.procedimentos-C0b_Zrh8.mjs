import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { D as DashboardShell, u as useAuth, B as Button, C as Card, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, I as Input, T as Textarea, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, _ as Switch, y as DialogFooter } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { d as fmt, s as supabase, p as parseBRLInput } from "./index.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, a8 as Pencil, a1 as Trash2, X } from "../_libs/lucide-react.mjs";
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
function SectionMeusProcedimentos() {
  const { profile } = useAuth();
  const [items, setItems] = reactExports.useState([]);
  const [inventoryOptions, setInventoryOptions] = reactExports.useState([]);
  const [open, setOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [name, setName] = reactExports.useState("");
  const [desc, setDesc] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("");
  const [price, setPrice] = reactExports.useState("");
  const [dur, setDur] = reactExports.useState("30");
  const [sessions, setSessions] = reactExports.useState("1");
  const [active, setActive] = reactExports.useState(true);
  const [inventoryLinks, setInventoryLinks] = reactExports.useState([]);
  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from("services").select(
      "id,name,description,category,default_price,duration_minutes,session_count,active"
    ).eq("professional_id", profile.id).order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []).map((p) => ({ ...p, session_count: Number(p.session_count ?? 1) })));
  };
  const loadInventory = async () => {
    const { data } = await supabase.from("inventory_items").select("id,name,unit").eq("active", true).order("name");
    setInventoryOptions(data ?? []);
  };
  reactExports.useEffect(() => {
    load();
    loadInventory();
  }, [profile]);
  const loadInventoryLinks = async (serviceId) => {
    const { data } = await supabase.from("service_inventory_items").select("inventory_item_id,quantity").eq("service_id", serviceId);
    setInventoryLinks(
      (data ?? []).map((row) => ({
        inventory_item_id: row.inventory_item_id,
        quantity: String(row.quantity)
      }))
    );
  };
  const openNew = () => {
    setEditing(null);
    setName("");
    setDesc("");
    setCat("");
    setPrice("");
    setDur("30");
    setSessions("1");
    setActive(true);
    setInventoryLinks([]);
    setOpen(true);
  };
  const openEdit = async (item) => {
    setEditing(item);
    setName(item.name);
    setDesc(item.description ?? "");
    setCat(item.category ?? "");
    setPrice(String(item.default_price));
    setDur(String(item.duration_minutes ?? 30));
    setSessions(String(item.session_count));
    setActive(item.active);
    await loadInventoryLinks(item.id);
    setOpen(true);
  };
  const addInventoryRow = () => {
    setInventoryLinks((prev) => [...prev, { inventory_item_id: "", quantity: "1" }]);
  };
  const saveInventoryLinks = async (serviceId) => {
    await supabase.from("service_inventory_items").delete().eq("service_id", serviceId);
    const valid = inventoryLinks.filter(
      (l) => l.inventory_item_id && Number(l.quantity) > 0
    );
    if (valid.length === 0) return;
    const { error } = await supabase.from("service_inventory_items").insert(
      valid.map((l) => ({
        service_id: serviceId,
        inventory_item_id: l.inventory_item_id,
        quantity: Number(l.quantity)
      }))
    );
    if (error) throw new Error(error.message);
  };
  const save = async () => {
    if (!name || !profile) return;
    const payload = {
      name,
      description: desc || null,
      category: cat || null,
      default_price: parseBRLInput(price) || 0,
      duration_minutes: Number(dur) || 30,
      session_count: Math.max(1, Number(sessions) || 1),
      active
    };
    try {
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
        await saveInventoryLinks(editing.id);
      } else {
        const { data, error } = await supabase.from("services").insert({
          ...payload,
          tenant_id: profile.tenant_id,
          professional_id: profile.id
        }).select("id").single();
        if (error) throw new Error(error.message);
        if (data) await saveInventoryLinks(data.id);
      }
      toast.success("Procedimento salvo");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const remove = async (item) => {
    const { error } = await supabase.from("services").update({ active: false }).eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Procedimento desativado");
      load();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Cadastre procedimentos com preço, pacotes de sessões e insumos de estoque consumidos a cada uso. Ao finalizar a consulta, cobrança, estoque e sessões são atualizados automaticamente." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openNew, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
        "Novo procedimento"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Preço" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Sessões" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Duração" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Nenhum procedimento cadastrado ainda." }) }) : items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: item.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm text-muted-foreground", children: item.category ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(item.default_price) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.session_count > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", children: [
          item.session_count,
          " sessões"
        ] }) : "Avulso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          item.duration_minutes ?? 30,
          " min"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: item.active ? "default" : "secondary", children: item.active ? "Ativo" : "Inativo" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { className: "text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => void openEdit(item), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-4" }) }),
          item.active && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => remove(item), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4" }) })
        ] })
      ] }, item.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editing ? "Editar procedimento" : "Novo procedimento" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[70vh] space-y-3 overflow-y-auto pr-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: "Ex.: Tirzepatida — 8 doses"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Descrição" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: desc, onChange: (e) => setDesc(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Categoria" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: cat, onChange: (e) => setCat(e.target.value), placeholder: "Ex.: Nutrologia" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Duração (min)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", value: dur, onChange: (e) => setDur(e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Preço padrão" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: price, onChange: (e) => setPrice(e.target.value), placeholder: "R$ 0,00" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Sessões por venda" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                min: 1,
                value: sessions,
                onChange: (e) => setSessions(e.target.value),
                placeholder: "1 = avulso, 10 = pacote"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-lg border p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Insumos de estoque (por uso)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: addInventoryRow, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-3" }),
              "Insumo"
            ] })
          ] }),
          inventoryLinks.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhum insumo vinculado. O estoque não será baixado automaticamente." }) : inventoryLinks.map((link, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: link.inventory_item_id,
                onValueChange: (v) => setInventoryLinks(
                  (prev) => prev.map(
                    (row, i) => i === idx ? { ...row, inventory_item_id: v } : row
                  )
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Item do estoque" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: inventoryOptions.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: opt.id, children: [
                    opt.name,
                    " (",
                    opt.unit,
                    ")"
                  ] }, opt.id)) })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "number",
                min: 0.01,
                step: 0.01,
                value: link.quantity,
                onChange: (e) => setInventoryLinks(
                  (prev) => prev.map(
                    (row, i) => i === idx ? { ...row, quantity: e.target.value } : row
                  )
                ),
                className: "w-20"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                size: "icon",
                variant: "ghost",
                onClick: () => setInventoryLinks((prev) => prev.filter((_, i) => i !== idx)),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
              }
            )
          ] }, idx))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: active, onCheckedChange: setActive }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Ativo" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void save(), children: "Salvar" })
      ] })
    ] }) })
  ] });
}
function ProfessionalProcedimentosPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Procedimentos", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Meus procedimentos", description: "Cadastre serviços e procedimentos com preço, pacotes de sessões e insumos de estoque." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionMeusProcedimentos, {})
  ] }) });
}
export {
  ProfessionalProcedimentosPage as component
};
