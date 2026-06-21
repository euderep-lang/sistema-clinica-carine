/** Tokens visuais do inbox CRM — estilo WhatsApp Web / clinic premium */
export const crmChatBg =
  "bg-[#e7ece8] dark:bg-zinc-950 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] [background-size:18px_18px] dark:[background-image:none]";

export const crmListItemActive =
  "bg-background shadow-sm ring-1 ring-border/70 dark:bg-zinc-900";

export const crmListItemBase =
  "mb-0.5 w-full max-w-full overflow-hidden rounded-xl px-2.5 py-2.5 text-left transition-all duration-150 hover:bg-background/80";

/** Evita que o viewport do ScrollArea (Radix) estoure a largura da coluna */
export const crmListScrollArea =
  "min-w-0 w-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!max-w-full";

export const crmFilterPill = (active: boolean) =>
  active
    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
    : "text-muted-foreground hover:bg-background/60 hover:text-foreground";

export const crmComposerBar =
  "border-t border-border/50 bg-[#f0f2f5]/95 px-3 py-2.5 backdrop-blur-sm dark:bg-background/95 pb-[max(0.625rem,env(safe-area-inset-bottom))]";

/** 3 colunas iguais no desktop — classes padrão Tailwind (arbitrary grid não entra no build) */
export const crmPanelShell =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:grid lg:grid-cols-3";
