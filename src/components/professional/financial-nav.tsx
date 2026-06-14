import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Landmark,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { label: string; to: "/professional/financial" | "/professional/financial/caixa" | "/professional/financial/despesas" | "/professional/financial/relatorios"; icon: LucideIcon }[] = [
  { label: "Cobranças", to: "/professional/financial", icon: Wallet },
  { label: "Caixa", to: "/professional/financial/caixa", icon: Landmark },
  { label: "Despesas", to: "/professional/financial/despesas", icon: TrendingDown },
  { label: "Relatórios", to: "/professional/financial/relatorios", icon: BarChart3 },
];

export function FinancialNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-wrap gap-2 border-b pb-4">
      {ITEMS.map((item) => {
        const active =
          item.to === "/professional/financial"
            ? pathname === "/professional/financial" || pathname === "/professional/financial/"
            : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
