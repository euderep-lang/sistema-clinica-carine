import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { completeSafeIdOAuthCallback } from "@/lib/digital-certificate.functions";

export const Route = createFileRoute("/professional/safeid/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: SafeIdCallbackPage,
});

function SafeIdCallbackPage() {
  const search = Route.useSearch();
  const complete = useServerFn(completeSafeIdOAuthCallback);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
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
        await complete({ data: { code: search.code, state: search.state } });
        setStatus("ok");
        setMessage("Autorização concluída! Volte à aba da receita.");
        if (window.opener) {
          window.opener.postMessage({ type: "safeid-oauth-done" }, "*");
        }
      } catch (e) {
        setStatus("error");
        setMessage((e as Error).message);
      }
    })();
  }, [search.code, search.error, search.state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-3">
        {status === "loading" && <Loader2 className="mx-auto size-10 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="mx-auto size-10 text-emerald-600" />}
        {status === "error" && <XCircle className="mx-auto size-10 text-destructive" />}
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === "ok" && (
          <p className="text-xs text-muted-foreground">Você pode fechar esta janela.</p>
        )}
      </div>
    </div>
  );
}
