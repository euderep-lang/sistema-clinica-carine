import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { W as fmtDateTimeLocalInput, s as supabase } from "./index.mjs";
import { u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, E as cn, I as Input, T as Textarea, y as DialogFooter, B as Button } from "./router-DcWaovdP.mjs";
import { t as toast } from "../_libs/sonner.mjs";
const UNITS = ["un", "cx", "rl", "L", "mL", "kg", "g", "mg", "UI", "tb", "fr", "amp", "cps"];
const MOVEMENT_LABEL = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
  waste: "Descarte"
};
const MOVEMENT_CLASS = {
  in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  out: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  adjustment: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  waste: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
};
const REASONS = {
  in: ["Compra", "Doação", "Devolução de paciente", "Ajuste de inventário"],
  out: ["Uso em procedimento", "Venda direta", "Descarte por vencimento", "Perda/Quebra", "Ajuste"],
  adjustment: ["Contagem física", "Correção de erro", "Outro"],
  waste: ["Vencimento", "Contaminação", "Quebra", "Outro"]
};
function stockStatus(current, min) {
  if (current <= 0) return "zero";
  if (current <= min) return "low";
  return "healthy";
}
const STATUS_LABEL = { healthy: "Saudável", low: "Baixo", zero: "Zerado" };
const STATUS_CLASS = {
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  zero: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
};
function fmtDT(d) {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function applyMovement(current, type, quantity) {
  if (type === "in") return current + quantity;
  if (type === "out" || type === "waste") return current - quantity;
  return quantity;
}
const TYPE_BTN = {
  in: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  out: "data-[active=true]:bg-red-600 data-[active=true]:text-white",
  adjustment: "data-[active=true]:bg-blue-600 data-[active=true]:text-white",
  waste: "data-[active=true]:bg-orange-600 data-[active=true]:text-white"
};
function StockMovementDialog({
  open,
  onOpenChange,
  itemId,
  fixedType,
  fixedReason,
  title,
  hidePatient,
  onSaved
}) {
  const { profile } = useAuth();
  const [items, setItems] = reactExports.useState([]);
  const [patients, setPatients] = reactExports.useState([]);
  const [selItem, setSelItem] = reactExports.useState(itemId ?? "");
  const [type, setType] = reactExports.useState(fixedType ?? "in");
  const [quantity, setQuantity] = reactExports.useState("");
  const [date, setDate] = reactExports.useState(fmtDateTimeLocalInput());
  const [reason, setReason] = reactExports.useState(fixedReason ?? "");
  const [unitCost, setUnitCost] = reactExports.useState("");
  const [patient, setPatient] = reactExports.useState("");
  const [notes, setNotes] = reactExports.useState("");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) return;
    setSelItem(itemId ?? "");
    setType(fixedType ?? "in");
    setReason(fixedReason ?? "");
    setQuantity("");
    setUnitCost("");
    setPatient("");
    setNotes("");
    setDate(fmtDateTimeLocalInput());
    (async () => {
      const { data: it } = await supabase.from("inventory_items").select("id,name,unit,current_stock,min_stock").eq("active", true).order("name");
      setItems(it ?? []);
      const { data: pt } = await supabase.from("patients").select("id,full_name").order("full_name").limit(200);
      setPatients(pt ?? []);
    })();
  }, [open, itemId, fixedType, fixedReason]);
  const current = reactExports.useMemo(() => items.find((i) => i.id === selItem), [items, selItem]);
  const qNum = Number(quantity) || 0;
  const after = current ? applyMovement(Number(current.current_stock), type, qNum) : 0;
  const reasonOptions = REASONS[type];
  reactExports.useEffect(() => {
    if (fixedReason) setReason(fixedReason);
    else setReason("");
  }, [type, fixedReason]);
  const save = async () => {
    if (!current || !profile) {
      toast.error("Selecione um item");
      return;
    }
    if (qNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    setSaving(true);
    const { error: mErr } = await supabase.from("inventory_movements").insert({
      tenant_id: profile.tenant_id,
      item_id: current.id,
      type,
      quantity: qNum,
      unit_cost: type === "in" && unitCost ? Number(unitCost) : null,
      reason: reason || null,
      notes: notes || null,
      patient_id: patient || null,
      professional_id: profile.role === "professional" ? profile.id : null,
      created_by: profile.id,
      date: new Date(date).toISOString()
    });
    if (mErr) {
      setSaving(false);
      toast.error("Erro ao salvar");
      return;
    }
    const { error: uErr } = await supabase.from("inventory_items").update({ current_stock: after }).eq("id", current.id);
    setSaving(false);
    if (uErr) {
      toast.error("Movimento salvo, mas erro ao atualizar estoque");
      return;
    }
    toast.success("Movimento registrado");
    if (after <= Number(current.min_stock)) toast.warning("Atenção: estoque abaixo do mínimo");
    onOpenChange(false);
    onSaved?.();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: title ?? "Movimentação de Estoque" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Item" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: selItem, onValueChange: setSelItem, disabled: !!itemId, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione um item" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: items.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: i.id, children: i.name }, i.id)) })
        ] }),
        current && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
          "Estoque atual: ",
          Number(current.current_stock),
          " ",
          current.unit
        ] })
      ] }),
      !fixedType && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-1 mt-1", children: Object.keys(MOVEMENT_LABEL).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-active": type === t,
            onClick: () => setType(t),
            className: cn("rounded-md border px-2 py-1.5 text-sm", TYPE_BTN[t]),
            children: MOVEMENT_LABEL[t]
          },
          t
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: type === "adjustment" ? "Novo estoque total" : "Quantidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.01", value: quantity, onChange: (e) => setQuantity(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "datetime-local", value: date, onChange: (e) => setDate(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Motivo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: reason, onValueChange: setReason, disabled: !!fixedReason, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: reasonOptions.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: r, children: r }, r)) })
        ] })
      ] }),
      type === "in" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Preço unitário (R$)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: "0", step: "0.01", value: unitCost, onChange: (e) => setUnitCost(e.target.value) })
      ] }),
      !hidePatient && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Paciente (opcional)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: patient || "none", onValueChange: (v) => setPatient(v === "none" ? "" : v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "— Nenhum —" }),
            patients.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: p.id, children: p.full_name }, p.id))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { rows: 2, value: notes, onChange: (e) => setNotes(e.target.value) })
      ] }),
      current && qNum > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm bg-muted px-3 py-2 rounded-md", children: [
        "Após este registro: estoque passará de ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: Number(current.current_stock) }),
        " para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: after }),
        " ",
        current.unit,
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving, children: "Salvar" })
    ] })
  ] }) });
}
export {
  MOVEMENT_LABEL as M,
  STATUS_LABEL as S,
  UNITS as U,
  STATUS_CLASS as a,
  StockMovementDialog as b,
  MOVEMENT_CLASS as c,
  fmtDT as f,
  stockStatus as s
};
