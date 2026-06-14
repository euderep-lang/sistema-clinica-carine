import { useEffect, useMemo, useState } from "react";
import { Users, CreditCard, Stethoscope, CalendarRange, BanknoteArrowDown, UserPlus, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import { fmt, PAYMENT_LABEL } from "@/lib/currency";
import { resolveLetterheadProfessionalId } from "@/lib/letterhead";
import { printWithLetterhead } from "@/lib/letterhead-print";
import { TableSkeleton, EmptyState } from "@/components/feedback-states";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

const REPORTS = [
  { id: "producao", label: "Produção por Profissional", icon: Users },
  { id: "pagamento", label: "Receita por Forma de Pagamento", icon: CreditCard },
  { id: "especialidade", label: "Consultas por Especialidade", icon: Stethoscope },
  { id: "agenda", label: "Relatório de Agenda", icon: CalendarRange },
  { id: "fluxo", label: "Fluxo de Caixa Detalhado", icon: BanknoteArrowDown },
  { id: "pacientes", label: "Relatório de Pacientes", icon: UserPlus },
] as const;
type ReportId = typeof REPORTS[number]["id"];

function firstDayOfMonth(): string { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function today(): string { return new Date().toISOString().slice(0, 10); }
function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}

export function ReportsPage() {
  const [active, setActive] = useState<ReportId>("producao");
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit">
        <CardContent className="p-2">
          <nav className="space-y-1">
            {REPORTS.map(r => (
              <button key={r.id} onClick={() => setActive(r.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left ${active === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                <r.icon className="size-4" />{r.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>
      <div>
        {active === "producao" && <ProducaoReport />}
        {active === "pagamento" && <PagamentoReport />}
        {active === "especialidade" && <EspecialidadeReport />}
        {active === "agenda" && <AgendaReport />}
        {active === "fluxo" && <FluxoReport />}
        {active === "pacientes" && <PacientesReport />}
      </div>
    </div>
  );
}

function DateRange({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-end">
      <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
      <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
    </div>
  );
}

// 1. Produção por Profissional
function ProducaoReport() {
  const { tenant } = useAuth();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ id: string; name: string; commission: number; appointments: number; total: number; received: number; pending: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, commission_pct").eq("role", "professional");
      const { data: bills } = await supabase.from("bills_receivable").select("professional_id, amount, paid_amount, status").gte("due_date", from).lte("due_date", to);
      const { data: appts } = await supabase.from("appointments").select("professional_id, status").eq("status", "completed").gte("date", from).lte("date", to);
      const map = new Map<string, { id: string; name: string; commission: number; appointments: number; total: number; received: number; pending: number }>();
      ((profs ?? []) as { id: string; full_name: string; commission_pct: number | null }[]).forEach(p => map.set(p.id, { id: p.id, name: p.full_name, commission: Number(p.commission_pct ?? 0), appointments: 0, total: 0, received: 0, pending: 0 }));
      ((bills ?? []) as { professional_id: string; amount: number; paid_amount: number; status: string }[]).forEach(b => {
        if (!b.professional_id) return; const m = map.get(b.professional_id); if (!m) return;
        m.total += Number(b.amount); m.received += Number(b.paid_amount); if (b.status === "pending" || b.status === "partial") m.pending += Number(b.amount) - Number(b.paid_amount);
      });
      ((appts ?? []) as { professional_id: string }[]).forEach(a => { if (a.professional_id) { const m = map.get(a.professional_id); if (m) m.appointments++; } });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);

  const totals = rows.reduce((acc, r) => ({ a: acc.a + r.appointments, t: acc.t + r.total, rec: acc.rec + r.received, p: acc.p + r.pending, c: acc.c + r.received * (r.commission / 100) }), { a: 0, t: 0, rec: 0, p: 0, c: 0 });
  const primary = tenant?.primary_color ?? "#1a2b4a";

  return (
    <Card>
      <CardHeader><CardTitle>Produção por Profissional</CardTitle><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Users} title="Sem produção no período" /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={11} tickFormatter={(v) => fmt(v as number)} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill={primary} name="Produção" />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Profissional</th><th>Consultas</th><th>Produção</th><th>Recebido</th><th>Pendente</th><th>Comissão</th></tr></thead>
                <tbody>
                  {rows.map(r => (<tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td>{r.appointments}</td><td>{fmt(r.total)}</td><td>{fmt(r.received)}</td><td className="text-amber-600">{fmt(r.pending)}</td><td>{fmt(r.received * (r.commission / 100))} ({r.commission}%)</td></tr>))}
                  <tr className="border-t font-semibold bg-muted/50"><td className="p-2">Total</td><td>{totals.a}</td><td>{fmt(totals.t)}</td><td>{fmt(totals.rec)}</td><td>{fmt(totals.p)}</td><td>{fmt(totals.c)}</td></tr>
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("producao.csv", [["Profissional","Consultas","Producao","Recebido","Pendente","Comissao"], ...rows.map(r => [r.name, r.appointments, r.total, r.received, r.pending, r.received * (r.commission / 100)])])}><Download className="size-4 mr-2" />Exportar planilha</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const PAY_COLORS: Record<string, string> = { cash: "#22c55e", pix: "#14b8a6", credit_card: "#3b82f6", debit_card: "#6366f1", health_insurance: "#a855f7", bank_transfer: "#f59e0b", other: "#94a3b8" };

// 2. Receita por Forma de Pagamento
function PagamentoReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ method: string; count: number; total: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("bills_receivable").select("payment_method, paid_amount, status").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      const map = new Map<string, { method: string; count: number; total: number }>();
      ((data ?? []) as { payment_method: string; paid_amount: number }[]).forEach(b => {
        const k = b.payment_method ?? "other";
        const m = map.get(k) ?? { method: k, count: 0, total: 0 };
        m.count++; m.total += Number(b.paid_amount); map.set(k, m);
      });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);

  const grand = rows.reduce((s, r) => s + r.total, 0);

  return (
    <Card>
      <CardHeader><CardTitle>Receita por Forma de Pagamento</CardTitle><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={CreditCard} title="Sem pagamentos no período" /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={rows} dataKey="total" nameKey="method" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label={(e: { method: string }) => PAYMENT_LABEL[e.method]}>
                  {rows.map(r => <Cell key={r.method} fill={PAY_COLORS[r.method] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend formatter={(v: string) => PAYMENT_LABEL[v] ?? v} />
              </PieChart>
            </ResponsiveContainer>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Forma</th><th>Quantidade</th><th>Total</th><th>%</th></tr></thead>
              <tbody>{rows.map(r => (<tr key={r.method} className="border-t"><td className="p-2">{PAYMENT_LABEL[r.method] ?? r.method}</td><td>{r.count}</td><td>{fmt(r.total)}</td><td>{((r.total / grand) * 100).toFixed(1)}%</td></tr>))}</tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 3. Consultas por Especialidade
function EspecialidadeReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ specialty: string; total: number; completed: number; cancelled: number; noShow: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("appointments").select("specialty, status").gte("date", from).lte("date", to);
      const map = new Map<string, { specialty: string; total: number; completed: number; cancelled: number; noShow: number }>();
      ((data ?? []) as { specialty: string | null; status: string }[]).forEach(a => {
        const k = a.specialty ?? "Sem especialidade";
        const m = map.get(k) ?? { specialty: k, total: 0, completed: 0, cancelled: 0, noShow: 0 };
        m.total++; if (a.status === "completed") m.completed++; if (a.status === "cancelled") m.cancelled++; if (a.status === "no_show") m.noShow++;
        map.set(k, m);
      });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);

  const COLORS = ["#3b82f6","#22c55e","#a855f7","#f59e0b","#ef4444","#14b8a6"];

  return (
    <Card>
      <CardHeader><CardTitle>Consultas por Especialidade</CardTitle><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <TableSkeleton /> : rows.length === 0 ? <EmptyState icon={Stethoscope} title="Sem consultas no período" /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={rows} dataKey="total" nameKey="specialty" innerRadius={60} outerRadius={100} label>{rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Especialidade</th><th>Total</th><th>Realizadas</th><th>Canceladas</th><th>Faltas</th><th>Taxa Comparecimento</th></tr></thead>
              <tbody>{rows.map(r => (<tr key={r.specialty} className="border-t"><td className="p-2">{r.specialty}</td><td>{r.total}</td><td className="text-green-600">{r.completed}</td><td className="text-red-600">{r.cancelled}</td><td className="text-amber-600">{r.noShow}</td><td>{r.total ? ((r.completed / r.total) * 100).toFixed(1) : 0}%</td></tr>))}</tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLOR: Record<string, string> = { completed: "#22c55e", confirmed: "#3b82f6", scheduled: "#94a3b8", cancelled: "#ef4444", no_show: "#f59e0b", in_progress: "#a855f7" };

// 4. Relatório de Agenda
function AgendaReport() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ id: string; date: string; start_time: string; type: string; status: string; patient: string; professional: string; room: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("appointments")
        .select("id, date, start_time, type, status, patients(full_name), profiles!appointments_professional_id_fkey(full_name), rooms(name)")
        .gte("date", from).lte("date", to).order("date").order("start_time");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRows((data ?? []).map((a: any) => ({ id: a.id, date: a.date, start_time: a.start_time, type: a.type, status: a.status, patient: a.patients?.full_name ?? "—", professional: a.profiles?.full_name ?? "—", room: a.rooms?.name ?? "—" })));
      setLoading(false);
    })();
  }, [from, to]);

  const total = rows.length, done = rows.filter(r => r.status === "completed").length, can = rows.filter(r => r.status === "cancelled").length, ns = rows.filter(r => r.status === "no_show").length;
  const byDay: Record<string, Record<string, number> & { date: string }> = {};
  rows.forEach(r => { const d = r.date.slice(5); if (!byDay[d]) byDay[d] = { date: d } as Record<string, number> & { date: string }; byDay[d][r.status] = (byDay[d][r.status] ?? 0) + 1; });
  const dayData = Object.values(byDay);

  return (
    <Card>
      <CardHeader><CardTitle>Relatório de Agenda</CardTitle><DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} /></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-semibold">{total}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Realizadas</div><div className="text-xl font-semibold text-green-600">{done}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Canceladas</div><div className="text-xl font-semibold text-red-600">{can}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Faltas</div><div className="text-xl font-semibold text-amber-600">{ns}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Comparecimento</div><div className="text-xl font-semibold">{total ? ((done / total) * 100).toFixed(0) : 0}%</div></CardContent></Card>
        </div>
        {loading ? <TableSkeleton /> : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dayData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Legend />
                {Object.keys(STATUS_COLOR).map(s => <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLOR[s]} name={APPOINTMENT_STATUS_LABEL[s] ?? s} />)}
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Data</th><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Consultório</th><th>Tipo</th><th>Situação</th></tr></thead>
                <tbody>{rows.slice(0, 100).map(r => (<tr key={r.id} className="border-t"><td className="p-2">{new Date(r.date).toLocaleDateString("pt-BR")}</td><td>{r.start_time.slice(0, 5)}</td><td>{r.patient}</td><td>{r.professional}</td><td>{r.room}</td><td>{APPOINTMENT_TYPE_LABEL[r.type] ?? r.type}</td><td><Badge variant="outline" style={{ borderColor: STATUS_COLOR[r.status], color: STATUS_COLOR[r.status] }}>{APPOINTMENT_STATUS_LABEL[r.status] ?? r.status}</Badge></td></tr>))}</tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" onClick={() => downloadCSV("agenda.csv", [["Data","Hora","Paciente","Profissional","Consultorio","Tipo","Situacao"], ...rows.map(r => [r.date, r.start_time, r.patient, r.professional, r.room, APPOINTMENT_TYPE_LABEL[r.type] ?? r.type, APPOINTMENT_STATUS_LABEL[r.status] ?? r.status])])}><Download className="size-4 mr-2" />Exportar planilha</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 5. Fluxo de Caixa Detalhado
function FluxoReport() {
  const { profile } = useAuth();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<{ id: string; date: string; type: "in" | "out"; description: string; party: string; method: string; amount: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rec } = await supabase.from("bills_receivable").select("id, paid_date, description, payment_method, paid_amount, patients(full_name)").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      const { data: pay } = await supabase.from("bills_payable").select("id, paid_date, description, supplier, payment_method, amount").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ins = (rec ?? []).map((r: any) => ({ id: r.id, date: r.paid_date as string, type: "in" as const, description: r.description, party: r.patients?.full_name ?? "—", method: r.payment_method ?? "—", amount: Number(r.paid_amount) }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outs = (pay ?? []).map((p: any) => ({ id: p.id, date: p.paid_date as string, type: "out" as const, description: p.description, party: p.supplier ?? "—", method: p.payment_method ?? "—", amount: Number(p.amount) }));
      setTx([...ins, ...outs].sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    })();
  }, [from, to]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof tx> = {};
    tx.forEach(t => { (g[t.date] ??= []).push(t); });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tx]);
  const totalIn = tx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = tx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);

  function exportPDF() {
    void printWithLetterhead(resolveLetterheadProfessionalId(profile));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="size-4 mr-2" />Exportar documento</Button>
        </div>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <TableSkeleton /> : tx.length === 0 ? <EmptyState icon={BanknoteArrowDown} title="Sem movimentações no período" /> : (
          <>
            <div className="grid gap-3 grid-cols-3">
              <Card className="border-l-4 border-l-green-500"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Entradas</div><div className="text-xl font-semibold text-green-600">{fmt(totalIn)}</div></CardContent></Card>
              <Card className="border-l-4 border-l-red-500"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Saídas</div><div className="text-xl font-semibold text-red-600">{fmt(totalOut)}</div></CardContent></Card>
              <Card className="border-l-4 border-l-primary"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Saldo</div><div className={`text-xl font-semibold ${totalIn - totalOut >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totalIn - totalOut)}</div></CardContent></Card>
            </div>
            <div className="space-y-4">
              {grouped.map(([date, items]) => {
                const dIn = items.filter(i => i.type === "in").reduce((s, i) => s + i.amount, 0);
                const dOut = items.filter(i => i.type === "out").reduce((s, i) => s + i.amount, 0);
                return (
                  <div key={date}>
                    <div className="bg-muted px-3 py-1 rounded text-sm font-semibold flex justify-between"><span>{new Date(date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</span><span className="text-xs">Entradas: {fmt(dIn)} · Saídas: {fmt(dOut)} · Saldo: {fmt(dIn - dOut)}</span></div>
                    <table className="w-full text-sm">
                      <tbody>
                        {items.map(t => (
                          <tr key={t.id} className={`border-t border-l-4 ${t.type === "in" ? "border-l-green-500" : "border-l-red-500"}`}>
                            <td className="p-2 w-24">{t.type === "in" ? "Entrada" : "Saída"}</td>
                            <td>{t.description}</td>
                            <td className="text-muted-foreground">{t.party}</td>
                            <td className="text-muted-foreground">{PAYMENT_LABEL[t.method] ?? t.method}</td>
                            <td className={`text-right font-medium ${t.type === "in" ? "text-green-600" : "text-red-600"}`}>{t.type === "in" ? "+" : "−"} {fmt(t.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 6. Relatório de Pacientes
const SOURCE_COLORS = ["#3b82f6","#a855f7","#f59e0b","#22c55e","#ef4444","#14b8a6"];
function PacientesReport() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, newMonth: 0, inactive: 0, returnRate: 0 });
  const [byMonth, setByMonth] = useState<{ month: string; count: number }[]>([]);
  const [bySource, setBySource] = useState<{ name: string; value: number }[]>([]);
  const [topVisits, setTopVisits] = useState<{ id: string; name: string; count: number; last: string }[]>([]);
  const [topRevenue, setTopRevenue] = useState<{ id: string; name: string; total: number; last: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: pts } = await supabase.from("patients").select("id, full_name, created_at, active, how_did_you_find_us");
      const { data: appts } = await supabase.from("appointments").select("id, patient_id, date");
      const { data: bills } = await supabase.from("bills_receivable").select("patient_id, paid_amount, status").eq("status", "paid");
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ninetyAgo = new Date(now.getTime() - 90 * 86400000);

      const ps = (pts ?? []) as { id: string; full_name: string; created_at: string; active: boolean; how_did_you_find_us: string | null }[];
      const as = (appts ?? []) as { patient_id: string; date: string }[];
      const bs = (bills ?? []) as { patient_id: string; paid_amount: number }[];

      const apCount: Record<string, number> = {}; const apLast: Record<string, string> = {};
      as.forEach(a => { apCount[a.patient_id] = (apCount[a.patient_id] ?? 0) + 1; if (!apLast[a.patient_id] || a.date > apLast[a.patient_id]) apLast[a.patient_id] = a.date; });
      const billTotal: Record<string, number> = {};
      bs.forEach(b => { billTotal[b.patient_id] = (billTotal[b.patient_id] ?? 0) + Number(b.paid_amount); });

      const active = ps.filter(p => p.active).length;
      const newMonth = ps.filter(p => new Date(p.created_at) >= monthStart).length;
      const inactive = ps.filter(p => { const last = apLast[p.id]; return !last || new Date(last) < ninetyAgo; }).length;
      const withTwo = Object.values(apCount).filter(c => c >= 2).length;
      const returnRate = active ? (withTwo / active) * 100 : 0;
      setStats({ active, newMonth, inactive, returnRate });

      const months: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months[d.toISOString().slice(0, 7)] = 0; }
      ps.forEach(p => { const k = p.created_at.slice(0, 7); if (k in months) months[k]++; });
      setByMonth(Object.entries(months).map(([month, count]) => ({ month: month.slice(5), count })));

      const sources: Record<string, number> = {};
      ps.forEach(p => { const k = p.how_did_you_find_us ?? "Não informado"; sources[k] = (sources[k] ?? 0) + 1; });
      setBySource(Object.entries(sources).map(([name, value]) => ({ name, value })));

      setTopVisits(ps.map(p => ({ id: p.id, name: p.full_name, count: apCount[p.id] ?? 0, last: apLast[p.id] ?? "" })).sort((a, b) => b.count - a.count).slice(0, 10));
      setTopRevenue(ps.map(p => ({ id: p.id, name: p.full_name, total: billTotal[p.id] ?? 0, last: apLast[p.id] ?? "" })).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 10));
      setLoading(false);
    })();
  }, []);

  if (loading) return <Card><CardContent className="p-6"><TableSkeleton /></CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Pacientes Ativos</div><div className="text-2xl font-semibold">{stats.active}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Novos este mês</div><div className="text-2xl font-semibold text-green-600">{stats.newMonth}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Inativos +90 dias</div><div className="text-2xl font-semibold text-amber-600">{stats.inactive}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Taxa de retorno</div><div className="text-2xl font-semibold">{stats.returnRate.toFixed(1)}%</div></CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Novos pacientes (últimos 12 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#3b82f6" /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Como nos conheceram</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>{bySource.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}</Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Top 10 — Mais consultas</CardTitle></CardHeader>
          <CardContent className="p-0"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Paciente</th><th>Consultas</th><th>Última</th></tr></thead>
            <tbody>{topVisits.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td>{r.count}</td><td>{r.last ? new Date(r.last).toLocaleDateString("pt-BR") : "—"}</td></tr>)}</tbody></table></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Top 10 — Maior receita</CardTitle></CardHeader>
          <CardContent className="p-0"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground uppercase"><tr><th className="p-2">Paciente</th><th>Total pago</th><th>Última consulta</th></tr></thead>
            <tbody>{topRevenue.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td>{fmt(r.total)}</td><td>{r.last ? new Date(r.last).toLocaleDateString("pt-BR") : "—"}</td></tr>)}</tbody></table></CardContent>
        </Card>
      </div>
    </div>
  );
}