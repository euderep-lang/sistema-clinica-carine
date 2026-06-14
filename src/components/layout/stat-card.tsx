import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "danger";

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
  default: { icon: "text-primary bg-primary/10", value: "text-foreground" },
  success: { icon: "text-success bg-success/10", value: "text-success" },
  warning: { icon: "text-warning bg-warning/15", value: "text-warning" },
  danger: { icon: "text-destructive bg-destructive/10", value: "text-destructive" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  action?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  action,
  className,
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors duration-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
              styles.icon,
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div>
        <p className={cn("font-display text-2xl font-semibold tabular-nums", styles.value)}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="mt-auto pt-1">{action}</div>}
    </article>
  );
}
