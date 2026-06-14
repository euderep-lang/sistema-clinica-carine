import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Search, User } from "lucide-react";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { clearKeepAliveCache } from "@/components/keep-alive-outlet";
import { ClinicSidebar } from "./clinic-sidebar";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";
import { useAuth } from "@/lib/mock-auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  receptionist: "Recepção",
  professional: "Profissional",
  financial: "Financeiro",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardShell({
  title,
  children,
  fullWidth,
}: {
  title: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const { profile, tenant, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    clearKeepAliveCache();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <SidebarProvider>
      <ClinicSidebar />
      <SidebarInset className="min-h-dvh bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Ir para o conteúdo
        </a>

        <header className="sticky top-0 z-20 flex h-[3.25rem] items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <SidebarTrigger
            className="size-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Recolher ou expandir menu (⌘B)"
          />

          <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

          <nav aria-label="Contexto da página" className="hidden min-w-0 sm:block">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="truncate text-muted-foreground">{tenant?.name}</li>
              <li className="text-muted-foreground/60" aria-hidden>
                /
              </li>
              <li className="truncate font-medium text-foreground">{title}</li>
            </ol>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 text-muted-foreground md:inline-flex"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            >
              <Search className="size-4" />
              <span>Buscar</span>
              <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline">
                ⌘K
              </kbd>
            </Button>

            <NotificationsBell />

            {profile && (
              <span className="hidden rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground lg:inline">
                {ROLE_LABEL[profile.role]}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menu da conta"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {profile ? initials(profile.full_name) : <User className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground md:inline">
                  {profile?.full_name}
                </span>
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
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="main-content"
          className={cn(
            "app-canvas flex-1",
            fullWidth ? "px-3 py-3 lg:px-4 lg:py-4" : "px-4 py-6 lg:px-8 lg:py-8",
          )}
        >
          <div
            className={cn(
              "mx-auto w-full",
              fullWidth ? "max-w-none space-y-3" : "max-w-7xl space-y-8",
            )}
          >
            {children}
          </div>
        </main>

        <CommandPalette />
      </SidebarInset>
    </SidebarProvider>
  );
}
