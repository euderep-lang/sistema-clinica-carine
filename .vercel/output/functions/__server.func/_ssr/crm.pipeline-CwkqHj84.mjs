import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useServerFn } from "./createSsrRpc-fdWaaOKT.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { d as fmt } from "./index.mjs";
import { e as ensureWaPipeline, g as getWaPipelineBoard, m as moveWaDealStage } from "./whatsapp-crm.functions-Dmtynik5.mjs";
import { D as DashboardShell, B as Button, C as Card, c as conversationDisplayName, E as cn } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import "../_libs/seroval.mjs";
import "../_libs/jspdf.mjs";
import { E as LoaderCircle, ai as ArrowLeft } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "./server-GGhSSPgi.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "./auth-middleware-DmvhAnC4.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-dialog.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/radix-ui__react-tooltip.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/radix-ui__react-avatar.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__react-dropdown-menu.mjs";
import "../_libs/radix-ui__react-menu.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "./patient-utils-YNqCHR6o.mjs";
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
import "fs";
import "path";
import "../_libs/fflate.mjs";
import "../_libs/fast-png.mjs";
import "../_libs/iobuffer.mjs";
import "../_libs/pako.mjs";
import "../_libs/html2canvas.mjs";
import "../_libs/dompurify.mjs";
import "../_libs/canvg.mjs";
import "../_libs/core-js.mjs";
import "../_libs/babel__runtime.mjs";
import "../_libs/raf.mjs";
import "../_libs/performance-now.mjs";
import "../_libs/rgbcolor.mjs";
import "../_libs/svg-pathdata.mjs";
import "../_libs/stackblur-canvas.mjs";
function CrmPipelinePage() {
  const ensureFn = useServerFn(ensureWaPipeline);
  const boardFn = useServerFn(getWaPipelineBoard);
  const moveFn = useServerFn(moveWaDealStage);
  const [loading, setLoading] = reactExports.useState(true);
  const [pipelineName, setPipelineName] = reactExports.useState(null);
  const [stages, setStages] = reactExports.useState([]);
  const [deals, setDeals] = reactExports.useState([]);
  const load = reactExports.useCallback(async () => {
    setLoading(true);
    try {
      await ensureFn();
      const board = await boardFn();
      setPipelineName(board.pipeline?.name ?? "Funil");
      setStages(board.stages ?? []);
      setDeals(board.deals ?? []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [boardFn, ensureFn]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const dealsByStage = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const s of stages) map.set(s.id, []);
    for (const d of deals) {
      const list = map.get(d.stage_id) ?? [];
      list.push(d);
      map.set(d.stage_id, list);
    }
    return map;
  }, [stages, deals]);
  const moveDeal = async (dealId, stageId) => {
    try {
      await moveFn({ data: { dealId, stageId } });
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-[50vh] items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-8 animate-spin text-muted-foreground" }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PageHeader,
      {
        title: pipelineName ?? "Funil de vendas",
        description: "Pipeline estilo Kommo — arraste negócios entre etapas ou use os botões.",
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/crm/inbox", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "mr-1.5 size-4" }),
          "Inbox"
        ] }) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 overflow-x-auto pb-4", children: stages.map((stage, idx) => {
      const stageDeals = dealsByStage.get(stage.id) ?? [];
      const prevStage = stages[idx - 1];
      const nextStage = stages[idx + 1];
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-[min(100%,280px)] shrink-0 flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2.5 rounded-full", style: { backgroundColor: stage.color } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: stage.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
            "(",
            stageDeals.length,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-[420px] flex-col gap-2 rounded-xl border bg-muted/20 p-2", children: [
          stageDeals.map((deal) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-3 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: deal.title }),
            deal.wa_conversations ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: conversationDisplayName(deal.wa_conversations) }) : null,
            deal.value_cents > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs font-medium text-emerald-700", children: fmt(deal.value_cents / 100) }) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-1", children: [
              prevStage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-7 text-[10px]",
                  onClick: () => void moveDeal(deal.id, prevStage.id),
                  children: "←"
                }
              ) : null,
              nextStage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-7 text-[10px]",
                  onClick: () => void moveDeal(deal.id, nextStage.id),
                  children: "→"
                }
              ) : null,
              deal.conversation_id ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "h-7 text-[10px]", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/crm/inbox", search: { conversation: deal.conversation_id }, children: "Chat" }) }) : null
            ] })
          ] }, deal.id)),
          stageDeals.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-6 text-center text-xs text-muted-foreground", children: "Vazio" }) : null
        ] })
      ] }, stage.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: cn("text-xs text-muted-foreground"), children: 'Para criar negócio a partir de uma conversa, use o botão "Adicionar ao funil" no painel do inbox.' })
  ] });
}
const SplitComponent = CrmPipelinePage;
export {
  SplitComponent as component
};
