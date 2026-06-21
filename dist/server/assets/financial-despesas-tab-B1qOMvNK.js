import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Plus, MoreHorizontal, Pencil, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { t as todayISO, p as parseBRLInput, Y as firstDayOfMonthISO, d as fmt, i as isOverdue, f as fmtDate } from "../server.js";
import { u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, _ as Switch, T as Textarea, y as DialogFooter, B as Button, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, af as PAYMENT_LABEL, q as Badge, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, b4 as DropdownMenu, b5 as DropdownMenuTrigger, b6 as DropdownMenuContent, b7 as DropdownMenuItem } from "./router-DKQJQoSP.js";
import { l as loadExpenseCategories } from "./expense-categories-Dy1TzRqd.js";
import { u as updateProfessionalExpense, c as createProfessionalExpense, l as loadProfessionalExpenses, m as markExpensePaid, a as cancelExpense, d as deleteProfessionalExpense } from "./expenses-qnPI0Lnj.js";
import { l as loadPaymentMethodConfigs, a as activePaymentMethods } from "./payment-methods-emmSWHPu.js";
import { D as DateRangeFilter } from "./date-range-filter-D23nXrfr.js";
import "node:crypto";
import "@supabase/supabase-js";
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
function ExpenseDialog({ open, onOpenChange, expense, onSaved }) {
  const { tenant, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState("pix");
  useEffect(() => {
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
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: expense ? "Editar despesa" : "Nova despesa" }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Descrição *" }),
        /* @__PURE__ */ jsx(Input, { value: description, onChange: (e) => setDescription(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Categoria" }),
          /* @__PURE__ */ jsxs(Select, { value: category || "none", onValueChange: (v) => setCategory(v === "none" ? "" : v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Sem categoria" }),
              categories.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c.name, children: c.name }, c.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Fornecedor" }),
          /* @__PURE__ */ jsx(Input, { value: supplier, onChange: (e) => setSupplier(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Valor *" }),
          /* @__PURE__ */ jsx(Input, { value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "0,00" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Vencimento *" }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { checked: markPaid, onCheckedChange: setMarkPaid }),
        /* @__PURE__ */ jsx(Label, { children: "Já paga" })
      ] }),
      markPaid && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Data do pagamento" }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: paidDate, onChange: (e) => setPaidDate(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Forma de pagamento" }),
          /* @__PURE__ */ jsxs(Select, { value: paymentMethod, onValueChange: setPaymentMethod, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsx(SelectContent, { children: methods.map((m) => /* @__PURE__ */ jsx(SelectItem, { value: m.value, children: m.label }, m.value)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsx(Textarea, { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2 })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxs(Button, { onClick: () => void save(), disabled: saving, children: [
        saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
        "Salvar"
      ] })
    ] })
  ] }) });
}
function FinancialDespesasTab() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const load = useCallback(async () => {
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
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.description.toLowerCase().includes(q) || (r.supplier?.toLowerCase().includes(q) ?? false) || (r.category?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);
  const totals = useMemo(() => {
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
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [
        /* @__PURE__ */ jsx(DateRangeFilter, { from, to, onFromChange: setFrom, onToChange: setTo }),
        /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Situação" }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "pending", children: "Pendente" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "paid", children: "Paga" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "overdue", children: "Vencida" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "cancelled", children: "Cancelada" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: category, onValueChange: setCategory, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Categoria" }) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas categorias" }),
            categories.map((c) => /* @__PURE__ */ jsx(SelectItem, { value: c, children: c }, c))
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Buscar…",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-48"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: openNew, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Nova despesa"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "Total: ",
        /* @__PURE__ */ jsx("strong", { className: "text-foreground", children: fmt(totals.total) })
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        "Pago: ",
        /* @__PURE__ */ jsx("strong", { className: "text-emerald-700", children: fmt(totals.paid) })
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        "Pendente: ",
        /* @__PURE__ */ jsx("strong", { className: "text-amber-700", children: fmt(totals.pending) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Fornecedor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsx(TableHead, { className: "w-12" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Nenhuma despesa encontrada." }) }) : filtered.map((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: r.description }),
          /* @__PURE__ */ jsx(TableCell, { children: r.category ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { children: r.supplier ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { children: fmt(r.amount) }),
          /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
          /* @__PURE__ */ jsx(TableCell, { children: r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—" }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[eff] ?? "", children: BILL_STATUS_LABEL[eff] ?? r.status }) }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "size-8", children: /* @__PURE__ */ jsx(MoreHorizontal, { className: "size-4" }) }) }),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => openEdit(r), children: [
                /* @__PURE__ */ jsx(Pencil, { className: "mr-2 size-4" }),
                "Editar"
              ] }),
              r.status === "pending" && /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => void pay(r), children: [
                /* @__PURE__ */ jsx(Check, { className: "mr-2 size-4" }),
                "Marcar como paga"
              ] }),
              r.status !== "cancelled" && /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => void cancel(r), children: [
                /* @__PURE__ */ jsx(X, { className: "mr-2 size-4" }),
                "Cancelar"
              ] }),
              /* @__PURE__ */ jsxs(
                DropdownMenuItem,
                {
                  className: "text-destructive focus:text-destructive",
                  onClick: () => void remove(r),
                  children: [
                    /* @__PURE__ */ jsx(Trash2, { className: "mr-2 size-4" }),
                    "Excluir"
                  ]
                }
              )
            ] })
          ] }) })
        ] }, r.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsx(
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
