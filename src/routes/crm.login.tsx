import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Download, Loader2, Share } from "lucide-react";
import { ClinicOsIcon } from "@/components/clinicos-icon";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/mock-auth";
import { useCrmViewportLock } from "@/hooks/use-crm-viewport-lock";
import {
  canAccessCrm,
  CRM_PWA_THEME,
  getCrmInstallPrompt,
  isCrmStandalone,
  isIosSafari,
  markCrmPwaSession,
  postLoginPathForRole,
  promptCrmInstall,
} from "@/lib/crm-pwa";

export const Route = createFileRoute("/crm/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/crm")
        ? search.redirect
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — WhatsApp CRM" },
      { name: "theme-color", content: CRM_PWA_THEME },
      { name: "apple-mobile-web-app-title", content: "WhatsApp CRM" },
    ],
    // Manifest no HTML do servidor: o Chrome precisa dele já no carregamento
    // inicial para reconhecer o PWA e oferecer "Instalar aplicativo".
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  component: CrmLoginPage,
});

function CrmLoginPage() {
  const { profile, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useCrmViewportLock(true);

  useEffect(() => {
    if (isCrmStandalone()) {
      setStandalone(true);
      return;
    }
    const sync = () => setCanInstall(!!getCrmInstallPrompt());
    sync();
    setIosHint(isIosSafari());
    window.addEventListener("crm-install-available", sync);
    window.addEventListener("beforeinstallprompt", sync);
    return () => {
      window.removeEventListener("crm-install-available", sync);
      window.removeEventListener("beforeinstallprompt", sync);
    };
  }, []);

  const handleInstall = async () => {
    const outcome = await promptCrmInstall();
    if (outcome === "unavailable") {
      toast.info("Abra o menu do Chrome (⋮) e toque em “Instalar aplicativo”.");
      return;
    }
    if (outcome === "accepted") {
      setCanInstall(false);
      toast.success("App instalado! Procure o ícone na tela inicial.");
    }
  };

  if (!loading && profile) {
    if (canAccessCrm(profile.role)) {
      return <Navigate to={redirect ?? "/crm/inbox"} />;
    }
    return <Navigate to={postLoginPathForRole(profile.role)} />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      markCrmPwaSession();
      const p = await signIn(email, password);
      if (!canAccessCrm(p.role)) {
        toast.error("Seu perfil não tem acesso ao CRM WhatsApp.");
        return;
      }
      toast.success(`Bem-vindo(a), ${p.full_name}`);
      navigate({ to: redirect ?? "/crm/inbox", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="crm-mobile-shell fixed left-[var(--crm-vv-offset-left,0)] top-[var(--crm-vv-offset-top,0)] z-50 flex flex-col overflow-hidden bg-[#111b21] text-white"
      style={{
        width: "var(--crm-vv-width, 100%)",
        height: "var(--crm-vv-height, 100svh)",
        maxHeight: "var(--crm-vv-height, 100svh)",
        paddingTop: "max(0px, env(safe-area-inset-top))",
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[22rem] space-y-8">
          <div className="space-y-4 text-center">
            <ClinicOsIcon variant="on-dark" size="xl" className="mx-auto" />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">WhatsApp CRM</h1>
              <p className="text-sm text-white/70">
                Atendimento da clínica. Sua sessão permanece ativa até você sair.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="crm-email" className="text-white/90">
                E-mail
              </Label>
              <Input
                id="crm-email"
                type="email"
                autoComplete="email"
                placeholder="voce@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-white/10 bg-[#1f2c34] text-white placeholder:text-white/40"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-password" className="text-white/90">
                Senha
              </Label>
              <Input
                id="crm-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/10 bg-[#1f2c34] text-white placeholder:text-white/40"
                required
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full text-white hover:opacity-90"
              style={{ backgroundColor: CRM_PWA_THEME }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Entrar no CRM"}
            </Button>
          </form>

          <p className="text-center text-xs text-white/50">
            <Link to="/forgot-password" className="underline underline-offset-2 hover:text-white/70">
              Esqueci minha senha
            </Link>
          </p>

          {!standalone ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {iosHint ? (
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-white/70">
                  <Share className="size-3.5 shrink-0" />
                  No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”.
                </p>
              ) : canInstall ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={() => void handleInstall()}
                >
                  <Download className="mr-1.5 size-4" />
                  Instalar app na tela inicial
                </Button>
              ) : (
                <p className="text-center text-xs text-white/60">
                  Para instalar como app: abra o menu do Chrome{" "}
                  <span className="font-semibold text-white/80">(⋮)</span> e toque em{" "}
                  <span className="font-semibold text-white/80">“Instalar aplicativo”</span>.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
