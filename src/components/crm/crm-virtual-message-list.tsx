import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CrmMessageBubble } from "@/components/crm/crm-message-bubble";
import type { WaMessage } from "@/lib/whatsapp-crm";

export interface CrmVirtualMessageListHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessageId: (messageId: string, behavior?: ScrollBehavior) => void;
  remeasure: () => void;
  isNearBottom: () => boolean;
}

interface CrmVirtualMessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  messages: WaMessage[];
  messagesById: Map<string, WaMessage>;
  resolveMediaUrl: (mediaId: string, mimeType?: string | null) => Promise<string>;
  onReply: (message: WaMessage) => void;
  onForward: (message: WaMessage) => void;
  onDelete: (message: WaMessage, scope: "everyone" | "me") => void;
  highlightedIds: Set<string>;
  onContentResize?: () => void;
  /** Disparado quando o usuário rola perto do topo (carregar histórico). */
  onNearTop?: () => void;
  /** Menos overscan no mobile/PWA. */
  compact?: boolean;
}

const ESTIMATE_ROW_PX = 68;
const NEAR_BOTTOM_PX = 140;
const NEAR_TOP_PX = 96;

export const CrmVirtualMessageList = forwardRef<
  CrmVirtualMessageListHandle,
  CrmVirtualMessageListProps
>(function CrmVirtualMessageList(
  {
    scrollRef,
    messages,
    messagesById,
    resolveMediaUrl,
    onReply,
    onForward,
    onDelete,
    highlightedIds,
    onContentResize,
    onNearTop,
    compact = false,
  },
  ref,
) {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATE_ROW_PX,
    overscan: compact ? 6 : 12,
    getItemKey: (index) => messages[index]?.id ?? index,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const nearTopLockRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, [scrollRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (messages.length === 0) return;
      virtualizer.scrollToIndex(messages.length - 1, { align: "end", behavior });
    },
    [messages.length, virtualizer],
  );

  const scrollToMessageId = useCallback(
    (messageId: string, behavior: ScrollBehavior = "smooth") => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      virtualizer.scrollToIndex(idx, { align: "center", behavior });
    },
    [messages, virtualizer],
  );

  const remeasure = useCallback(() => {
    virtualizer.measure();
  }, [virtualizer]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom,
      scrollToMessageId,
      remeasure,
      isNearBottom,
    }),
    [scrollToBottom, scrollToMessageId, remeasure, isNearBottom],
  );

  const handleRowResize = useCallback(() => {
    remeasure();
    onContentResize?.();
  }, [remeasure, onContentResize]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onNearTop) return;

    const onScroll = () => {
      if (el.scrollTop > NEAR_TOP_PX || nearTopLockRef.current) return;
      nearTopLockRef.current = true;
      onNearTop();
      window.setTimeout(() => {
        nearTopLockRef.current = false;
      }, 800);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, onNearTop, messages.length]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      className="relative w-full pb-1.5"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {items.map((virtualRow) => {
        const message = messages[virtualRow.index];
        if (!message) return null;
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="crm-msg-row absolute left-0 w-full px-0 pb-1"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <CrmMessageBubble
              message={message}
              resolveMediaUrl={resolveMediaUrl}
              replyTo={
                message.reply_to_message_id
                  ? messagesById.get(message.reply_to_message_id)
                  : null
              }
              onReply={onReply}
              onForward={onForward}
              onDelete={onDelete}
              highlighted={highlightedIds.has(message.id)}
              onContentResize={handleRowResize}
            />
          </div>
        );
      })}
    </div>
  );
});
