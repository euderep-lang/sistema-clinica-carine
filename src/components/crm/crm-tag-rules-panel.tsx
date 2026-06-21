import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { deleteWaTagRule, getWaTagRules, upsertWaTagRule } from "@/lib/whatsapp-crm.functions";
import type { WaTag } from "@/lib/whatsapp-crm";
import { CrmDetailSection } from "@/components/crm/crm-detail-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  tags: WaTag[];
}

type RuleRow = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string | null;
  tag_id: string;
  wa_tags?: { name: string; color: string } | null;
};

export function CrmTagRulesPanel({ tags }: Props) {
  const loadFn = useServerFn(getWaTagRules);
  const upsertFn = useServerFn(upsertWaTagRule);
  const deleteFn = useServerFn(deleteWaTagRule);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [name, setName] = useState("");
  const [tagId, setTagId] = useState("");
  const [triggerType, setTriggerType] = useState<"keyword" | "first_message" | "channel">("keyword");
  const [triggerValue, setTriggerValue] = useState("");

  const reload = async () => {
    const rows = await loadFn();
    setRules(rows as RuleRow[]);
  };

  useEffect(() => {
    void reload();
  }, [loadFn]);

  const save = async () => {
    if (!name.trim() || !tagId) return;
    try {
      await upsertFn({
        data: {
          name: name.trim(),
          tagId,
          triggerType,
          triggerValue: triggerType === "first_message" ? undefined : triggerValue,
        },
      });
      setName("");
      setTriggerValue("");
      toast.success("Regra salva");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <CrmDetailSection title="Automação" description="Aplica tags automaticamente em mensagens recebidas.">
      <Input placeholder="Nome da regra" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
      <Select value={tagId} onValueChange={setTagId}>
        <SelectTrigger className="mt-2 h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
        <SelectContent>
          {tags.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={triggerType} onValueChange={(v) => setTriggerType(v as typeof triggerType)}>
        <SelectTrigger className="mt-2 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="keyword">Palavra-chave na mensagem</SelectItem>
          <SelectItem value="first_message">Primeira mensagem do contato</SelectItem>
          <SelectItem value="channel">Canal (whatsapp / instagram / messenger)</SelectItem>
        </SelectContent>
      </Select>
      {triggerType !== "first_message" ? (
        <Input
          placeholder={triggerType === "keyword" ? "Ex: orçamento, agendar" : "whatsapp, instagram ou messenger"}
          value={triggerValue}
          onChange={(e) => setTriggerValue(e.target.value)}
          className="mt-2 h-9"
        />
      ) : null}
      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => void save()}>
        <Zap className="mr-1.5 size-3.5" />
        Adicionar regra
      </Button>

      {rules.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-2 text-[11px]">
              <div>
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground"> → {r.wa_tags?.name ?? "tag"}</span>
                <p className="text-muted-foreground">
                  {r.trigger_type}
                  {r.trigger_value ? `: ${r.trigger_value}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => void remove(r.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </CrmDetailSection>
  );
}
