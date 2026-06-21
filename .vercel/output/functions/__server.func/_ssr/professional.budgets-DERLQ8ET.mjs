import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { s as supabase, d as fmt, f as fmtDate, g as getTenantSetting, U as formatClinicAddress, t as todayISO, p as parseBRLInput, O as shiftDateISO } from "./index.mjs";
import { u as useAuth, D as DashboardShell, B as Button, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, a5 as BUDGET_STATUS_LABEL, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, a6 as BUDGET_STATUS_CLASS, a7 as loadLetterheadForPdf, a8 as generateBudgetPDF, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, g as Popover, h as PopoverTrigger, j as PopoverContent, $ as Command, a0 as CommandInput, a1 as CommandList, a2 as CommandEmpty, a3 as CommandGroup, a4 as CommandItem, T as Textarea, y as DialogFooter } from "./router-DcWaovdP.mjs";
import { m as maskCPF } from "./patient-utils-YNqCHR6o.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { S as StatCard } from "./stat-card-BAwtn22B.mjs";
import { P as PageSection } from "./page-section-B6uCwEd5.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, R as Receipt, a8 as Pencil, ae as FileDown, K as Send, q as CircleCheck, aa as ShoppingCart, E as LoaderCircle, a1 as Trash2 } from "../_libs/lucide-react.mjs";
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
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
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
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
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
const emptyItem = () => ({
  service_id: null,
  description: "",
  quantity: 1,
  unit_price: 0
});
const EDITABLE_STATUSES = ["draft", "sent", "approved", "rejected"];
function BudgetFormDialog({
  open,
  onOpenChange,
  budgetId,
  onSaved
}) {
  const { profile, tenant } = useAuth();
  const [loading, setLoading] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [patients, setPatients] = reactExports.useState([]);
  const [services, setServices] = reactExports.useState([]);
  const [patientId, setPatientId] = reactExports.useState("");
  const [patientOpen, setPatientOpen] = reactExports.useState(false);
  const [patientSearch, setPatientSearch] = reactExports.useState("");
  const [date, setDate] = reactExports.useState(todayISO());
  const [validUntil, setValidUntil] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("draft");
  const [discountPercent, setDiscountPercent] = reactExports.useState("0");
  const [notes, setNotes] = reactExports.useState("");
  const [items, setItems] = reactExports.useState([emptyItem()]);
  const [converted, setConverted] = reactExports.useState(false);
  const [budgetNumber, setBudgetNumber] = reactExports.useState(null);
  const resetForm = () => {
    setPatientId("");
    setDate(todayISO());
    setValidUntil(shiftDateISO(todayISO(), 15));
    setStatus("draft");
    setDiscountPercent("0");
    setNotes("");
    setItems([emptyItem()]);
    setConverted(false);
    setBudgetNumber(null);
  };
  reactExports.useEffect(() => {
    if (!open || !profile) return;
    (async () => {
      setLoading(true);
      const [{ data: pts }, { data: svcs }] = await Promise.all([
        supabase.from("patients").select("id, full_name, cpf").eq("tenant_id", profile.tenant_id).eq("active", true).order("full_name"),
        supabase.from("services").select("id, name, default_price, session_count").eq("tenant_id", profile.tenant_id).eq("active", true).or(`professional_id.eq.${profile.id},professional_id.is.null`).order("name")
      ]);
      setPatients(pts ?? []);
      setServices(svcs ?? []);
      if (budgetId) {
        const { data: budget, error } = await supabase.from("budgets").select("*").eq("id", budgetId).eq("professional_id", profile.id).maybeSingle();
        if (error || !budget) {
          toast.error("Orçamento não encontrado");
          onOpenChange(false);
          return;
        }
        const { data: bill } = await supabase.from("bills_receivable").select("id").eq("budget_id", budgetId).maybeSingle();
        setConverted(Boolean(bill));
        const { data: budgetItems } = await supabase.from("budget_items").select("*").eq("budget_id", budgetId).order("position");
        setPatientId(budget.patient_id ?? "");
        setBudgetNumber(budget.number);
        setDate(budget.date);
        setValidUntil(budget.valid_until ?? "");
        setStatus(budget.status);
        setDiscountPercent(String(budget.discount_percent ?? 0));
        setNotes(budget.notes ?? "");
        setItems(
          budgetItems?.length ? budgetItems.map((it) => ({
            service_id: it.service_id,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price)
          })) : [emptyItem()]
        );
      } else {
        resetForm();
      }
      setLoading(false);
    })();
  }, [open, budgetId, profile, onOpenChange]);
  const filteredPatients = reactExports.useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || (p.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    ).slice(0, 30);
  }, [patients, patientSearch]);
  const subtotal = reactExports.useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items]
  );
  const discountValue = reactExports.useMemo(() => {
    const pct = Number(discountPercent.replace(",", ".")) || 0;
    return Math.round(subtotal * (pct / 100) * 100) / 100;
  }, [subtotal, discountPercent]);
  const finalValue = Math.max(0, Math.round((subtotal - discountValue) * 100) / 100);
  const updateItem = (index, patch) => {
    setItems((arr) => arr.map((it, i) => i === index ? { ...it, ...patch } : it));
  };
  const pickService = (index, serviceId) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    updateItem(index, {
      service_id: svc.id,
      description: svc.name,
      unit_price: Number(svc.default_price)
    });
  };
  const save = async () => {
    if (!profile || !tenant) return;
    if (!patientId) {
      toast.error("Selecione o paciente");
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Adicione ao menos um procedimento");
      return;
    }
    if (converted) {
      toast.error("Orçamento já convertido em venda — não pode ser editado");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        patient_id: patientId,
        professional_id: profile.id,
        date,
        valid_until: validUntil || null,
        status,
        notes: notes.trim() || null,
        subtotal,
        discount_percent: Number(discountPercent.replace(",", ".")) || 0,
        discount_value: discountValue,
        final_value: finalValue
      };
      let id = budgetId;
      if (budgetId) {
        const { error } = await supabase.from("budgets").update(payload).eq("id", budgetId);
        if (error) throw error;
        await supabase.from("budget_items").delete().eq("budget_id", budgetId);
      } else {
        const { data, error } = await supabase.from("budgets").insert(payload).select("id").single();
        if (error || !data) throw error ?? new Error("Erro ao criar orçamento");
        id = data.id;
      }
      const rows = validItems.map((it, i) => ({
        budget_id: id,
        service_id: it.service_id,
        position: i + 1,
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: Math.round(it.quantity * it.unit_price * 100) / 100
      }));
      const { error: itemsErr } = await supabase.from("budget_items").insert(rows);
      if (itemsErr) throw itemsErr;
      toast.success(budgetId ? "Orçamento atualizado" : "Orçamento criado");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const patient = patients.find((p) => p.id === patientId);
  const readOnly = converted;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[90vh] max-w-3xl overflow-y-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: budgetId && budgetNumber ? `Orçamento #${budgetNumber}` : "Novo orçamento" }) }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-8 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      converted && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900", children: "Este orçamento já foi convertido em venda e não pode mais ser editado." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Paciente *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "outline",
                className: "w-full justify-start font-normal",
                disabled: readOnly,
                children: patient ? patient.full_name : "Selecionar paciente…"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { className: "w-80 p-0", align: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Command, { shouldFilter: false, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CommandInput,
                {
                  placeholder: "Buscar nome ou CPF…",
                  value: patientSearch,
                  onValueChange: setPatientSearch
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandList, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandEmpty, { children: "Nenhum paciente" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { children: filteredPatients.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CommandItem,
                  {
                    value: p.id,
                    onSelect: () => {
                      setPatientId(p.id);
                      setPatientOpen(false);
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: p.full_name }),
                      p.cpf && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: maskCPF(p.cpf) })
                    ] })
                  },
                  p.id
                )) })
              ] })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Situação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: status,
              onValueChange: (v) => setStatus(v),
              disabled: readOnly,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: EDITABLE_STATUSES.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: s, children: BUDGET_STATUS_LABEL[s] }, s)) })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "date",
              value: date,
              onChange: (e) => setDate(e.target.value),
              disabled: readOnly
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Válido até" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "date",
              value: validUntil,
              onChange: (e) => setValidUntil(e.target.value),
              disabled: readOnly
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Procedimentos" }),
        items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 rounded-lg border p-3 sm:grid-cols-12", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: it.service_id ?? "",
              onValueChange: (v) => pickService(i, v),
              disabled: readOnly,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Procedimento" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: services.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: s.id, children: [
                  s.name,
                  " — ",
                  fmt(s.default_price),
                  s.session_count > 1 ? ` (${s.session_count} sessões)` : ""
                ] }, s.id)) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              placeholder: "Descrição",
              value: it.description,
              onChange: (e) => updateItem(i, { description: e.target.value }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "number",
              min: 1,
              value: it.quantity,
              onChange: (e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              placeholder: "Preço unit.",
              value: it.unit_price ? fmt(it.unit_price) : "",
              onChange: (e) => updateItem(i, { unit_price: parseBRLInput(e.target.value) }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between sm:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: fmt(it.quantity * it.unit_price) }),
            !readOnly && items.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => setItems((a) => a.filter((_, j) => j !== i)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4" }) })
          ] })
        ] }, i)),
        !readOnly && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => setItems((a) => [...a, emptyItem()]), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-1 size-4" }),
          "Adicionar procedimento"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Desconto (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: discountPercent,
              onChange: (e) => setDiscountPercent(e.target.value),
              disabled: readOnly
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border bg-muted/40 p-3 sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Subtotal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmt(subtotal) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Desconto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "- ",
              fmt(discountValue)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex justify-between font-semibold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmt(finalValue) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Textarea,
          {
            rows: 2,
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            disabled: readOnly
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), children: "Cancelar" }),
      !readOnly && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => void save(), disabled: saving || loading, children: saving ? "Salvando…" : budgetId ? "Salvar alterações" : "Criar orçamento" })
    ] })
  ] }) });
}
function statusBadge(status) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: BUDGET_STATUS_CLASS[status] ?? "bg-gray-100 text-gray-700", children: BUDGET_STATUS_LABEL[status] ?? status });
}
function ProfessionalBudgetsPage() {
  const {
    profile,
    tenant
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = reactExports.useState([]);
  const [convertedIds, setConvertedIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const [status, setStatus] = reactExports.useState("all");
  const [search, setSearch] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [formOpen, setFormOpen] = reactExports.useState(false);
  const [editId, setEditId] = reactExports.useState(null);
  const [convertingId, setConvertingId] = reactExports.useState(null);
  const load = reactExports.useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from("budgets").select("id,number,date,valid_until,status,subtotal,discount_value,final_value,notes,patient_id,patients(full_name)").eq("professional_id", profile.id).order("date", {
      ascending: false
    });
    if (status !== "all") q = q.eq("status", status);
    const {
      data,
      error
    } = await q;
    if (error) toast.error(error.message);
    const list = data ?? [];
    setRows(list);
    const ids = list.map((r) => r.id);
    if (ids.length) {
      const {
        data: bills
      } = await supabase.from("bills_receivable").select("id, budget_id").in("budget_id", ids);
      const converted = /* @__PURE__ */ new Set();
      for (const b of bills ?? []) {
        if (b.budget_id) converted.add(b.budget_id);
      }
      setConvertedIds(converted);
    } else {
      setConvertedIds(/* @__PURE__ */ new Set());
    }
    setLoading(false);
  }, [profile, status]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const filtered = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.number).includes(q) || (r.patients?.full_name?.toLowerCase().includes(q) ?? false));
  }, [rows, search]);
  const totals = reactExports.useMemo(() => ({
    count: filtered.length,
    value: filtered.reduce((s, r) => s + Number(r.final_value), 0),
    approved: filtered.filter((r) => r.status === "approved").length
  }), [filtered]);
  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };
  const openEdit = (id) => {
    setEditId(id);
    setFormOpen(true);
  };
  const updateStatus = async (id, next) => {
    const {
      error
    } = await supabase.from("budgets").update({
      status: next
    }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Orçamento marcado como ${BUDGET_STATUS_LABEL[next] ?? next}`);
    void load();
  };
  const exportPdf = async (row) => {
    if (!profile || !tenant) return;
    try {
      const [{
        data: items
      }, {
        data: tenantRow
      }, addr, letterhead] = await Promise.all([supabase.from("budget_items").select("*").eq("budget_id", row.id).order("position"), supabase.from("tenants").select("name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle(), getTenantSetting(tenant.id, "address"), loadLetterheadForPdf(profile.id)]);
      if (!letterhead.imageData) {
        toast.warning("Papel timbrado não encontrado — PDF gerado com as margens configuradas. Cadastre o timbrado em Minhas configurações.");
      }
      const pdfData = {
        clinic: {
          name: tenantRow?.name ?? tenant.name,
          address: formatClinicAddress(addr) ?? tenantRow?.address ?? null,
          phone: tenantRow?.phone ?? null,
          email: tenantRow?.email ?? null,
          cnpj: tenantRow?.cnpj ?? null
        },
        number: row.number,
        date: row.date,
        validUntil: row.valid_until,
        patientName: row.patients?.full_name ?? "—",
        professionalName: profile.full_name,
        items: (items ?? []).map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          total_price: Number(it.total_price)
        })),
        subtotal: Number(row.subtotal),
        discountValue: Number(row.discount_value),
        finalValue: Number(row.final_value),
        notes: row.notes,
        letterhead
      };
      const blob = generateBudgetPDF(pdfData);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e.message);
    }
  };
  const convertToSale = async (row) => {
    if (convertedIds.has(row.id)) {
      toast.error("Orçamento já convertido");
      return;
    }
    if (row.status !== "approved") {
      toast.error("Aprove o orçamento antes de converter em venda");
      return;
    }
    setConvertingId(row.id);
    try {
      const {
        data,
        error
      } = await supabase.rpc("convert_budget_to_sale", {
        p_budget_id: row.id
      });
      if (error) throw error;
      const result = data;
      toast.success(`Venda criada — ${fmt(result?.amount ?? row.final_value)} no financeiro do paciente`);
      void load();
      if (result?.patient_id) {
        navigate({
          to: "/professional/patients/$id",
          params: {
            id: result.patient_id
          },
          search: {
            tab: "financeiro"
          }
        });
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setConvertingId(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Orçamentos", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Orçamentos", description: "Propostas de tratamento — crie, envie ao paciente e converta em venda.", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openCreate, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
        "Novo orçamento"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: "Resumo", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Total de orçamentos", value: totals.count, icon: Receipt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Valor total", value: fmt(totals.value), icon: Receipt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Aprovados", value: totals.approved, icon: Receipt, tone: "success" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Buscar por paciente ou número…", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos" }),
            Object.entries(BUDGET_STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: k, children: v }, k))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nº" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Validade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Nenhum orçamento encontrado." }) }) : filtered.map((r) => {
          const converted = convertedIds.has(r.id);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { className: "font-mono", children: [
              "#",
              r.number
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmtDate(r.date) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmtDate(r.valid_until) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(r.final_value) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
              statusBadge(r.status),
              converted && /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-emerald-600 text-white hover:bg-emerald-600", children: "Vendido" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => openEdit(r.id), title: "Editar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "size-4" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => void exportPdf(r), title: "PDF", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "size-4" }) }),
              r.status === "draft" && !converted && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => void updateStatus(r.id, "sent"), title: "Marcar como enviado", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "mr-1 size-3" }),
                "Enviar"
              ] }),
              (r.status === "draft" || r.status === "sent") && !converted && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => void updateStatus(r.id, "approved"), title: "Aprovar orçamento", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mr-1 size-3" }),
                "Aprovar"
              ] }),
              r.status === "approved" && !converted && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => void convertToSale(r), disabled: convertingId === r.id, title: "Converter em venda", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingCart, { className: "mr-1 size-3" }),
                "Converter"
              ] }),
              converted && r.patient_id && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", onClick: () => navigate({
                to: "/professional/patients/$id",
                params: {
                  id: r.patient_id
                },
                search: {
                  tab: "financeiro"
                }
              }), children: "Financeiro" })
            ] }) })
          ] }, r.id);
        }) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(BudgetFormDialog, { open: formOpen, onOpenChange: setFormOpen, budgetId: editId, onSaved: () => void load() })
  ] });
}
export {
  ProfessionalBudgetsPage as component
};
