import { createFileRoute, Navigate, useRouterState } from "@tanstack/react-router";
import { KeepAliveOutlet } from "@/components/keep-alive-outlet";
import { useWaMessageNotifications } from "@/hooks/use-wa-message-notifications";
import { useWaReminderNotifications } from "@/hooks/use-wa-reminder-notifications";
import { dashboardPathFor, useAuth, type Role } from "@/lib/mock-auth";
import { isPathAllowedByPermissions, type PermissionMatrix } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

const PREFIX_TO_ROLE: Record<string, Role> = {
  admin: "admin",
  reception: "receptionist",
  professional: "professional",
  financial: "financial",
};

/** Rotas de outro módulo que este perfil pode acessar (ex.: estoque do profissional). */
const CROSS_ROLE_PATH_PREFIXES: Partial<Record<Role, string[]>> = {
  professional: ["/financial/inventory", "/financial/inventory/items", "/financial/inventory/categories"],
  receptionist: ["/financial/inventory", "/financial/inventory/items", "/financial/inventory/categories"],
};

function canAccessPath(
  role: Role,
  pathname: string,
  permissions: PermissionMatrix | null,
) {
  if (role === "admin") return true;

  // Camada de permissões configuráveis pelo admin (áreas desligadas por perfil).
  if (!isPathAllowedByPermissions(role, pathname, permissions)) return false;

  if (pathname === "/crm/inbox" || pathname.startsWith("/crm/")) {
    return role === "admin" || role === "professional" || role === "receptionist";
  }

  const crossRole = CROSS_ROLE_PATH_PREFIXES[role];
  if (crossRole?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  const segment = pathname.split("/")[1] ?? "";
  const expectedRole = PREFIX_TO_ROLE[segment];
  return !expectedRole || expectedRole === role;
}

function AuthGate() {
  const { profile, permissions, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useWaMessageNotifications();
  useWaReminderNotifications();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" />;
  if (!canAccessPath(profile.role, pathname, permissions)) {
    return <Navigate to={dashboardPathFor(profile.role)} />;
  }
  return <KeepAliveOutlet />;
}