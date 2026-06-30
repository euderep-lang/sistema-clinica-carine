/** Tokens visuais do inbox CRM — estilo WhatsApp Business */
export const crmWaAccent = "#25D366";
export const crmWaAccentDark = "#128C7E";
export const crmWaAccentStrong = "#1FA855";

/** Classes Tailwind para botão/link CRM em destaque */
export const crmHighlightButtonActive =
  "bg-[#25D366] text-white shadow-sm hover:bg-[#20bd5a] hover:text-white data-[active=true]:bg-[#25D366] data-[active=true]:text-white";
export const crmHighlightButtonIdle =
  "bg-[#25D366]/20 text-[#0d6b3d] hover:bg-[#25D366]/30 hover:text-[#065f46] data-[active=true]:bg-[#25D366] data-[active=true]:text-white dark:text-[#25D366] dark:hover:text-[#dcf8c6]";
export const crmHighlightIcon = "text-[#25D366]";
export const crmHighlightOutlineButton =
  "border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 hover:text-[#0d6b3d]";

export const crmWaHeader = "bg-[#075E54] text-white";

export const crmWaListBg = "bg-white dark:bg-[#111b21]";

export const crmChatBg =
  "bg-[#efeae2] dark:bg-[#0b141a] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23000000%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]";

export const crmListItemActive =
  "bg-[#f0f2f5] dark:bg-[#202c33]";

export const crmComposerBar =
  "shrink-0 border-t border-black/5 bg-[#f0f2f5] px-2 py-1.5 dark:border-white/10 dark:bg-[#1f2c34] pb-[max(0.375rem,calc(env(safe-area-inset-bottom)+var(--crm-keyboard-inset,0px)))]";

/** Área de mensagens — scroll interno, composer fica fixo embaixo */
export const crmChatMessagesScroll =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch]";

export const crmListItemBase =
  "mb-0 w-full max-w-full overflow-hidden border-b border-black/[0.06] px-3 py-3 text-left transition-colors active:bg-[#f5f6f6] dark:border-white/[0.06] dark:active:bg-[#202c33]";

/** Evita que o viewport do ScrollArea (Radix) estoure a largura da coluna */
export const crmListScrollArea =
  "min-w-0 w-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!max-w-full";

export const crmFilterPill = (active: boolean) =>
  active
    ? "bg-[#25D366] text-white shadow-sm"
    : "bg-[#e9edef] text-[#54656f] dark:bg-[#202c33] dark:text-[#aebac1]";

/** 3 colunas no desktop (20% / 55% / 25%) — grid-template via style inline no shell */
export const crmPanelShell =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:grid lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
