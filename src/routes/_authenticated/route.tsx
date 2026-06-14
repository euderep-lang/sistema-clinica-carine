import { createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { KeepAliveOutlet } from "@/components/keep-alive-outlet";
import { dashboardPathFor, useAuth, type Role } from "@/lib/mock-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

const PREFIX_TO_ROLE: Record<string, Role> = {
  admin: "admin",
  reception: "receptionist",
  professional: "professional",
  financial: "financial",
};

function AuthGate() {
  const { profile, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" />;
  if (profile.role === "admin") return <KeepAliveOutlet />;

  const segment = pathname.split("/")[1] ?? "";
  const expectedRole = PREFIX_TO_ROLE[segment];
  if (expectedRole && expectedRole !== profile.role) {
    return <Navigate to={dashboardPathFor(profile.role)} />;
  }
  return <KeepAliveOutlet />;
}