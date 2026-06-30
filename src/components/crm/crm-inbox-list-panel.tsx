import type { RefObject } from "react";
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { CrmContactAvatarFromMap } from "@/components/crm/crm-contact-avatar";
import {
  crmFilterPill,
  crmListItemActive,
  crmListItemBase,
  crmListScrollArea,
  crmWaListBg,
} from "@/components/crm/crm-inbox-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CHANNEL_BADGE_CLASS,
  CHANNEL_LABEL,
  conversationDisplayName,
  formatRelativeTime,
  type WaConversation,
  type WaPendingTransfer,
  type WaTag,
} from "@/lib/whatsapp-crm";
import { cn } from "@/lib/utils";

export type CrmInboxListFilter = "all" | "mine" | "unread" | "transferred" | "queue" | "closed";
export type CrmInboxChannelFilter = "all" | "whatsapp" | "instagram" | "messenger";

export type CrmListFilterChip = { key: string; label: string; color?: string };

interface CrmInboxListPanelProps {
  hiddenOnMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  listFiltersOpen: boolean;
  onListFiltersOpenChange: (open: boolean | ((prev: boolean) => boolean)) => void;
  hasActiveListFilters: boolean;
  listFilterSummary: CrmListFilterChip[];
  filter: CrmInboxListFilter;
  onFilterChange: (filter: CrmInboxListFilter) => void;
  channelFilter: CrmInboxChannelFilter;
  onChannelFilterChange: (channel: CrmInboxChannelFilter) => void;
  tagFilter: string | null;
  onTagFilterChange: (tagId: string | null) => void;
  tags: WaTag[];
  pendingTransferCount: number;
  loadingList: boolean;
  filteredCount: number;
  visibleConversations: WaConversation[];
  selectedId: string | null;
  pendingTransfers: Record<string, WaPendingTransfer>;
  contactPhotos: Record<string, string | null | undefined>;
  convTagsMap: Record<string, string[]>;
  resolveTagColor: (tagIds: string[] | undefined) => string | undefined;
  onSelectConversation: (id: string) => void;
  hasMoreConversations: boolean;
  listSentinelRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onManualConvOpen: () => void;
  provider: string | null;
  onSyncConfirmOpen: () => void;
  syncing: boolean;
}

