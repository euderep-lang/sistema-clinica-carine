import { Fragment, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { HistoryRecord, MediaHistoryEntry } from "@/lib/patient-history";
import { formatFileSizeKb } from "@/lib/media-compress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EvolutionEntry } from "@/components/professional/evolution-history-types";

function openStoragePath(path: string) {
  return supabase.storage.from("patient-documents").createSignedUrl(path, 120);
}

function AttachmentLink({
  fileName,
  caption,
  sizeKb,
  mimeType,
  storagePath,
}: {
  fileName: string;
  caption: string | null;
  sizeKb: number;
  mimeType: string;
  storagePath: string;
}) {
  const open = async () => {
    const { data, error } = await openStoragePath(storagePath);
    if (error || !data) {
      toast.error("Erro ao abrir arquivo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const isImage = mimeType.startsWith("image/");

  return (
    <button
      type="button"
      onClick={() => void open()}
      className="flex w-full items-start gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-left text-xs transition hover:bg-muted"
    >
      {isImage ? (
        <ImageIcon className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <FileText className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{caption || fileName}</span>
        <span className="text-muted-foreground">{formatFileSizeKb(Number(sizeKb))}</span>
      </span>
    </button>
  );
}

function MediaHistoryCard({
  entry,
  highlight,
}: {
  entry: MediaHistoryEntry;
  highlight?: boolean;
}) {
  const when = new Date(entry.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className={cn("w-full", highlight ? "border-primary/40 bg-primary/5" : undefined)}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{when}</p>
            <p className="text-xs text-muted-foreground">
              {entry.profiles?.full_name ?? "Profissional"}
              {entry.profiles?.specialty ? ` · ${entry.profiles.specialty}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {highlight && <Badge variant="secondary">Novo</Badge>}
            <Badge variant="outline" className="text-[10px]">
              {entry.mime_type === "application/pdf" && entry.caption?.toLowerCase().includes("receita") ? (
                <>
                  <FileText className="mr-1 size-3" />
                  Receita
                </>
              ) : (
                <>
                  <Paperclip className="mr-1 size-3" />
                  Anexo
                </>
              )}
            </Badge>
          </div>
        </div>
        <AttachmentLink
          fileName={entry.file_name}
          caption={entry.caption}
          sizeKb={Number(entry.file_size_kb)}
          mimeType={entry.mime_type}
          storagePath={entry.storage_path}
        />
      </CardContent>
    </Card>
  );
}

function EvolutionHistoryItem({ entry, highlight }: { entry: EvolutionEntry; highlight?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.evolution_text.length > 280;
  const shown =
    expanded || !long ? entry.evolution_text : `${entry.evolution_text.slice(0, 280)}…`;

  const when = new Date(entry.created_at || entry.date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className={cn("w-full", highlight ? "border-primary/40 bg-primary/5" : undefined)}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{when}</p>
            <p className="text-xs text-muted-foreground">
              {entry.profiles?.full_name ?? "Profissional"}
              {entry.profiles?.specialty ? ` · ${entry.profiles.specialty}` : ""}
            </p>
          </div>
          {highlight && <Badge variant="secondary">Novo</Badge>}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{shown}</p>
        {long && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ver menos" : "Ver mais"}
          </Button>
        )}
        {(entry.evolution_attachments ?? []).length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Paperclip className="size-3" />
              Anexos ({(entry.evolution_attachments ?? []).length})
            </p>
            {(entry.evolution_attachments ?? []).map((att) => (
              <AttachmentLink
                key={att.id}
                fileName={att.file_name}
                caption={att.caption}
                sizeKb={Number(att.file_size_kb)}
                mimeType={att.mime_type}
                storagePath={att.storage_path}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EvolutionHistory({
  entries,
  loading,
  highlightKey,
  uploading = false,
  onAddFiles,
}: {
  entries: HistoryRecord[];
  loading: boolean;
  highlightKey?: string | null;
  uploading?: boolean;
  onAddFiles?: (files: FileList) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold">Histórico</h2>
          <p className="text-xs text-muted-foreground">{entries.length} registro(s)</p>
        </div>
        {onAddFiles && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1.5 px-2 text-xs"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              title="Anexar fotos ou PDF"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Paperclip className="size-3.5" />
              )}
              Anexar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onAddFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum registro ainda. Anexe fotos ou escreva uma evolução à direita.
            </p>
          ) : (
            entries.map((item, index) => {
              const key = `${item.kind}:${item.data.id}`;
              const highlight = highlightKey === key;
              return (
                <Fragment key={key}>
                  {index > 0 && (
                    <div
                      className="my-3 h-1 w-full rounded-full bg-primary/35"
                      role="separator"
                      aria-hidden
                    />
                  )}
                  {item.kind === "media" ? (
                    <MediaHistoryCard entry={item.data} highlight={highlight} />
                  ) : (
                    <EvolutionHistoryItem entry={item.data} highlight={highlight} />
                  )}
                </Fragment>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
