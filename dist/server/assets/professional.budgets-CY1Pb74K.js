import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2, Plus, Receipt, Pencil, FileDown, Send, CheckCircle2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { t as todayISO, s as supabase, d as fmt, p as parseBRLInput, O as shiftDateISO, f as fmtDate, g as getTenantSetting, U as formatClinicAddress } from "../server.js";
import { u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, g as Popover, h as PopoverTrigger, B as Button, j as PopoverContent, $ as Command, a0 as CommandInput, a1 as CommandList, a2 as CommandEmpty, a3 as CommandGroup, a4 as CommandItem, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, a5 as BUDGET_STATUS_LABEL, I as Input, T as Textarea, y as DialogFooter, D as DashboardShell, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, a6 as BUDGET_STATUS_CLASS, a7 as loadLetterheadForPdf, a8 as generateBudgetPDF } from "./router-DKQJQoSP.js";
import { m as maskCPF } from "./patient-utils-YNqCHR6o.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { S as StatCard } from "./stat-card-CXtIWEk7.js";
import { P as PageSection } from "./page-section-DYrcOGE9.js";
import "node:crypto";
import "@supabase/supabase-js";
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
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [date, setDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState("draft");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [converted, setConverted] = useState(false);
  const [budgetNumber, setBudgetNumber] = useState(null);
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
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || (p.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    ).slice(0, 30);
  }, [patients, patientSearch]);
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items]
  );
  const discountValue = useMemo(() => {
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
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] max-w-3xl overflow-y-auto", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: budgetId && budgetNumber ? `Orçamento #${budgetNumber}` : "Novo orçamento" }) }),
    loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-12", children: /* @__PURE__ */ jsx(Loader2, { className: "size-8 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      converted && /* @__PURE__ */ jsx("p", { className: "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900", children: "Este orçamento já foi convertido em venda e não pode mais ser editado." }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Paciente *" }),
          /* @__PURE__ */ jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
            /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outline",
                className: "w-full justify-start font-normal",
                disabled: readOnly,
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
          /* @__PURE__ */ jsx(Label, { children: "Situação" }),
          /* @__PURE__ */ jsxs(
            Select,
            {
              value: status,
              onValueChange: (v) => setStatus(v),
              disabled: readOnly,
              children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsx(SelectContent, { children: EDITABLE_STATUSES.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s, children: BUDGET_STATUS_LABEL[s] }, s)) })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Data" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "date",
              value: date,
              onChange: (e) => setDate(e.target.value),
              disabled: readOnly
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Válido até" }),
          /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Procedimentos" }),
        items.map((it, i) => /* @__PURE__ */ jsxs("div", { className: "grid gap-2 rounded-lg border p-3 sm:grid-cols-12", children: [
          /* @__PURE__ */ jsx("div", { className: "sm:col-span-4", children: /* @__PURE__ */ jsxs(
            Select,
            {
              value: it.service_id ?? "",
              onValueChange: (v) => pickService(i, v),
              disabled: readOnly,
              children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Procedimento" }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: services.map((s) => /* @__PURE__ */ jsxs(SelectItem, { value: s.id, children: [
                  s.name,
                  " — ",
                  fmt(s.default_price),
                  s.session_count > 1 ? ` (${s.session_count} sessões)` : ""
                ] }, s.id)) })
              ]
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "sm:col-span-3", children: /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: "Descrição",
              value: it.description,
              onChange: (e) => updateItem(i, { description: e.target.value }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "sm:col-span-1", children: /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              min: 1,
              value: it.quantity,
              onChange: (e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: "Preço unit.",
              value: it.unit_price ? fmt(it.unit_price) : "",
              onChange: (e) => updateItem(i, { unit_price: parseBRLInput(e.target.value) }),
              disabled: readOnly
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between sm:col-span-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: fmt(it.quantity * it.unit_price) }),
            !readOnly && items.length > 1 && /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: () => setItems((a) => a.filter((_, j) => j !== i)), children: /* @__PURE__ */ jsx(Trash2, { className: "size-4" }) })
          ] })
        ] }, i)),
        !readOnly && /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: () => setItems((a) => [...a, emptyItem()]), children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-1 size-4" }),
          "Adicionar procedimento"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx(Label, { children: "Desconto (%)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: discountPercent,
              onChange: (e) => setDiscountPercent(e.target.value),
              disabled: readOnly
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-muted/40 p-3 sm:col-span-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Subtotal" }),
            /* @__PURE__ */ jsx("span", { children: fmt(subtotal) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsx("span", { children: "Desconto" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "- ",
              fmt(discountValue)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex justify-between font-semibold", children: [
            /* @__PURE__ */ jsx("span", { children: "Total" }),
            /* @__PURE__ */ jsx("span", { children: fmt(finalValue) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), children: "Cancelar" }),
      !readOnly && /* @__PURE__ */ jsx(Button, { onClick: () => void save(), disabled: saving || loading, children: saving ? "Salvando…" : budgetId ? "Salvar alterações" : "Criar orçamento" })
    ] })
  ] }) });
}
function statusBadge(status) {
  return /* @__PURE__ */ jsx(Badge, { className: BUDGET_STATUS_CLASS[status] ?? "bg-gray-100 text-gray-700", children: BUDGET_STATUS_LABEL[status] ?? status });
}
function ProfessionalBudgetsPage() {
  const {
    profile,
    tenant
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [convertedIds, setConvertedIds] = useState(/* @__PURE__ */ new Set());
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const load = useCallback(async () => {
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
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.number).includes(q) || (r.patients?.full_name?.toLowerCase().includes(q) ?? false));
  }, [rows, search]);
  const totals = useMemo(() => ({
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
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Orçamentos", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "Orçamentos", description: "Propostas de tratamento — crie, envie ao paciente e converta em venda.", actions: /* @__PURE__ */ jsxs(Button, { onClick: openCreate, children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Novo orçamento"
      ] }) }),
      /* @__PURE__ */ jsx(PageSection, { title: "Resumo", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsx(StatCard, { label: "Total de orçamentos", value: totals.count, icon: Receipt }),
        /* @__PURE__ */ jsx(StatCard, { label: "Valor total", value: fmt(totals.value), icon: Receipt }),
        /* @__PURE__ */ jsx(StatCard, { label: "Aprovados", value: totals.approved, icon: Receipt, tone: "success" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsx(Input, { placeholder: "Buscar por paciente ou número…", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }),
        /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
            Object.entries(BUDGET_STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Nº" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Validade" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Nenhum orçamento encontrado." }) }) : filtered.map((r) => {
          const converted = convertedIds.has(r.id);
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxs(TableCell, { className: "font-mono", children: [
              "#",
              r.number
            ] }),
            /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.date) }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.valid_until) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(r.final_value) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1", children: [
              statusBadge(r.status),
              converted && /* @__PURE__ */ jsx(Badge, { className: "bg-emerald-600 text-white hover:bg-emerald-600", children: "Vendido" })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => openEdit(r.id), title: "Editar", children: /* @__PURE__ */ jsx(Pencil, { className: "size-4" }) }),
              /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => void exportPdf(r), title: "PDF", children: /* @__PURE__ */ jsx(FileDown, { className: "size-4" }) }),
              r.status === "draft" && !converted && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => void updateStatus(r.id, "sent"), title: "Marcar como enviado", children: [
                /* @__PURE__ */ jsx(Send, { className: "mr-1 size-3" }),
                "Enviar"
              ] }),
              (r.status === "draft" || r.status === "sent") && !converted && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => void updateStatus(r.id, "approved"), title: "Aprovar orçamento", children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1 size-3" }),
                "Aprovar"
              ] }),
              r.status === "approved" && !converted && /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => void convertToSale(r), disabled: convertingId === r.id, title: "Converter em venda", children: [
                /* @__PURE__ */ jsx(ShoppingCart, { className: "mr-1 size-3" }),
                "Converter"
              ] }),
              converted && r.patient_id && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => navigate({
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
    /* @__PURE__ */ jsx(BudgetFormDialog, { open: formOpen, onOpenChange: setFormOpen, budgetId: editId, onSaved: () => void load() })
  ] });
}
export {
  ProfessionalBudgetsPage as component
};
