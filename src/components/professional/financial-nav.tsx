import {
  BarChart3,
  Landmark,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialTab = "cobrancas" | "caixa" | "despesas" | "relatorios";

const ITEMS: { id: FinancialTab; label: string; icon: LucideIcon }[] = [
  { id: "cobrancas", label: "Cobranças", icon: Wallet },
  { id: "caixa", label: "Caixa", icon: Landmark },
  { id: "despesas", label: "Despesas", icon: TrendingDown },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
];

export function FinancialNav({
  activeTab,
  onTabChange,
}: {
  activeTab: FinancialTab;
  onTabChange: (tab: FinancialTab) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-4">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
            activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
