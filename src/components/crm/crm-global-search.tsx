import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { fmtDateTime } from "@/lib/locale";
import { searchWaMessagesGlobal } from "@/lib/whatsapp-crm.functions";
import { CHANNEL_LABEL, conversationDisplayName } from "@/lib/whatsapp-crm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  onOpenConversation: (conversationId: string) => void;
}

export function CrmGlobalSearch({ onOpenConversation }: Props) {
  const searchFn = useServerFn(searchWaMessagesGlobal);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<
    {
      message_id: string;
      conversation_id: string;
      body: string | null;
      message_type: string;
      created_at: string;
      contact_name: string | null;
      contact_phone: string;
      channel: string;
    }[]
  >([]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchFn({ data: { query: q, limit: 40 } });
      setHits(rows as typeof hits);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Search className="size-3.5" />
          Buscar mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Busca global no CRM</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Texto, nome de arquivo, palavra-chave…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            autoFocus
          />
          <Button onClick={() => void runSearch()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-y-auto">
          {hits.length === 0 && query.trim().length >= 2 && !loading ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p>
          ) : null}
          {hits.map((h) => (
            <button
              key={h.message_id}
              type="button"
              className="block w-full rounded-lg border p-2.5 text-left hover:bg-muted/60"
              onClick={() => {
                onOpenConversation(h.conversation_id);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {conversationDisplayName({
                    contact_name: h.contact_name,
                    contact_phone: h.contact_phone,
                  })}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {CHANNEL_LABEL[h.channel] ?? h.channel}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{h.body ?? h.message_type}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(h.created_at)}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
