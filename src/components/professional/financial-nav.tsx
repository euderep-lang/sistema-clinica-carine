import {
  BarChart3,
  Landmark,
  Percent,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialTab = "cobrancas" | "caixa" | "despesas" | "comissao" | "relatorios";

const ITEMS: { id: FinancialTab; label: string; icon: LucideIcon }[] = [
  { id: "cobrancas", label: "Cobranças", icon: Wallet },
  { id: "caixa", label: "Caixa", icon: Landmark },
  { id: "despesas", label: "Despesas", icon: TrendingDown },
  { id: "comissao", label: "Comissão", icon: Percent },
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
    <nav className="-mx-1 flex gap-1.5 overflow-x-auto border-b px-1 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:gap-2 sm:pb-4 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition sm:gap-2 sm:rounded-md sm:text-sm",
            activeTab === item.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted sm:bg-transparent",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
