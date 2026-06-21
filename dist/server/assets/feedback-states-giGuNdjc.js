import { jsx, jsxs } from "react/jsx-runtime";
import { ah as Skeleton } from "./router-DKQJQoSP.js";
function EmptyState({
  icon: Icon,
  title,
  description,
  action
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center gap-4 px-4 py-14 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "flex size-14 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground", children: /* @__PURE__ */ jsx(Icon, { className: "size-6" }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      /* @__PURE__ */ jsx("p", { className: "font-display text-base font-semibold text-foreground", children: title }),
      description && /* @__PURE__ */ jsx("p", { className: "mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground", children: description })
    ] }),
    action
  ] });
}
function TableSkeleton({ rows = 5, cols = 5 }) {
  return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Array.from({ length: rows }).map((_, i) => /* @__PURE__ */ jsx("div", { className: "flex gap-3", children: Array.from({ length: cols }).map((_2, j) => /* @__PURE__ */ jsx(Skeleton, { className: "h-9 flex-1 rounded-md" }, j)) }, i)) });
}
export {
  EmptyState as E,
  TableSkeleton as T
};
