import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, LogOut, MessageCircle, MoreVertical, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/mock-auth";
import { CRM_PWA_THEME } from "@/lib/crm-pwa";
import { performAppSignOut } from "@/lib/crm-sign-out";
import { useCrmViewportLock } from "@/hooks/use-crm-viewport-lock";

export type CrmPwaTab = "inbox" | "pipeline" | "analytics";

export interface CrmPwaHeaderConfig {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

interface CrmPwaShellProps {
  children: ReactNode;
  activeTab: CrmPwaTab;
  hideBottomNav?: boolean;
  header?: CrmPwaHeaderConfig;
}

const TAB_ITEMS: {
  id: CrmPwaTab;
  label: string;
  to: "/crm/inbox" | "/crm/pipeline" | "/crm/analytics";
  icon: typeof MessageCircle;
  roles?: ("admin" | "receptionist" | "professional")[];
}[] = [
  { id: "inbox", label: "Conversas", to: "/crm/inbox", icon: MessageCircle },
  { id: "pipeline", label: "Funil", to: "/crm/pipeline", icon: Users },
  {
    id: "analytics",
    label: "Métricas",
    to: "/crm/analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
];

export function CrmPwaShell({ children, activeTab, hideBottomNav, header }: CrmPwaShellProps) {
  const { profile, tenant, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role;

  useCrmViewportLock(true);

  const handleLogout = async () => {
    await performAppSignOut(signOut);
    navigate({ to: "/crm/login", replace: true });
  };

  const tabs = TAB_ITEMS.filter(
    (t) => !t.roles || (role && t.roles.includes(role as "admin")),
  );

  return (
    <div
      className="crm-mobile-shell fixed left-[var(--crm-vv-offset-left,0)] top-[var(--crm-vv-offset-top,0)] z-50 flex flex-col overflow-hidden bg-[#111b21]"
      style={{
        width: "var(--crm-vv-width, 100%)",
        height: "var(--crm-vv-height, 100svh)",
        maxHeight: "var(--crm-vv-height, 100svh)",
        ["--crm-wa-header" as string]: CRM_PWA_THEME,
      }}
    >
      <header
        className="shrink-0 bg-[#075E54] text-white shadow-sm"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <div className="flex h-14 items-center gap-2 px-2">
          {header?.showBack ? (
            <button
              type="button"
              aria-label="Voltar"
              className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors active:bg-white/10"
              onClick={header.onBack}
            >
              <ArrowLeft className="size-6" strokeWidth={2} />
            </button>
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {(tenant?.name ?? "C").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-medium leading-tight">
              {header?.title ?? tenant?.name ?? "WhatsApp Business"}
            </p>
            {header?.subtitle ? (
              <p className="truncate text-xs text-white/75">{header.subtitle}</p>
            ) : activeTab === "inbox" && !header?.showBack ? (
              <p className="truncate text-xs text-white/75">CRM · {tenant?.name ?? "Clínica"}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {header?.right ?? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-10 items-center justify-center rounded-full transition-colors active:bg-white/10"
                  aria-label="Menu"
                >
                  <MoreVertical className="size-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{profile?.full_name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]">
        {children}
      </main>

      {!hideBottomNav ? (
        <nav
          className="shrink-0 border-t border-black/5 bg-[#f0f2f5] dark:border-white/10 dark:bg-[#1f2c34]"
          style={{
            paddingBottom: "max(0px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex h-[52px] items-stretch justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.to}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
                    active
                      ? "text-[#25D366] dark:text-[#25D366]"
                      : "text-[#667781] dark:text-[#8696a0]",
                  )}
                >
                  <Icon className={cn("size-[22px]", active && "stroke-[2.25]")} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

interface CrmPageShellProps {
  title: string;
  children: ReactNode;
  fullWidth?: boolean;
  pwa?: {
    activeTab: CrmPwaTab;
    hideBottomNav?: boolean;
    header?: CrmPwaHeaderConfig;
  };
}

/** Desktop: dashboard. Mobile/PWA: shell WhatsApp Business. */
export function CrmPageShell({ title, children, fullWidth, pwa }: CrmPageShellProps) {
  if (pwa) {
    return (
      <CrmPwaShell
        activeTab={pwa.activeTab}
        hideBottomNav={pwa.hideBottomNav}
        header={pwa.header}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
      </CrmPwaShell>
    );
  }

  return (
    <DashboardShell title={title} fullWidth={fullWidth}>
      {children}
    </DashboardShell>
  );
}
