import { useEffect, useMemo, useState } from "react";
import { Forward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  conversationDisplayName,
  formatPhoneBR,
  type WaConversation,
  type WaMessage,
} from "@/lib/whatsapp-crm";

function messageSnippet(message: WaMessage): string {
  const body = message.body?.trim();
  if (message.message_type === "text" && body) return body;
  if (message.message_type === "audio") return "🎤 Áudio";
  if (message.message_type === "image" || message.message_type === "sticker") {
    return body && !/^📷/.test(body) ? `📷 ${body}` : "📷 Imagem";
  }
  if (message.message_type === "video") return body && !/^🎬/.test(body) ? `🎬 ${body}` : "🎬 Vídeo";
  if (message.message_type === "document") {
    return `📎 ${message.media_filename ?? body ?? "Documento"}`;
  }
  if (message.message_type === "contact") return body ?? "👤 Contato";
  if (message.message_type === "location") return body ?? "📍 Localização";
  return body ?? "Mensagem";
}

interface CrmForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: WaMessage | null;
  conversations: WaConversation[];
  currentConversationId: string | null;
  onConfirm: (targetConversationId: string) => Promise<void>;
}

export function CrmForwardMessageDialog({
  open,
  onOpenChange,
  message,
  conversations,
  currentConversationId,
  onConfirm,
}: CrmForwardMessageDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedId(null);
      setSending(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return conversations
      .filter((c) => c.id !== currentConversationId)
      .filter((c) => (c.channel ?? "whatsapp") === "whatsapp")
      .filter((c) => {
        if (!q) return true;
        const name = conversationDisplayName(c).toLowerCase();
        const phone = c.contact_phone.replace(/\D/g, "");
        return name.includes(q) || (digits.length >= 4 && phone.includes(digits));
      })
      .slice(0, 80);
  }, [conversations, currentConversationId, search]);

  const handleConfirm = async () => {
    if (!selectedId || sending) return;
    setSending(true);
    try {
      await onConfirm(selectedId);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,32rem)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="size-4" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {message ? (
          <div className="shrink-0 border-b bg-muted/30 px-4 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Mensagem selecionada
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm">{messageSnippet(message)}</p>
          </div>
        ) : null}

        <div className="shrink-0 px-4 py-2.5">
          <Input
            placeholder="Buscar contato ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada.
            </li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors",
                    selectedId === c.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/60",
                  )}
                >
                  <span className="truncate text-sm font-medium">{conversationDisplayName(c)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatPhoneBR(c.contact_phone)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <DialogFooter className="shrink-0 border-t px-4 py-3 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!selectedId || sending}>
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Forward className="mr-2 size-4" />}
            Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
