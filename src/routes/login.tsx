import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardPathFor, useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — ClinicOS" }] }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  "Agenda, prontuário e financeiro em um só lugar",
  "Acesso por perfil: recepção, profissional e administrativo",
  "Interface pensada para rotina clínica diária",
];

function LoginPage() {
  const { profile, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && profile) {
    return <Navigate to={dashboardPathFor(profile.role)} />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const p = await signIn(email, password);
      toast.success(`Bem-vindo(a), ${p.full_name}`);
      navigate({ to: dashboardPathFor(p.role) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Activity className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">ClinicOS</p>
            <p className="text-sm text-primary-foreground/80">Gestão clínica profissional</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Operação clínica organizada, do check-in ao fechamento.
          </h1>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">
          Acesso restrito a colaboradores autorizados da clínica.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[22rem] space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="size-5" strokeWidth={2.25} />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-foreground">ClinicOS</h1>
                <p className="text-sm text-muted-foreground">Gestão clínica profissional</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-foreground">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Use suas credenciais para acessar o painel da clínica.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  className="cursor-pointer text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
                  onClick={() => toast.info("Em breve: redefinição de senha por e-mail.")}
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Acessar painel"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
