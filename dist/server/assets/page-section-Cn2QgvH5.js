import { jsxs, jsx } from "react/jsx-runtime";
import { E as cn } from "./router-D_mhnWOa.js";
function PageSection({ title, description, actions, children, className }) {
  return /* @__PURE__ */ jsxs("section", { className: cn("space-y-4", className), children: [
    (title || actions) && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        title && /* @__PURE__ */ jsx("h2", { className: "font-display text-base font-semibold text-foreground", children: title }),
        description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-sm text-muted-foreground", children: description })
      ] }),
      actions
    ] }),
    children
  ] });
}
export {
  PageSection as P
};
