import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { u as useServerFn } from "./createSsrRpc-BDBMMm1A.js";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { c as completeSafeIdOAuthCallback } from "./digital-certificate.functions-Cx_KRlRH.js";
import { R as Route } from "./router-uS_mSfDy.js";
import "@tanstack/react-router";
import "./server-BXpJ0fIw.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "zod";
import "./auth-middleware-D93OGO-c.js";
import "@supabase/supabase-js";
import "@tanstack/react-query";
import "./client-CUE-_UGz.js";
import "sonner";
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
import "./letterhead-pdf-4K2s0GWH.js";
function SafeIdCallbackPage() {
  const search = Route.useSearch();
  const complete = useServerFn(completeSafeIdOAuthCallback);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Processando autorização…");
  useEffect(() => {
    (async () => {
      if (search.error === "user_denied") {
        setStatus("error");
        setMessage("Autorização negada no app SafeID.");
        return;
      }
      if (!search.code || !search.state) {
        setStatus("error");
        setMessage("Resposta inválida do SafeID.");
        return;
      }
      try {
        await complete({
          data: {
            code: search.code,
            state: search.state
          }
        });
        setStatus("ok");
        setMessage("Autorização concluída! Volte à aba da receita.");
        if (window.opener) {
          window.opener.postMessage({
            type: "safeid-oauth-done"
          }, "*");
        }
      } catch (e) {
        setStatus("error");
        setMessage(e.message);
      }
    })();
  }, [search.code, search.error, search.state]);
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background p-6", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center space-y-3", children: [
    status === "loading" && /* @__PURE__ */ jsx(Loader2, { className: "mx-auto size-10 animate-spin text-primary" }),
    status === "ok" && /* @__PURE__ */ jsx(CheckCircle2, { className: "mx-auto size-10 text-emerald-600" }),
    status === "error" && /* @__PURE__ */ jsx(XCircle, { className: "mx-auto size-10 text-destructive" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: message }),
    status === "ok" && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Você pode fechar esta janela." })
  ] }) });
}
export {
  SafeIdCallbackPage as component
};
