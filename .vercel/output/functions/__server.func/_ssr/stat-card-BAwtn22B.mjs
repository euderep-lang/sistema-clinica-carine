import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { E as cn } from "./router-DcWaovdP.mjs";
const toneStyles = {
  default: { icon: "text-primary bg-primary/10", value: "text-foreground" },
  success: { icon: "text-success bg-success/10", value: "text-success" },
  warning: { icon: "text-warning bg-warning/15", value: "text-warning" },
  danger: { icon: "text-destructive bg-destructive/10", value: "text-destructive" }
};
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  action,
  className
}) {
  const styles = toneStyles[tone];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      className: cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors duration-200",
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[0.8125rem] font-medium text-muted-foreground", children: label }),
          Icon && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                styles.icon
              ),
              "aria-hidden": true,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("font-display text-2xl font-semibold tabular-nums", styles.value), children: value }),
          sub && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: sub })
        ] }),
        action && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto pt-1", children: action })
      ]
    }
  );
}
export {
  StatCard as S
};
