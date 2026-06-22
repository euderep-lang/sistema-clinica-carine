import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fmtDateTime, fmtDateFromDate, shiftDateISO, todayISO } from "@/lib/locale";
import { useEffect, useMemo, useState } from "react";
import { Cake, Send, Users, BarChart3, Megaphone, ExternalLink, Check, Download } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { applyVars, logMessage, age, daysSince, DEFAULT_BIRTHDAY_MESSAGE, type PatientLite, CHANNEL_BADGE } from "@/lib/messaging";
import { openCrmInbox } from "@/lib/crm-navigation";
import { toast } from "sonner";
import { randomUUID } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/reception/marketing")({
  component: MarketingPage,
});

interface Tpl { id: string; name: string; channel: string; trigger: string; content: string; active: boolean; }

function initials(name: string) { return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }

function MarketingPage() {
  const { tenant, profile } = useAuth();
  return (
    <DashboardShell title="Campanhas">
      <Tabs defaultValue="aniversariantes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="aniversariantes"><Cake className="size-4 mr-2" />Aniversariantes</TabsTrigger>
          <TabsTrigger value="inativos"><Users className="size-4 mr-2" />Pacientes Inativos</TabsTrigger>
          <TabsTrigger value="campanhas"><Megaphone className="size-4 mr-2" />Campanhas</TabsTrigger>
          <TabsTrigger value="relatorio"><BarChart3 className="size-4 mr-2" />Relatório</TabsTrigger>
        </TabsList>
        <TabsContent value="aniversariantes"><AniversariantesTab tenantId={tenant?.id ?? ""} tenantName={tenant?.name ?? ""} userId={profile?.id ?? ""} /></TabsContent>
        <TabsContent value="inativos"><InativosTab tenantId={tenant?.id ?? ""} tenantName={tenant?.name ?? ""} userId={profile?.id ?? ""} /></TabsContent>
        <TabsContent value="campanhas"><CampanhasTab tenantId={tenant?.id ?? ""} tenantName={tenant?.name ?? ""} userId={profile?.id ?? ""} /></TabsContent>
        <TabsContent value="relatorio"><RelatorioTab /></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

// ============ Aniversariantes

function AniversariantesTab({ tenantId, tenantName, userId }: { tenantId: string; tenantName: string; userId: string }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth());
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [template, setTemplate] = useState<Tpl | null>(null);
  const [contacted, setContacted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true).not("birth_date", "is", null);
      setPatients((data ?? []) as PatientLite[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: t } = await (supabase as any).from("message_templates").select("id, name, channel, trigger, content, active").eq("trigger", "birthday").eq("active", true).limit(1);
      setTemplate((t?.[0] ?? null) as Tpl | null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs } = await (supabase as any).from("message_logs").select("patient_id, sent_at").gte("sent_at", new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());
      const map: Record<string, boolean> = {};
      ((logs ?? []) as { patient_id: string }[]).forEach(l => { if (l.patient_id) map[l.patient_id] = true; });
      setContacted(map);
    })();
  }, []);

  const monthPatients = useMemo(() => patients.filter(p => p.birth_date && new Date(p.birth_date).getMonth() === month).sort((a, b) => new Date(a.birth_date!).getDate() - new Date(b.birth_date!).getDate()), [patients, month]);
  const totalContacted = monthPatients.filter(p => contacted[p.id]).length;

  async function sendBirthday(p: PatientLite) {
    if (!p.phone) { toast.error("Sem telefone"); return; }
    const content = template ? applyVars(template.content, p, tenantName) : applyVars(DEFAULT_BIRTHDAY_MESSAGE, p, tenantName);
    openCrmInbox(navigate, { patientId: p.id, phone: p.phone, draft: content });
    try { await logMessage({ tenant_id: tenantId, patient_id: p.id, template_id: template?.id ?? null, channel: "whatsapp", content, sent_by: userId }); setContacted({ ...contacted, [p.id]: true }); }
    catch { toast.error("Falha ao registrar"); }
  }

  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={async () => {
          if (!confirm(`Preparar mensagens de aniversário para ${monthPatients.length} pacientes no CRM?`)) return;
          toast.info("Envie cada mensagem pelo CRM clicando no paciente.");
        }}><Send className="size-4 mr-2" />Enviar para todos do mês</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Aniversariantes</div><div className="text-2xl font-semibold">{monthPatients.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Já contatados</div><div className="text-2xl font-semibold text-green-600">{totalContacted}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pendentes</div><div className="text-2xl font-semibold text-amber-600">{monthPatients.length - totalContacted}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr><th className="p-3"></th><th>Nome</th><th>Aniversário</th><th>Idade que fará</th><th>Telefone</th><th>Situação</th><th></th></tr>
            </thead>
            <tbody>
              {monthPatients.map(p => {
                const d = new Date(p.birth_date!);
                const willTurn = (age(p.birth_date) ?? 0) + (d.getMonth() < new Date().getMonth() || (d.getMonth() === new Date().getMonth() && d.getDate() < new Date().getDate()) ? 0 : 0);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3"><Avatar className="size-8"><AvatarFallback>{initials(p.full_name)}</AvatarFallback></Avatar></td>
                    <td>{p.full_name}</td>
                    <td>{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}</td>
                    <td>{willTurn + 1} anos</td>
                    <td>{p.phone ?? "—"}</td>
                    <td>{contacted[p.id] ? <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><Check className="size-3 mr-1" />Contatado</Badge> : <Badge variant="outline">Pendente</Badge>}</td>
                    <td className="pr-3"><Button size="sm" variant="outline" onClick={() => sendBirthday(p)}>Enviar Parabéns</Button></td>
                  </tr>
                );
              })}
              {monthPatients.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Sem aniversariantes neste mês</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Inativos

interface InactivePatient extends PatientLite { last_appointment: string | null; last_professional: string | null; days: number; }

function InativosTab({ tenantId, tenantName, userId }: { tenantId: string; tenantName: string; userId: string }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<number>(90);
  const [rows, setRows] = useState<InactivePatient[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [customMsg, setCustomMsg] = useState(`Olá {{nome_paciente}}, faz um tempo que não nos vemos. Que tal agendar uma consulta na ${"{{nome_clinica}}"}?`);

  useEffect(() => {
    (async () => {
      const { data: pts } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true);
      const { data: appts } = await supabase.from("appointments").select("patient_id, date, professional_id, profiles!appointments_professional_id_fkey(full_name)").order("date", { ascending: false });
      const last: Record<string, { date: string; prof: string | null }> = {};
      ((appts ?? []) as unknown as { patient_id: string; date: string; profiles?: { full_name: string } | null }[]).forEach(a => {
        if (!last[a.patient_id]) last[a.patient_id] = { date: a.date, prof: a.profiles?.full_name ?? null };
      });
      const result: InactivePatient[] = ((pts ?? []) as PatientLite[]).map(p => {
        const l = last[p.id];
        const d = l ? daysSince(l.date) ?? 99999 : 99999;
        return { ...p, last_appointment: l?.date ?? null, last_professional: l?.prof ?? null, days: d };
      }).filter(r => r.days >= period).sort((a, b) => b.days - a.days);
      setRows(result);
    })();
  }, [period]);

  function dayColor(d: number) {
    if (d >= 365) return "text-red-600 font-semibold";
    if (d >= 180) return "text-orange-600 font-semibold";
    return "text-yellow-700 font-semibold";
  }

  async function sendReactivation(p: InactivePatient) {
    if (!p.phone) { toast.error("Sem telefone"); return; }
    const content = applyVars(customMsg, p, tenantName);
    openCrmInbox(navigate, { patientId: p.id, phone: p.phone, draft: content });
    try { await logMessage({ tenant_id: tenantId, patient_id: p.id, channel: "whatsapp", content, sent_by: userId }); }
    catch { toast.error("Falha ao registrar"); }
  }

  async function bulkSend() {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    toast.info(`${ids.length} paciente(s) selecionado(s). Envie pelo CRM clicando em cada um.`);
  }

  function exportCSV() {
    const csv = ["Nome,Telefone,Última Consulta,Profissional,Dias", ...rows.map(r => [r.full_name, r.phone ?? "", r.last_appointment ?? "", r.last_professional ?? "", r.days].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pacientes-inativos.csv"; a.click();
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm">Sem consulta há mais de:</Label>
        {[90, 180, 365].map(d => (
          <Button key={d} size="sm" variant={period === d ? "default" : "outline"} onClick={() => setPeriod(d)}>{d === 365 ? "1 ano" : `${d} dias`}</Button>
        ))}
        <div className="ml-auto"><Button size="sm" variant="outline" onClick={exportCSV}><Download className="size-4 mr-2" />Exportar planilha</Button></div>
      </div>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
          <strong>{rows.length}</strong> pacientes inativos nos últimos {period} dias
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensagem de reativação</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={3} />
          <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{{nome_paciente}}"}, {"{{nome_clinica}}"}</p>
        </CardContent>
      </Card>

      {selectedCount > 0 && (
        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md">
          <span className="text-sm">{selectedCount} selecionado(s)</span>
          <Button size="sm" onClick={bulkSend}><Send className="size-4 mr-2" />Enviar mensagem</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="p-3"><Checkbox checked={selectedCount === rows.length && rows.length > 0} onCheckedChange={v => { const m: Record<string, boolean> = {}; if (v) rows.forEach(r => m[r.id] = true); setSelected(m); }} /></th>
                <th></th><th>Nome</th><th>Última consulta</th><th>Profissional</th><th>Telefone</th><th>Dias</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3"><Checkbox checked={!!selected[r.id]} onCheckedChange={v => setSelected({ ...selected, [r.id]: !!v })} /></td>
                  <td><Avatar className="size-8"><AvatarFallback>{initials(r.full_name)}</AvatarFallback></Avatar></td>
                  <td>{r.full_name}</td>
                  <td>{r.last_appointment ? fmtDateFromDate(new Date(r.last_appointment)) : "—"}</td>
                  <td>{r.last_professional ?? "—"}</td>
                  <td>{r.phone ?? "—"}</td>
                  <td><span className={dayColor(r.days)}>{r.days >= 99999 ? "∞" : r.days}</span></td>
                  <td className="pr-3"><Button size="sm" variant="outline" onClick={() => sendReactivation(r)}>Reativar</Button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum paciente inativo</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Campanhas

interface Campaign { id: string; date: string; segment: string; channel: string; count: number; template: string; }

function CampanhasTab({ tenantId, tenantName, userId }: { tenantId: string; tenantName: string; userId: string }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [segment, setSegment] = useState<string>("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [segmentPatients, setSegmentPatients] = useState<PatientLite[]>([]);
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [tplId, setTplId] = useState<string>("custom");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<Campaign[]>([]);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendIndex, setSendIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("patients").select("id, full_name, phone, birth_date").eq("active", true);
      setPatients((p ?? []) as PatientLite[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: t } = await (supabase as any).from("message_templates").select("id, name, channel, trigger, content, active").eq("active", true);
      setTemplates((t ?? []) as Tpl[]);
      try { setHistory(JSON.parse(localStorage.getItem("campaigns_history") ?? "[]")); } catch { /* noop */ }
    })();
  }, []);

  function pickSegment(s: string) {
    setSegment(s);
    const now = new Date();
    let list: PatientLite[] = [];
    if (s === "all") list = patients;
    else if (s === "birthday") list = patients.filter(p => p.birth_date && new Date(p.birth_date).getMonth() === now.getMonth());
    else if (s === "inactive90") list = patients; // simplified
    setSegmentPatients(list);
  }

  async function startCampaign() {
    setSendOpen(true); setSendIndex(0);
    const camp: Campaign = { id: randomUUID(), date: new Date().toISOString(), segment, channel, count: segmentPatients.length, template: tplId === "custom" ? "Personalizado" : templates.find(t => t.id === tplId)?.name ?? "—" };
    const next = [camp, ...history]; setHistory(next); localStorage.setItem("campaigns_history", JSON.stringify(next));
  }

  async function sendNext() {
    const p = segmentPatients[sendIndex]; if (!p) return;
    if (!p.phone) { setSendIndex(sendIndex + 1); return; }
    const tpl = templates.find(t => t.id === tplId);
    const msg = tpl ? applyVars(tpl.content, p, tenantName) : applyVars(content, p, tenantName);
    openCrmInbox(navigate, { patientId: p.id, phone: p.phone, draft: msg });
    try { await logMessage({ tenant_id: tenantId, patient_id: p.id, template_id: tplId === "custom" ? null : tplId, channel, content: msg, sent_by: userId }); } catch { /* noop */ }
    setSendIndex(sendIndex + 1);
  }

  const channelTpls = templates.filter(t => t.channel === channel);

  const segments = [
    { id: "all", label: "Todos os pacientes ativos", count: patients.length },
    { id: "birthday", label: "Aniversariantes do mês", count: patients.filter(p => p.birth_date && new Date(p.birth_date).getMonth() === new Date().getMonth()).length },
    { id: "inactive90", label: "Pacientes inativos +90 dias", count: patients.length },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Nova Campanha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 text-sm">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 p-2 rounded border ${step === s ? "border-primary bg-primary/10" : "border-muted"}`}>
                <div className="font-semibold">Passo {s}</div>
                <div className="text-xs text-muted-foreground">{["Segmento","Mensagem","Revisão"][s - 1]}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {segments.map(s => (
                  <button key={s.id} className={`p-4 rounded-lg border text-left ${segment === s.id ? "border-primary bg-primary/10" : ""}`} onClick={() => pickSegment(s.id)}>
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.count} pacientes</div>
                  </button>
                ))}
              </div>
              <Button disabled={!segment} onClick={() => setStep(2)}>Próximo</Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Canal</Label>
                <div className="flex gap-2 mt-1">
                  <Button variant={channel === "whatsapp" ? "default" : "outline"} onClick={() => setChannel("whatsapp")}>WhatsApp</Button>
                  <Button variant={channel === "sms" ? "default" : "outline"} onClick={() => setChannel("sms")}>Mensagem de texto</Button>
                </div>
              </div>
              <div>
                <Label>Modelo</Label>
                <Select value={tplId} onValueChange={v => { setTplId(v); if (v !== "custom") { const t = templates.find(x => x.id === v); if (t) setContent(t.content); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    {channelTpls.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conteúdo</Label>
                <Textarea value={content} onChange={e => setContent(e.target.value)} rows={5} />
              </div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button disabled={!content.trim()} onClick={() => setStep(3)}>Próximo</Button></div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2 text-sm">
                <div><strong>Segmento:</strong> {segments.find(x => x.id === segment)?.label}</div>
                <div><strong>Destinatários:</strong> {segmentPatients.length}</div>
                <div><strong>Canal:</strong> {channel}</div>
                <div className="p-3 bg-muted rounded"><strong>Mensagem:</strong><pre className="whitespace-pre-wrap mt-1 text-xs">{content}</pre></div>
                <details><summary className="cursor-pointer">Ver primeiros pacientes</summary><ul className="text-xs ml-4 mt-1">{segmentPatients.slice(0, 5).map(p => <li key={p.id}>{p.full_name}</li>)}{segmentPatients.length > 5 && <li>e mais {segmentPatients.length - 5}</li>}</ul></details>
              </div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(2)}>Voltar</Button><Button onClick={startCampaign}><Send className="size-4 mr-2" />Iniciar Campanha</Button></div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Envio em sequência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">Enviado {sendIndex} de {segmentPatients.length}</div>
            <div className="h-2 bg-muted rounded"><div className="h-full bg-primary rounded transition-all" style={{ width: `${(sendIndex / Math.max(1, segmentPatients.length)) * 100}%` }} /></div>
            {sendIndex < segmentPatients.length && (
              <div className="p-3 border rounded text-sm">
                <div className="font-medium">{segmentPatients[sendIndex]?.full_name}</div>
                <div className="text-xs text-muted-foreground">{segmentPatients[sendIndex]?.phone ?? "Sem telefone"}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            {sendIndex < segmentPatients.length ? <Button onClick={sendNext}><Send className="size-4 mr-2" />Abrir no CRM</Button> : <Button onClick={() => { setSendOpen(false); setStep(1); setSegment(""); setContent(""); }}>Concluir</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Campanhas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide"><tr><th className="p-3">Data</th><th>Segmento</th><th>Canal</th><th>Total</th><th>Modelo</th></tr></thead>
            <tbody>
              {history.map(c => (
                <tr key={c.id} className="border-t"><td className="p-3">{fmtDateTime(c.date)}</td><td>{c.segment}</td><td>{c.channel}</td><td>{c.count}</td><td>{c.template}</td></tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem campanhas ainda</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Relatório

function RelatorioTab() {
  const [logs, setLogs] = useState<{ sent_at: string; channel: string; patient_id: string | null; template_id: string | null; message_templates?: { name: string } | null }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("message_logs").select("sent_at, channel, patient_id, template_id, message_templates(name)").gte("sent_at", since.toISOString()).order("sent_at");
      setLogs((data ?? []));
    })();
  }, []);

  const total = logs.length;
  const whatsapp = logs.filter(l => l.channel === "whatsapp").length;
  const sms = logs.filter(l => l.channel === "sms").length;
  const reach = new Set(logs.map(l => l.patient_id).filter(Boolean)).size;

  const byDay: Record<string, { day: string; whatsapp: number; sms: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const k = shiftDateISO(todayISO(), -i).slice(5, 10);
    byDay[k] = { day: k, whatsapp: 0, sms: 0 };
  }
  logs.forEach(l => { const k = l.sent_at.slice(5, 10); if (byDay[k]) { if (l.channel === "whatsapp") byDay[k].whatsapp++; else if (l.channel === "sms") byDay[k].sms++; } });
  const dayData = Object.values(byDay);

  const tplCounts: Record<string, { name: string; count: number; channel: string; last: string }> = {};
  logs.forEach(l => {
    const name = l.message_templates?.name ?? "Personalizado";
    if (!tplCounts[name]) tplCounts[name] = { name, count: 0, channel: l.channel, last: l.sent_at };
    tplCounts[name].count++;
    if (l.sent_at > tplCounts[name].last) tplCounts[name].last = l.sent_at;
  });
  const topTpls = Object.values(tplCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total enviadas (30d)</div><div className="text-2xl font-semibold">{total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">WhatsApp</div><div className="text-2xl font-semibold text-green-600">{whatsapp}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Mensagem de texto</div><div className="text-2xl font-semibold text-blue-600">{sms}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pacientes alcançados</div><div className="text-2xl font-semibold">{reach}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Mensagens por dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip /><Legend />
              <Bar dataKey="whatsapp" stackId="a" fill="#22c55e" name="WhatsApp" />
              <Bar dataKey="sms" stackId="a" fill="#3b82f6" name="Mensagem de texto" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 5 modelos mais utilizados</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topTpls.map(t => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-40 text-sm truncate">{t.name}</div>
                <div className="flex-1 h-6 bg-muted rounded relative">
                  <div className="h-full bg-primary rounded" style={{ width: `${(t.count / topTpls[0].count) * 100}%` }} />
                </div>
                <div className="w-12 text-right text-sm font-semibold">{t.count}</div>
              </div>
            ))}
            {topTpls.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Sem dados</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por modelo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wide"><tr><th className="p-3">Nome</th><th>Canal</th><th>Vezes usado</th><th>Último uso</th></tr></thead>
            <tbody>
              {Object.values(tplCounts).map(t => (
                <tr key={t.name} className="border-t"><td className="p-3">{t.name}</td><td><Badge variant="outline" className={CHANNEL_BADGE[t.channel]?.cls}>{CHANNEL_BADGE[t.channel]?.label ?? t.channel}</Badge></td><td>{t.count}</td><td>{fmtDateTime(t.last)}</td></tr>
              ))}
              {Object.values(tplCounts).length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Sem dados</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}