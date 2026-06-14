import { jsx, jsxs } from "react/jsx-runtime";
import { o as Dialog, p as DialogContent, q as DialogHeader, r as DialogTitle, a7 as DialogDescription } from "./router-CL5eFCiw.js";
import { P as PatientSessionsContent } from "./patient-sessions-content-CapGkTe2.js";
function PatientSessionsDialog({
  open,
  onOpenChange,
  patientId,
  patientName
}) {
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: "Sessões do paciente" }),
      /* @__PURE__ */ jsx(DialogDescription, { children: patientName ? `Protocolos e sessões de ${patientName}` : "Sessões realizadas e pendentes" })
    ] }),
    /* @__PURE__ */ jsx(
      PatientSessionsContent,
      {
        patientId,
        patientName,
        active: open
      }
    )
  ] }) });
}
export {
  PatientSessionsDialog as P
};
