import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { s as supabase, L as fmtDateFromDate, d as fmt } from "../server.js";
import { s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, q as Badge, B as Button } from "./router-DKQJQoSP.js";
import { S as SessionCheckoffDialog, a as SessionHistoryDialog, P as Progress } from "./session-history-dialog-WB9jLVnI.js";
const STATUS_LABEL = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};
function PatientPackagesList({ packages, onCheckoff, onHistory }) {
  if (packages.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-sm text-muted-foreground", children: "Nenhum pacote de sessões ativo para este paciente." });
  }
  return /* @__PURE__ */ jsx("div", { className: "space-y-3", children: packages.map((pkg) => {
    const pct = Math.round(pkg.used_sessions / pkg.total_sessions * 100);
    const remaining = pkg.total_sessions - pkg.used_sessions;
    const canCheckoff = pkg.status === "active" && pkg.used_sessions < pkg.total_sessions;
    return /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-lg border p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: pkg.service_name }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Compra em ",
            fmtDateFromDate(new Date(pkg.purchased_at)),
            " ·",
            " ",
            fmt(pkg.unit_price)
          ] })
        ] }),
        /* @__PURE__ */ jsx(Badge, { variant: pkg.status === "active" ? "default" : "secondary", children: STATUS_LABEL[pkg.status] ?? pkg.status })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Progress, { value: pct, className: "h-1.5" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          pkg.used_sessions,
          "/",
          pkg.total_sessions,
          " realizadas",
          pkg.status === "active" && remaining > 0 && ` · ${remaining} restantes`
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        pkg.used_sessions > 0 && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => onHistory(pkg), children: "Histórico" }),
        canCheckoff && /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => onCheckoff(pkg), children: "Dar baixa" })
      ] })
    ] }, pkg.id);
  }) });
}
function PatientSessionsDialog(props) {
  if ("patientId" in props && props.patientId) {
    return /* @__PURE__ */ jsx(PatientSessionsByPatientDialog, { ...props });
  }
  return /* @__PURE__ */ jsx(PatientSessionsGroupDialog, { ...props });
}
function PatientSessionsGroupDialog({
  open,
  onOpenChange,
  group,
  onCheckoff,
  onHistory
}) {
  if (!group) return null;
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] max-w-lg overflow-y-auto", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
      "Sessões — ",
      group.patient_name
    ] }) }),
    /* @__PURE__ */ jsx(
      PatientPackagesList,
      {
        packages: group.packages,
        onCheckoff,
        onHistory
      }
    )
  ] }) });
}
function PatientSessionsByPatientDialog({
  open,
  onOpenChange,
  patientId,
  patientName
}) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("patient_session_packages").select("id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name)").eq("patient_id", patientId).eq("status", "active").order("purchased_at", { ascending: false });
    if (error) {
      setPackages([]);
    } else {
      setPackages(
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
    if (!open) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [open, load]);
  const toTarget = (pkg) => ({
    packageId: pkg.id,
    patientName: patientName ?? "Paciente",
    serviceName: pkg.service_name,
    usedSessions: pkg.used_sessions,
    totalSessions: pkg.total_sessions
  });
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] max-w-lg overflow-y-auto", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
        "Sessões — ",
        patientName ?? "Paciente"
      ] }) }),
      loading ? /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-sm text-muted-foreground", children: "Carregando…" }) : /* @__PURE__ */ jsx(
        PatientPackagesList,
        {
          packages,
          onCheckoff: (pkg) => {
            setCheckoffTarget(toTarget(pkg));
            setCheckoffOpen(true);
          },
          onHistory: (pkg) => {
            setHistoryTarget(toTarget(pkg));
            setHistoryOpen(true);
          }
        }
      )
    ] }) }),
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
  PatientSessionsDialog as P
};
