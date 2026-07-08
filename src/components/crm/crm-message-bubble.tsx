import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Loader2, MoreVertical, Reply, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrmAudioPlayer } from "@/components/crm/crm-audio-player";
import { CrmContactCard, CrmDocumentCard, CrmLocationCard } from "@/components/crm/crm-message-rich";
import {
  extractWaContact,
  extractWaLocation,
  isContactPlaceholderBody,
  isDocumentPlaceholderBody,
  isLocationPlaceholderBody,
  isStickerPlaceholderBody,
} from "@/lib/wa-message-content";
import {
  formatMessageTime,
  isDirectMediaUrl,
  type WaMessage,
  waMessageStatusTicks,
} from "@/lib/whatsapp-crm";
import { cn } from "@/lib/utils";

interface CrmMessageBubbleProps {
  message: WaMessage;
  resolveMediaUrl: (mediaId: string, mimeType?: string | null) => Promise<string>;
  replyTo?: WaMessage | null;
  onReply?: (message: WaMessage) => void;
  onDelete?: (message: WaMessage, scope: "everyone" | "me") => void;
  highlighted?: boolean;
  /** Chamado quando mídia carrega e altera a altura do bubble (mantém scroll no fim). */
  onContentResize?: () => void;
}

function isAudioPlaceholder(body: string | null | undefined): boolean {
  if (!body?.trim()) return true;
  const t = body.trim();
  return t === "Áudio" || t === "🎤 Áudio" || /^🎤\s*Áudio$/i.test(t);
}

export function CrmMessageBubble(props: CrmMessageBubbleProps) {
  return <CrmMessageBubbleInner {...props} />;
}

