import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wallet,
  Package,
  BarChart3,
  Settings,
  ClipboardCheck,
  MessageSquare,
  Megaphone,
  Inbox,
  FileText,
  Receipt,
  TrendingDown,
  TrendingUp,
  LineChart,
  CalendarCheck,
  ClipboardList,
  Salad,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type Role } from "@/lib/mock-auth";
import { canAccessFeature, featureForPath } from "@/lib/permissions";
import { ClinicOsIcon } from "@/components/clinicos-icon";
import { cn } from "@/lib/utils";
import {
  crmHighlightButtonActive,
  crmHighlightButtonIdle,
  crmHighlightIcon,
} from "@/components/crm/crm-inbox-theme";

type NavItem = { title: string; url: string; icon: LucideIcon; highlight?: "whatsapp" };

const NAV: Record<Role, { label: string; items: NavItem[] }[]> = {
  admin: [
    {
      label: "Operação",
      items: [
        { title: "Painel", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Agenda", url: "/reception/agenda", icon: Calendar },
        { title: "Pacientes", url: "/reception/pacientes", icon: Users },
        { title: "CRM WhatsApp", url: "/crm/inbox", icon: Inbox, highlight: "whatsapp" },
        { title: "Funil de vendas", url: "/crm/pipeline", icon: LineChart },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Financeiro", url: "/financial/dashboard", icon: Wallet },
        { title: "Serviços", url: "/admin/services", icon: Receipt },
        { title: "Estoque", url: "/financial/inventory", icon: Package },
        { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
        { title: "Configurações", url: "/admin/settings", icon: Settings },
      ],
    },
  ],
  receptionist: [
    {
      label: "Atendimento",
      items: [
        { title: "Painel", url: "/reception/dashboard", icon: LayoutDashboard },
        { title: "Agenda", url: "/reception/agenda", icon: Calendar },
        { title: "Pacientes", url: "/reception/pacientes", icon: Users },
        { title: "Check-in", url: "/reception/checkin", icon: ClipboardCheck },
      ],
    },
    {
      label: "Comunicação",
      items: [
        { title: "CRM WhatsApp", url: "/crm/inbox", icon: Inbox, highlight: "whatsapp" },
        { title: "Funil de vendas", url: "/crm/pipeline", icon: LineChart },
        { title: "Mensagens", url: "/reception/mensagens", icon: MessageSquare },
        { title: "Campanhas", url: "/reception/marketing", icon: Megaphone },
      ],
    },
  ],
  professional: [
    {
      label: "Consultório",
      items: [
        { title: "Painel", url: "/professional/dashboard", icon: LayoutDashboard },
        { title: "Minha Agenda", url: "/professional/agenda", icon: Calendar },
        { title: "Pacientes", url: "/professional/patients", icon: Users },
        { title: "CRM WhatsApp", url: "/crm/inbox", icon: Inbox, highlight: "whatsapp" },
        { title: "Funil de vendas", url: "/crm/pipeline", icon: LineChart },
        { title: "Prontuários", url: "/professional/prontuarios", icon: FileText },
        { title: "Receituário", url: "/professional/prescriptions", icon: FileText },
        { title: "Sessões", url: "/professional/sessions", icon: CalendarCheck },
        { title: "Plano Terapêutico", url: "/professional/plano-alimentar", icon: Salad },
      ],
    },
    {
      label: "Administrativo",
      items: [
        { title: "Orçamento (IA)", url: "/professional/orcamento", icon: Receipt },
        { title: "Orçamentos", url: "/professional/budgets", icon: Receipt },
        { title: "Procedimentos", url: "/professional/procedimentos", icon: ClipboardList },
        { title: "Financeiro", url: "/professional/financial", icon: Wallet },
        { title: "Estoque", url: "/professional/inventory", icon: Package },
        { title: "Configurações", url: "/professional/settings", icon: Settings },
      ],
    },
  ],
  financial: [
    {
      label: "Financeiro",
      items: [
        { title: "Painel", url: "/financial/dashboard", icon: LayoutDashboard },
        { title: "Contas a Receber", url: "/financial/receivables", icon: TrendingUp },
        { title: "Contas a Pagar", url: "/financial/payables", icon: TrendingDown },
        { title: "Fluxo de Caixa", url: "/financial/fluxo", icon: LineChart },
        { title: "Estoque", url: "/financial/inventory", icon: Package },
        { title: "Relatórios", url: "/financial/relatorios", icon: BarChart3 },
      ],
    },
  ],
};

function SidebarNavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  const isWhatsapp = item.highlight === "whatsapp";

  return (
    <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className={cn(
          "h-9 gap-3 rounded-md px-2.5 font-medium transition-colors duration-200 group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:!size-[2.7rem] group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!gap-0 group-data-[collapsible=icon]:!overflow-visible group-data-[collapsible=icon]:!p-0",
          isWhatsapp
            ? active
              ? crmHighlightButtonActive
              : crmHighlightButtonIdle
            : "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-none",
        )}
      >
        <Link
          to={item.url}
          title={item.title}
          aria-label={item.title}
          className={cn(
            "flex h-full w-full cursor-pointer items-center gap-3 outline-none",
            "group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
          )}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon
            className={cn(
              "size-4 shrink-0 group-data-[collapsible=icon]:size-[1.2rem]",
              isWhatsapp ? (active ? "opacity-100" : cn(crmHighlightIcon, "opacity-100")) : "opacity-80",
            )}
          />
          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarCollapseButton() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleSidebar}
      className="h-9 w-full justify-start gap-2 px-2.5 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      title={collapsed ? "Expandir menu" : "Recolher menu"}
    >
      {collapsed ? (
        <ChevronRight className="size-[1.2rem] shrink-0" />
      ) : (
        <ChevronLeft className="size-[1.2rem] shrink-0" />
      )}
      <span className="text-sm group-data-[collapsible=icon]:hidden">
        {isMobile ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
      </span>
    </Button>
  );
}

export function ClinicSidebar() {
  const { profile, tenant, permissions } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!profile) return null;
  const role = profile.role;
  const groups = NAV[role]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const feature = featureForPath(item.url);
        if (!feature) return true;
        return canAccessFeature(role, permissions, feature.key);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          to={groups[0]?.items[0]?.url ?? "/"}
          title="Ir para o painel"
          aria-label="Ir para o painel"
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 transition-colors duration-200 hover:bg-sidebar-accent group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center"
        >
          <ClinicOsIcon
            variant="auto"
            size="md"
            className="group-data-[collapsible=icon]:size-[1.3365rem]"
          />
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-brand text-[0.9375rem] font-semibold leading-none text-sidebar-foreground">
              ClinicOS
            </span>
            <span className="mt-1 truncate text-xs text-muted-foreground">{tenant?.name}</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:items-center">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center">
            <SidebarGroupLabel className="px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
              <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.url || pathname.startsWith(item.url + "/");
                  return <SidebarNavLink key={item.url} item={item} active={active} />;
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="space-y-2 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
        <SidebarCollapseButton />
        <p className="px-0.5 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Sistema de gestão clínica
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
