import { j as jsxRuntimeExports } from "../_libs/react.mjs";
function PageHeader({ title, description, meta, actions }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 min-w-0", children: [
      meta && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: meta }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-2xl font-semibold text-foreground sm:text-[1.75rem]", children: title }),
      description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground", children: description })
    ] }),
    actions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: actions })
  ] });
}
export {
  PageHeader as P
};
