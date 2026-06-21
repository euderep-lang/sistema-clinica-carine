import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { getMetaWaTemplates, sendWaBroadcast } from "@/lib/whatsapp-crm.functions";
import type { WaConversation } from "@/lib/whatsapp-crm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  conversations: WaConversation[];
  provider: string | null;
}

export function CrmBroadcastDialog({ conversations, provider }: Props) {
  const templatesFn = useServerFn(getMetaWaTemplates);
  const broadcastFn = useServerFn(sendWaBroadcast);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<{ name: string; language: string; status: string }[]>([]);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [variablesText, setVariablesText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || provider !== "meta") return;
    void templatesFn().then((t) => setTemplates(t as typeof templates));
  }, [open, provider, templatesFn]);

  if (provider !== "meta") return null;

  const whatsappConvs = conversations.filter((c) => (c.channel ?? "whatsapp") === "whatsapp");

  const send = async () => {
    if (!name.trim() || !templateName) {
      toast.error("Informe nome da campanha e template");
      return;
    }
    setSending(true);
    try {
      const variables = variablesText
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      const res = await broadcastFn({
        data: {
          name: name.trim(),
          templateName,
          variables,
          conversationIds: whatsappConvs.map((c) => c.id),
        },
      });
      toast.success(`Broadcast enviado: ${res.sent} ok, ${res.failed} falhas`);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Megaphone className="size-3.5" />
          Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Broadcast com template Meta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome da campanha</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Promoção março" />
          </div>
          <div>
            <Label>Template aprovado</Label>
            <Select value={templateName} onValueChange={setTemplateName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={`${t.name}-${t.language}`} value={t.name}>
                    {t.name} ({t.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Variáveis do corpo (uma por linha)</Label>
            <Textarea
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              placeholder={"Nome do paciente\nData"}
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Serão enviados para {whatsappConvs.length} contatos WhatsApp abertos no CRM.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => void send()} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
