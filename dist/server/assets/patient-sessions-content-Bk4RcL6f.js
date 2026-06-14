import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { C as Card, c as CardContent, W as fmt, m as Badge, B as Button } from "./router-uS_mSfDy.js";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./progress-DAD4twrC.js";
import { s as supabase } from "./client-CUE-_UGz.js";
const STATUS_LABEL = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};
function PatientSessionsContent({
  patientId,
  patientName,
  active = true
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("patient_session_packages").select("id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name)").eq("patient_id", patientId).order("purchased_at", { ascending: false });
    if (error) toast.error(error.message);
    else {
      setRows(
        (data ?? []).map((row) => {
          const svc = row.services;
          const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
          return {
            id: row.id,
            service_name: name ?? "Procedimento",
            total_sessions: row.total_sessions,
            used_sessions: row.used_sessions,
            status: row.status,
            purchased_at: row.purchased_at,
            unit_price: Number(row.unit_price)
          };
        })
      );
    }
    setLoading(false);
  }, [patientId]);
  useEffect(() => {
    if (!active) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [active, load]);
  const toTarget = (row) => ({
    packageId: row.id,
    patientName: patientName ?? "Paciente",
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions
  });
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-10 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
      "Carregando sessões…"
    ] });
  }
  if (rows.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "py-10 text-center text-sm text-muted-foreground", children: "Nenhum pacote de sessões para este paciente." });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: rows.map((row) => {
      const pct = Math.round(row.used_sessions / row.total_sessions * 100);
      const remaining = row.total_sessions - row.used_sessions;
      return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium", children: row.service_name }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              fmt(row.unit_price),
              " ·",
              " ",
              new Date(row.purchased_at).toLocaleDateString("pt-BR")
            ] })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: row.status === "active" ? "default" : "secondary", children: STATUS_LABEL[row.status] ?? row.status })
        ] }),
        /* @__PURE__ */ jsx(Progress, { value: pct, className: "h-2" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            row.used_sessions,
            " de ",
            row.total_sessions,
            " realizadas",
            row.status === "active" && ` · ${remaining} restantes`
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
            row.used_sessions > 0 && /* @__PURE__ */ jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: () => {
                  setHistoryTarget(toTarget(row));
                  setHistoryOpen(true);
                },
                children: "Histórico"
              }
            ),
            row.status === "active" && row.used_sessions < row.total_sessions && /* @__PURE__ */ jsx(
              Button,
              {
                size: "sm",
                variant: "outline",
                onClick: () => {
                  setCheckoffTarget(toTarget(row));
                  setCheckoffOpen(true);
                },
                children: "Dar baixa"
              }
            )
          ] })
        ] })
      ] }) }) }, row.id);
    }) }),
    /* @__PURE__ */ jsx(
      SessionCheckoffDialog,
      {
        open: checkoffOpen,
        onOpenChange: setCheckoffOpen,
        target: checkoffTarget,
        onSuccess: () => void load()
      }
    ),
    /* @__PURE__ */ jsx(
      SessionHistoryDialog,
      {
        open: historyOpen,
        onOpenChange: setHistoryOpen,
        target: historyTarget
      }
    )
  ] });
}
export {
  PatientSessionsContent as P
};
