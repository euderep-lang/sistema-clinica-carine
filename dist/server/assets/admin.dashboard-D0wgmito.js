import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { u as useAuth, C as Card, f as CardContent, b as CardHeader, e as CardTitle, L as Label, I as Input, B as Button, q as Badge, T as Textarea, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, D as DashboardShell } from "./router-DKQJQoSP.js";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Lock, Unlock, Users, Calendar, Wallet, Package, Stethoscope } from "lucide-react";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-DYrcOGE9.js";
import { S as StatCard } from "./stat-card-CXtIWEk7.js";
import { T as TableSkeleton } from "./feedback-states-giGuNdjc.js";
import { toast } from "sonner";
import { ae as currentYearMonth, s as supabase, d as fmt, t as todayISO } from "../server.js";
import { p as periodFromYearMonth, b as buildProfessionalProduction, e as effectiveCommissionPct, c as commissionValue } from "./commission-DZcFPis-.js";
import { c as chartMoneyMargin, a as chartMoneyYAxisProps, f as fmtChartMoneyTooltip } from "./chart-format-g1tKzfTG.js";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import "@tanstack/react-query";
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
import "./financial-competence-CrKl4Oe7.js";
function CommissionClosing({ yearMonth: controlledMonth, onYearMonthChange }) {
  const { profile } = useAuth();
  const [internalMonth, setInternalMonth] = useState(currentYearMonth());
  const yearMonth = controlledMonth ?? internalMonth;
  const setYearMonth = onYearMonthChange ?? setInternalMonth;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [closings, setClosings] = useState([]);
  const [liveStats, setLiveStats] = useState([]);
  const [draftPct, setDraftPct] = useState({});
  const [draftNotes, setDraftNotes] = useState("");
  const period = useMemo(() => periodFromYearMonth(yearMonth), [yearMonth]);
  const isClosed = closings.length > 0 && closings.every((c) => c.status === "closed");
  const load = useCallback(async () => {
    if (!profile || !period) return;
    setLoading(true);
    try {
      const [{ data: profs }, { data: bills }, { data: appts }, { data: existing }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, specialty, commission_pct").eq("role", "professional").eq("active", true),
        supabase.from("bills_receivable").select(
          "id, professional_id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id"
        ).or(
          `and(competence_date.gte.${period.from},competence_date.lte.${period.to}),and(paid_date.gte.${period.from},paid_date.lte.${period.to})`
        ),
        supabase.from("appointments").select("professional_id, status, date").eq("status", "completed").gte("date", period.from).lte("date", period.to),
        supabase.from("commission_closings").select(
          "id, professional_id, period_year, period_month, appointments_completed, production_total, received_total, pending_total, base_commission_pct, adjusted_commission_pct, commission_amount, status, notes, professional:profiles!commission_closings_professional_id_fkey(full_name)"
        ).eq("period_year", period.year).eq("period_month", period.month)
      ]);
      const stats = buildProfessionalProduction(
        profs ?? [],
        bills ?? [],
        appts ?? [],
        period
      );
      setLiveStats(stats);
      setClosings(existing ?? []);
      const pctDraft = {};
      for (const c of existing ?? []) {
        const pct = effectiveCommissionPct(c.base_commission_pct, c.adjusted_commission_pct);
        pctDraft[c.professional_id] = String(pct);
      }
      for (const s of stats) {
        if (!pctDraft[s.id]) pctDraft[s.id] = String(s.commissionPct);
      }
      setDraftPct(pctDraft);
      setDraftNotes((existing ?? [])[0]?.notes ?? "");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile, period]);
  useEffect(() => {
    void load();
  }, [load]);
  const displayRows = useMemo(() => {
    if (closings.length > 0) {
      return closings.map((c) => {
        const pct = effectiveCommissionPct(c.base_commission_pct, c.adjusted_commission_pct);
        return {
          id: c.professional_id,
          name: c.professional?.full_name ?? "—",
          appointments: c.appointments_completed,
          production: Number(c.production_total),
          received: Number(c.received_total),
          pending: Number(c.pending_total),
          commissionPct: pct,
          commissionAmount: Number(c.commission_amount),
          closingId: c.id,
          status: c.status
        };
      });
    }
    return liveStats.map((s) => ({
      id: s.id,
      name: s.name,
      appointments: s.appointments,
      production: s.production,
      received: s.received,
      pending: s.pending,
      commissionPct: s.commissionPct,
      commissionAmount: s.commissionAmount,
      closingId: null,
      status: "open"
    }));
  }, [closings, liveStats]);
  const totals = useMemo(
    () => displayRows.reduce(
      (acc, r) => ({
        appointments: acc.appointments + r.appointments,
        production: acc.production + r.production,
        received: acc.received + r.received,
        pending: acc.pending + r.pending,
        commission: acc.commission + r.commissionAmount
      }),
      { appointments: 0, production: 0, received: 0, pending: 0, commission: 0 }
    ),
    [displayRows]
  );
  const syncPeriod = async () => {
    if (!profile || !period || isClosed) return;
    setBusy(true);
    try {
      const rows = liveStats.map((s) => {
        const adjusted = Number(draftPct[s.id] ?? s.commissionPct);
        const pct = Number.isFinite(adjusted) ? adjusted : s.commissionPct;
        return {
          tenant_id: profile.tenant_id,
          professional_id: s.id,
          period_year: period.year,
          period_month: period.month,
          appointments_completed: s.appointments,
          production_total: s.production,
          received_total: s.received,
          pending_total: s.pending,
          base_commission_pct: s.commissionPct,
          adjusted_commission_pct: pct !== s.commissionPct ? pct : null,
          commission_amount: commissionValue(s.received, pct),
          status: "open",
          notes: draftNotes || null
        };
      });
      const { error } = await supabase.from("commission_closings").upsert(rows, {
        onConflict: "tenant_id,professional_id,period_year,period_month"
      });
      if (error) throw error;
      toast.success("Período atualizado com os dados do mês");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const closePeriod = async () => {
    if (!profile || !period) return;
    setBusy(true);
    try {
      if (closings.length === 0) await syncPeriod();
      const { error } = await supabase.from("commission_closings").update({
        status: "closed",
        closed_by: profile.id,
        closed_at: (/* @__PURE__ */ new Date()).toISOString(),
        notes: draftNotes || null
      }).eq("period_year", period.year).eq("period_month", period.month);
      if (error) throw error;
      toast.success("Mês fechado — comissões bloqueadas para edição automática");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const reopenPeriod = async () => {
    if (!profile || !period) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("commission_closings").update({ status: "open", closed_by: null, closed_at: null }).eq("period_year", period.year).eq("period_month", period.month);
      if (error) throw error;
      toast.success("Período reaberto para ajustes");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const saveOverride = async (professionalId) => {
    if (!period || isClosed) return;
    const stat = liveStats.find((s) => s.id === professionalId);
    if (!stat) return;
    const pct = Number(draftPct[professionalId]);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Comissão deve estar entre 0 e 100");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        professional_id: professionalId,
        period_year: period.year,
        period_month: period.month,
        appointments_completed: stat.appointments,
        production_total: stat.production,
        received_total: stat.received,
        pending_total: stat.pending,
        base_commission_pct: stat.commissionPct,
        adjusted_commission_pct: pct !== stat.commissionPct ? pct : null,
        commission_amount: commissionValue(stat.received, pct),
        status: "open",
        notes: draftNotes || null
      };
      const { error } = await supabase.from("commission_closings").upsert(payload, {
        onConflict: "tenant_id,professional_id,period_year,period_month"
      });
      if (error) throw error;
      toast.success("Comissão ajustada");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (!period) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-8 text-center text-muted-foreground", children: "Período inválido." }) });
  }
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Fechamento de comissão" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
          "Comissão calculada sobre o ",
          /* @__PURE__ */ jsx("strong", { children: "recebido no período" }),
          ". Ajuste retroativo antes de fechar o mês."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Mês de referência" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "month",
              value: yearMonth,
              onChange: (e) => setYearMonth(e.target.value),
              className: "w-40"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: () => void load(), disabled: loading, children: [
          /* @__PURE__ */ jsx(RefreshCw, { className: "mr-2 size-4" }),
          "Atualizar"
        ] }),
        !isClosed ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => void syncPeriod(), disabled: busy || loading, children: "Salvar período" }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "secondary", onClick: () => void closePeriod(), disabled: busy || loading, children: [
            /* @__PURE__ */ jsx(Lock, { className: "mr-2 size-4" }),
            "Fechar mês"
          ] })
        ] }) : /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => void reopenPeriod(), disabled: busy, children: [
          /* @__PURE__ */ jsx(Unlock, { className: "mr-2 size-4" }),
          "Reabrir mês"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Badge, { variant: isClosed ? "secondary" : "default", children: isClosed ? "Fechado" : "Em aberto" }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
          period.from,
          " até ",
          period.to
        ] })
      ] }),
      !isClosed && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Observações do fechamento" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: draftNotes,
            onChange: (e) => setDraftNotes(e.target.value),
            placeholder: "Ex.: Ajuste de comissão acordado com Dr. João…",
            rows: 2
          }
        )
      ] }),
      loading ? /* @__PURE__ */ jsx(TableSkeleton, {}) : displayRows.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-sm text-muted-foreground", children: "Nenhum profissional ativo no período." }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Consultas" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Produção" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Recebido" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Pendente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Comissão %" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor comissão" }),
          !isClosed && /* @__PURE__ */ jsx(TableHead, {})
        ] }) }),
        /* @__PURE__ */ jsxs(TableBody, { children: [
          displayRows.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: row.name }),
            /* @__PURE__ */ jsx(TableCell, { children: row.appointments }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(row.production) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(row.received) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-amber-600", children: fmt(row.pending) }),
            /* @__PURE__ */ jsx(TableCell, { children: isClosed ? /* @__PURE__ */ jsxs("span", { children: [
              row.commissionPct,
              "%"
            ] }) : /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                min: 0,
                max: 100,
                className: "w-20",
                value: draftPct[row.id] ?? String(row.commissionPct),
                onChange: (e) => setDraftPct((prev) => ({ ...prev, [row.id]: e.target.value }))
              }
            ) }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: fmt(
              isClosed ? row.commissionAmount : commissionValue(row.received, Number(draftPct[row.id] ?? row.commissionPct))
            ) }),
            !isClosed && /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => void saveOverride(row.id), disabled: busy, children: "Aplicar" }) })
          ] }, row.id)),
          /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/50 font-semibold", children: [
            /* @__PURE__ */ jsx(TableCell, { children: "Total" }),
            /* @__PURE__ */ jsx(TableCell, { children: totals.appointments }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(totals.production) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(totals.received) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-amber-600", children: fmt(totals.pending) }),
            /* @__PURE__ */ jsx(TableCell, {}),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(totals.commission) }),
            !isClosed && /* @__PURE__ */ jsx(TableCell, {})
          ] })
        ] })
      ] }) })
    ] })
  ] });
}
function AdminMasterDashboard() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [patientCount, setPatientCount] = useState(0);
  const [todayAppts, setTodayAppts] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [professionals, setProfessionals] = useState([]);
  const period = useMemo(() => periodFromYearMonth(yearMonth), [yearMonth]);
  const today = todayISO();
  const primary = tenant?.primary_color ?? "#1a2b4a";
  useEffect(() => {
    if (!period) return;
    (async () => {
      setLoading(true);
      const [
        { count: patients },
        { count: apptsToday },
        { data: profs },
        { data: bills },
        { data: appts },
        { data: inventory }
      ] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("date", today).neq("status", "cancelled"),
        supabase.from("profiles").select("id, full_name, specialty, commission_pct").eq("role", "professional").eq("active", true),
        supabase.from("bills_receivable").select(
          "id, professional_id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id"
        ).or(
          `and(competence_date.gte.${period.from},competence_date.lte.${period.to}),and(paid_date.gte.${period.from},paid_date.lte.${period.to})`
        ),
        supabase.from("appointments").select("professional_id, status, date").eq("status", "completed").gte("date", period.from).lte("date", period.to),
        supabase.from("inventory_items").select("id, current_stock, min_stock")
      ]);
      setPatientCount(patients ?? 0);
      setTodayAppts(apptsToday ?? 0);
      const inv = inventory ?? [];
      setLowStock(inv.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length);
      setProfessionals(
        buildProfessionalProduction(
          profs ?? [],
          bills ?? [],
          appts ?? [],
          period
        )
      );
      setLoading(false);
    })();
  }, [period, today]);
  const monthReceived = professionals.reduce((s, p) => s + p.received, 0);
  const monthProduction = professionals.reduce((s, p) => s + p.production, 0);
  const monthCommission = professionals.reduce((s, p) => s + p.commissionAmount, 0);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: "Controle geral da clínica",
        description: "Visão consolidada de operação, produção por profissional e fechamento de comissão."
      }
    ),
    /* @__PURE__ */ jsx(PageSection, { title: "Indicadores do mês", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Pacientes ativos", value: loading ? "…" : patientCount, icon: Users }),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          label: "Agendamentos hoje",
          value: loading ? "…" : todayAppts,
          icon: Calendar,
          sub: today
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          label: "Recebido no mês",
          value: loading ? "…" : fmt(monthReceived),
          icon: Wallet,
          tone: "success",
          sub: `Produção ${fmt(monthProduction)}`
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          label: "Itens em alerta de estoque",
          value: loading ? "…" : lowStock,
          icon: Package,
          tone: lowStock > 0 ? "warning" : "default",
          action: lowStock > 0 ? /* @__PURE__ */ jsx(Button, { variant: "link", size: "sm", className: "h-auto p-0", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/financial/inventory", children: "Ver estoque" }) }) : void 0
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs(
      PageSection,
      {
        title: "Produção por profissional",
        description: `Referência: ${yearMonth}. Comissão estimada total: ${loading ? "…" : fmt(monthCommission)}.`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "month",
                value: yearMonth,
                onChange: (e) => setYearMonth(e.target.value),
                className: "h-9 rounded-md border bg-background px-3 text-sm"
              }
            ),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/admin/relatorios", children: "Relatórios detalhados" }) }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/admin/services", children: "Catálogo de serviços" }) })
          ] }),
          loading ? /* @__PURE__ */ jsx(TableSkeleton, {}) : professionals.length === 0 ? /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-8 text-center text-muted-foreground", children: "Nenhum profissional ativo com movimentação no período." }) }) : /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_320px]", children: [
            /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold", children: "Ranking de produção" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(BarChart, { data: professionals, margin: chartMoneyMargin, children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", fontSize: 11, angle: -12, textAnchor: "end", height: 56 }),
                /* @__PURE__ */ jsx(YAxis, { fontSize: 11, ...chartMoneyYAxisProps }),
                /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmtChartMoneyTooltip(v) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "production", fill: primary, name: "Produção", radius: [4, 4, 0, 0] })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
              /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
                /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Consultas" }),
                /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Recebido" })
              ] }) }),
              /* @__PURE__ */ jsx(TableBody, { children: professionals.map((p) => /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsxs(TableCell, { children: [
                  /* @__PURE__ */ jsx("div", { className: "font-medium", children: p.name }),
                  p.specialty && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: p.specialty })
                ] }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: p.appointments }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: fmt(p.received) })
              ] }, p.id)) })
            ] }) }) })
          ] }),
          !loading && professionals.length > 0 && /* @__PURE__ */ jsx(Card, { className: "mt-4", children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Consultas" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Produção" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Recebido" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Pendente" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Comissão" }),
              /* @__PURE__ */ jsx(TableHead, { children: "%" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: professionals.map((p) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Stethoscope, { className: "size-4 text-muted-foreground" }),
                p.name
              ] }) }),
              /* @__PURE__ */ jsx(TableCell, { children: p.appointments }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(p.production) }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(p.received) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-amber-600", children: fmt(p.pending) }),
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: fmt(p.commissionAmount) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(Badge, { variant: "outline", children: [
                p.commissionPct,
                "%"
              ] }) })
            ] }, p.id)) })
          ] }) }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx(CommissionClosing, { yearMonth, onYearMonthChange: setYearMonth })
  ] });
}
function AdminDashboard() {
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Painel do Administrador", children: /* @__PURE__ */ jsx(AdminMasterDashboard, {}) });
}
export {
  AdminDashboard as component
};
