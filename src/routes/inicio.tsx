import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Paperclip } from "lucide-react";
import { dashboardPathFor, useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [{ title: "ClinicOS — Central" }],
  }),
  component: CentralHub,
});

function CentralHub() {
  const { profile, tenant, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary/10 via-background to-background px-5 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
              {(tenant?.name ?? "C").slice(0, 1).toUpperCase()}
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {tenant?.name ?? "ClinicOS"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Olá, {profile.full_name.split(" ")[0]}. O que você quer fazer?
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => navigate({ to: dashboardPathFor(profile.role) })}
              className="flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <LayoutDashboard className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Abrir Sistema</p>
                <p className="text-sm text-muted-foreground">
                  Agenda, prontuário, financeiro e tudo mais
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/anexar" })}
              className="flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <Paperclip className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Anexar no prontuário</p>
                <p className="text-sm text-muted-foreground">
                  Buscar paciente e enviar foto ou documento
                </p>
              </div>
            </button>
          </div>
        </div>

        <p className="pt-8 text-center text-xs text-muted-foreground">
          ClinicOS · Central da clínica
        </p>
      </div>
    </div>
  );
}
