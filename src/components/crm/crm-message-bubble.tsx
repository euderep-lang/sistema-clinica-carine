import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Reply } from "lucide-react";
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
  highlighted?: boolean;
}

export function CrmMessageBubble({
  message,
  resolveMediaUrl,
  replyTo,
  onReply,
  highlighted,
}: CrmMessageBubbleProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const loadMedia = useCallback(async () => {
    if (!message.media_id) return;
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

  const openMedia = () => {
    if (mediaUrl) window.open(mediaUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative max-w-[min(88%,26rem)] rounded-lg px-3 py-2 text-[13px] leading-relaxed shadow-sm",
        message.direction === "outbound"
          ? "ml-auto rounded-tr-sm bg-[#d9fdd3] text-zinc-900 dark:bg-emerald-900/40 dark:text-emerald-50"
          : "rounded-tl-sm bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        highlighted && "ring-2 ring-amber-400/80 ring-offset-2",
      )}
    >
      {onReply ? (
        <button
          type="button"
          className="absolute -left-8 top-1 hidden rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 lg:block"
          onClick={() => onReply(message)}
          title="Responder"
        >
          <Reply className="size-3.5" />
        </button>
      ) : null}

      {replyTo ? (
        <div
          className={cn(
            "mb-1 rounded-lg border-l-4 px-2 py-1 text-xs opacity-90",
            message.direction === "outbound"
              ? "border-emerald-600/30 bg-emerald-900/5"
              : "border-emerald-500/40 bg-muted/40",
          )}
        >
          <p className="line-clamp-2">{replyTo.body ?? replyTo.message_type}</p>
        </div>
      ) : null}
      {message.media_id ? (
        <div className="mb-1">
          {loadingMedia ? (
            <div className="flex items-center gap-2 py-2 text-xs opacity-80">
              <Loader2 className="size-3.5 animate-spin" />
              Carregando mídia…
            </div>
          ) : mediaError ? (
            <button type="button" className="text-xs underline" onClick={() => void loadMedia()}>
              Falha ao carregar — tentar de novo
            </button>
          ) : message.message_type === "image" && mediaUrl ? (
            <button type="button" onClick={openMedia} className="block overflow-hidden rounded-lg">
              <img
                src={mediaUrl}
                alt={message.media_filename ?? "Imagem"}
                className="max-h-64 w-full object-cover"
                loading="lazy"
              />
            </button>
          ) : message.message_type === "audio" && mediaUrl ? (
            <audio controls preload="metadata" className="max-w-full" src={mediaUrl}>
              <track kind="captions" />
            </audio>
          ) : message.message_type === "video" && mediaUrl ? (
            <video controls preload="metadata" className="max-h-64 w-full rounded-lg" src={mediaUrl}>
              <track kind="captions" />
            </video>
          ) : mediaUrl ? (
            <button
              type="button"
              onClick={openMedia}
              className="flex items-center gap-2 rounded-md bg-black/10 px-2 py-1.5 text-xs underline"
            >
              <FileText className="size-3.5 shrink-0" />
              {message.media_filename ?? "Abrir arquivo"}
              <ExternalLink className="size-3 shrink-0" />
            </button>
          ) : null}
        </div>
      ) : null}

      {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}

      <p className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
        <span>
          {formatMessageTime(message.created_at)}
          {message.sender_profile?.full_name ? ` · ${message.sender_profile.full_name}` : ""}
        </span>
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
}
