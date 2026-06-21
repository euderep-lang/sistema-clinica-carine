import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { P as PageSection } from "./page-section-B6uCwEd5.mjs";
import { S as StatCard } from "./stat-card-BAwtn22B.mjs";
import { u as useAuth, L as Label, I as Input, C as Card, b as CardHeader, e as CardTitle, f as CardContent, q as Badge, af as PAYMENT_LABEL, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell } from "./router-DcWaovdP.mjs";
import { t as todayISO, s as supabase, d as fmt, f as fmtDate } from "./index.mjs";
import { l as loadProfessionalExpenses } from "./expenses-ZJLXZZvE.mjs";
import "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { a$ as ArrowDownLeft, ac as Landmark, b0 as ArrowUpRight } from "../_libs/lucide-react.mjs";
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
function FinancialCaixaTab() {
  const { profile } = useAuth();
  const [date, setDate] = reactExports.useState(todayISO());
  const [search, setSearch] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [payments, setPayments] = reactExports.useState([]);
  const [expenses, setExpenses] = reactExports.useState([]);
  const load = reactExports.useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [{ data: payData }, expenseData] = await Promise.all([
      supabase.from("bill_payments").select(
        "id, amount, net_amount, fee_amount, payment_method, paid_date, notes, patients(full_name), bills_receivable(description)"
      ).eq("professional_id", profile.id).eq("status", "active").eq("paid_date", date).order("created_at", { ascending: false }),
      loadProfessionalExpenses(profile.id, {
        from: date,
        to: date,
        dateField: "paid_date",
        status: "paid"
      })
    ]);
    setPayments(payData ?? []);
    setExpenses(expenseData);
    setLoading(false);
  }, [profile, date]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const filteredPayments = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) => (p.patients?.full_name?.toLowerCase().includes(q) ?? false) || (p.bills_receivable?.description?.toLowerCase().includes(q) ?? false) || (p.notes?.toLowerCase().includes(q) ?? false)
    );
  }, [payments, search]);
  const filteredExpenses = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => e.description.toLowerCase().includes(q));
  }, [expenses, search]);
  const stats = reactExports.useMemo(() => {
    const inflow = payments.reduce((s, p) => s + Number(p.net_amount ?? p.amount), 0);
    const fees = payments.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
    const outflow = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byMethod = /* @__PURE__ */ new Map();
    for (const p of payments) {
      const k = p.payment_method;
      byMethod.set(k, (byMethod.get(k) ?? 0) + Number(p.net_amount ?? p.amount));
    }
    return { inflow, fees, outflow, balance: inflow - outflow, byMethod };
  }, [payments, expenses]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Data do caixa" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-44" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Input,
        {
          placeholder: "Buscar movimentação…",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          className: "w-64"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageSection, { title: `Caixa — ${fmtDate(date)}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Entradas (líquido)", value: fmt(stats.inflow), icon: ArrowDownLeft, tone: "success" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Taxas", value: fmt(stats.fees), icon: Landmark, tone: "warning" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Saídas", value: fmt(stats.outflow), icon: ArrowUpRight, tone: "danger" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Saldo do dia", value: fmt(stats.balance), icon: Landmark })
    ] }) }),
    stats.byMethod.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Entradas por forma de pagamento" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "flex flex-wrap gap-2", children: Array.from(stats.byMethod.entries()).map(([method, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "px-3 py-1", children: [
        PAYMENT_LABEL[method] ?? method,
        ": ",
        fmt(value)
      ] }, method)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base text-emerald-700", children: "Recebimentos do dia" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Paciente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Descrição" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Forma" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Líquido" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Carregando…" }) }) : filteredPayments.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Nenhum recebimento neste dia." }) }) : filteredPayments.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: p.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "max-w-[160px] truncate text-sm", children: p.bills_receivable?.description ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: PAYMENT_LABEL[p.payment_method] ?? p.payment_method }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right font-medium", children: fmt(p.net_amount ?? p.amount) })
          ] }, p.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base text-red-700", children: "Despesas pagas no dia" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Descrição" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Categoria" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Forma" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Valor" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Carregando…" }) }) : filteredExpenses.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Nenhuma despesa paga neste dia." }) }) : filteredExpenses.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.category ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: e.payment_method ? PAYMENT_LABEL[e.payment_method] : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right font-medium", children: fmt(e.amount) })
          ] }, e.id)) })
        ] }) })
      ] })
    ] })
  ] });
}
export {
  FinancialCaixaTab
};
