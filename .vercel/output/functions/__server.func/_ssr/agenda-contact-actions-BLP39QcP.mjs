import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { B as Button } from "./router-DcWaovdP.mjs";
import { b as buildCrmInboxSearch } from "./crm-navigation-CWVrTkjz.mjs";
import { h as telUrl } from "./agenda-utils-DAU-4XZp.mjs";
import { _ as MessageCircle, J as Phone } from "../_libs/lucide-react.mjs";
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
    hasCrm && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        variant: "outline",
        size: size === "icon" ? "icon" : "sm",
        className: size === "icon" ? "size-8 text-emerald-600" : "h-8 gap-1 text-emerald-600",
        asChild: true,
        title: "CRM WhatsApp",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/crm/inbox", search: crmSearch, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "size-4" }),
          size === "sm" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "CRM" })
        ] })
      }
    ),
    tel && /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "size-4" }),
          size === "sm" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: "Ligar" })
        ]
      }
    )
  ] });
}
export {
  AgendaContactActions as A
};
