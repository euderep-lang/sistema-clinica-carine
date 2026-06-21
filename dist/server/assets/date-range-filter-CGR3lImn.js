import { jsxs, jsx } from "react/jsx-runtime";
import { L as Label, I as Input } from "./router-D_mhnWOa.js";
function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "De",
  toLabel = "Até"
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: fromLabel }),
      /* @__PURE__ */ jsx(Input, { type: "date", value: from, onChange: (e) => onFromChange(e.target.value), className: "w-40" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: toLabel }),
      /* @__PURE__ */ jsx(Input, { type: "date", value: to, onChange: (e) => onToChange(e.target.value), className: "w-40" })
    ] })
  ] });
}
export {
  DateRangeFilter as D
};
