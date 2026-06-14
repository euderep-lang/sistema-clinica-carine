import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSafeIdSignatureAuthStatus,
  initiateSafeIdSignatureAuth,
} from "@/lib/digital-certificate.functions";

interface SafeIdSignatureAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sessão anterior expirou — exibe texto de renovação por mais 12h. */
  renewal?: boolean;
  onAuthorized: () => void;
  saving?: boolean;
}

export function SafeIdSignatureAuthDialog({
  open,
  onOpenChange,
  renewal = false,
  onAuthorized,
  saving = false,
}: SafeIdSignatureAuthDialogProps) {
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);

  const initiateSafeIdAuth = useServerFn(initiateSafeIdSignatureAuth);
  const fetchSafeIdAuthStatus = useServerFn(getSafeIdSignatureAuthStatus);

  useEffect(() => {
    if (!open) {
      setAuthReady(false);
      setAuthLoading(false);
      setAuthError(null);
      setAuthorizeUrl(null);
      return;
    }

    let cancelled = false;
    setAuthLoading(true);
    setAuthReady(false);
    setAuthError(null);
    setAuthorizeUrl(null);

    const openAuthorizeWindow = (url: string) => {
      const popup = window.open(url, "safeid-oauth", "width=520,height=720");
      if (!popup) {
        toast.error("Permita pop-ups neste site para abrir a autorização SafeID.");
      }
    };

    (async () => {
      const origin = window.location.origin;
      try {
        const status = await fetchSafeIdAuthStatus({ data: { origin } });
        if (cancelled) return;
        if (status.ready) {
          setAuthReady(true);
          return;
        }

        if (status.redirectError || !status.redirectUri) {
          const callback = `${origin}/professional/safeid/callback`;
          const msg =
            status.redirectError ??
            `Cadastre ${callback} no painel SafeID e em SAFEID_REDIRECT_URI no .env.`;
          setAuthError(msg);
          toast.error(msg);
          return;
        }

        const result = await initiateSafeIdAuth({ data: { origin } });
        if (cancelled) return;
        if (result.alreadyAuthorized) {
          setAuthReady(true);
          return;
        }
        if (!result.authorizeUrl) return;
        setAuthorizeUrl(result.authorizeUrl);
        openAuthorizeWindow(result.authorizeUrl);
        toast.message(
          renewal
            ? "Sessão expirada — confirme no app SafeID para renovar por 12 horas"
            : "Confirme a autorização no app SafeID (válida por 12 horas)",
        );
      } catch (e) {
        if (!cancelled) {
          const msg = (e as Error).message;
          const hint =
            msg === "Failed to fetch"
              ? "Não foi possível falar com o servidor. Verifique se o app está na mesma URL do SAFEID_REDIRECT_URI no .env."
              : msg.includes("redirecionamento") || msg.includes("redirect")
                ? `${msg} Confirme que SAFEID_REDIRECT_URI no .env é idêntica à URL cadastrada no painel SafeID Integração.`
                : msg;
          setAuthError(hint);
          toast.error(hint);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "safeid-oauth-done") {
        void fetchSafeIdAuthStatus({ data: { origin: window.location.origin } }).then((status) => {
          if (status.ready) setAuthReady(true);
        });
      }
    };
    window.addEventListener("message", onMessage);

    const interval = window.setInterval(async () => {
      try {
        const status = await fetchSafeIdAuthStatus({ data: { origin: window.location.origin } });
        if (status.ready) setAuthReady(true);
      } catch {
        /* ignore polling errors */
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("message", onMessage);
    };
  }, [open, renewal, fetchSafeIdAuthStatus, initiateSafeIdAuth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {renewal ? "Renovar autorização SafeID" : "Autorizar assinatura SafeID"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          {renewal && (
            <p className="text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              Sua autorização de <strong>12 horas</strong> expirou. Confirme novamente no app{" "}
              <strong>SafeID</strong> no celular para assinar esta receita.
            </p>
          )}
          <p>
            <strong className="text-foreground">1.</strong> Uma janela de autorização foi aberta. Confirme a notificação
            no app <strong>SafeID</strong> no celular.
          </p>
          <p>
            <strong className="text-foreground">2.</strong> Após aprovar, a autorização vale por{" "}
            <strong className="text-foreground">12 horas</strong> — você assina várias receitas sem repetir o passo.
          </p>
          {authError && <p className="text-destructive">{authError}</p>}
          {authLoading && <p className="text-amber-700">Preparando autorização…</p>}
          {!authLoading && !authReady && !authError && (
            <p className="text-amber-700">Aguardando confirmação no app SafeID…</p>
          )}
          {authReady && (
            <p className="text-emerald-700">Autorização confirmada. Clique em Assinar e finalizar.</p>
          )}
        </div>
        {authorizeUrl && !authReady && !authError && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(authorizeUrl, "safeid-oauth", "width=520,height=720")}
          >
            Abrir autorização novamente
          </Button>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={saving || !authReady}
            onClick={() => {
              onOpenChange(false);
              onAuthorized();
            }}
          >
            Assinar e finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
