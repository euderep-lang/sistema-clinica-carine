import type { LucideIcon, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CrmDetailSection({
  title,
  description,
  children,
  className,
  bare,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <div className="px-0.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {title}
          </h4>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/90">{description}</p>
          ) : null}
        </div>
      ) : null}
      {bare ? children : (
        <div className="rounded-xl border border-border/45 bg-background p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      )}
    </section>
  );
}

export function CrmDetailEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      {description ? <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export const crmDetailTabTrigger =
  "group flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all lg:min-w-0 lg:w-full data-[state=active]:bg-background data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-emerald-200/80 dark:data-[state=active]:text-emerald-200 dark:data-[state=active]:ring-emerald-900/50 text-muted-foreground hover:bg-background/70 hover:text-foreground";

export const crmDetailAsideShell =
  "flex min-w-0 w-full shrink-0 flex-col overflow-hidden border-border/60 bg-[#f7f9f8] dark:bg-zinc-950 lg:w-auto lg:border-l";

export const crmDetailTabsRoot = "flex min-h-0 flex-1 flex-col lg:flex-row";

export const crmDetailTabList =
  "mx-0 flex h-auto w-full shrink-0 gap-1 overflow-x-auto border-b border-border/50 bg-background/80 p-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:w-[3.5rem] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-1 [&::-webkit-scrollbar]:hidden";

export const crmDetailContentWrap = "flex min-h-0 min-w-0 flex-1 flex-col";

export const crmDetailHeader =
  "shrink-0 border-b border-border/40 bg-background/90 px-3 py-2.5 backdrop-blur-sm";

export const crmDetailScroll = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3";

export const crmDetailTabContent = "mt-0 space-y-4 focus-visible:outline-none focus-visible:ring-0";

export const crmNoteCard =
  "relative rounded-xl border border-border/40 bg-background p-3 pl-4 shadow-sm before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-0.5 before:rounded-full before:bg-emerald-500/70";
