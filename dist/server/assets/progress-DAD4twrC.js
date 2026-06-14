import { jsx, jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect } from "react";
import { Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, o as Dialog, p as DialogContent, q as DialogHeader, r as DialogTitle, a7 as DialogDescription, L as Label, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, s as DialogFooter, B as Button, w as cn, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, m as Badge } from "./router-uS_mSfDy.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as ProgressPrimitive from "@radix-ui/react-progress";
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
  const [professionals, setProfessionals] = useState([]);
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionTime, setSessionTime] = useState(nowTime());
  const [professionalId, setProfessionalId] = useState("");
  const [productBatch, setProductBatch] = useState("");
  const [applicationRoute, setApplicationRoute] = useState("IM");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: "Dar baixa na sessão" }),
      /* @__PURE__ */ jsx(DialogDescription, { children: target ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions})` : "Registre os dados desta sessão." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 py-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "session-date", children: "Data" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "session-date",
              type: "date",
              value: sessionDate,
              onChange: (e) => setSessionDate(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "session-time", children: "Horário" }),
          /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Profissional" }),
        /* @__PURE__ */ jsxs(Select, { value: professionalId, onValueChange: setProfessionalId, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione o profissional" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: professionals.map((pro) => /* @__PURE__ */ jsx(SelectItem, { value: pro.id, children: pro.full_name }, pro.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { children: "Via" }),
          /* @__PURE__ */ jsxs(Select, { value: applicationRoute, onValueChange: setApplicationRoute, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione a via" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: APPLICATION_ROUTES.map((route) => /* @__PURE__ */ jsx(SelectItem, { value: route.value, children: route.label }, route.value)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "product-batch", children: "Lote do produto" }),
          /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxs(Button, { onClick: () => void submit(), disabled: saving || !target, children: [
        saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
        "Confirmar baixa"
      ] })
    ] })
  ] }) });
}
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  ScrollAreaPrimitive.Root,
  {
    ref,
    className: cn("relative overflow-hidden", className),
    ...props,
    children: [
      /* @__PURE__ */ jsx(ScrollAreaPrimitive.Viewport, { className: "h-full w-full rounded-[inherit]", children }),
      /* @__PURE__ */ jsx(ScrollBar, {}),
      /* @__PURE__ */ jsx(ScrollAreaPrimitive.Corner, {})
    ]
  }
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;
const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ jsx(
  ScrollAreaPrimitive.ScrollAreaScrollbar,
  {
    ref,
    orientation,
    className: cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(ScrollAreaPrimitive.ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
  }
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
function formatDate(value, fallback) {
  if (value) {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return new Date(fallback).toLocaleDateString("pt-BR");
}
function formatTime(value, fallback) {
  if (value) return value.slice(0, 5);
  return new Date(fallback).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function SessionHistoryDialog({
  open,
  onOpenChange,
  target
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-2xl", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(History, { className: "size-5" }),
        "Histórico de sessões"
      ] }),
      /* @__PURE__ */ jsx(DialogDescription, { children: target ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions} realizadas)` : "Sessões já registradas neste pacote." })
    ] }),
    loading ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-12 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
      "Carregando histórico…"
    ] }) : rows.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-12 text-center text-sm text-muted-foreground", children: "Nenhuma sessão registrada ainda." }) : /* @__PURE__ */ jsx(ScrollArea, { className: "max-h-[50vh]", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Horário" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Via" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Lote" }),
        /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Qtd" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: rows.map((row) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { children: formatDate(row.session_date, row.used_at) }),
        /* @__PURE__ */ jsx(TableCell, { children: formatTime(row.session_time, row.used_at) }),
        /* @__PURE__ */ jsx(TableCell, { children: row.professional_name }),
        /* @__PURE__ */ jsx(TableCell, { children: row.application_route ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: row.application_route }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "—" }) }),
        /* @__PURE__ */ jsx(TableCell, { children: row.product_batch ? /* @__PURE__ */ jsx(Badge, { variant: "outline", children: row.product_batch }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "—" }) }),
        /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: row.quantity })
      ] }, row.id)) })
    ] }) })
  ] }) });
}
const Progress = React.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ jsx(
  ProgressPrimitive.Root,
  {
    ref,
    className: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className),
    ...props,
    children: /* @__PURE__ */ jsx(
      ProgressPrimitive.Indicator,
      {
        className: "h-full w-full flex-1 bg-primary transition-all",
        style: { transform: `translateX(-${100 - (value || 0)}%)` }
      }
    )
  }
));
Progress.displayName = ProgressPrimitive.Root.displayName;
export {
  Progress as P,
  SessionCheckoffDialog as S,
  SessionHistoryDialog as a,
  ScrollArea as b
};
