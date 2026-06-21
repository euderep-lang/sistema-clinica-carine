import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { s as supabase, K as fmtTimeFromDate, M as tomorrowISO, f as fmtDate } from "./index.mjs";
import { u as useAuth, D as DashboardShell, C as Card, b as CardHeader, e as CardTitle, f as CardContent, L as Label, g as Popover, h as PopoverTrigger, B as Button, j as PopoverContent, I as Input, A as Avatar, k as AvatarFallback, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, T as Textarea, q as Badge } from "./router-DcWaovdP.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BH0EiCRX.mjs";
import { a as applyVars, f as formatDateTimeBR, C as CHANNEL_BADGE, S as STATUS_BADGE, l as logMessage } from "./messaging-DWA-MxWT.mjs";
import { o as openCrmInbox } from "./crm-navigation-CWVrTkjz.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { S as Search, M as MessageSquare, J as Phone, K as Send, a as Check, N as ExternalLink } from "../_libs/lucide-react.mjs";
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
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
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
import "../_libs/isbot.mjs";
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
import "../_libs/radix-ui__react-tabs.mjs";
function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function MensagensPage() {
  const {
    profile,
    tenant
  } = useAuth();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Mensagens", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: "enviar", className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "enviar", children: "Enviar mensagem" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "lembretes", children: "Lembretes de amanhã" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "enviar", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EnviarTab, { tenantId: tenant?.id ?? "", tenantName: tenant?.name ?? "", userId: profile?.id ?? "" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "lembretes", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RemindersTab, { tenantId: tenant?.id ?? "", tenantName: tenant?.name ?? "", userId: profile?.id ?? "" }) })
  ] }) });
}
function EnviarTab({
  tenantId,
  tenantName,
  userId
}) {
  const navigate = useNavigate();
  const [patients, setPatients] = reactExports.useState([]);
  const [templates, setTemplates] = reactExports.useState([]);
  const [logs, setLogs] = reactExports.useState([]);
  const [patientQuery, setPatientQuery] = reactExports.useState("");
  const [patient, setPatient] = reactExports.useState(null);
  const [channel, setChannel] = reactExports.useState("whatsapp");
  const [tplId, setTplId] = reactExports.useState("custom");
  const [content, setContent] = reactExports.useState("");
  const [filterChannel, setFilterChannel] = reactExports.useState("all");
  const [filterStatus, setFilterStatus] = reactExports.useState("all");
  const [search, setSearch] = reactExports.useState("");
  reactExports.useEffect(() => {
    (async () => {
      const {
        data: p
      } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true).order("full_name").limit(500);
      setPatients(p ?? []);
      const {
        data: t
      } = await supabase.from("message_templates").select("id, name, channel, trigger, content, active").eq("active", true).order("name");
      setTemplates(t ?? []);
      await loadLogs();
    })();
  }, []);
  async function loadLogs() {
    const {
      data
    } = await supabase.from("message_logs").select("id, sent_at, channel, content, status, patient_id, template_id, patients(full_name), message_templates(name)").order("sent_at", {
      ascending: false
    }).limit(50);
    setLogs(data ?? []);
  }
  const filteredPatients = reactExports.useMemo(() => {
    const q = patientQuery.toLowerCase().trim();
    if (!q) return patients.slice(0, 8);
    return patients.filter((p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)).slice(0, 10);
  }, [patients, patientQuery]);
  const channelTemplates = templates.filter((t) => t.channel === channel);
  function selectTemplate(id) {
    setTplId(id);
    if (id === "custom") {
      setContent("");
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (t && patient) setContent(applyVars(t.content, patient, tenantName));
    else if (t) setContent(t.content);
  }
  reactExports.useEffect(() => {
    if (tplId !== "custom" && patient) {
      const t = templates.find((x) => x.id === tplId);
      if (t) setContent(applyVars(t.content, patient, tenantName));
    }
  }, [patient?.id]);
  async function send() {
    if (!patient) {
      toast.error("Selecione um paciente");
      return;
    }
    if (!content.trim()) {
      toast.error("Mensagem vazia");
      return;
    }
    if (channel === "whatsapp") {
      if (!patient.phone) {
        toast.error("Paciente sem telefone");
        return;
      }
      openCrmInbox(navigate, {
        patientId: patient.id,
        phone: patient.phone,
        draft: content
      });
    } else {
      await navigator.clipboard.writeText(content).catch(() => {
      });
      toast.info("Integração de mensagem de texto em breve. Texto copiado para a área de transferência.");
    }
    try {
      await logMessage({
        tenant_id: tenantId,
        patient_id: patient.id,
        template_id: tplId === "custom" ? null : tplId,
        channel,
        content,
        sent_by: userId
      });
      toast.success("Mensagem registrada. Finalize o envio no CRM.");
      await loadLogs();
    } catch (e) {
      toast.error("Falha ao registrar mensagem");
    }
  }
  const filteredLogs = logs.filter((l) => {
    if (filterChannel !== "all" && l.channel !== filterChannel) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search && !(l.patients?.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-6 lg:grid-cols-[420px_1fr]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Enviar Mensagem" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Paciente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "w-full justify-start font-normal mt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "size-4 mr-2" }),
              patient ? patient.full_name : "Buscar paciente..."
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(PopoverContent, { className: "w-[380px] p-0", align: "start", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-2 border-b", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: patientQuery, onChange: (e) => setPatientQuery(e.target.value), placeholder: "Nome ou telefone" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-64 overflow-y-auto", children: [
                filteredPatients.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between", onClick: () => setPatient(p), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: p.full_name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground text-xs", children: p.phone })
                ] }, p.id)),
                filteredPatients.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 text-sm text-muted-foreground", children: "Nenhum paciente" })
              ] })
            ] })
          ] }),
          patient && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-3 items-center p-3 rounded-md border bg-muted/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "size-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { children: initials(patient.full_name) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: patient.full_name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground text-xs", children: patient.phone ?? "Sem telefone" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Canal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: channel === "whatsapp" ? "default" : "outline", className: "flex-1", onClick: () => setChannel("whatsapp"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "size-4 mr-2" }),
              "WhatsApp"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", variant: channel === "sms" ? "default" : "outline", className: "flex-1", onClick: () => setChannel("sms"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "size-4 mr-2" }),
              "Mensagem de texto"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Modelo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: tplId, onValueChange: selectTemplate, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "mt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "custom", children: "Mensagem personalizada" }),
              channelTemplates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: t.id, children: t.name }, t.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Conteúdo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: content, onChange: (e) => setContent(e.target.value), rows: 5, maxLength: 1024, className: "mt-1", placeholder: "Escreva sua mensagem..." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground text-right mt-1", children: [
            content.length,
            "/1024"
          ] })
        ] }),
        content && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium text-emerald-900 dark:text-emerald-100 mb-1", children: "Pré-visualização" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm whitespace-pre-wrap text-emerald-950 dark:text-emerald-50", children: content }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-emerald-700 dark:text-emerald-300 text-right mt-1", children: fmtTimeFromDate() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "w-full", onClick: send, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-4 mr-2" }),
          "Enviar Mensagem"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Histórico de Mensagens" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Buscar paciente...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-48" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: filterChannel, onValueChange: setFilterChannel, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-36", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos canais" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "whatsapp", children: "WhatsApp" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "sms", children: "Mensagem de texto" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: filterStatus, onValueChange: setFilterStatus, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-36", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "sent", children: "Enviado" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "delivered", children: "Entregue" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "failed", children: "Falhou" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "pending", children: "Pendente" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-2 pr-2", children: "Data/Hora" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pr-2", children: "Paciente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pr-2", children: "Canal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pr-2", children: "Modelo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pr-2", children: "Conteúdo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pr-2", children: "Situação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          filteredLogs.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2 pr-2 whitespace-nowrap", children: formatDateTimeBR(l.sent_at) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-2", children: l.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: CHANNEL_BADGE[l.channel]?.cls, children: CHANNEL_BADGE[l.channel]?.label ?? l.channel }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-2 text-muted-foreground", children: l.message_templates?.name ?? "Personalizado" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-2 max-w-[240px] truncate", children: l.content.slice(0, 60) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pr-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: STATUS_BADGE[l.status]?.cls, children: STATUS_BADGE[l.status]?.label ?? l.status }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", children: "Ver" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { className: "w-80 text-sm whitespace-pre-wrap", children: l.content })
            ] }) })
          ] }, l.id)),
          filteredLogs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Sem mensagens" }) })
        ] })
      ] }) }) })
    ] })
  ] });
}
function RemindersTab({
  tenantId,
  tenantName,
  userId
}) {
  const navigate = useNavigate();
  const [appts, setAppts] = reactExports.useState([]);
  const [template, setTemplate] = reactExports.useState(null);
  const [sentMap, setSentMap] = reactExports.useState({});
  const tomorrow = reactExports.useMemo(() => tomorrowISO(), []);
  const storageKey = `reminders_sent_${tomorrow}`;
  reactExports.useEffect(() => {
    try {
      setSentMap(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
    } catch {
    }
    (async () => {
      const {
        data
      } = await supabase.from("appointments").select("id, date, start_time, patient_id, professional_id, status, patients(id, full_name, phone), profiles!appointments_professional_id_fkey(full_name)").eq("date", tomorrow).in("status", ["scheduled", "confirmed"]).order("start_time");
      setAppts(data ?? []);
      const {
        data: tpls
      } = await supabase.from("message_templates").select("id, name, channel, trigger, content, active").eq("trigger", "appointment_reminder").eq("active", true).limit(1);
      setTemplate(tpls?.[0] ?? null);
    })();
  }, [tomorrow, storageKey]);
  function persistSent(next) {
    setSentMap(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }
  async function sendOne(a) {
    if (!a.patients?.phone) {
      toast.error("Paciente sem telefone");
      return;
    }
    const patient = {
      id: a.patients.id,
      full_name: a.patients.full_name,
      phone: a.patients.phone
    };
    const extras = {
      data_consulta: fmtDate(a.date),
      hora_consulta: a.start_time.slice(0, 5),
      nome_profissional: a.profiles?.full_name ?? ""
    };
    const fallback = `Olá ${patient.full_name}, lembrando da sua consulta amanhã às ${extras.hora_consulta} em ${tenantName}.`;
    const content = template ? applyVars(template.content, patient, tenantName, extras) : fallback;
    openCrmInbox(navigate, {
      patientId: patient.id,
      phone: patient.phone,
      draft: content
    });
    try {
      await logMessage({
        tenant_id: tenantId,
        patient_id: patient.id,
        template_id: template?.id ?? null,
        channel: "whatsapp",
        content,
        sent_by: userId
      });
      persistSent({
        ...sentMap,
        [a.id]: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch {
      toast.error("Falha ao registrar");
    }
  }
  async function sendAll() {
    const pending = appts.filter((a) => !sentMap[a.id] && a.patients?.phone);
    if (pending.length === 0) {
      toast.info("Nenhum lembrete pendente");
      return;
    }
    toast.info(`${pending.length} lembrete(s) pendente(s). Envie pelo CRM clicando em cada paciente.`);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { children: [
          "Lembretes para amanhã — ",
          fmtDate(tomorrow)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Envie lembretes de consulta para os pacientes agendados amanhã." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: sendAll, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-4 mr-2" }),
        "Enviar todos pendentes"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase tracking-wide", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-2", children: "Paciente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Horário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Profissional" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        appts.map((a) => {
          const sentAt = sentMap[a.id];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2", children: a.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.patients?.phone ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.start_time.slice(0, 5) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.profiles?.full_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: sentAt ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { className: "bg-green-100 text-green-800 border-green-200", variant: "outline", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 mr-1" }),
              "Enviado"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: "Pendente" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => sendOne(a), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "size-3 mr-1" }),
              "Enviar"
            ] }) })
          ] }, a.id);
        }),
        appts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "py-8 text-center text-muted-foreground", children: "Nenhuma consulta agendada para amanhã" }) })
      ] })
    ] }) })
  ] });
}
export {
  MensagensPage as component
};
