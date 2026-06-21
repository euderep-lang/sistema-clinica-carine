import { jsxs, jsx } from "react/jsx-runtime";
import { u as useAuth, B as Button, C as Card, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, I as Input, T as Textarea, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, _ as Switch, y as DialogFooter, D as DashboardShell } from "./router-C3L3OxIm.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { d as fmt, s as supabase, p as parseBRLInput } from "../server.js";
import "@tanstack/react-query";
import "@tanstack/react-router";
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
function SectionMeusProcedimentos() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [inventoryOptions, setInventoryOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [dur, setDur] = useState("30");
  const [sessions, setSessions] = useState("1");
  const [active, setActive] = useState(true);
  const [inventoryLinks, setInventoryLinks] = useState([]);
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
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Cadastre procedimentos com preço, pacotes de sessões e insumos de estoque consumidos a cada uso. Ao finalizar a consulta, cobrança, estoque e sessões são atualizados automaticamente." }),
      /* @__PURE__ */ jsxs(Button, { onClick: openNew, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Novo procedimento"
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Nome" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Preço" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Sessões" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Duração" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsx(TableHead, {})
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: items.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Nenhum procedimento cadastrado ainda." }) }) : items.map((item) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: item.name }),
        /* @__PURE__ */ jsx(TableCell, { className: "text-sm text-muted-foreground", children: item.category ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { children: fmt(item.default_price) }),
        /* @__PURE__ */ jsx(TableCell, { children: item.session_count > 1 ? /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
          item.session_count,
          " sessões"
        ] }) : "Avulso" }),
        /* @__PURE__ */ jsxs(TableCell, { children: [
          item.duration_minutes ?? 30,
          " min"
        ] }),
        /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: item.active ? "default" : "secondary", children: item.active ? "Ativo" : "Inativo" }) }),
        /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
          /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => void openEdit(item), children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" }) }),
          item.active && /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => remove(item), children: /* @__PURE__ */ jsx(Trash2, { className: "size-4" }) })
        ] })
      ] }, item.id)) })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Editar procedimento" : "Novo procedimento" }) }),
      /* @__PURE__ */ jsxs("div", { className: "max-h-[70vh] space-y-3 overflow-y-auto pr-1", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Nome *" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: "Ex.: Tirzepatida — 8 doses"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Descrição" }),
          /* @__PURE__ */ jsx(Textarea, { value: desc, onChange: (e) => setDesc(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Categoria" }),
            /* @__PURE__ */ jsx(Input, { value: cat, onChange: (e) => setCat(e.target.value), placeholder: "Ex.: Nutrologia" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Duração (min)" }),
            /* @__PURE__ */ jsx(Input, { type: "number", value: dur, onChange: (e) => setDur(e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Preço padrão" }),
            /* @__PURE__ */ jsx(Input, { value: price, onChange: (e) => setPrice(e.target.value), placeholder: "R$ 0,00" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Sessões por venda" }),
            /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-lg border p-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx(Label, { children: "Insumos de estoque (por uso)" }),
            /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: addInventoryRow, children: [
              /* @__PURE__ */ jsx(Plus, { className: "mr-1 size-3" }),
              "Insumo"
            ] })
          ] }),
          inventoryLinks.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhum insumo vinculado. O estoque não será baixado automaticamente." }) : inventoryLinks.map((link, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxs(
              Select,
              {
                value: link.inventory_item_id,
                onValueChange: (v) => setInventoryLinks(
                  (prev) => prev.map(
                    (row, i) => i === idx ? { ...row, inventory_item_id: v } : row
                  )
                ),
                children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Item do estoque" }) }),
                  /* @__PURE__ */ jsx(SelectContent, { children: inventoryOptions.map((opt) => /* @__PURE__ */ jsxs(SelectItem, { value: opt.id, children: [
                    opt.name,
                    " (",
                    opt.unit,
                    ")"
                  ] }, opt.id)) })
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(
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
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                size: "icon",
                variant: "ghost",
                onClick: () => setInventoryLinks((prev) => prev.filter((_, i) => i !== idx)),
                children: /* @__PURE__ */ jsx(X, { className: "size-4" })
              }
            )
          ] }, idx))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Switch, { checked: active, onCheckedChange: setActive }),
          /* @__PURE__ */ jsx(Label, { children: "Ativo" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { onClick: () => void save(), children: "Salvar" })
      ] })
    ] }) })
  ] });
}
function ProfessionalProcedimentosPage() {
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Procedimentos", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Meus procedimentos", description: "Cadastre serviços e procedimentos com preço, pacotes de sessões e insumos de estoque." }),
    /* @__PURE__ */ jsx(SectionMeusProcedimentos, {})
  ] }) });
}
export {
  ProfessionalProcedimentosPage as component
};
