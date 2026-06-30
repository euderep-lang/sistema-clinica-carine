import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Faixa de aviso/lembrete com safe-area e texto que não corta em telas estreitas. */
export function CrmInlineAlert({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "warning" | "info" | "violet";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-b px-3 py-2.5 text-sm leading-snug",
        "pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]",
        "break-words [overflow-wrap:anywhere]",
        tone === "warning" &&
          "border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "info" &&
          "border-emerald-300/50 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
        tone === "violet" &&
          "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100",
        tone === "default" && "border-border/50 bg-muted/40 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
