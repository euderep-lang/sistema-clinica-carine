import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFileSizeKb } from "@/lib/media-compress";

export interface PendingMediaItem {
  id: string;
  file: File;
  sizeKb: number;
  previewUrl: string | null;
  caption: string;
}

interface MediaCaptionDialogProps {
  open: boolean;
  items: PendingMediaItem[];
  uploading: boolean;
  onCaptionChange: (id: string, caption: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MediaCaptionDialog({
  open,
  items,
  uploading,
  onCaptionChange,
  onConfirm,
  onCancel,
}: MediaCaptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !uploading && onCancel()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Legenda do anexo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Informe a legenda de cada arquivo antes de salvar no histórico.
        </p>
        <div className="space-y-3 py-2">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded bg-muted text-[10px] font-medium">
                    PDF
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSizeKb(item.sizeKb)}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor={`caption-${item.id}`} className="text-xs">
                  Legenda {items.length > 1 ? `${index + 1}` : ""} *
                </Label>
                <Input
                  id={`caption-${item.id}`}
                  value={item.caption}
                  onChange={(e) => onCaptionChange(item.id, e.target.value)}
                  placeholder="Ex.: antes, depois, raio-x…"
                  className="mt-1 h-9 text-sm"
                  autoFocus={index === 0}
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar no histórico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
