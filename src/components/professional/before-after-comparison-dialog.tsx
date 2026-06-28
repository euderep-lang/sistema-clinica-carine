import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Download, ImageOff, Loader2, Share2 } from "lucide-react";
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  label: string,
  y: number,
  width: number,
  height: number,
  colors: [string, string],
) {
  const gradient = ctx.createLinearGradient(0, y, width, y);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(height * 0.4)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, width / 2, y + height / 2);
}

async function buildStoryCanvas(opts: {
  topLabel: string;
  topUrls: [string | null, string | null];
  bottomLabel: string;
  bottomUrls: [string | null, string | null];
}): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1920;
  const rowH = H / 2;
  const bannerH = 96;
  const photoH = rowH - bannerH;
  const colW = W / 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  const drawCell = async (
    url: string | null,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    if (!url) {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x, y, w, h);
      return;
    }
    try {
      const img = await loadImage(url);
      drawCover(ctx, img, x, y, w, h);
    } catch {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x, y, w, h);
    }
  };

  drawBanner(ctx, opts.topLabel, 0, W, bannerH, ["#f59e0b", "#f97316"]);
  await drawCell(opts.topUrls[0], 0, bannerH, colW, photoH);
  await drawCell(opts.topUrls[1], colW, bannerH, colW, photoH);

  drawBanner(ctx, opts.bottomLabel, rowH, W, bannerH, ["#0f766e", "#0d9488"]);
  await drawCell(opts.bottomUrls[0], 0, rowH + bannerH, colW, photoH);
  await drawCell(opts.bottomUrls[1], colW, rowH + bannerH, colW, photoH);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(0, rowH - 2, W, 4);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.92,
    );
  });
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

function DatePhotoPicker({
  title,
  group,
  selected,
  urlCache,
  onToggle,
  accent,
}: {
  title: string;
  group: BeforeAfterDateGroup;
  selected: string[];
  urlCache: Record<string, string>;
  onToggle: (photoId: string) => void;
  accent: "top" | "bottom";
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "text-[11px] font-semibold",
            selected.length === 2 ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {selected.length}/2 selecionadas
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {group.photos.map((photo) => {
          const order = selected.indexOf(photo.id);
          const isSelected = order !== -1;
          const url = urlCache[photo.storage_path] ?? null;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onToggle(photo.id)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border-2 transition",
                isSelected
                  ? accent === "top"
                    ? "border-amber-500 ring-2 ring-amber-500/30"
                    : "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/40",
              )}
            >
              <StoryPhotoCell url={url} alt={photo.caption ?? photo.file_name} />
              {isSelected && (
                <span
                  className={cn(
                    "absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white",
                    accent === "top" ? "bg-amber-500" : "bg-primary",
                  )}
                >
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
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
  const [topSelected, setTopSelected] = useState<string[]>([]);
  const [bottomSelected, setBottomSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState<"download" | "share" | null>(null);

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
    if (!comparison) {
      setTopSelected([]);
      setBottomSelected([]);
      return;
    }
    setTopSelected(comparison.top.photos.slice(0, 2).map((p) => p.id));
    setBottomSelected(comparison.bottom.photos.slice(0, 2).map((p) => p.id));
  }, [comparison]);

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

  const toggleSelection = (
    photoId: string,
    selected: string[],
    setSelected: (next: string[]) => void,
  ) => {
    if (selected.includes(photoId)) {
      setSelected(selected.filter((id) => id !== photoId));
      return;
    }
    if (selected.length >= 2) {
      setSelected([selected[1], photoId]);
      return;
    }
    setSelected([...selected, photoId]);
  };

  const urlsForSelection = (
    group: BeforeAfterDateGroup | undefined,
    selected: string[],
  ): [string | null, string | null] => {
    const photo = (index: number) => {
      const id = selected[index];
      if (!id || !group) return null;
      const found = group.photos.find((p) => p.id === id);
      return found ? urlCache[found.storage_path] ?? null : null;
    };
    return [photo(0), photo(1)];
  };

  const topUrls = useMemo(
    (): [string | null, string | null] =>
      urlsForSelection(comparison?.top, topSelected),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comparison, urlCache, topSelected],
  );

  const bottomUrls = useMemo(
    (): [string | null, string | null] =>
      urlsForSelection(comparison?.bottom, bottomSelected),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comparison, urlCache, bottomSelected],
  );

  const exportFileName = useMemo(() => {
    const slug = (patientName ?? "paciente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const dates =
      comparison
        ? `${comparison.top.dateLabel}_${comparison.bottom.dateLabel}`.replace(/\//g, "-")
        : "comparacao";
    return `antes-depois_${slug}_${dates}.jpg`;
  }, [patientName, comparison]);

  const handleDownload = async () => {
    if (!comparison) return;
    setExporting("download");
    try {
      const canvas = await buildStoryCanvas({
        topLabel: comparison.top.dateLabel,
        topUrls,
        bottomLabel: comparison.bottom.dateLabel,
        bottomUrls,
      });
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async () => {
    if (!comparison) return;
    setExporting("share");
    try {
      const canvas = await buildStoryCanvas({
        topLabel: comparison.top.dateLabel,
        topUrls,
        bottomLabel: comparison.bottom.dateLabel,
        bottomUrls,
      });
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], exportFileName, { type: "image/jpeg" });
      const nav = navigator as Navigator & {
        canShare?: (data?: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Comparação Antes x Depois",
          text: patientName ? `Comparação — ${patientName}` : "Comparação Antes x Depois",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.info("Compartilhamento direto não suportado neste dispositivo. Imagem baixada.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error((e as Error).message);
      }
    } finally {
      setExporting(null);
    }
  };

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
                <div className="w-full space-y-3 rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-foreground">
                    Escolha 2 fotos de cada data
                  </p>
                  <DatePhotoPicker
                    title={`Linha de cima · ${comparison.top.dateLabel}`}
                    group={comparison.top}
                    selected={topSelected}
                    urlCache={urlCache}
                    onToggle={(id) =>
                      toggleSelection(id, topSelected, setTopSelected)
                    }
                    accent="top"
                  />
                  <DatePhotoPicker
                    title={`Linha de baixo · ${comparison.bottom.dateLabel}`}
                    group={comparison.bottom}
                    selected={bottomSelected}
                    urlCache={urlCache}
                    onToggle={(id) =>
                      toggleSelection(id, bottomSelected, setBottomSelected)
                    }
                    accent="bottom"
                  />
                </div>
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

                <div className="flex w-full max-w-[300px] flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1 gap-2"
                    onClick={() => void handleDownload()}
                    disabled={exporting !== null}
                  >
                    {exporting === "download" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    Baixar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => void handleShare()}
                    disabled={exporting !== null}
                  >
                    {exporting === "share" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Share2 className="size-4" />
                    )}
                    Compartilhar
                  </Button>
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
