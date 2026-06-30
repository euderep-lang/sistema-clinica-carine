import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/mock-auth";
import { canAccessCrm, CRM_PWA_THEME, markCrmPwaSession, postLoginPathForRole } from "@/lib/crm-pwa";

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
      className="flex min-h-dvh flex-col bg-[#111b21] text-white"
      style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[22rem] space-y-8">
          <div className="space-y-4 text-center">
            <div
              className="mx-auto flex size-16 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: CRM_PWA_THEME }}
            >
              <MessageCircle className="size-8" strokeWidth={2} />
            </div>
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
        </div>
      </div>
    </div>
  );
}
