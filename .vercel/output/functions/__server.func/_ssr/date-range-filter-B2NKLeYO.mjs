import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Label, I as Input } from "./router-DcWaovdP.mjs";
function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "De",
  toLabel = "Até"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: fromLabel }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: from, onChange: (e) => onFromChange(e.target.value), className: "w-40" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: toLabel }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: to, onChange: (e) => onToChange(e.target.value), className: "w-40" })
    ] })
  ] });
}
export {
  DateRangeFilter as D
};