export function CrmInboxListPanel({
  hiddenOnMobile,
  search,
  onSearchChange,
  listFiltersOpen,
  onListFiltersOpenChange,
  hasActiveListFilters,
  listFilterSummary,
  filter,
  onFilterChange,
  channelFilter,
  onChannelFilterChange,
  tagFilter,
  onTagFilterChange,
  tags,
  pendingTransferCount,
  loadingList,
  filteredCount,
  visibleConversations,
  selectedId,
  pendingTransfers,
  contactPhotos,
  convTagsMap,
  resolveTagColor,
  onSelectConversation,
  hasMoreConversations,
  listSentinelRef,
  onLoadMore,
  onManualConvOpen,
  provider,
  onSyncConfirmOpen,
  syncing,
}: CrmInboxListPanelProps) {
  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden lg:border-r lg:border-border/60 lg:bg-muted/20",
        crmWaListBg,
        hiddenOnMobile && "hidden lg:flex",
      )}
    >
      <div className="space-y-2 border-b border-black/[0.06] bg-[#f0f2f5] p-2 dark:border-white/10 dark:bg-[#111b21]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 rounded-lg border-0 bg-white pl-9 text-sm shadow-none dark:bg-[#202c33]"
          />
        </div>
        <button
          type="button"
          aria-expanded={listFiltersOpen}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-xs text-[#54656f] transition hover:bg-black/[0.04] dark:text-[#aebac1] dark:hover:bg-white/[0.06] lg:hidden"
          onClick={() => onListFiltersOpenChange((open) => !open)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 shrink-0" />
            <span className="font-medium">Filtros</span>
            {hasActiveListFilters ? (
              <span className="rounded-full bg-[#25D366] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {listFilterSummary.length}
              </span>
            ) : null}
          </span>
          {listFiltersOpen ? (
            <ChevronUp className="size-4 shrink-0" />
          ) : (
            <ChevronDown className="size-4 shrink-0" />
          )}
        </button>
        {!listFiltersOpen && hasActiveListFilters ? (
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {listFilterSummary.map((chip) => (
              <span
                key={chip.key}
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  chip.color
                    ? "text-white"
                    : "bg-[#e9edef] text-[#54656f] dark:bg-[#202c33] dark:text-[#aebac1]",
                )}
                style={chip.color ? { backgroundColor: chip.color } : undefined}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
        <div className={cn("space-y-2", !listFiltersOpen && "hidden lg:block")}>
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["all", "Todas"],
                ["queue", "Fila"],
                ["mine", "Minhas"],
                ["unread", "Não lidas"],
                ["transferred", "Transferidas"],
                ["closed", "Encerradas"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  crmFilterPill(filter === f),
                  f === "transferred" && pendingTransferCount > 0 && filter !== f && "text-violet-700",
                )}
                onClick={() => onFilterChange(f)}
              >
                {label}
                {f === "transferred" && pendingTransferCount > 0 ? (
                  <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white">
                    {pendingTransferCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["all", "Todos canais"],
                ["whatsapp", "WhatsApp"],
                ["instagram", "Instagram"],
                ["messenger", "Messenger"],
              ] as const
            ).map(([ch, label]) => (
              <button
                key={ch}
                type="button"
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                  crmFilterPill(channelFilter === ch),
                )}
                onClick={() => onChannelFilterChange(ch)}
              >
                {label}
              </button>
            ))}
          </div>
          {tags.length > 0 ? (
            <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                  crmFilterPill(!tagFilter),
                )}
                onClick={() => onTagFilterChange(null)}
              >
                Todas tags
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-white transition",
                    tagFilter === t.id ? "ring-2 ring-offset-1" : "opacity-80",
                  )}
                  style={{ backgroundColor: t.color }}
                  onClick={() => onTagFilterChange(tagFilter === t.id ? null : t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <ScrollArea className={cn("flex-1 py-1", crmListScrollArea)}>
        {loadingList ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCount === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa.</p>
        ) : (
          <div className="min-w-0 max-w-full px-2">
            {visibleConversations.map((c) => {
              const name = conversationDisplayName(c);
              const pendingTransfer = pendingTransfers[c.id];
              const isPendingTransfer = !!pendingTransfer;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectConversation(c.id)}
                  className={cn(
                    crmListItemBase,
                    selectedId === c.id && crmListItemActive,
                    isPendingTransfer && "ring-1 ring-violet-400/60 bg-violet-50/80 dark:bg-violet-950/20",
                    !isPendingTransfer && c.unread_count > 0 && selectedId !== c.id && "bg-emerald-500/5",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <CrmContactAvatarFromMap
                      name={name}
                      conversationId={c.id}
                      photos={contactPhotos}
                      tagColor={resolveTagColor(convTagsMap[c.id])}
                      size="sm"
                      ringClassName={cn(isPendingTransfer && "ring-2 ring-violet-500 ring-offset-1")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "truncate",
                            isPendingTransfer || c.unread_count > 0 ? "font-semibold" : "font-medium",
                          )}
                        >
                          {name}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {isPendingTransfer
                            ? formatRelativeTime(pendingTransfer.created_at)
                            : formatRelativeTime(c.last_message_at)}
                        </span>
                      </div>
                      {isPendingTransfer ? (
                        <p className="truncate text-xs font-medium text-violet-700 dark:text-violet-300">
                          <ArrowRightLeft className="mr-1 inline size-3" />
                          Transferida por {pendingTransfer.from_profile?.full_name ?? "equipe"}
                          {pendingTransfer.note ? ` · ${pendingTransfer.note}` : ""}
                        </p>
                      ) : (
                        <p
                          className={cn(
                            "truncate text-xs",
                            c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.last_message_preview ?? "Sem mensagens"}
                        </p>
                      )}
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
                        {(c.channel ?? "whatsapp") !== "whatsapp" ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-4 shrink-0 px-1.5 text-[9px]",
                              CHANNEL_BADGE_CLASS[c.channel ?? "whatsapp"],
                            )}
                          >
                            {CHANNEL_LABEL[c.channel ?? "whatsapp"] ?? c.channel}
                          </Badge>
                        ) : null}
                        {isPendingTransfer ? (
                          <Badge className="h-4 shrink-0 bg-violet-600 px-1.5 text-[10px] hover:bg-violet-600">
                            Nova transferência
                          </Badge>
                        ) : null}
                        <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground flex items-center gap-0.5">
                          {c.patients?.full_name && c.contact_name && c.contact_name !== c.patients.full_name
                            ? `${c.contact_name} · `
                            : ""}
                          {c.assigned_profile?.full_name ? (
                            <>
                              <UserRound className="size-2.5 shrink-0" aria-hidden />
                              {c.assigned_profile.full_name}
                            </>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Sem responsável</span>
                          )}
                        </p>
                        {c.unread_count > 0 ? (
                          <Badge className="h-4 shrink-0 px-1.5 text-[10px]">{c.unread_count}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {hasMoreConversations ? (
              <div ref={listSentinelRef} className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground transition hover:bg-muted"
                >
                  Carregar mais ({filteredCount - visibleConversations.length})
                </button>
              </div>
            ) : null}
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2 border-t border-border/50 bg-background/50 p-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1 rounded-full text-xs"
          onClick={onManualConvOpen}
        >
          <Plus className="mr-1.5 size-3.5" />
          Iniciar por telefone
        </Button>
        {provider === "zapi" ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={onSyncConfirmOpen}
            disabled={syncing}
            title="Sincronizar conversas do WhatsApp"
          >
            {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
