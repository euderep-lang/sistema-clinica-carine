import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type BeforeAfterDateGroup,
  loadBeforeAfterDateGroups,
  pickComparisonDates,
  signedPhotoUrl,
} from "@/lib/patient-before-after";
import { cn } from "@/lib/utils";

interface BeforeAfterComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
}

function StoryPhotoCell({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/80 text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-5 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={cn("size-full object-cover", className)}
      loading="lazy"
    />
  );
}

function StoryRow({
  dateLabel,
  urls,
  position,
}: {
  dateLabel: string;
  urls: [string | null, string | null];
  position: "top" | "bottom";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "shrink-0 px-2 py-1.5 text-center text-[11px] font-semibold tracking-wide",
          position === "top"
            ? "bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white"
            : "bg-gradient-to-r from-primary/90 to-teal-600/90 text-white",
        )}
      >
        {dateLabel}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <StoryPhotoCell url={urls[0]} alt={`${dateLabel} — foto 1`} />
        <StoryPhotoCell
          url={urls[1]}
          alt={`${dateLabel} — foto 2`}
          className="border-l border-white/20"
        />
      </div>
    </div>
  );
}

export function BeforeAfterComparisonDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: BeforeAfterComparisonDialogProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<BeforeAfterDateGroup[]>([]);
  const [dateX, setDateX] = useState("");
  const [dateY, setDateY] = useState("");
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBeforeAfterDateGroups(patientId);
      setGroups(data);
      if (data.length >= 2) {
        setDateX(data[1].dateLabel);
        setDateY(data[0].dateLabel);
      } else {
        setDateX("");
        setDateY("");
      }
    } catch (e) {
      toast.error((e as Error).message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!open) return;
    void loadGroups();
  }, [open, loadGroups]);

  const comparison = useMemo(() => {
    if (!dateX || !dateY) return null;
    return pickComparisonDates(groups, dateX, dateY);
  }, [groups, dateX, dateY]);

  useEffect(() => {
    if (!comparison) return;
    let cancelled = false;

    (async () => {
      const paths = [
        ...comparison.top.photos.map((p) => p.storage_path),
        ...comparison.bottom.photos.map((p) => p.storage_path),
      ];
      const unique = [...new Set(paths)];
      const entries = await Promise.all(
        unique.map(async (path) => [path, await signedPhotoUrl(path)] as const),
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [path, url] of entries) {
        if (url) next[path] = url;
      }
      setUrlCache((prev) => ({ ...prev, ...next }));
    })();

    return () => {
      cancelled = true;
    };
  }, [comparison]);

  const topUrls = useMemo((): [string | null, string | null] => {
    if (!comparison) return [null, null];
    return [
      comparison.top.photos[0]
        ? urlCache[comparison.top.photos[0].storage_path] ?? null
        : null,
      comparison.top.photos[1]
        ? urlCache[comparison.top.photos[1].storage_path] ?? null
        : null,
    ];
  }, [comparison, urlCache]);

  const bottomUrls = useMemo((): [string | null, string | null] => {
    if (!comparison) return [null, null];
    return [
      comparison.bottom.photos[0]
        ? urlCache[comparison.bottom.photos[0].storage_path] ?? null
        : null,
      comparison.bottom.photos[1]
        ? urlCache[comparison.bottom.photos[1].storage_path] ?? null
        : null,
    ];
  }, [comparison, urlCache]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-amber-600" />
            Comparação Antes x Depois
          </DialogTitle>
          <DialogDescription>
            {patientName
              ? `Montagem vertical das fotos de ${patientName}, organizadas por data.`
              : "Selecione duas datas para comparar as fotos no formato Stories."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando fotos…
          </div>
        ) : groups.length < 2 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            É necessário ter fotos de <strong>Antes x Depois</strong> em pelo menos{" "}
            <strong>duas datas</strong> diferentes para gerar a comparação.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Data superior (mais antiga)</Label>
                <Select value={dateX} onValueChange={setDateX}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a data" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.dateLabel} value={group.dateLabel}>
                        {group.dateLabel} ({group.photos.length} foto
                        {group.photos.length !== 1 ? "s" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data inferior (mais recente)</Label>
                <Select value={dateY} onValueChange={setDateY}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a data" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.dateLabel} value={group.dateLabel}>
                        {group.dateLabel} ({group.photos.length} foto
                        {group.photos.length !== 1 ? "s" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateX === dateY ? (
              <p className="text-center text-sm text-destructive">
                Selecione duas datas diferentes para comparar.
              </p>
            ) : comparison ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-xs text-muted-foreground">
                  Formato Stories — 2 fotos de cima ({comparison.top.dateLabel}) · 2 fotos de
                  baixo ({comparison.bottom.dateLabel})
                </p>
                <div className="w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-foreground/10 bg-black shadow-2xl">
                  <div className="flex aspect-[9/16] flex-col">
                    <StoryRow
                      dateLabel={comparison.top.dateLabel}
                      urls={topUrls}
                      position="top"
                    />
                    <div className="h-0.5 shrink-0 bg-white/30" />
                    <StoryRow
                      dateLabel={comparison.bottom.dateLabel}
                      urls={bottomUrls}
                      position="bottom"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Fotos por data ({groups.length})
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                {groups.map((group) => (
                  <li
                    key={group.dateLabel}
                    className="flex items-center justify-between gap-2 rounded px-1 py-0.5"
                  >
                    <span className="font-medium">{group.dateLabel}</span>
                    <span className="text-muted-foreground">
                      {group.photos.length} imagem{group.photos.length !== 1 ? "ns" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
