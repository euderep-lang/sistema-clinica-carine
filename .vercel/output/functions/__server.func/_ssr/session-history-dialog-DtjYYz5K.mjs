import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { R as Root, I as Indicator } from "../_libs/radix-ui__react-progress.mjs";
import { E as cn, u as useAuth, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, ae as DialogDescription, L as Label, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, y as DialogFooter, B as Button, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge } from "./router-DcWaovdP.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { s as supabase, L as fmtDateFromDate, K as fmtTimeFromDate } from "./index.mjs";
import { S as ScrollArea } from "./scroll-area-B1YvI_Sp.mjs";
import { E as LoaderCircle, a6 as History } from "../_libs/lucide-react.mjs";
const Progress = reactExports.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Root,
  {
    ref,
    className: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Indicator,
      {
        className: "h-full w-full flex-1 bg-primary transition-all",
        style: { transform: `translateX(-${100 - (value || 0)}%)` }
      }
    )
  }
));
Progress.displayName = Root.displayName;
function todayISO() {
  return todayISO();
}
function nowTime() {
  const d = /* @__PURE__ */ new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const APPLICATION_ROUTES = [
  { value: "IM", label: "IM" },
  { value: "EV", label: "EV" },
  { value: "Oral", label: "Oral" }
];
function SessionCheckoffDialog({
  open,
  onOpenChange,
  target,
  onSuccess
}) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = reactExports.useState([]);
  const [sessionDate, setSessionDate] = reactExports.useState(todayISO());
  const [sessionTime, setSessionTime] = reactExports.useState(nowTime());
  const [professionalId, setProfessionalId] = reactExports.useState("");
  const [productBatch, setProductBatch] = reactExports.useState("");
  const [applicationRoute, setApplicationRoute] = reactExports.useState("IM");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) return;
    setSessionDate(todayISO());
    setSessionTime(nowTime());
    setProductBatch("");
    setApplicationRoute("IM");
    setProfessionalId(profile?.id ?? "");
    (async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").eq("role", "professional").order("full_name");
      setProfessionals(data ?? []);
    })();
  }, [open, profile]);
  const submit = async () => {
    if (!target) return;
    if (!sessionDate || !sessionTime) {
      toast.error("Informe data e horário");
      return;
    }
    if (!professionalId) {
      toast.error("Selecione o profissional");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("register_session_checkoff", {
      p_package_id: target.packageId,
      p_session_date: sessionDate,
      p_session_time: sessionTime,
      p_professional_id: professionalId,
      p_product_batch: productBatch.trim() || null,
      p_application_route: applicationRoute
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data;
    toast.success(
      `Sessão registrada · ${result?.used_sessions ?? target.usedSessions + 1}/${result?.total_sessions ?? target.totalSessions}`
    );
    onOpenChange(false);
    onSuccess?.();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-md", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Dar baixa na sessão" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: target ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions})` : "Registre os dados desta sessão." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "session-date", children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "session-date",
              type: "date",
              value: sessionDate,
              onChange: (e) => setSessionDate(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "session-time", children: "Horário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "session-time",
              type: "time",
              value: sessionTime,
              onChange: (e) => setSessionTime(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Profissional" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: professionalId, onValueChange: setProfessionalId, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione o profissional" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: professionals.map((pro) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: pro.id, children: pro.full_name }, pro.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Via" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: applicationRoute, onValueChange: setApplicationRoute, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione a via" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: APPLICATION_ROUTES.map((route) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: route.value, children: route.label }, route.value)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "product-batch", children: "Lote do produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "product-batch",
              value: productBatch,
              onChange: (e) => setProductBatch(e.target.value),
              placeholder: "Ex.: LOTE-2026-0042"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void submit(), disabled: saving || !target, children: [
        saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
        "Confirmar baixa"
      ] })
    ] })
  ] }) });
}
function formatDate(value, fallback) {
  if (value) {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return fmtDateFromDate(new Date(fallback));
}
function formatTime(value, fallback) {
  if (value) return value.slice(0, 5);
  return fmtTimeFromDate(new Date(fallback), {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function SessionHistoryDialog({
  open,
  onOpenChange,
  target
}) {
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from("session_usages").select(
        "id,session_date,session_time,used_at,product_batch,application_route,quantity,profiles(full_name)"
      ).eq("package_id", target.packageId).order("used_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        setRows([]);
      } else {
        setRows(
          (data ?? []).map((row) => {
            const pro = row.profiles;
            return {
              id: row.id,
              session_date: row.session_date,
              session_time: row.session_time,
              used_at: row.used_at,
              product_batch: row.product_batch,
              application_route: row.application_route,
              quantity: row.quantity,
              professional_name: (Array.isArray(pro) ? pro[0]?.full_name : pro?.full_name) ?? "—"
            };
          })
        );
      }
      setLoading(false);
    })();
  }, [open, target]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-5" }),
        "Histórico de sessões"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: target ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions} realizadas)` : "Sessões já registradas neste pacote." })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-12 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
      "Carregando histórico…"
    ] }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-12 text-center text-sm text-muted-foreground", children: "Nenhuma sessão registrada ainda." }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ScrollArea, { className: "max-h-[50vh]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Data" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Horário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Profissional" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Via" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Lote" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Qtd" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatDate(row.session_date, row.used_at) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatTime(row.session_time, row.used_at) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: row.professional_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: row.application_route ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: row.application_route }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: row.product_batch ? /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: row.product_batch }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "—" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: row.quantity })
      ] }, row.id)) })
    ] }) })
  ] }) });
}
export {
  Progress as P,
  SessionCheckoffDialog as S,
  SessionHistoryDialog as a
};
