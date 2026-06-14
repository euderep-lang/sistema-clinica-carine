import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Phone, Send, Search, Check, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { applyVars, buildWhatsAppLink, logMessage, formatDateTimeBR, CHANNEL_BADGE, STATUS_BADGE, type Channel, type PatientLite } from "@/lib/messaging";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reception/mensagens")({
  component: MensagensPage,
});

interface Tpl { id: string; name: string; channel: Channel | "email"; trigger: string; content: string; active: boolean; }
interface LogRow { id: string; sent_at: string; channel: string; content: string; status: string; patient_id: string | null; template_id: string | null; patients?: { full_name: string } | null; message_templates?: { name: string } | null; }

function initials(name: string) { return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }

function MensagensPage() {
  const { profile, tenant } = useAuth();
  return (
    <DashboardShell title="Mensagens">
      <Tabs defaultValue="enviar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enviar">Enviar mensagem</TabsTrigger>
          <TabsTrigger value="lembretes">Lembretes de amanhã</TabsTrigger>
        </TabsList>
        <TabsContent value="enviar">
          <EnviarTab tenantId={tenant?.id ?? ""} tenantName={tenant?.name ?? ""} userId={profile?.id ?? ""} />
        </TabsContent>
        <TabsContent value="lembretes">
          <RemindersTab tenantId={tenant?.id ?? ""} tenantName={tenant?.name ?? ""} userId={profile?.id ?? ""} />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function EnviarTab({ tenantId, tenantName, userId }: { tenantId: string; tenantName: string; userId: string }) {
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [patient, setPatient] = useState<PatientLite | null>(null);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [tplId, setTplId] = useState<string>("custom");
  const [content, setContent] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true).order("full_name").limit(500);
      setPatients((p ?? []) as PatientLite[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: t } = await (supabase as any).from("message_templates").select("id, name, channel, trigger, content, active").eq("active", true).order("name");
      setTemplates((t ?? []) as Tpl[]);
      await loadLogs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLogs() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("message_logs").select("id, sent_at, channel, content, status, patient_id, template_id, patients(full_name), message_templates(name)").order("sent_at", { ascending: false }).limit(50);
    setLogs((data ?? []) as LogRow[]);
  }

  const filteredPatients = useMemo(() => {
    const q = patientQuery.toLowerCase().trim();
    if (!q) return patients.slice(0, 8);
    return patients.filter(p => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)).slice(0, 10);
  }, [patients, patientQuery]);

  const channelTemplates = templates.filter(t => t.channel === channel);

  function selectTemplate(id: string) {
    setTplId(id);
    if (id === "custom") { setContent(""); return; }
    const t = templates.find(x => x.id === id);
    if (t && patient) setContent(applyVars(t.content, patient, tenantName));
    else if (t) setContent(t.content);
  }

  useEffect(() => {
    if (tplId !== "custom" && patient) {
      const t = templates.find(x => x.id === tplId);
      if (t) setContent(applyVars(t.content, patient, tenantName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  async function send() {
    if (!patient) { toast.error("Selecione um paciente"); return; }
    if (!content.trim()) { toast.error("Mensagem vazia"); return; }
    if (channel === "whatsapp") {
      if (!patient.phone) { toast.error("Paciente sem telefone"); return; }
      window.open(buildWhatsAppLink(patient.phone, content), "_blank", "noopener,noreferrer");
    } else {
      await navigator.clipboard.writeText(content).catch(() => {});
      toast.info("Integração de mensagem de texto em breve. Texto copiado para a área de transferência.");
    }
    try {
      await logMessage({ tenant_id: tenantId, patient_id: patient.id, template_id: tplId === "custom" ? null : tplId, channel, content, sent_by: userId });
      toast.success("Mensagem registrada. Confirme o envio no aplicativo.");
      await loadLogs();
    } catch (e) {
      toast.error("Falha ao registrar mensagem");
    }
  }

  const filteredLogs = logs.filter(l => {
    if (filterChannel !== "all" && l.channel !== filterChannel) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search && !(l.patients?.full_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Enviar Mensagem</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Paciente</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal mt-1">
                  <Search className="size-4 mr-2" />
                  {patient ? patient.full_name : "Buscar paciente..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0" align="start">
                <div className="p-2 border-b"><Input value={patientQuery} onChange={e => setPatientQuery(e.target.value)} placeholder="Nome ou telefone" /></div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between" onClick={() => setPatient(p)}>
                      <span>{p.full_name}</span><span className="text-muted-foreground text-xs">{p.phone}</span>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nenhum paciente</div>}
                </div>
              </PopoverContent>
            </Popover>
            {patient && (
              <div className="mt-2 flex gap-3 items-center p-3 rounded-md border bg-muted/30">
                <Avatar className="size-10"><AvatarFallback>{initials(patient.full_name)}</AvatarFallback></Avatar>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{patient.full_name}</div>
                  <div className="text-muted-foreground text-xs">{patient.phone ?? "Sem telefone"}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Canal</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant={channel === "whatsapp" ? "default" : "outline"} className="flex-1" onClick={() => setChannel("whatsapp")}>
                <MessageSquare className="size-4 mr-2" />WhatsApp
              </Button>
              <Button type="button" variant={channel === "sms" ? "default" : "outline"} className="flex-1" onClick={() => setChannel("sms")}>
                <Phone className="size-4 mr-2" />Mensagem de texto
              </Button>
            </div>
          </div>

          <div>
            <Label>Modelo</Label>
            <Select value={tplId} onValueChange={selectTemplate}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Mensagem personalizada</SelectItem>
                {channelTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Conteúdo</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} maxLength={1024} className="mt-1" placeholder="Escreva sua mensagem..." />
            <div className="text-xs text-muted-foreground text-right mt-1">{content.length}/1024</div>
          </div>

          {content && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs font-medium text-emerald-900 dark:text-emerald-100 mb-1">Pré-visualização</div>
              <div className="text-sm whitespace-pre-wrap text-emerald-950 dark:text-emerald-50">{content}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 text-right mt-1">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          )}

          <Button className="w-full" onClick={send}>
            <Send className="size-4 mr-2" />Enviar Mensagem
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Mensagens</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canais</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">Mensagem de texto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
                <tr><th className="py-2 pr-2">Data/Hora</th><th className="pr-2">Paciente</th><th className="pr-2">Canal</th><th className="pr-2">Modelo</th><th className="pr-2">Conteúdo</th><th className="pr-2">Situação</th><th></th></tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 pr-2 whitespace-nowrap">{formatDateTimeBR(l.sent_at)}</td>
                    <td className="pr-2">{l.patients?.full_name ?? "—"}</td>
                    <td className="pr-2"><Badge variant="outline" className={CHANNEL_BADGE[l.channel]?.cls}>{CHANNEL_BADGE[l.channel]?.label ?? l.channel}</Badge></td>
                    <td className="pr-2 text-muted-foreground">{l.message_templates?.name ?? "Personalizado"}</td>
                    <td className="pr-2 max-w-[240px] truncate">{l.content.slice(0, 60)}</td>
                    <td className="pr-2"><Badge variant="outline" className={STATUS_BADGE[l.status]?.cls}>{STATUS_BADGE[l.status]?.label ?? l.status}</Badge></td>
                    <td><Popover><PopoverTrigger asChild><Button size="sm" variant="ghost">Ver</Button></PopoverTrigger><PopoverContent className="w-80 text-sm whitespace-pre-wrap">{l.content}</PopoverContent></Popover></td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Sem mensagens</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ApptRow { id: string; date: string; start_time: string; patient_id: string; professional_id: string | null; status: string; patients?: { id: string; full_name: string; phone: string | null } | null; profiles?: { full_name: string } | null; }

function RemindersTab({ tenantId, tenantName, userId }: { tenantId: string; tenantName: string; userId: string }) {
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [template, setTemplate] = useState<Tpl | null>(null);
  const [sentMap, setSentMap] = useState<Record<string, string>>({});

  const tomorrow = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const storageKey = `reminders_sent_${tomorrow}`;

  useEffect(() => {
    try { setSentMap(JSON.parse(localStorage.getItem(storageKey) ?? "{}")); } catch { /* ignore */ }
    (async () => {
      const { data } = await supabase.from("appointments")
        .select("id, date, start_time, patient_id, professional_id, status, patients(id, full_name, phone), profiles!appointments_professional_id_fkey(full_name)")
        .eq("date", tomorrow).in("status", ["scheduled", "confirmed"]).order("start_time");
      setAppts((data ?? []) as unknown as ApptRow[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tpls } = await (supabase as any).from("message_templates").select("id, name, channel, trigger, content, active").eq("trigger", "appointment_reminder").eq("active", true).limit(1);
      setTemplate((tpls?.[0] ?? null) as Tpl | null);
    })();
  }, [tomorrow, storageKey]);

  function persistSent(next: Record<string, string>) {
    setSentMap(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function sendOne(a: ApptRow) {
    if (!a.patients?.phone) { toast.error("Paciente sem telefone"); return; }
    const patient: PatientLite = { id: a.patients.id, full_name: a.patients.full_name, phone: a.patients.phone };
    const extras = { data_consulta: new Date(a.date).toLocaleDateString("pt-BR"), hora_consulta: a.start_time.slice(0, 5), nome_profissional: a.profiles?.full_name ?? "" };
    const fallback = `Olá ${patient.full_name}, lembrando da sua consulta amanhã às ${extras.hora_consulta} em ${tenantName}.`;
    const content = template ? applyVars(template.content, patient, tenantName, extras) : fallback;
    window.open(buildWhatsAppLink(patient.phone, content), "_blank", "noopener,noreferrer");
    try {
      await logMessage({ tenant_id: tenantId, patient_id: patient.id, template_id: template?.id ?? null, channel: "whatsapp", content, sent_by: userId });
      persistSent({ ...sentMap, [a.id]: new Date().toISOString() });
    } catch { toast.error("Falha ao registrar"); }
  }

  async function sendAll() {
    const pending = appts.filter(a => !sentMap[a.id] && a.patients?.phone);
    if (pending.length === 0) { toast.info("Nenhum lembrete pendente"); return; }
    for (const a of pending) { await sendOne(a); await new Promise(r => setTimeout(r, 400)); }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Lembretes para amanhã — {new Date(tomorrow).toLocaleDateString("pt-BR")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Envie lembretes de consulta para os pacientes agendados amanhã.</p>
          </div>
          <Button onClick={sendAll}><Send className="size-4 mr-2" />Enviar todos pendentes</Button>
        </div>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
            <tr><th className="py-2">Paciente</th><th>Telefone</th><th>Horário</th><th>Profissional</th><th>Situação</th><th></th></tr>
          </thead>
          <tbody>
            {appts.map(a => {
              const sentAt = sentMap[a.id];
              return (
                <tr key={a.id} className="border-t">
                  <td className="py-2">{a.patients?.full_name ?? "—"}</td>
                  <td>{a.patients?.phone ?? "—"}</td>
                  <td>{a.start_time.slice(0, 5)}</td>
                  <td>{a.profiles?.full_name ?? "—"}</td>
                  <td>{sentAt ? <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline"><Check className="size-3 mr-1" />Enviado</Badge> : <Badge variant="outline">Pendente</Badge>}</td>
                  <td><Button size="sm" variant="outline" onClick={() => sendOne(a)}><ExternalLink className="size-3 mr-1" />Enviar</Button></td>
                </tr>
              );
            })}
            {appts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma consulta agendada para amanhã</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}