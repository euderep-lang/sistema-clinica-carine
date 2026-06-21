import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { Y as firstDayOfMonthISO, t as todayISO, d as fmt, i as isOverdue, f as fmtDate, p as parseBRLInput } from "./index.mjs";
import { u as useAuth, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, I as Input, B as Button, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, af as PAYMENT_LABEL, q as Badge, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, b4 as DropdownMenu, b5 as DropdownMenuTrigger, b6 as DropdownMenuContent, b7 as DropdownMenuItem, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, _ as Switch, T as Textarea, y as DialogFooter } from "./router-DcWaovdP.mjs";
import { l as loadExpenseCategories } from "./expense-categories-BsKcdGzG.mjs";
import { l as loadProfessionalExpenses, m as markExpensePaid, c as cancelExpense, d as deleteProfessionalExpense, u as updateProfessionalExpense, a as createProfessionalExpense } from "./expenses-ZJLXZZvE.mjs";
import { l as loadPaymentMethodConfigs, a as activePaymentMethods } from "./payment-methods-B6YcEEZ8.mjs";
import { D as DateRangeFilter } from "./date-range-filter-B2NKLeYO.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, aY as Ellipsis, a8 as Pencil, a as Check, X, a1 as Trash2, E as LoaderCircle } from "../_libs/lucide-react.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
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
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
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
function ExpenseDialog({ open, onOpenChange, expense, onSaved }) {
  const { tenant, profile } = useAuth();
  const [saving, setSaving] = reactExports.useState(false);
  const [categories, setCategories] = reactExports.useState([]);
  const [methods, setMethods] = reactExports.useState([]);
  const [description, setDescription] = reactExports.useState("");
  const [category, setCategory] = reactExports.useState("");
  const [supplier, setSupplier] = reactExports.useState("");
  const [amount, setAmount] = reactExports.useState("");
  const [dueDate, setDueDate] = reactExports.useState(todayISO());
  const [notes, setNotes] = reactExports.useState("");
  const [markPaid, setMarkPaid] = reactExports.useState(false);
  const [paidDate, setPaidDate] = reactExports.useState(todayISO());
  const [paymentMethod, setPaymentMethod] = reactExports.useState("pix");
  reactExports.useEffect(() => {
    if (!open) return;
    void (async () => {
      const [cats, configs] = await Promise.all([
        loadExpenseCategories(),
        loadPaymentMethodConfigs()
      ]);
      setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      setMethods(activePaymentMethods(configs).filter((m) => m.value !== "other"));
    })();
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    if (expense) {
      setDescription(expense.description);
      setCategory(expense.category ?? "");
      setSupplier(expense.supplier ?? "");
      setAmount(Number(expense.amount).toFixed(2).replace(".", ","));
      setDueDate(expense.due_date);
      setNotes(expense.notes ?? "");
      setMarkPaid(expense.status === "paid");
      setPaidDate(expense.paid_date ?? todayISO());
      setPaymentMethod(expense.payment_method ?? "pix");
    } else {
      setDescription("");
      setCategory("");
      setSupplier("");
      setAmount("");
      setDueDate(todayISO());
      setNotes("");
      setMarkPaid(false);
      setPaidDate(todayISO());
      setPaymentMethod("pix");
    }
  }, [open, expense]);
  const save = async () => {
    if (!tenant || !profile || !description.trim() || !amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const value = parseBRLInput(amount);
    if (value <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        category: category || null,
        supplier: supplier.trim() || null,
        amount: value,
        due_date: dueDate,
        notes: notes.trim() || null,
        status: markPaid ? "paid" : "pending",
        paid_date: markPaid ? paidDate : null,
        payment_method: markPaid ? paymentMethod : null
      };
      if (expense) {
        await updateProfessionalExpense(expense.id, payload);
        toast.success("Despesa atualizada");
      } else {
        await createProfessionalExpense(tenant.id, profile.id, payload);
        toast.success("Despesa criada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: expense ? "Editar despesa" : "Nova despesa" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Descrição *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: description, onChange: (e) => setDescription(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Categoria" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: category || "none", onValueChange: (v) => setCategory(v === "none" ? "" : v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "Sem categoria" }),
              categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.name, children: c.name }, c.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Fornecedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: supplier, onChange: (e) => setSupplier(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Valor *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "0,00" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Vencimento *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: markPaid, onCheckedChange: setMarkPaid }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Já paga" })
      ] }),
      markPaid && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Data do pagamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: paidDate, onChange: (e) => setPaidDate(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Forma de pagamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: paymentMethod, onValueChange: setPaymentMethod, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: methods.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: m.value, children: m.label }, m.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2 })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void save(), disabled: saving, children: [
        saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
        "Salvar"
      ] })
    ] })
  ] }) });
}
function FinancialDespesasTab() {
  const { profile } = useAuth();
  const [rows, setRows] = reactExports.useState([]);
  const [categories, setCategories] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("all");
  const [category, setCategory] = reactExports.useState("all");
  const [from, setFrom] = reactExports.useState(firstDayOfMonthISO());
  const [to, setTo] = reactExports.useState(todayISO());
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editTarget, setEditTarget] = reactExports.useState(null);
  const load = reactExports.useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        loadProfessionalExpenses(profile.id, { status, category, from, to, dateField: "due_date" }),
        loadExpenseCategories()
      ]);
      setRows(data);
      setCategories(cats.map((c) => c.name));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile, status, category, from, to]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const filtered = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.description.toLowerCase().includes(q) || (r.supplier?.toLowerCase().includes(q) ?? false) || (r.category?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);
  const totals = reactExports.useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    for (const r of filtered) {
      if (r.status === "cancelled") continue;
      total += Number(r.amount);
      if (r.status === "paid") paid += Number(r.amount);
      else pending += Number(r.amount);
    }
    return { total, paid, pending };
  }, [filtered]);
  const openNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (row) => {
    setEditTarget(row);
    setDialogOpen(true);
  };
  const pay = async (row) => {
    try {
      await markExpensePaid(row.id, todayISO(), row.payment_method ?? "pix");
      toast.success("Despesa marcada como paga");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const remove = async (row) => {
    try {
      await deleteProfessionalExpense(row.id);
      toast.success("Despesa excluída");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const cancel = async (row) => {
    try {
      await cancelExpense(row.id);
      toast.success("Despesa cancelada");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DateRangeFilter, { from, to, onFromChange: setFrom, onToChange: setTo }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Situação" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "pending", children: "Pendente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "paid", children: "Paga" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "overdue", children: "Vencida" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "cancelled", children: "Cancelada" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: category, onValueChange: setCategory, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Categoria" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas categorias" }),
            categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c, children: c }, c))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            placeholder: "Buscar…",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-48"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openNew, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
        "Nova despesa"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Total: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: fmt(totals.total) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Pago: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-emerald-700", children: fmt(totals.paid) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Pendente: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-amber-700", children: fmt(totals.pending) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Descrição" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Fornecedor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Vencimento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Forma" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-12" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Nenhuma despesa encontrada." }) }) : filtered.map((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.category ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.supplier ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(r.amount) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmtDate(r.due_date) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: BILL_STATUS_CLASS[eff] ?? "", children: BILL_STATUS_LABEL[eff] ?? r.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "size-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "size-4" }) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => openEdit(r), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-2 size-4" }),
                "Editar"
              ] }),
              r.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void pay(r), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-2 size-4" }),
                "Marcar como paga"
              ] }),
              r.status !== "cancelled" && /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: () => void cancel(r), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mr-2 size-4" }),
                "Cancelar"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                DropdownMenuItem,
                {
                  className: "text-destructive focus:text-destructive",
                  onClick: () => void remove(r),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 size-4" }),
                    "Excluir"
                  ]
                }
              )
            ] })
          ] }) })
        ] }, r.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExpenseDialog,
      {
        open: dialogOpen,
        onOpenChange: setDialogOpen,
        expense: editTarget,
        onSaved: () => void load()
      }
    )
  ] });
}
export {
  FinancialDespesasTab
};
