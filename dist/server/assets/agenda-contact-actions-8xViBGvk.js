import { jsxs, jsx } from "react/jsx-runtime";
import { MessageCircle, Phone } from "lucide-react";
import { B as Button } from "./router-wbAJq94_.js";
import { k as whatsappUrl, l as telUrl } from "./agenda-utils-DsE3sZeK.js";
function AgendaContactActions({
  phone,
  patientName,
  size = "sm"
}) {
  const wa = whatsappUrl(phone, patientName ? `Olá ${patientName}, ` : void 0);
  const tel = telUrl(phone);
  if (!wa && !tel) return null;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
    wa && /* @__PURE__ */ jsxs(
      Button,
      {
        type: "button",
        variant: "outline",
        size: size === "icon" ? "icon" : "sm",
        className: size === "icon" ? "size-8 text-emerald-600" : "h-8 gap-1 text-emerald-600",
        onClick: () => window.open(wa, "_blank"),
        title: "WhatsApp",
        children: [
          /* @__PURE__ */ jsx(MessageCircle, { className: "size-4" }),
          size === "sm" && /* @__PURE__ */ jsx("span", { className: "text-xs", children: "WhatsApp" })
        ]
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
