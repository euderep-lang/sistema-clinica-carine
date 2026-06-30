import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, MessageCircle, Timer, UserX } from "lucide-react";
import { getCrmMetrics } from "@/lib/whatsapp-crm.functions";
import { cn } from "@/lib/utils";

interface Props {
  onFilterUnassigned?: () => void;
  onFilterUnread?: () => void;
  compact?: boolean;
}

export function CrmMetricsStrip({ onFilterUnassigned, onFilterUnread, compact }: Props) {
  const metricsFn = useServerFn(getCrmMetrics);
  const [metrics, setMetrics] = useState<{
    open: number;
    unassigned: number;
    unreadTotal: number;
    closedToday: number;
    avgFirstResponseMinutes: number | null;
  } | null>(null);

  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== "visible") return;
      void metricsFn().then(setMetrics);
    };
    load();
    const id = window.setInterval(load, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [metricsFn]);

  if (!metrics) return null;

  const items = [
    { label: "Abertas", value: metrics.open, icon: Inbox, highlight: false, onClick: undefined },
    {
      label: "Fila",
      value: metrics.unassigned,
      icon: UserX,
      highlight: metrics.unassigned > 0,
      onClick: onFilterUnassigned,
    },
    {
      label: "Não lidas",
      value: metrics.unreadTotal,
      icon: MessageCircle,
      highlight: metrics.unreadTotal > 0,
      onClick: onFilterUnread,
    },
    { label: "Hoje", value: metrics.closedToday, icon: Timer, highlight: false, onClick: undefined },
  ];

  if (compact) {
    return (
      <div className="hidden items-center gap-1.5 md:flex">
        {items.map(({ label, value, icon: Icon, highlight, onClick }) => (
          <button
            key={label}
            type="button"
            disabled={!onClick}
            onClick={onClick}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition",
              highlight
                ? "bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "text-muted-foreground hover:bg-muted/60",
              onClick && "cursor-pointer",
            )}
          >
            <Icon className="size-3.5 opacity-70" />
            <span className="font-semibold tabular-nums text-foreground">{value}</span>
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
        {metrics.avgFirstResponseMinutes != null ? (
          <span className="ml-1 hidden rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground xl:inline">
            1ª resp. ~{metrics.avgFirstResponseMinutes} min
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
      {items.map(({ label, value, icon: Icon, highlight, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition",
            highlight
              ? "bg-amber-500/15 text-amber-900 dark:text-amber-100"
              : "bg-muted/50 text-muted-foreground",
            onClick && "cursor-pointer active:scale-[0.98]",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="font-semibold text-foreground">{value}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
