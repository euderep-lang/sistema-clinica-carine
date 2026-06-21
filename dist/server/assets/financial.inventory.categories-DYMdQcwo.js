import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { u as useAuth, D as DashboardShell, B as Button, C as Card, f as CardContent, aG as TooltipProvider, aH as Tooltip, aI as TooltipTrigger, aJ as TooltipContent, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, I as Input, y as DialogFooter } from "./router-DKQJQoSP.js";
import { s as supabase } from "../server.js";
import { toast } from "sonner";
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
function Page() {
  const {
    profile
  } = useAuth();
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const load = async () => {
    const {
      data
    } = await supabase.from("inventory_categories").select("id,name,color,inventory_items(count)").order("name");
    setCats((data ?? []).map((c) => ({
      ...c,
      count: c.inventory_items?.[0]?.count ?? 0
    })));
  };
  useEffect(() => {
    load();
  }, []);
  const openNew = () => {
    setEditing(null);
    setName("");
    setColor("#6b7280");
    setOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setName(c.name);
    setColor(c.color);
    setOpen(true);
  };
  const save = async () => {
    if (!name || !profile) return;
    const payload = {
      name,
      color
    };
    const {
      error
    } = editing ? await supabase.from("inventory_categories").update(payload).eq("id", editing.id) : await supabase.from("inventory_categories").insert({
      ...payload,
      tenant_id: profile.tenant_id
    });
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Salvo");
      setOpen(false);
      load();
    }
  };
  const remove = async (c) => {
    if (c.count > 0) return;
    const {
      error
    } = await supabase.from("inventory_categories").delete().eq("id", c.id);
    if (error) toast.error("Erro");
    else {
      toast.success("Removida");
      load();
    }
  };
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Categorias de Estoque", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(Button, { onClick: openNew, children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }),
        "Nova Categoria"
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-3 md:grid-cols-3", children: cats.map((c) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-lg shrink-0", style: {
          background: c.color
        } }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium truncate", children: c.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            c.count,
            " ",
            c.count === 1 ? "item" : "itens"
          ] })
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(c), children: /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", disabled: c.count > 0, onClick: () => remove(c), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) }) }) }),
          c.count > 0 && /* @__PURE__ */ jsx(TooltipContent, { children: "Remova os itens primeiro" })
        ] }) })
      ] }) }, c.id)) })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-sm", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: editing ? "Editar Categoria" : "Nova Categoria" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Nome" }),
          /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Cor" }),
          /* @__PURE__ */ jsx(Input, { type: "color", value: color, onChange: (e) => setColor(e.target.value), className: "h-10 w-full" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { onClick: save, children: "Salvar" })
      ] })
    ] }) })
  ] });
}
export {
  Page as component
};
