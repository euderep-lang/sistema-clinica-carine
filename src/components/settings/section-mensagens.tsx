import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, MessageSquare, Mail, Phone, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { softDelete } from "@/lib/trash";
import { useAuth } from "@/lib/mock-auth";
import { renderTemplate, SAMPLE_VARS, TEMPLATE_VARS } from "@/lib/settings-helpers";
import { DEFAULT_BIRTHDAY_MESSAGE } from "@/lib/messaging";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionAutomacaoWhatsApp } from "@/components/settings/section-automacao-whatsapp";

type Channel = "whatsapp" | "sms" | "email";
type Trigger = "appointment_confirmation" | "appointment_reminder" | "post_appointment" | "birthday" | "custom";

interface Tpl { id: string; name: string; channel: Channel; trigger: Trigger; content: string; active: boolean; }

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "Mensagem de texto", email: "E-mail" };
const TRIGGER_LABEL: Record<Trigger, string> = {
  appointment_confirmation: "Confirmação de consulta",
  appointment_reminder: "Lembrete 24h antes",
  post_appointment: "Pós-consulta",
  birthday: "Aniversário",
  custom: "Personalizado",
};

const CHANNEL_ICONS: Record<Channel, typeof MessageSquare> = { whatsapp: MessageSquare, sms: Phone, email: Mail };

export function SectionMensagens() {
  const { profile, tenant } = useAuth();
  const [items, setItems] = useState<Tpl[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [name, setName] = useState(""); const [channel, setChannel] = useState<Channel>("whatsapp");
  const [trigger, setTrigger] = useState<Trigger>("custom"); const [content, setContent] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    const { data } = await supabase.from("message_templates" as never).select("id,name,channel,trigger,content,active").order("name") as unknown as { data: Tpl[] };
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setChannel("whatsapp");
    setTrigger("custom");
    setContent("");
    setOpen(true);
  };
  const openNewBirthday = () => {
    setEditing(null);
    setName("Aniversário");
    setChannel("whatsapp");
    setTrigger("birthday");
    setContent(DEFAULT_BIRTHDAY_MESSAGE);
    setOpen(true);
  };
  const openEdit = (t: Tpl) => { setEditing(t); setName(t.name); setChannel(t.channel); setTrigger(t.trigger); setContent(t.content); setOpen(true); };

  const insertVar = (v: string) => {
    const ta = taRef.current; if (!ta) { setContent((c) => c + `{{${v}}}`); return; }
    const s = ta.selectionStart ?? content.length; const e = ta.selectionEnd ?? content.length;
    const next = content.slice(0, s) + `{{${v}}}` + content.slice(e);
    setContent(next);
    setTimeout(() => { ta.focus(); const pos = s + v.length + 4; ta.setSelectionRange(pos, pos); }, 0);
  };

  const save = async () => {
    if (!name || !content || !profile) return;
    const payload = { name, channel, trigger, content };
    const { error } = editing
      ? await supabase.from("message_templates" as never).update(payload as never).eq("id", editing.id)
      : await supabase.from("message_templates" as never).insert({ ...payload, tenant_id: profile.tenant_id } as never);
    if (error) toast.error(error.message); else { toast.success("Salvo"); setOpen(false); load(); }
  };

  const remove = async (t: Tpl) => {
    try {
      await softDelete({
        entityType: "message_template",
        table: "message_templates",
        id: t.id,
        label: t.name,
      });
      toast.success("Movido para a lixeira");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggle = async (t: Tpl) => {
    await supabase.from("message_templates" as never).update({ active: !t.active } as never).eq("id", t.id);
    load();
  };

  const preview = renderTemplate(content, { ...SAMPLE_VARS, nome_clinica: tenant?.name ?? "Sua Clínica" });
  const maxChars = channel === "whatsapp" ? 1024 : channel === "sms" ? 160 : 5000;

  return (
    <Tabs defaultValue="automacao" className="space-y-4">
      <TabsList>
        <TabsTrigger value="automacao" className="gap-2">
          <Bot className="size-4" />
          Automação WhatsApp
        </TabsTrigger>
        <TabsTrigger value="modelos" className="gap-2">
          <MessageSquare className="size-4" />
          Modelos manuais
        </TabsTrigger>
      </TabsList>

      <TabsContent value="automacao">
        <SectionAutomacaoWhatsApp />
      </TabsContent>

      <TabsContent value="modelos" className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={openNewBirthday}>Modelo de aniversário</Button>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Modelo</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((t) => {
          const Icon = CHANNEL_ICONS[t.channel];
          return (
            <Card key={t.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" />{CHANNEL_LABEL[t.channel]}</Badge>
                    <Badge variant="secondary">{TRIGGER_LABEL[t.trigger]}</Badge>
                  </div>
                </div>
                <Switch checked={t.active} onCheckedChange={() => toggle(t)} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.content.slice(0, 80)}{t.content.length > 80 ? "..." : ""}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Canal</Label>
              <div className="flex gap-2 mt-1">
                {(["whatsapp","sms","email"] as Channel[]).map((c) => {
                  const Icon = CHANNEL_ICONS[c];
                  return <Button key={c} type="button" size="sm" variant={channel === c ? "default" : "outline"} onClick={() => setChannel(c)}><Icon className="h-4 w-4 mr-1" />{CHANNEL_LABEL[c]}</Button>;
                })}
              </div>
            </div>
            <div>
              <Label>Gatilho</Label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as Trigger)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABEL) as Trigger[]).map((t) => <SelectItem key={t} value={t}>{TRIGGER_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo *</Label>
              <Textarea ref={taRef} value={content} onChange={(e) => setContent(e.target.value)} rows={6} maxLength={maxChars} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <div className="flex flex-wrap gap-1">
                  {TEMPLATE_VARS.map((v) => (
                    <button key={v} type="button" onClick={() => insertVar(v)} className="px-2 py-0.5 rounded bg-muted hover:bg-muted/70 font-mono">{`{{${v}}}`}</button>
                  ))}
                </div>
                <span>{content.length}/{maxChars}</span>
              </div>
            </div>
            <div>
              <Label>Pré-visualização</Label>
              <div className="border rounded-md p-3 bg-muted/50 text-sm whitespace-pre-wrap">{preview || <span className="text-muted-foreground">A pré-visualização aparece aqui...</span>}</div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>
    </Tabs>
  );
}