const CrmMessageBubbleInner = memo(function CrmMessageBubbleInner({
  message,
  resolveMediaUrl,
  replyTo,
  onReply,
  onDelete,
  highlighted,
  onContentResize,
}: CrmMessageBubbleProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const isDeleted = !!message.deleted_at;
  const isAudio = message.message_type === "audio";
  const isImage = message.message_type === "image" || message.message_type === "sticker";
  const isVideo = message.message_type === "video";
  const isDocument = message.message_type === "document";

  const contact = useMemo(
    () => extractWaContact(message),
    [message.message_type, message.body, message.raw_payload],
  );
  const location = useMemo(
    () => extractWaLocation(message),
    [message.message_type, message.body, message.raw_payload],
  );

  const hideBodyForRich =
    (contact && isContactPlaceholderBody(message.body)) ||
    (location && isLocationPlaceholderBody(message.body)) ||
    (isDocument && isDocumentPlaceholderBody(message.body, message.media_filename)) ||
    (message.message_type === "sticker" && isStickerPlaceholderBody(message.body));

  const showBody = !!message.body && !(isAudio && isAudioPlaceholder(message.body)) && !hideBodyForRich;

  const loadMedia = useCallback(async () => {
    if (!message.media_id || message.deleted_at) return;
    if (isDirectMediaUrl(message.media_id)) {
      setMediaUrl(message.media_id);
      return;
    }
    setLoadingMedia(true);
    setMediaError(false);
    try {
      const url = await resolveMediaUrl(message.media_id, message.media_mime);
      setMediaUrl(url);
    } catch {
      setMediaError(true);
    } finally {
      setLoadingMedia(false);
    }
  }, [message.media_id, message.media_mime, resolveMediaUrl]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    if (mediaUrl) onContentResize?.();
  }, [mediaUrl, onContentResize]);

  const openMedia = () => {
    if (mediaUrl) window.open(mediaUrl, "_blank", "noopener,noreferrer");
  };

  const senderName = message.sender_profile?.full_name?.trim();
  const showSenderAbove = message.direction === "outbound" && !!senderName;

  if (isDeleted) {
    const deletedLabel =
      message.direction === "outbound" ? "Você apagou esta mensagem" : "Esta mensagem foi apagada";
    return (
      <div
        id={`msg-${message.id}`}
        className={cn(
          "max-w-[min(78%,15rem)] scroll-mt-20 rounded-[10px] px-2.5 py-1.5 text-[12px] leading-snug",
          message.direction === "outbound"
            ? "ml-auto rounded-tr-[3px] bg-[#d9fdd3]/60 text-zinc-500 dark:bg-emerald-900/20 dark:text-emerald-100/50"
            : "rounded-tl-[3px] bg-white/70 text-zinc-500 shadow-[0_1px_0.5px_rgba(0,0,0,0.06)] dark:bg-zinc-800/60 dark:text-zinc-400",
        )}
      >
        <p className="flex items-center gap-1 italic">
          <Ban className="size-3 shrink-0" />
          {deletedLabel}
        </p>
        <p className="mt-0.5 flex items-center justify-end text-[9px] leading-none opacity-70">
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    );
  }

  const actionsMenu =
    onReply || onDelete ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "absolute right-0.5 top-0.5 z-10 flex size-5 items-center justify-center rounded-full text-muted-foreground/80 opacity-70 transition group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
              message.direction === "outbound"
                ? "bg-[#d9fdd3] dark:bg-emerald-900/40"
                : "bg-white dark:bg-zinc-800",
            )}
            title="Mais ações"
          >
            <MoreVertical className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onReply ? (
            <DropdownMenuItem onClick={() => onReply(message)}>
              <Reply className="size-3.5" />
              Responder
            </DropdownMenuItem>
          ) : null}
          {onDelete && (onReply ? <DropdownMenuSeparator /> : null)}
          {onDelete && message.direction === "outbound" ? (
            <DropdownMenuItem
              onClick={() => onDelete(message, "everyone")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Apagar para todos
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem onClick={() => onDelete(message, "me")}>
              <Ban className="size-3.5" />
              Apagar para mim
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const bubble = (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "group relative max-w-[min(78%,15rem)] scroll-mt-20 rounded-[10px] text-[12px] leading-snug transition-shadow",
        isAudio ? "px-2 py-1.5" : "px-2.5 py-1.5",
        message.direction === "outbound"
          ? cn("rounded-tr-[3px] bg-[#d9fdd3] text-zinc-900 dark:bg-emerald-900/40 dark:text-emerald-50", !showSenderAbove && "ml-auto")
          : "rounded-tl-[3px] bg-white text-zinc-900 shadow-[0_1px_0.5px_rgba(0,0,0,0.06)] dark:bg-zinc-800 dark:text-zinc-100",
        highlighted && "ring-2 ring-amber-400/90 ring-offset-1",
        (contact || location) && "min-w-[11rem]",
      )}
    >
      {onReply ? (
        <button
          type="button"
          className="absolute -left-7 top-0.5 hidden rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 lg:block"
          onClick={() => onReply(message)}
          title="Responder"
        >
          <Reply className="size-3" />
        </button>
      ) : null}

      {actionsMenu}

      {replyTo ? (
        <div
          className={cn(
            "mb-1 rounded-md border-l-[3px] px-1.5 py-0.5 text-[10px] leading-tight opacity-90",
            message.direction === "outbound"
              ? "border-emerald-600/30 bg-emerald-900/5"
              : "border-emerald-500/40 bg-muted/40",
          )}
        >
          <p className="line-clamp-2">{replyTo.body ?? replyTo.message_type}</p>
        </div>
      ) : null}

      {contact ? (
        <CrmContactCard contact={contact} outbound={message.direction === "outbound"} className="mb-0.5" />
      ) : null}

      {location ? (
        <CrmLocationCard location={location} outbound={message.direction === "outbound"} className="mb-0.5" />
      ) : null}

      {message.media_id && !contact && !location ? (
        <div className={cn(showBody ? "mb-1" : "")}>
          {loadingMedia ? (
            <div className="flex items-center gap-1.5 py-1 text-[10px] opacity-70">
              <Loader2 className="size-3 animate-spin" />
              Carregando…
            </div>
          ) : mediaError ? (
            <button type="button" className="text-[10px] underline" onClick={() => void loadMedia()}>
              Tentar de novo
            </button>
          ) : isImage && mediaUrl ? (
            <button type="button" onClick={openMedia} className="block overflow-hidden rounded-md">
              <img
                src={mediaUrl}
                alt={message.media_filename ?? "Imagem"}
                className="max-h-48 w-full object-cover"
                loading="lazy"
                onLoad={() => onContentResize?.()}
              />
            </button>
          ) : isAudio && mediaUrl ? (
            <CrmAudioPlayer src={mediaUrl} outbound={message.direction === "outbound"} />
          ) : isVideo && mediaUrl ? (
            <video
              controls
              preload="metadata"
              className="max-h-44 w-full rounded-md"
              src={mediaUrl}
              onLoadedMetadata={() => onContentResize?.()}
            >
              <track kind="captions" />
            </video>
          ) : isDocument ? (
            <CrmDocumentCard
              filename={message.media_filename ?? "Documento"}
              mimeType={message.media_mime}
              mediaUrl={mediaUrl}
              loading={loadingMedia}
              onOpen={openMedia}
              outbound={message.direction === "outbound"}
            />
          ) : mediaUrl ? (
            <CrmDocumentCard
              filename={message.media_filename ?? "Abrir arquivo"}
              mimeType={message.media_mime}
              mediaUrl={mediaUrl}
              onOpen={openMedia}
              outbound={message.direction === "outbound"}
            />
          ) : null}
        </div>
      ) : null}

      {showBody ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}

      <p
        className={cn(
          "flex items-center justify-end gap-0.5 text-[9px] leading-none opacity-60",
          showBody || contact || location || (!isAudio && message.media_id) ? "mt-1" : "mt-0.5",
        )}
      >
        <span>{formatMessageTime(message.created_at)}</span>
        {message.direction === "outbound" ? (
          <span
            className={cn(
              "font-medium",
              message.status === "read" || message.status === "played"
                ? "text-sky-600 dark:text-sky-400"
                : "text-emerald-700/70 dark:text-emerald-300/70",
            )}
            title={message.status}
          >
            {waMessageStatusTicks(message.status)}
          </span>
        ) : null}
      </p>
    </div>
  );

  if (showSenderAbove) {
    return (
      <div className="ml-auto flex max-w-[min(78%,15rem)] flex-col items-end">
        <p className="mb-0.5 px-1 text-[10px] font-medium text-emerald-800/80 dark:text-emerald-300/90">
          {senderName}
        </p>
        {bubble}
      </div>
    );
  }

  return bubble;
});
