import { ExternalLink, FileText, MapPin, UserRound } from "lucide-react";
import { formatPhoneBR } from "@/lib/whatsapp-crm";
import type { WaContactContent, WaLocationContent } from "@/lib/wa-message-content";
import { cn } from "@/lib/utils";

export function CrmContactCard({
  contact,
  outbound,
  className,
}: {
  contact: WaContactContent;
  outbound?: boolean;
  className?: string;
}) {
  const phoneLabel = contact.phone ? formatPhoneBR(contact.phone) : null;
  const waLink = contact.phone ? `https://wa.me/${contact.phone.replace(/\D/g, "")}` : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-left shadow-sm",
        outbound
          ? "border-emerald-700/15 bg-white/90 dark:border-emerald-500/20 dark:bg-zinc-900/40"
          : "border-border/60 bg-white dark:bg-zinc-900/60",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-2.5 py-1.5">
        <UserRound className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</span>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[13px] font-semibold leading-tight">{contact.name}</p>
        {phoneLabel ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{phoneLabel}</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Telefone não informado</p>
        )}
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            Abrir no WhatsApp
            <ExternalLink className="size-2.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CrmLocationCard({
  location,
  outbound,
  className,
}: {
  location: WaLocationContent;
  outbound?: boolean;
  className?: string;
}) {
  const hasCoords = location.latitude !== 0 || location.longitude !== 0;
  const mapPreview = hasCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${location.latitude},${location.longitude}&zoom=15&size=280x120&markers=${location.latitude},${location.longitude},red-pushpin`
    : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-left shadow-sm",
        outbound
          ? "border-emerald-700/15 bg-white/90 dark:border-emerald-500/20 dark:bg-zinc-900/40"
          : "border-border/60 bg-white dark:bg-zinc-900/60",
        className,
      )}
    >
      {mapPreview ? (
        <a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={mapPreview}
            alt=""
            className="h-24 w-full object-cover"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="flex h-20 items-center justify-center bg-muted/40">
          <MapPin className="size-8 text-emerald-600/70 dark:text-emerald-400/70" />
        </div>
      )}
      <div className="px-2.5 py-2">
        <p className="text-[13px] font-semibold leading-tight">{location.title}</p>
        {location.address ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{location.address}</p>
        ) : null}
        <a
          href={location.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          Abrir no mapa
          <ExternalLink className="size-2.5" />
        </a>
      </div>
    </div>
  );
}

export function CrmDocumentCard({
  filename,
  mimeType,
  mediaUrl,
  loading,
  onOpen,
  outbound,
  className,
}: {
  filename: string;
  mimeType?: string | null;
  mediaUrl?: string | null;
  loading?: boolean;
  onOpen?: () => void;
  outbound?: boolean;
  className?: string;
}) {
  const isPdf = mimeType?.includes("pdf") || filename.toLowerCase().endsWith(".pdf");

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!mediaUrl && !loading}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition hover:opacity-90 disabled:cursor-default",
        outbound
          ? "border-emerald-700/15 bg-white/90 dark:border-emerald-500/20 dark:bg-zinc-900/40"
          : "border-border/60 bg-white dark:bg-zinc-900/60",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          isPdf ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground",
        )}
      >
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">{filename}</p>
        <p className="text-[10px] text-muted-foreground">
          {loading ? "Carregando…" : isPdf ? "PDF · toque para abrir" : "Documento · toque para abrir"}
        </p>
      </div>
      {mediaUrl ? <ExternalLink className="size-3 shrink-0 opacity-60" /> : null}
    </button>
  );
}
