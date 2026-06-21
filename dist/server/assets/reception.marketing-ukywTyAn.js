import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate } from "@tanstack/react-router";
import { s as supabase, L as fmtDateFromDate, N as fmtDateTime, O as shiftDateISO, t as todayISO } from "../server.js";
import { useState, useEffect, useMemo } from "react";
import { Cake, Users, Megaphone, BarChart3, Send, Check, Download } from "lucide-react";
import { u as useAuth, D as DashboardShell, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, B as Button, C as Card, f as CardContent, b as CardHeader, e as CardTitle, A as Avatar, k as AvatarFallback, q as Badge, L as Label, T as Textarea, r as Checkbox, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, y as DialogFooter, z as randomUUID } from "./router-DKQJQoSP.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BKWVL3n-.js";
import { b as age, d as daysSince, C as CHANNEL_BADGE, a as applyVars, l as logMessage } from "./messaging-SkmwnP1o.js";
import { o as openCrmInbox } from "./crm-navigation-CSMuJWnR.js";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";
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
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "@radix-ui/react-tabs";
function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function MarketingPage() {
  const {
    tenant,
    profile
  } = useAuth();
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Campanhas", children: /* @__PURE__ */ jsxs(Tabs, { defaultValue: "aniversariantes", className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(TabsList, { children: [
      /* @__PURE__ */ jsxs(TabsTrigger, { value: "aniversariantes", children: [
        /* @__PURE__ */ jsx(Cake, { className: "size-4 mr-2" }),
        "Aniversariantes"
      ] }),
      /* @__PURE__ */ jsxs(TabsTrigger, { value: "inativos", children: [
        /* @__PURE__ */ jsx(Users, { className: "size-4 mr-2" }),
        "Pacientes Inativos"
      ] }),
      /* @__PURE__ */ jsxs(TabsTrigger, { value: "campanhas", children: [
        /* @__PURE__ */ jsx(Megaphone, { className: "size-4 mr-2" }),
        "Campanhas"
      ] }),
      /* @__PURE__ */ jsxs(TabsTrigger, { value: "relatorio", children: [
        /* @__PURE__ */ jsx(BarChart3, { className: "size-4 mr-2" }),
        "Relatório"
      ] })
    ] }),
    /* @__PURE__ */ jsx(TabsContent, { value: "aniversariantes", children: /* @__PURE__ */ jsx(AniversariantesTab, { tenantId: tenant?.id ?? "", tenantName: tenant?.name ?? "", userId: profile?.id ?? "" }) }),
    /* @__PURE__ */ jsx(TabsContent, { value: "inativos", children: /* @__PURE__ */ jsx(InativosTab, { tenantId: tenant?.id ?? "", tenantName: tenant?.name ?? "", userId: profile?.id ?? "" }) }),
    /* @__PURE__ */ jsx(TabsContent, { value: "campanhas", children: /* @__PURE__ */ jsx(CampanhasTab, { tenantId: tenant?.id ?? "", tenantName: tenant?.name ?? "", userId: profile?.id ?? "" }) }),
    /* @__PURE__ */ jsx(TabsContent, { value: "relatorio", children: /* @__PURE__ */ jsx(RelatorioTab, {}) })
  ] }) });
}
function AniversariantesTab({
  tenantId,
  tenantName,
  userId
}) {
  const navigate = useNavigate();
  const [month, setMonth] = useState((/* @__PURE__ */ new Date()).getMonth());
  const [patients, setPatients] = useState([]);
  const [template, setTemplate] = useState(null);
  const [contacted, setContacted] = useState({});
  useEffect(() => {
    (async () => {
      const {
        data
      } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true).not("birth_date", "is", null);
      setPatients(data ?? []);
      const {
        data: t
      } = await supabase.from("message_templates").select("id, name, channel, trigger, content, active").eq("trigger", "birthday").eq("active", true).limit(1);
      setTemplate(t?.[0] ?? null);
      const {
        data: logs
      } = await supabase.from("message_logs").select("patient_id, sent_at").gte("sent_at", new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() - 30)).toISOString());
      const map = {};
      (logs ?? []).forEach((l) => {
        if (l.patient_id) map[l.patient_id] = true;
      });
      setContacted(map);
    })();
  }, []);
  const monthPatients = useMemo(() => patients.filter((p) => p.birth_date && new Date(p.birth_date).getMonth() === month).sort((a, b) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate()), [patients, month]);
  const totalContacted = monthPatients.filter((p) => contacted[p.id]).length;
  async function sendBirthday(p) {
    if (!p.phone) {
      toast.error("Sem telefone");
      return;
    }
    const content = template ? applyVars(template.content, p, tenantName) : `Olá ${p.full_name}, a equipe ${tenantName} deseja um feliz aniversário! 🎉`;
    openCrmInbox(navigate, {
      patientId: p.id,
      phone: p.phone,
      draft: content
    });
    try {
      await logMessage({
        tenant_id: tenantId,
        patient_id: p.id,
        template_id: template?.id ?? null,
        channel: "whatsapp",
        content,
        sent_by: userId
      });
      setContacted({
        ...contacted,
        [p.id]: true
      });
    } catch {
      toast.error("Falha ao registrar");
    }
  }
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysInMonth = new Date((/* @__PURE__ */ new Date()).getFullYear(), month + 1, 0).getDate();
  const dayCounts = {};
  monthPatients.forEach((p) => {
    const d = new Date(p.birth_date).getDate();
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs(Select, { value: String(month), onValueChange: (v) => setMonth(Number(v)), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-56", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: monthNames.map((m, i) => /* @__PURE__ */ jsx(SelectItem, { value: String(i), children: m }, i)) })
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: async () => {
        if (!confirm(`Preparar mensagens de aniversário para ${monthPatients.length} pacientes no CRM?`)) return;
        toast.info("Envie cada mensagem pelo CRM clicando no paciente.");
      }, children: [
        /* @__PURE__ */ jsx(Send, { className: "size-4 mr-2" }),
        "Enviar para todos do mês"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Aniversariantes" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: monthPatients.length })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Já contatados" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-green-600", children: totalContacted })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Pendentes" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-amber-600", children: monthPatients.length - totalContacted })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base", children: [
        monthNames[month],
        " ",
        (/* @__PURE__ */ new Date()).getFullYear()
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-1 mb-4", children: Array.from({
        length: daysInMonth
      }, (_, i) => i + 1).map((d) => /* @__PURE__ */ jsxs("div", { className: `aspect-square rounded border text-center text-xs flex flex-col justify-center ${dayCounts[d] ? "bg-primary/10 border-primary" : "bg-muted/30"}`, children: [
        /* @__PURE__ */ jsx("div", { children: d }),
        dayCounts[d] && /* @__PURE__ */ jsx("div", { className: "text-[10px] font-semibold text-primary", children: dayCounts[d] })
      ] }, d)) }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "p-3" }),
        /* @__PURE__ */ jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsx("th", { children: "Aniversário" }),
        /* @__PURE__ */ jsx("th", { children: "Idade que fará" }),
        /* @__PURE__ */ jsx("th", { children: "Telefone" }),
        /* @__PURE__ */ jsx("th", { children: "Situação" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        monthPatients.map((p) => {
          const d = new Date(p.birth_date);
          const willTurn = (age(p.birth_date) ?? 0) + (d.getMonth() < (/* @__PURE__ */ new Date()).getMonth() || d.getMonth() === (/* @__PURE__ */ new Date()).getMonth() && d.getDate() < (/* @__PURE__ */ new Date()).getDate() ? 0 : 0);
          return /* @__PURE__ */ jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsx("td", { className: "p-3", children: /* @__PURE__ */ jsx(Avatar, { className: "size-8", children: /* @__PURE__ */ jsx(AvatarFallback, { children: initials(p.full_name) }) }) }),
            /* @__PURE__ */ jsx("td", { children: p.full_name }),
            /* @__PURE__ */ jsxs("td", { children: [
              String(d.getDate()).padStart(2, "0"),
              "/",
              String(d.getMonth() + 1).padStart(2, "0")
            ] }),
            /* @__PURE__ */ jsxs("td", { children: [
              willTurn + 1,
              " anos"
            ] }),
            /* @__PURE__ */ jsx("td", { children: p.phone ?? "—" }),
            /* @__PURE__ */ jsx("td", { children: contacted[p.id] ? /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "bg-green-100 text-green-800 border-green-200", children: [
              /* @__PURE__ */ jsx(Check, { className: "size-3 mr-1" }),
              "Contatado"
            ] }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Pendente" }) }),
            /* @__PURE__ */ jsx("td", { className: "pr-3", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => sendBirthday(p), children: "Enviar Parabéns" }) })
          ] }, p.id);
        }),
        monthPatients.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Sem aniversariantes neste mês" }) })
      ] })
    ] }) }) })
  ] });
}
function InativosTab({
  tenantId,
  tenantName,
  userId
}) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(90);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({});
  const [customMsg, setCustomMsg] = useState(`Olá {{nome_paciente}}, faz um tempo que não nos vemos. Que tal agendar uma consulta na ${"{{nome_clinica}}"}?`);
  useEffect(() => {
    (async () => {
      const {
        data: pts
      } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true);
      const {
        data: appts
      } = await supabase.from("appointments").select("patient_id, date, professional_id, profiles!appointments_professional_id_fkey(full_name)").order("date", {
        ascending: false
      });
      const last = {};
      (appts ?? []).forEach((a) => {
        if (!last[a.patient_id]) last[a.patient_id] = {
          date: a.date,
          prof: a.profiles?.full_name ?? null
        };
      });
      const result = (pts ?? []).map((p) => {
        const l = last[p.id];
        const d = l ? daysSince(l.date) ?? 99999 : 99999;
        return {
          ...p,
          last_appointment: l?.date ?? null,
          last_professional: l?.prof ?? null,
          days: d
        };
      }).filter((r) => r.days >= period).sort((a, b) => b.days - a.days);
      setRows(result);
    })();
  }, [period]);
  function dayColor(d) {
    if (d >= 365) return "text-red-600 font-semibold";
    if (d >= 180) return "text-orange-600 font-semibold";
    return "text-yellow-700 font-semibold";
  }
  async function sendReactivation(p) {
    if (!p.phone) {
      toast.error("Sem telefone");
      return;
    }
    const content = applyVars(customMsg, p, tenantName);
    openCrmInbox(navigate, {
      patientId: p.id,
      phone: p.phone,
      draft: content
    });
    try {
      await logMessage({
        tenant_id: tenantId,
        patient_id: p.id,
        channel: "whatsapp",
        content,
        sent_by: userId
      });
    } catch {
      toast.error("Falha ao registrar");
    }
  }
  async function bulkSend() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;
    toast.info(`${ids.length} paciente(s) selecionado(s). Envie pelo CRM clicando em cada um.`);
  }
  function exportCSV() {
    const csv = ["Nome,Telefone,Última Consulta,Profissional,Dias", ...rows.map((r) => [r.full_name, r.phone ?? "", r.last_appointment ?? "", r.last_professional ?? "", r.days].join(","))].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pacientes-inativos.csv";
    a.click();
  }
  const selectedCount = Object.values(selected).filter(Boolean).length;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Label, { className: "text-sm", children: "Sem consulta há mais de:" }),
      [90, 180, 365].map((d) => /* @__PURE__ */ jsx(Button, { size: "sm", variant: period === d ? "default" : "outline", onClick: () => setPeriod(d), children: d === 365 ? "1 ano" : `${d} dias` }, d)),
      /* @__PURE__ */ jsx("div", { className: "ml-auto", children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: exportCSV, children: [
        /* @__PURE__ */ jsx(Download, { className: "size-4 mr-2" }),
        "Exportar planilha"
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { className: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 text-sm text-amber-900 dark:text-amber-100", children: [
      /* @__PURE__ */ jsx("strong", { children: rows.length }),
      " pacientes inativos nos últimos ",
      period,
      " dias"
    ] }) }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Mensagem de reativação" }) }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsx(Textarea, { value: customMsg, onChange: (e) => setCustomMsg(e.target.value), rows: 3 }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
          "Variáveis: ",
          "{{nome_paciente}}",
          ", ",
          "{{nome_clinica}}"
        ] })
      ] })
    ] }),
    selectedCount > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center p-3 bg-primary/10 rounded-md", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
        selectedCount,
        " selecionado(s)"
      ] }),
      /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: bulkSend, children: [
        /* @__PURE__ */ jsx(Send, { className: "size-4 mr-2" }),
        "Enviar mensagem"
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "p-3", children: /* @__PURE__ */ jsx(Checkbox, { checked: selectedCount === rows.length && rows.length > 0, onCheckedChange: (v) => {
          const m = {};
          if (v) rows.forEach((r) => m[r.id] = true);
          setSelected(m);
        } }) }),
        /* @__PURE__ */ jsx("th", {}),
        /* @__PURE__ */ jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsx("th", { children: "Última consulta" }),
        /* @__PURE__ */ jsx("th", { children: "Profissional" }),
        /* @__PURE__ */ jsx("th", { children: "Telefone" }),
        /* @__PURE__ */ jsx("th", { children: "Dias" }),
        /* @__PURE__ */ jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        rows.slice(0, 50).map((r) => /* @__PURE__ */ jsxs("tr", { className: "border-t", children: [
          /* @__PURE__ */ jsx("td", { className: "p-3", children: /* @__PURE__ */ jsx(Checkbox, { checked: !!selected[r.id], onCheckedChange: (v) => setSelected({
            ...selected,
            [r.id]: !!v
          }) }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Avatar, { className: "size-8", children: /* @__PURE__ */ jsx(AvatarFallback, { children: initials(r.full_name) }) }) }),
          /* @__PURE__ */ jsx("td", { children: r.full_name }),
          /* @__PURE__ */ jsx("td", { children: r.last_appointment ? fmtDateFromDate(new Date(r.last_appointment)) : "—" }),
          /* @__PURE__ */ jsx("td", { children: r.last_professional ?? "—" }),
          /* @__PURE__ */ jsx("td", { children: r.phone ?? "—" }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", { className: dayColor(r.days), children: r.days >= 99999 ? "∞" : r.days }) }),
          /* @__PURE__ */ jsx("td", { className: "pr-3", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => sendReactivation(r), children: "Reativar" }) })
        ] }, r.id)),
        rows.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 8, className: "py-8 text-center text-muted-foreground", children: "Nenhum paciente inativo" }) })
      ] })
    ] }) }) })
  ] });
}
function CampanhasTab({
  tenantId,
  tenantName,
  userId
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [segment, setSegment] = useState("");
  const [patients, setPatients] = useState([]);
  const [segmentPatients, setSegmentPatients] = useState([]);
  const [channel, setChannel] = useState("whatsapp");
  const [templates, setTemplates] = useState([]);
  const [tplId, setTplId] = useState("custom");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendIndex, setSendIndex] = useState(0);
  useEffect(() => {
    (async () => {
      const {
        data: p
      } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true);
      setPatients(p ?? []);
      const {
        data: t
      } = await supabase.from("message_templates").select("id, name, channel, trigger, content, active").eq("active", true);
      setTemplates(t ?? []);
      try {
        setHistory(JSON.parse(localStorage.getItem("campaigns_history") ?? "[]"));
      } catch {
      }
    })();
  }, []);
  function pickSegment(s) {
    setSegment(s);
    const now = /* @__PURE__ */ new Date();
    let list = [];
    if (s === "all") list = patients;
    else if (s === "birthday") list = patients.filter((p) => p.birth_date && new Date(p.birth_date).getMonth() === now.getMonth());
    else if (s === "inactive90") list = patients;
    setSegmentPatients(list);
  }
  async function startCampaign() {
    setSendOpen(true);
    setSendIndex(0);
    const camp = {
      id: randomUUID(),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      segment,
      channel,
      count: segmentPatients.length,
      template: tplId === "custom" ? "Personalizado" : templates.find((t) => t.id === tplId)?.name ?? "—"
    };
    const next = [camp, ...history];
    setHistory(next);
    localStorage.setItem("campaigns_history", JSON.stringify(next));
  }
  async function sendNext() {
    const p = segmentPatients[sendIndex];
    if (!p) return;
    if (!p.phone) {
      setSendIndex(sendIndex + 1);
      return;
    }
    const tpl = templates.find((t) => t.id === tplId);
    const msg = tpl ? applyVars(tpl.content, p, tenantName) : applyVars(content, p, tenantName);
    openCrmInbox(navigate, {
      patientId: p.id,
      phone: p.phone,
      draft: msg
    });
    try {
      await logMessage({
        tenant_id: tenantId,
        patient_id: p.id,
        template_id: tplId === "custom" ? null : tplId,
        channel,
        content: msg,
        sent_by: userId
      });
    } catch {
    }
    setSendIndex(sendIndex + 1);
  }
  const channelTpls = templates.filter((t) => t.channel === channel);
  const segments = [{
    id: "all",
    label: "Todos os pacientes ativos",
    count: patients.length
  }, {
    id: "birthday",
    label: "Aniversariantes do mês",
    count: patients.filter((p) => p.birth_date && new Date(p.birth_date).getMonth() === (/* @__PURE__ */ new Date()).getMonth()).length
  }, {
    id: "inactive90",
    label: "Pacientes inativos +90 dias",
    count: patients.length
  }];
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Nova Campanha" }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsx("div", { className: "flex gap-2 text-sm", children: [1, 2, 3].map((s) => /* @__PURE__ */ jsxs("div", { className: `flex-1 p-2 rounded border ${step === s ? "border-primary bg-primary/10" : "border-muted"}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "font-semibold", children: [
            "Passo ",
            s
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: ["Segmento", "Mensagem", "Revisão"][s - 1] })
        ] }, s)) }),
        step === 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "grid gap-2 sm:grid-cols-3", children: segments.map((s) => /* @__PURE__ */ jsxs("button", { className: `p-4 rounded-lg border text-left ${segment === s.id ? "border-primary bg-primary/10" : ""}`, onClick: () => pickSegment(s.id), children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium text-sm", children: s.label }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
              s.count,
              " pacientes"
            ] })
          ] }, s.id)) }),
          /* @__PURE__ */ jsx(Button, { disabled: !segment, onClick: () => setStep(2), children: "Próximo" })
        ] }),
        step === 2 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Canal" }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-1", children: [
              /* @__PURE__ */ jsx(Button, { variant: channel === "whatsapp" ? "default" : "outline", onClick: () => setChannel("whatsapp"), children: "WhatsApp" }),
              /* @__PURE__ */ jsx(Button, { variant: channel === "sms" ? "default" : "outline", onClick: () => setChannel("sms"), children: "Mensagem de texto" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Modelo" }),
            /* @__PURE__ */ jsxs(Select, { value: tplId, onValueChange: (v) => {
              setTplId(v);
              if (v !== "custom") {
                const t = templates.find((x) => x.id === v);
                if (t) setContent(t.content);
              }
            }, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "custom", children: "Personalizado" }),
                channelTpls.map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t.id, children: t.name }, t.id))
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Conteúdo" }),
            /* @__PURE__ */ jsx(Textarea, { value: content, onChange: (e) => setContent(e.target.value), rows: 5 })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setStep(1), children: "Voltar" }),
            /* @__PURE__ */ jsx(Button, { disabled: !content.trim(), onClick: () => setStep(3), children: "Próximo" })
          ] })
        ] }),
        step === 3 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Segmento:" }),
              " ",
              segments.find((x) => x.id === segment)?.label
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Destinatários:" }),
              " ",
              segmentPatients.length
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Canal:" }),
              " ",
              channel
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-3 bg-muted rounded", children: [
              /* @__PURE__ */ jsx("strong", { children: "Mensagem:" }),
              /* @__PURE__ */ jsx("pre", { className: "whitespace-pre-wrap mt-1 text-xs", children: content })
            ] }),
            /* @__PURE__ */ jsxs("details", { children: [
              /* @__PURE__ */ jsx("summary", { className: "cursor-pointer", children: "Ver primeiros pacientes" }),
              /* @__PURE__ */ jsxs("ul", { className: "text-xs ml-4 mt-1", children: [
                segmentPatients.slice(0, 5).map((p) => /* @__PURE__ */ jsx("li", { children: p.full_name }, p.id)),
                segmentPatients.length > 5 && /* @__PURE__ */ jsxs("li", { children: [
                  "e mais ",
                  segmentPatients.length - 5
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setStep(2), children: "Voltar" }),
            /* @__PURE__ */ jsxs(Button, { onClick: startCampaign, children: [
              /* @__PURE__ */ jsx(Send, { className: "size-4 mr-2" }),
              "Iniciar Campanha"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: sendOpen, onOpenChange: setSendOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Envio em sequência" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
          "Enviado ",
          sendIndex,
          " de ",
          segmentPatients.length
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-2 bg-muted rounded", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-primary rounded transition-all", style: {
          width: `${sendIndex / Math.max(1, segmentPatients.length) * 100}%`
        } }) }),
        sendIndex < segmentPatients.length && /* @__PURE__ */ jsxs("div", { className: "p-3 border rounded text-sm", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: segmentPatients[sendIndex]?.full_name }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: segmentPatients[sendIndex]?.phone ?? "Sem telefone" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: sendIndex < segmentPatients.length ? /* @__PURE__ */ jsxs(Button, { onClick: sendNext, children: [
        /* @__PURE__ */ jsx(Send, { className: "size-4 mr-2" }),
        "Abrir no CRM"
      ] }) : /* @__PURE__ */ jsx(Button, { onClick: () => {
        setSendOpen(false);
        setStep(1);
        setSegment("");
        setContent("");
      }, children: "Concluir" }) })
    ] }) }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Histórico de Campanhas" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "p-3", children: "Data" }),
          /* @__PURE__ */ jsx("th", { children: "Segmento" }),
          /* @__PURE__ */ jsx("th", { children: "Canal" }),
          /* @__PURE__ */ jsx("th", { children: "Total" }),
          /* @__PURE__ */ jsx("th", { children: "Modelo" })
        ] }) }),
        /* @__PURE__ */ jsxs("tbody", { children: [
          history.map((c) => /* @__PURE__ */ jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsx("td", { className: "p-3", children: fmtDateTime(c.date) }),
            /* @__PURE__ */ jsx("td", { children: c.segment }),
            /* @__PURE__ */ jsx("td", { children: c.channel }),
            /* @__PURE__ */ jsx("td", { children: c.count }),
            /* @__PURE__ */ jsx("td", { children: c.template })
          ] }, c.id)),
          history.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 5, className: "py-8 text-center text-muted-foreground", children: "Sem campanhas ainda" }) })
        ] })
      ] }) })
    ] })
  ] });
}
function RelatorioTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    (async () => {
      const since = /* @__PURE__ */ new Date();
      since.setDate(since.getDate() - 30);
      const {
        data
      } = await supabase.from("message_logs").select("sent_at, channel, patient_id, template_id, message_templates(name)").gte("sent_at", since.toISOString()).order("sent_at");
      setLogs(data ?? []);
    })();
  }, []);
  const total = logs.length;
  const whatsapp = logs.filter((l) => l.channel === "whatsapp").length;
  const sms = logs.filter((l) => l.channel === "sms").length;
  const reach = new Set(logs.map((l) => l.patient_id).filter(Boolean)).size;
  const byDay = {};
  for (let i = 29; i >= 0; i--) {
    const k = shiftDateISO(todayISO(), -i).slice(5, 10);
    byDay[k] = {
      day: k,
      whatsapp: 0,
      sms: 0
    };
  }
  logs.forEach((l) => {
    const k = l.sent_at.slice(5, 10);
    if (byDay[k]) {
      if (l.channel === "whatsapp") byDay[k].whatsapp++;
      else if (l.channel === "sms") byDay[k].sms++;
    }
  });
  const dayData = Object.values(byDay);
  const tplCounts = {};
  logs.forEach((l) => {
    const name = l.message_templates?.name ?? "Personalizado";
    if (!tplCounts[name]) tplCounts[name] = {
      name,
      count: 0,
      channel: l.channel,
      last: l.sent_at
    };
    tplCounts[name].count++;
    if (l.sent_at > tplCounts[name].last) tplCounts[name].last = l.sent_at;
  });
  const topTpls = Object.values(tplCounts).sort((a, b) => b.count - a.count).slice(0, 5);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid gap-3 grid-cols-2 md:grid-cols-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Total enviadas (30d)" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: total })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "WhatsApp" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-green-600", children: whatsapp })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Mensagem de texto" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold text-blue-600", children: sms })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Pacientes alcançados" }),
        /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: reach })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Mensagens por dia" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(BarChart, { data: dayData, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
        /* @__PURE__ */ jsx(XAxis, { dataKey: "day", fontSize: 11 }),
        /* @__PURE__ */ jsx(YAxis, { fontSize: 11 }),
        /* @__PURE__ */ jsx(Tooltip, {}),
        /* @__PURE__ */ jsx(Legend, {}),
        /* @__PURE__ */ jsx(Bar, { dataKey: "whatsapp", stackId: "a", fill: "#22c55e", name: "WhatsApp" }),
        /* @__PURE__ */ jsx(Bar, { dataKey: "sms", stackId: "a", fill: "#3b82f6", name: "Mensagem de texto" })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Top 5 modelos mais utilizados" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        topTpls.map((t) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-40 text-sm truncate", children: t.name }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 h-6 bg-muted rounded relative", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-primary rounded", style: {
            width: `${t.count / topTpls[0].count * 100}%`
          } }) }),
          /* @__PURE__ */ jsx("div", { className: "w-12 text-right text-sm font-semibold", children: t.count })
        ] }, t.name)),
        topTpls.length === 0 && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground text-center py-4", children: "Sem dados" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Detalhamento por modelo" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "p-3", children: "Nome" }),
          /* @__PURE__ */ jsx("th", { children: "Canal" }),
          /* @__PURE__ */ jsx("th", { children: "Vezes usado" }),
          /* @__PURE__ */ jsx("th", { children: "Último uso" })
        ] }) }),
        /* @__PURE__ */ jsxs("tbody", { children: [
          Object.values(tplCounts).map((t) => /* @__PURE__ */ jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsx("td", { className: "p-3", children: t.name }),
            /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", className: CHANNEL_BADGE[t.channel]?.cls, children: CHANNEL_BADGE[t.channel]?.label ?? t.channel }) }),
            /* @__PURE__ */ jsx("td", { children: t.count }),
            /* @__PURE__ */ jsx("td", { children: fmtDateTime(t.last) })
          ] }, t.name)),
          Object.values(tplCounts).length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 4, className: "py-6 text-center text-muted-foreground", children: "Sem dados" }) })
        ] })
      ] }) })
    ] })
  ] });
}
export {
  MarketingPage as component
};
