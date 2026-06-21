import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { u as useServerFn } from "./createSsrRpc-CzfufYmk.js";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { d as fmt } from "../server.js";
import { e as ensureWaPipeline, g as getWaPipelineBoard, m as moveWaDealStage } from "./whatsapp-crm.functions-7xmbQXVs.js";
import { D as DashboardShell, B as Button, C as Card, c as conversationDisplayName, E as cn } from "./router-D_mhnWOa.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import "./server-CATTbrgJ.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "node:crypto";
import "@supabase/supabase-js";
import "./auth-middleware-C1kGvq5j.js";
import "@tanstack/react-query";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "@radix-ui/react-dropdown-menu";
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
function CrmPipelinePage() {
  const ensureFn = useServerFn(ensureWaPipeline);
  const boardFn = useServerFn(getWaPipelineBoard);
  const moveFn = useServerFn(moveWaDealStage);
  const [loading, setLoading] = useState(true);
  const [pipelineName, setPipelineName] = useState(null);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const load = useCallback(async () => {
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
  useEffect(() => {
    void load();
  }, [load]);
  const dealsByStage = useMemo(() => {
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
    return /* @__PURE__ */ jsx(DashboardShell, { children: /* @__PURE__ */ jsx("div", { className: "flex h-[50vh] items-center justify-center", children: /* @__PURE__ */ jsx(Loader2, { className: "size-8 animate-spin text-muted-foreground" }) }) });
  }
  return /* @__PURE__ */ jsxs(DashboardShell, { children: [
    /* @__PURE__ */ jsx(
      PageHeader,
      {
        title: pipelineName ?? "Funil de vendas",
        description: "Pipeline estilo Kommo — arraste negócios entre etapas ou use os botões.",
        actions: /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/crm/inbox", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "mr-1.5 size-4" }),
          "Inbox"
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "flex gap-3 overflow-x-auto pb-4", children: stages.map((stage, idx) => {
      const stageDeals = dealsByStage.get(stage.id) ?? [];
      const prevStage = stages[idx - 1];
      const nextStage = stages[idx + 1];
      return /* @__PURE__ */ jsxs("div", { className: "flex w-[min(100%,280px)] shrink-0 flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "size-2.5 rounded-full", style: { backgroundColor: stage.color } }),
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: stage.name }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
            "(",
            stageDeals.length,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex min-h-[420px] flex-col gap-2 rounded-xl border bg-muted/20 p-2", children: [
          stageDeals.map((deal) => /* @__PURE__ */ jsxs(Card, { className: "p-3 shadow-sm", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: deal.title }),
            deal.wa_conversations ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: conversationDisplayName(deal.wa_conversations) }) : null,
            deal.value_cents > 0 ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs font-medium text-emerald-700", children: fmt(deal.value_cents / 100) }) : null,
            /* @__PURE__ */ jsxs("div", { className: "mt-2 flex flex-wrap gap-1", children: [
              prevStage ? /* @__PURE__ */ jsx(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-7 text-[10px]",
                  onClick: () => void moveDeal(deal.id, prevStage.id),
                  children: "←"
                }
              ) : null,
              nextStage ? /* @__PURE__ */ jsx(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-7 text-[10px]",
                  onClick: () => void moveDeal(deal.id, nextStage.id),
                  children: "→"
                }
              ) : null,
              deal.conversation_id ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", className: "h-7 text-[10px]", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/crm/inbox", search: { conversation: deal.conversation_id }, children: "Chat" }) }) : null
            ] })
          ] }, deal.id)),
          stageDeals.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-6 text-center text-xs text-muted-foreground", children: "Vazio" }) : null
        ] })
      ] }, stage.id);
    }) }),
    /* @__PURE__ */ jsx("p", { className: cn("text-xs text-muted-foreground"), children: 'Para criar negócio a partir de uma conversa, use o botão "Adicionar ao funil" no painel do inbox.' })
  ] });
}
const SplitComponent = CrmPipelinePage;
export {
  SplitComponent as component
};
