import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { B as Button } from "./router-DKQJQoSP.js";
import { b as buildCrmInboxSearch } from "./crm-navigation-CSMuJWnR.js";
import { j as telUrl } from "./agenda-utils-CO-C_DbJ.js";
function AgendaContactActions({
  phone,
  patientId,
  patientName,
  size = "sm"
}) {
  const crmSearch = buildCrmInboxSearch({
    patientId,
    phone,
    draft: patientName ? `Olá ${patientName}, ` : void 0
  });
  const tel = telUrl(phone);
  const hasCrm = !!(crmSearch.patient || crmSearch.phone);
  if (!hasCrm && !tel) return null;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
    hasCrm && /* @__PURE__ */ jsx(
      Button,
      {
        variant: "outline",
        size: size === "icon" ? "icon" : "sm",
        className: size === "icon" ? "size-8 text-emerald-600" : "h-8 gap-1 text-emerald-600",
        asChild: true,
        title: "CRM WhatsApp",
        children: /* @__PURE__ */ jsxs(Link, { to: "/crm/inbox", search: crmSearch, children: [
          /* @__PURE__ */ jsx(MessageCircle, { className: "size-4" }),
          size === "sm" && /* @__PURE__ */ jsx("span", { className: "text-xs", children: "CRM" })
        ] })
      }
    ),
    tel && /* @__PURE__ */ jsxs(
      Button,
      {
        type: "button",
        variant: "outline",
        size: size === "icon" ? "icon" : "sm",
        className: size === "icon" ? "size-8" : "h-8 gap-1",
        onClick: () => {
          window.location.href = tel;
        },
        title: "Ligar",
        children: [
          /* @__PURE__ */ jsx(Phone, { className: "size-4" }),
          size === "sm" && /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Ligar" })
        ]
      }
    )
  ] });
}
export {
  AgendaContactActions as A
};
