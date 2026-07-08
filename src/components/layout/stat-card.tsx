import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "danger";
type StatSize = "default" | "sm";

const toneStyles: Record<StatTone, { icon: string; value: string }> = {
  default: { icon: "text-primary bg-primary/10", value: "text-foreground" },
  success: { icon: "text-success bg-success/10", value: "text-success" },
  warning: { icon: "text-warning bg-warning/15", value: "text-warning" },
  danger: { icon: "text-destructive bg-destructive/10", value: "text-destructive" },
};

const sizeStyles: Record<
  StatSize,
  {
    article: string;
    header: string;
    label: string;
    iconWrap: string;
    icon: string;
    value: string;
    sub: string;
  }
> = {
  default: {
    article: "gap-3 rounded-lg p-4",
    header: "gap-3",
    label: "text-[0.8125rem]",
    iconWrap: "size-8 rounded-md",
    icon: "size-4",
    value: "text-2xl",
    sub: "mt-1 text-xs",
  },
  // ~30% smaller than default
  sm: {
    article: "gap-2 rounded-md p-2.5",
    header: "gap-2",
    label: "text-[0.6875rem]",
    iconWrap: "size-6 rounded",
    icon: "size-3",
    value: "text-lg",
    sub: "mt-0.5 text-[0.6875rem]",
  },
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  size?: StatSize;
  action?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  size = "default",
  action,
  className,
  onClick,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const sizing = sizeStyles[size];
  const clickable = Boolean(onClick);

  return (
    <article
      className={cn(
        "flex flex-col border bg-card transition-colors duration-200",
        sizing.article,
        clickable && "cursor-pointer hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className={cn("flex items-start justify-between", sizing.header)}>
        <span className={cn("font-medium text-muted-foreground", sizing.label)}>{label}</span>
        {Icon && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center",
              sizing.iconWrap,
              styles.icon,
            )}
            aria-hidden
          >
            <Icon className={sizing.icon} />
          </span>
        )}
      </div>
      <div>
        <p className={cn("font-display font-semibold tabular-nums", sizing.value, styles.value)}>
          {value}
        </p>
        {sub && <p className={cn("text-muted-foreground", sizing.sub)}>{sub}</p>}
      </div>
      {action && <div className="mt-auto pt-1">{action}</div>}
    </article>
  );
}
