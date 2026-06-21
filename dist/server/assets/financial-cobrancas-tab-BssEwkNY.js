import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, ShoppingBag, RotateCcw, History, Plus, Trash2, Wallet, TrendingUp, TrendingDown, MoreHorizontal, HandCoins, Pencil } from "lucide-react";
import { toast } from "sonner";
import { P as PageSection } from "./page-section-BwYEiYgr.js";
import { S as StatCard } from "./stat-card-BwnRVrCt.js";
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from "./alert-dialog-DEHxPboV.js";
import { aZ as loadSaleChargeItems, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, ae as DialogDescription, q as Badge, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, af as PAYMENT_LABEL, B as Button, a_ as billCanReceive, L as Label, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, T as Textarea, a$ as receiveBillPayment, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, u as useAuth, b0 as previewInstallments, g as Popover, h as PopoverTrigger, j as PopoverContent, $ as Command, a0 as CommandInput, a1 as CommandList, a2 as CommandEmpty, a3 as CommandGroup, a4 as CommandItem, E as cn, y as DialogFooter, b1 as updateStandaloneSale, b2 as createStandaloneSale, C as Card, f as CardContent, b3 as billIsInstallment, b4 as DropdownMenu, b5 as DropdownMenuTrigger, b6 as DropdownMenuContent, b7 as DropdownMenuItem, b8 as billIsEditable, b9 as billCanReverse, ba as billCanDelete, bb as DropdownMenuSeparator, bc as reverseSale, bd as billHasSaleItems, be as deleteBill } from "./router-C3L3OxIm.js";
import { S as ScrollArea } from "./scroll-area-DdVoVpiO.js";
import { a as activePaymentMethods, c as calculatePaymentFee, l as loadPaymentMethodConfigs } from "./payment-methods-CetGitIM.js";
import { s as supabase, p as parseBRLInput, i as isOverdue, f as fmtDate, d as fmt, t as todayISO$1, L as fmtDateFromDate, ae as currentYearMonth } from "../server.js";
import { m as maskCPF } from "./patient-utils-YNqCHR6o.js";
import { p as periodFromYearMonth } from "./commission-DZcFPis-.js";
import { c as computeCompetencePeriodStats } from "./financial-competence-CrKl4Oe7.js";
import "@radix-ui/react-alert-dialog";
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
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "@radix-ui/react-scroll-area";
import "node:crypto";
import "@supabase/supabase-js";
async function loadBillPayments(options) {
  let query = supabase.from("bill_payments").select(
    "id, bill_receivable_id, amount, fee_amount, net_amount, payment_method, paid_date, notes, status, reversed_at, reversal_reason, created_at, patients(full_name), bills_receivable(description, amount, installment_number, installment_count), created_by_profile:created_by(full_name)"
  ).order("paid_date", { ascending: false }).order("created_at", { ascending: false }).limit(options?.limit ?? 100);
  if (options?.billId) {
    query = query.eq("bill_receivable_id", options.billId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function reverseBillPayment(paymentId, reason) {
  const { data, error } = await supabase.rpc("reverse_bill_payment", {
    p_payment_id: paymentId,
    p_reason: reason
  });
  if (error) throw new Error(error.message);
  return data;
}
function paymentCanReverse(row) {
  return row.status === "active";
}
const CREDIT_INSTALLMENTS = Array.from({ length: 12 }, (_, i) => i + 1);
function todayISO() {
  return todayISO();
}
function buildPaymentNotes(userNotes, method, creditInstallments) {
  const parts = [];
  if (method === "credit_card") {
    parts.push(
      creditInstallments === 1 ? "Crédito à vista" : `Crédito em ${creditInstallments}x`
    );
  }
  const trimmed = userNotes.trim();
  if (trimmed) parts.push(trimmed);
  return parts.length ? parts.join(" · ") : void 0;
}
function BillDetailDialog({
  open,
  onOpenChange,
  bill,
  onChanged
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [methodConfigs, setMethodConfigs] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState("");
  const [creditInstallments, setCreditInstallments] = useState("1");
  const [paySaving, setPaySaving] = useState(false);
  const [reversePaymentTarget, setReversePaymentTarget] = useState(null);
  const [reversingPayment, setReversingPayment] = useState(false);
  const outstanding = bill ? Math.max(0, Number(bill.amount) - Number(bill.paid_amount)) : 0;
  const payValue = parseBRLInput(payAmount);
  const installmentCount = Number(creditInstallments) || 1;
  const installmentValue = useMemo(() => {
    if (payMethod !== "credit_card" || payValue <= 0 || installmentCount <= 1) return 0;
    return payValue / installmentCount;
  }, [payMethod, payValue, installmentCount]);
  const paymentMethods = useMemo(() => activePaymentMethods(methodConfigs), [methodConfigs]);
  const feePreview = useMemo(() => {
    const config = methodConfigs.find((c) => c.method === payMethod && c.active);
    if (!config || payValue <= 0) return null;
    return calculatePaymentFee(payValue, config);
  }, [methodConfigs, payMethod, payValue]);
  const loadDetails = useCallback(async () => {
    if (!bill) return;
    setLoading(true);
    try {
      const [chargeItems, billPayments, configs] = await Promise.all([
        loadSaleChargeItems(bill.id),
        loadBillPayments({ billId: bill.id, limit: 50 }),
        loadPaymentMethodConfigs()
      ]);
      setItems(chargeItems);
      setPayments(billPayments);
      setMethodConfigs(configs);
      setPayAmount(outstanding > 0 ? outstanding.toFixed(2).replace(".", ",") : "");
      setPayDate(todayISO());
      setPayMethod("pix");
      setCreditInstallments("1");
      setPayNotes("");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [bill, outstanding]);
  useEffect(() => {
    if (!open || !bill) return;
    void loadDetails();
  }, [open, bill, loadDetails]);
  const refreshAll = async () => {
    await loadDetails();
    onChanged();
  };
  const submitPayment = async () => {
    if (!bill) return;
    const value = parseBRLInput(payAmount);
    if (value <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    if (payMethod === "credit_card" && (!creditInstallments || installmentCount < 1)) {
      toast.error("Informe o parcelamento no cartão");
      return;
    }
    setPaySaving(true);
    try {
      const notes = buildPaymentNotes(payNotes, payMethod, installmentCount);
      await receiveBillPayment(bill.id, value, payMethod, payDate, notes);
      toast.success("Pagamento registrado");
      setPayNotes("");
      setCreditInstallments("1");
      await refreshAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPaySaving(false);
    }
  };
  const confirmReversePayment = async () => {
    if (!reversePaymentTarget) return;
    setReversingPayment(true);
    try {
      await reverseBillPayment(reversePaymentTarget.id, "Estorno manual");
      toast.success("Pagamento estornado");
      setReversePaymentTarget(null);
      await refreshAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReversingPayment(false);
    }
  };
  if (!bill) return null;
  const effStatus = isOverdue(bill.due_date, bill.status) ? "overdue" : bill.status;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { className: "shrink-0 border-b px-6 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(DialogTitle, { className: "text-lg", children: bill.patients?.full_name ?? "Paciente" }),
            /* @__PURE__ */ jsx(DialogDescription, { className: "mt-1 text-sm", children: bill.description })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[effStatus], children: BILL_STATUS_LABEL[effStatus] }),
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
              "Vence ",
              fmtDate(bill.due_date)
            ] }),
            bill.competence_date && bill.competence_date !== bill.due_date && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
              "· Competência ",
              fmtDate(bill.competence_date)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap gap-4 text-sm", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Total: ",
            /* @__PURE__ */ jsx("strong", { children: fmt(bill.amount) })
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Recebido: ",
            /* @__PURE__ */ jsx("strong", { className: "text-emerald-700", children: fmt(bill.paid_amount) })
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Em aberto: ",
            /* @__PURE__ */ jsx("strong", { className: "text-amber-700", children: fmt(outstanding) })
          ] })
        ] })
      ] }),
      loading ? /* @__PURE__ */ jsx("div", { className: "flex flex-1 items-center justify-center py-20", children: /* @__PURE__ */ jsx(Loader2, { className: "size-8 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r", children: [
          /* @__PURE__ */ jsxs("section", { className: "shrink-0 border-b p-5", children: [
            /* @__PURE__ */ jsxs("h3", { className: "mb-3 flex items-center gap-2 text-sm font-semibold", children: [
              /* @__PURE__ */ jsx(ShoppingBag, { className: "size-4 text-primary" }),
              "O que comprou nesta conta"
            ] }),
            items.length > 0 ? /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: items.map((item) => /* @__PURE__ */ jsxs(
              "li",
              {
                className: "flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm",
                children: [
                  /* @__PURE__ */ jsxs("span", { children: [
                    item.quantity,
                    "x ",
                    item.services?.name ?? "Procedimento",
                    item.services && item.services.session_count > 1 && /* @__PURE__ */ jsxs("span", { className: "ml-1 text-xs text-muted-foreground", children: [
                      "(",
                      item.services.session_count,
                      " sessões/un)"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: fmt(item.total_price) })
                ]
              },
              item.id
            )) }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: bill.description })
          ] }),
          /* @__PURE__ */ jsxs("section", { className: "flex min-h-0 flex-1 flex-col p-5", children: [
            /* @__PURE__ */ jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Histórico de pagamentos" }),
            /* @__PURE__ */ jsx(ScrollArea, { className: "min-h-0 flex-1", children: payments.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-sm text-muted-foreground", children: "Nenhum pagamento registrado." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2 pr-3", children: payments.map((p) => /* @__PURE__ */ jsxs(
              "li",
              {
                className: `flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${p.status === "reversed" ? "opacity-60" : ""}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsx("div", { className: "font-medium", children: fmt(p.amount) }),
                    /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
                      fmtDate(p.paid_date),
                      " · ",
                      PAYMENT_LABEL[p.payment_method],
                      p.fee_amount != null && Number(p.fee_amount) > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
                        " · Líquido ",
                        fmt(p.net_amount ?? p.amount)
                      ] }),
                      p.status === "reversed" && " · Estornado"
                    ] }),
                    p.notes && /* @__PURE__ */ jsx("div", { className: "mt-0.5 text-xs text-muted-foreground", children: p.notes })
                  ] }),
                  paymentCanReverse(p) && /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "ghost",
                      size: "icon",
                      className: "size-8 shrink-0 text-destructive hover:text-destructive",
                      title: "Estornar pagamento",
                      onClick: () => setReversePaymentTarget(p),
                      children: /* @__PURE__ */ jsx(RotateCcw, { className: "size-4" })
                    }
                  )
                ]
              },
              p.id
            )) }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-col p-5", children: [
          /* @__PURE__ */ jsx("h3", { className: "mb-3 text-sm font-semibold", children: "Lançar pagamento" }),
          billCanReceive(bill) ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Valor" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    value: payAmount,
                    onChange: (e) => setPayAmount(e.target.value),
                    placeholder: "R$ 0,00"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Data" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "date",
                    value: payDate,
                    onChange: (e) => setPayDate(e.target.value)
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Forma de pagamento" }),
              /* @__PURE__ */ jsx("div", { className: "mt-1 grid grid-cols-3 gap-1.5", children: paymentMethods.filter((m) => m.value !== "other").map((m) => /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setPayMethod(m.value);
                    if (m.value !== "credit_card") setCreditInstallments("1");
                  },
                  className: `rounded-md border px-2 py-1.5 text-xs transition-colors ${payMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`,
                  children: [
                    /* @__PURE__ */ jsx("span", { className: "mr-1", children: m.icon }),
                    m.label
                  ]
                },
                m.value
              )) })
            ] }),
            payMethod === "credit_card" && /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-primary/20 bg-primary/5 p-3", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Parcelamento no cartão" }),
              /* @__PURE__ */ jsxs(
                Select,
                {
                  value: creditInstallments,
                  onValueChange: setCreditInstallments,
                  children: [
                    /* @__PURE__ */ jsx(SelectTrigger, { className: "mt-1 bg-background", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione as parcelas" }) }),
                    /* @__PURE__ */ jsx(SelectContent, { children: CREDIT_INSTALLMENTS.map((n) => /* @__PURE__ */ jsx(SelectItem, { value: String(n), children: n === 1 ? "À vista (1x)" : `${n}x no cartão` }, n)) })
                  ]
                }
              ),
              installmentCount > 1 && payValue > 0 && /* @__PURE__ */ jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
                installmentCount,
                "x de ",
                /* @__PURE__ */ jsx("strong", { children: fmt(installmentValue) }),
                " no cartão"
              ] })
            ] }),
            feePreview && feePreview.fee > 0 && /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "Taxa estimada: ",
              /* @__PURE__ */ jsx("strong", { children: fmt(feePreview.fee) }),
              " · Líquido:",
              " ",
              /* @__PURE__ */ jsx("strong", { children: fmt(feePreview.net) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Observações" }),
              /* @__PURE__ */ jsx(
                Textarea,
                {
                  value: payNotes,
                  onChange: (e) => setPayNotes(e.target.value),
                  rows: 3,
                  placeholder: "Opcional"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              Button,
              {
                className: "w-full",
                onClick: () => void submitPayment(),
                disabled: paySaving,
                children: [
                  paySaving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
                  "Confirmar recebimento"
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Esta cobrança está quitada ou cancelada." })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      AlertDialog,
      {
        open: Boolean(reversePaymentTarget),
        onOpenChange: (o) => !o && setReversePaymentTarget(null),
        children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
          /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
            /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Estornar pagamento?" }),
            /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
              "O pagamento de",
              " ",
              /* @__PURE__ */ jsx("strong", { children: reversePaymentTarget && fmt(reversePaymentTarget.amount) }),
              " será estornado e o saldo em aberto da cobrança será recalculado."
            ] })
          ] }),
          /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
            /* @__PURE__ */ jsx(AlertDialogCancel, { disabled: reversingPayment, children: "Cancelar" }),
            /* @__PURE__ */ jsx(
              AlertDialogAction,
              {
                className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                disabled: reversingPayment,
                onClick: (e) => {
                  e.preventDefault();
                  void confirmReversePayment();
                },
                children: "Confirmar estorno"
              }
            )
          ] })
        ] })
      }
    )
  ] });
}
function PaymentHistoryDialog({
  open,
  onOpenChange,
  billId,
  onChanged
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reversing, setReversing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBillPayments({ billId: billId ?? void 0, limit: 200 });
      setRows(data);
    } catch (e) {
      toast.error(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [billId]);
  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && r.status !== "active") return false;
      if (statusFilter === "reversed" && r.status !== "reversed") return false;
      if (!q) return true;
      return (r.patients?.full_name?.toLowerCase().includes(q) ?? false) || (r.bills_receivable?.description?.toLowerCase().includes(q) ?? false) || PAYMENT_LABEL[r.payment_method]?.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);
  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setReversing(true);
    try {
      await reverseBillPayment(reverseTarget.id, "Estorno manual");
      toast.success("Pagamento estornado — saldo da cobrança atualizado");
      setReverseTarget(null);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReversing(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] max-w-4xl overflow-hidden flex flex-col", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(History, { className: "size-5" }),
          "Histórico de pagamentos"
        ] }),
        /* @__PURE__ */ jsx(DialogDescription, { children: billId ? "Pagamentos desta cobrança. Estorne um lançamento para reabrir o saldo." : "Todos os recebimentos registrados. Estorne pagamentos individuais quando necessário." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Buscar paciente ou descrição…",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-56"
          }
        ),
        /* @__PURE__ */ jsxs(Select, { value: statusFilter, onValueChange: setStatusFilter, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "active", children: "Ativos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "reversed", children: "Estornados" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-auto rounded-lg border", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Cobrança" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
          /* @__PURE__ */ jsx(TableHead, { className: "w-12" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: /* @__PURE__ */ jsx(Loader2, { className: "mx-auto size-5 animate-spin" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Nenhum pagamento encontrado." }) }) : filtered.map((r) => /* @__PURE__ */ jsxs(TableRow, { className: r.status === "reversed" ? "opacity-60" : void 0, children: [
          /* @__PURE__ */ jsx(TableCell, { className: "whitespace-nowrap", children: fmtDate(r.paid_date) }),
          /* @__PURE__ */ jsx(TableCell, { children: r.patients?.full_name ?? "—" }),
          /* @__PURE__ */ jsxs(TableCell, { className: "max-w-[200px]", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate text-sm", children: r.bills_receivable?.description ?? "—" }),
            r.bills_receivable?.installment_count != null && r.bills_receivable.installment_count > 1 && /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
              "Parcela ",
              r.bills_receivable.installment_number,
              "/",
              r.bills_receivable.installment_count
            ] })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: fmt(r.amount) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: PAYMENT_LABEL[r.payment_method] ?? r.payment_method }),
          /* @__PURE__ */ jsx(TableCell, { children: r.status === "active" ? /* @__PURE__ */ jsx(Badge, { className: "bg-green-100 text-green-800", children: "Confirmado" }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-muted-foreground", children: "Estornado" }) }),
          /* @__PURE__ */ jsx(TableCell, { children: paymentCanReverse(r) && /* @__PURE__ */ jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              className: "size-8 text-destructive hover:text-destructive",
              title: "Estornar pagamento",
              onClick: () => setReverseTarget(r),
              children: /* @__PURE__ */ jsx(RotateCcw, { className: "size-4" })
            }
          ) })
        ] }, r.id)) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx(AlertDialog, { open: Boolean(reverseTarget), onOpenChange: (o) => !o && setReverseTarget(null), children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Estornar pagamento?" }),
        /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
          "O pagamento de ",
          /* @__PURE__ */ jsx("strong", { children: reverseTarget && fmt(reverseTarget.amount) }),
          " em",
          " ",
          /* @__PURE__ */ jsx("strong", { children: reverseTarget && fmtDate(reverseTarget.paid_date) }),
          " será estornado. O saldo da cobrança será recalculado e a parcela voltará a ficar em aberto, se aplicável."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { disabled: reversing, children: "Cancelar" }),
        /* @__PURE__ */ jsx(
          AlertDialogAction,
          {
            disabled: reversing,
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            onClick: (e) => {
              e.preventDefault();
              void confirmReverse();
            },
            children: "Confirmar estorno"
          }
        )
      ] })
    ] }) })
  ] });
}
const emptyItem = () => ({
  service_id: null,
  description: "",
  quantity: 1,
  unit_price: 0
});
function StandaloneSaleDialog({
  open,
  onOpenChange,
  billId,
  defaultPatientId,
  onSaved
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [dueDate, setDueDate] = useState(todayISO$1());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [installmentInterval, setInstallmentInterval] = useState("1");
  const isEdit = Boolean(billId);
  const resetForm = () => {
    setPatientId(defaultPatientId ?? "");
    setDueDate(todayISO$1());
    setNotes("");
    setItems([emptyItem()]);
    setPaymentMode("cash");
    setInstallmentCount("3");
    setInstallmentInterval("1");
  };
  useEffect(() => {
    if (!open || !profile) return;
    (async () => {
      setLoading(true);
      const [{ data: pts }, { data: svcs }] = await Promise.all([
        supabase.from("patients").select("id, full_name, cpf").eq("tenant_id", profile.tenant_id).eq("active", true).order("full_name"),
        supabase.from("services").select("id, name, default_price, session_count").eq("tenant_id", profile.tenant_id).eq("active", true).or(`professional_id.eq.${profile.id},professional_id.is.null`).order("name")
      ]);
      setPatients(pts ?? []);
      setServices(svcs ?? []);
      if (billId) {
        const { data: bill, error } = await supabase.from("bills_receivable").select("patient_id, due_date, notes, installment_count").eq("id", billId).maybeSingle();
        if (error || !bill) {
          toast.error("Venda não encontrada");
          onOpenChange(false);
          return;
        }
        const chargeItems = await loadSaleChargeItems(billId);
        setPatientId(bill.patient_id ?? "");
        setDueDate(bill.due_date);
        setNotes(bill.notes ?? "");
        if (bill.installment_count && bill.installment_count > 1) {
          setPaymentMode("installment");
          setInstallmentCount(String(bill.installment_count));
        } else {
          setPaymentMode("cash");
        }
        setItems(
          chargeItems.length > 0 ? chargeItems.map((it) => ({
            service_id: it.service_id,
            description: it.services?.name ?? "",
            quantity: it.quantity,
            unit_price: Number(it.unit_price)
          })) : [emptyItem()]
        );
      } else {
        resetForm();
      }
      setLoading(false);
    })();
  }, [open, profile, billId, defaultPatientId, onOpenChange]);
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return patients.filter(
      (p) => !q || p.full_name.toLowerCase().includes(q) || (p.cpf ?? "").includes(q.replace(/\D/g, ""))
    ).slice(0, 30);
  }, [patients, patientSearch]);
  const total = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items]
  );
  const installments = useMemo(() => {
    const count = Math.max(2, Math.min(48, Number(installmentCount) || 2));
    if (paymentMode !== "installment" || total <= 0) return [];
    return previewInstallments(
      total,
      dueDate,
      count,
      Math.max(1, Number(installmentInterval) || 1)
    );
  }, [paymentMode, total, dueDate, installmentCount, installmentInterval]);
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
  const toPayload = () => items.filter((it) => it.service_id && it.quantity > 0).map((it) => ({
    service_id: it.service_id,
    quantity: it.quantity,
    unit_price: it.unit_price
  }));
  const save = async () => {
    if (!profile) return;
    if (!patientId) {
      toast.error("Selecione o paciente");
      return;
    }
    const payload = toPayload();
    if (payload.length === 0) {
      toast.error("Adicione ao menos um procedimento");
      return;
    }
    setSaving(true);
    try {
      const count = paymentMode === "installment" ? Math.max(2, Number(installmentCount) || 2) : 1;
      const interval = Math.max(1, Number(installmentInterval) || 1);
      const options = {
        notes: notes.trim() || void 0,
        installmentCount: count,
        installmentIntervalMonths: interval
      };
      if (billId) {
        await updateStandaloneSale(billId, payload, dueDate, options);
        toast.success(count > 1 ? "Venda parcelada atualizada" : "Venda atualizada");
      } else {
        const result = await createStandaloneSale(patientId, payload, dueDate, options);
        toast.success(
          result.installment_count > 1 ? `Venda parcelada em ${result.installment_count}x criada` : "Venda criada — estoque atualizado"
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const patient = patients.find((p) => p.id === patientId);
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] max-w-3xl overflow-y-auto", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: isEdit ? "Editar venda" : "Nova venda avulsa" }) }),
    loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-12", children: /* @__PURE__ */ jsx(Loader2, { className: "size-8 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "A venda gera cobrança, pacote de sessões (se aplicável) e baixa automática no estoque." }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Paciente *" }),
          /* @__PURE__ */ jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
            /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outline",
                className: "w-full justify-start font-normal",
                disabled: isEdit,
                children: patient ? patient.full_name : "Selecionar paciente…"
              }
            ) }),
            /* @__PURE__ */ jsx(PopoverContent, { className: "w-80 p-0", align: "start", children: /* @__PURE__ */ jsxs(Command, { shouldFilter: false, children: [
              /* @__PURE__ */ jsx(
                CommandInput,
                {
                  placeholder: "Buscar nome ou CPF…",
                  value: patientSearch,
                  onValueChange: setPatientSearch
                }
              ),
              /* @__PURE__ */ jsxs(CommandList, { children: [
                /* @__PURE__ */ jsx(CommandEmpty, { children: "Nenhum paciente" }),
                /* @__PURE__ */ jsx(CommandGroup, { children: filteredPatients.map((p) => /* @__PURE__ */ jsx(
                  CommandItem,
                  {
                    value: p.id,
                    onSelect: () => {
                      setPatientId(p.id);
                      setPatientOpen(false);
                    },
                    children: /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "font-medium", children: p.full_name }),
                      p.cpf && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: maskCPF(p.cpf) })
                    ] })
                  },
                  p.id
                )) })
              ] })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: paymentMode === "installment" ? "1ª parcela (vencimento) *" : "Vencimento *" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "date",
              value: dueDate,
              onChange: (e) => setDueDate(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-lg border p-3", children: [
        /* @__PURE__ */ jsx(Label, { children: "Forma de pagamento" }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setPaymentMode("cash"),
              className: cn(
                "flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors",
                paymentMode === "cash" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/50"
              ),
              children: "À vista"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setPaymentMode("installment"),
              className: cn(
                "flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors",
                paymentMode === "installment" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/50"
              ),
              children: "Parcelado"
            }
          )
        ] }),
        paymentMode === "installment" && /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { children: "Número de parcelas" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                min: 2,
                max: 48,
                value: installmentCount,
                onChange: (e) => setInstallmentCount(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { children: "Intervalo (meses)" }),
            /* @__PURE__ */ jsxs(Select, { value: installmentInterval, onValueChange: setInstallmentInterval, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "1", children: "Mensal" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "2", children: "Bimestral" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "3", children: "Trimestral" })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(Label, { children: "Procedimentos *" }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              onClick: () => setItems((arr) => [...arr, emptyItem()]),
              children: [
                /* @__PURE__ */ jsx(Plus, { className: "mr-1 size-3.5" }),
                "Adicionar"
              ]
            }
          )
        ] }),
        items.map((item, index) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_72px_120px_40px]",
            children: [
              /* @__PURE__ */ jsxs(
                Select,
                {
                  value: item.service_id ?? "",
                  onValueChange: (v) => pickService(index, v),
                  children: [
                    /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Procedimento" }) }),
                    /* @__PURE__ */ jsx(SelectContent, { children: services.map((s) => /* @__PURE__ */ jsxs(SelectItem, { value: s.id, children: [
                      s.name,
                      s.session_count > 1 ? ` (${s.session_count} sessões)` : ""
                    ] }, s.id)) })
                  ]
                }
              ),
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "number",
                  min: 1,
                  value: item.quantity,
                  onChange: (e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })
                }
              ),
              /* @__PURE__ */ jsx(
                Input,
                {
                  placeholder: "R$ 0,00",
                  value: item.unit_price ? fmt(item.unit_price) : "",
                  onChange: (e) => updateItem(index, { unit_price: parseBRLInput(e.target.value) })
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "icon",
                  disabled: items.length === 1,
                  onClick: () => setItems((arr) => arr.filter((_, i) => i !== index)),
                  children: /* @__PURE__ */ jsx(Trash2, { className: "size-4" })
                }
              )
            ]
          },
          index
        ))
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: notes,
            onChange: (e) => setNotes(e.target.value),
            rows: 2,
            placeholder: "Opcional"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-muted/50 px-4 py-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "Total da venda: " }),
          /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold", children: fmt(total) })
        ] }),
        installments.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 border-t pt-3", children: [
          /* @__PURE__ */ jsxs("p", { className: "mb-2 text-xs font-medium text-muted-foreground", children: [
            "Parcelas (",
            installments.length,
            "x)"
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "max-h-36 space-y-1 overflow-y-auto text-xs", children: installments.map((p) => /* @__PURE__ */ jsxs(
            "li",
            {
              className: "flex items-center justify-between rounded bg-background/80 px-2 py-1",
              children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  p.number,
                  "/",
                  installments.length,
                  " ·",
                  " ",
                  fmtDateFromDate(/* @__PURE__ */ new Date(p.dueDate + "T12:00:00"))
                ] }),
                /* @__PURE__ */ jsx("span", { className: "font-medium", children: fmt(p.amount) })
              ]
            },
            p.number
          )) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxs(Button, { onClick: () => void save(), disabled: saving || loading, children: [
        saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
        isEdit ? "Salvar alterações" : "Criar venda"
      ] })
    ] })
  ] }) });
}
function FinancialCobrancasTab() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionPct, setCommissionPct] = useState(0);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editBillId, setEditBillId] = useState(null);
  const [detailBillId, setDetailBillId] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBillId, setHistoryBillId] = useState(null);
  const period = periodFromYearMonth(currentYearMonth());
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: prof } = await supabase.from("profiles").select("commission_pct").eq("id", profile.id).maybeSingle();
    setCommissionPct(Number(prof?.commission_pct ?? 0));
    let q = supabase.from("bills_receivable").select(
      "id, description, amount, paid_amount, due_date, paid_date, competence_date, payment_method, status, notes, budget_id, patient_id, installment_number, installment_count, consultation_charge_id, patients(full_name)"
    ).or(`professional_id.eq.${profile.id},professional_id.is.null`).order("due_date", { ascending: false }).limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, [profile, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.description.toLowerCase().includes(q) || (r.patients?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);
  const stats = useMemo(() => {
    if (!period) return { production: 0, received: 0, pending: 0 };
    return computeCompetencePeriodStats(rows, period);
  }, [rows, period]);
  const commissionEst = stats.received * (commissionPct / 100);
  const detailBill = useMemo(
    () => rows.find((r) => r.id === detailBillId) ?? null,
    [rows, detailBillId]
  );
  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      await reverseSale(reverseTarget.id, "Estorno pelo profissional");
      toast.success(billHasSaleItems(reverseTarget) ? "Venda estornada" : "Cobrança cancelada");
      setReverseTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteBill(deleteTarget.id);
      toast.success("Cobrança excluída");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => {
        setHistoryBillId(null);
        setHistoryOpen(true);
      }, children: [
        /* @__PURE__ */ jsx(History, { className: "mr-2 size-4" }),
        "Histórico de pagamentos"
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: () => {
        setEditBillId(null);
        setSaleOpen(true);
      }, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Nova venda avulsa"
      ] })
    ] }),
    /* @__PURE__ */ jsx(PageSection, { title: "Resumo do mês", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Produção", value: fmt(stats.production), icon: Wallet }),
      /* @__PURE__ */ jsx(StatCard, { label: "Recebido", value: fmt(stats.received), icon: TrendingUp, tone: "success" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Pendente", value: fmt(stats.pending), icon: TrendingDown, tone: "warning" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Comissão estimada", value: fmt(commissionEst), sub: `${commissionPct}% sobre recebido`, icon: Wallet })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsx(Input, { placeholder: "Buscar paciente ou descrição…", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }),
      /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
          Object.entries(BILL_STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Recebido" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsx(TableHead, { className: "w-12" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 8, className: "py-10 text-center text-muted-foreground", children: "Nenhuma cobrança encontrada." }) }) : filtered.map((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return /* @__PURE__ */ jsxs(TableRow, { className: "cursor-pointer hover:bg-muted/50", onClick: () => setDetailBillId(r.id), children: [
          /* @__PURE__ */ jsx(TableCell, { children: r.patients?.full_name ?? "—" }),
          /* @__PURE__ */ jsxs(TableCell, { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm", children: r.description }),
            billIsInstallment(r) && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "mt-1 text-[10px]", children: [
              "Parcela ",
              r.installment_number,
              "/",
              r.installment_count
            ] })
          ] }),
          /* @__PURE__ */ jsx(TableCell, { children: fmt(r.amount) }),
          /* @__PURE__ */ jsx(TableCell, { children: fmt(r.paid_amount) }),
          /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—" }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[eff], children: BILL_STATUS_LABEL[eff] }) }),
          /* @__PURE__ */ jsx(TableCell, { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "size-8", children: /* @__PURE__ */ jsx(MoreHorizontal, { className: "size-4" }) }) }),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => setDetailBillId(r.id), children: [
                /* @__PURE__ */ jsx(HandCoins, { className: "mr-2 size-4" }),
                "Abrir conta"
              ] }),
              billIsEditable(r) && /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => {
                setEditBillId(r.id);
                setSaleOpen(true);
              }, children: [
                /* @__PURE__ */ jsx(Pencil, { className: "mr-2 size-4" }),
                "Editar venda"
              ] }),
              billCanReverse(r) && /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => setReverseTarget(r), children: [
                /* @__PURE__ */ jsx(RotateCcw, { className: "mr-2 size-4" }),
                "Estornar"
              ] }),
              billCanDelete(r) && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
                /* @__PURE__ */ jsxs(DropdownMenuItem, { className: "text-destructive focus:text-destructive", onClick: () => setDeleteTarget(r), children: [
                  /* @__PURE__ */ jsx(Trash2, { className: "mr-2 size-4" }),
                  "Excluir"
                ] })
              ] })
            ] })
          ] }) })
        ] }, r.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsx(StandaloneSaleDialog, { open: saleOpen, onOpenChange: setSaleOpen, billId: editBillId, onSaved: () => void load() }),
    /* @__PURE__ */ jsx(BillDetailDialog, { open: Boolean(detailBillId), onOpenChange: (open) => !open && setDetailBillId(null), bill: detailBill, onChanged: () => void load() }),
    /* @__PURE__ */ jsx(PaymentHistoryDialog, { open: historyOpen, onOpenChange: setHistoryOpen, billId: historyBillId, onChanged: () => void load() }),
    /* @__PURE__ */ jsx(AlertDialog, { open: Boolean(reverseTarget), onOpenChange: (o) => !o && setReverseTarget(null), children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Estornar cobrança?" }),
        /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
          "A cobrança ",
          /* @__PURE__ */ jsx("strong", { children: reverseTarget?.description }),
          " será cancelada."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { disabled: actionLoading, children: "Voltar" }),
        /* @__PURE__ */ jsx(AlertDialogAction, { className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", disabled: actionLoading, onClick: (e) => {
          e.preventDefault();
          void confirmReverse();
        }, children: "Confirmar estorno" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(AlertDialog, { open: Boolean(deleteTarget), onOpenChange: (o) => !o && setDeleteTarget(null), children: /* @__PURE__ */ jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsx(AlertDialogTitle, { children: "Excluir cobrança?" }),
        /* @__PURE__ */ jsxs(AlertDialogDescription, { children: [
          "A cobrança ",
          /* @__PURE__ */ jsx("strong", { children: deleteTarget?.description }),
          " será removida permanentemente."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsx(AlertDialogCancel, { disabled: actionLoading, children: "Cancelar" }),
        /* @__PURE__ */ jsx(AlertDialogAction, { className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", disabled: actionLoading, onClick: (e) => {
          e.preventDefault();
          void confirmDelete();
        }, children: "Excluir" })
      ] })
    ] }) })
  ] });
}
export {
  FinancialCobrancasTab
};
