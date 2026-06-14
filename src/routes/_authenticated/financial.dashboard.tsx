import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { BarChart, Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmt, fmtDate, BILL_STATUS_LABEL, BILL_STATUS_CLASS, isOverdue } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/financial/dashboard")({ component: Dashboard });

interface BR { id: string; description: string; amount: number; paid_amount: number; due_date: string; paid_date: string | null; status: string; patients: { full_name: string } | null; }
interface BP { id: string; description: string; supplier: string | null; amount: number; due_date: string; paid_date: string | null; status: string; }

function Dashboard() {
  const [recv, setRecv] = useState<BR[]>([]);
  const [pay, setPay] = useState<BP[]>([]);

  useEffect(() => { (async () => {
    const { data: r } = await supabase.from("bills_receivable" as never).select("id, description, amount, paid_amount, due_date, paid_date, status, patients(full_name)").order("due_date") as never;
    setRecv(((r ?? []) as unknown) as BR[]);
    const { data: p } = await supabase.from("bills_payable" as never).select("id, description, supplier, amount, due_date, paid_date, status").order("due_date") as never;
    setPay(((p ?? []) as unknown) as BP[]);
  })(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const monthIncome = recv.filter((b) => b.paid_date && b.paid_date.startsWith(month)).reduce((s, b) => s + Number(b.paid_amount), 0);
  const monthExpense = pay.filter((b) => b.paid_date && b.paid_date.startsWith(month)).reduce((s, b) => s + Number(b.amount), 0);
  const toReceive = recv.filter((b) => b.status === "pending" || b.status === "partial" || b.status === "overdue").reduce((s, b) => s + (Number(b.amount) - Number(b.paid_amount)), 0);
  const toPay = pay.filter((b) => b.status === "pending" || b.status === "overdue").reduce((s, b) => s + Number(b.amount), 0);
  const result = monthIncome - monthExpense;

  // Build last 30 days chart
  const days: { day: string; income: number; expense: number; balance: number }[] = [];
  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const inc = recv.filter((b) => b.paid_date === k).reduce((s, b) => s + Number(b.paid_amount), 0);
    const exp = pay.filter((b) => b.paid_date === k).reduce((s, b) => s + Number(b.amount), 0);
    cumulative += inc - exp;
    days.push({ day: `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`, income: inc, expense: exp, balance: cumulative });
  }

  const overdueRecv = recv.filter((b) => isOverdue(b.due_date, b.status));
  const overduePay = pay.filter((b) => isOverdue(b.due_date, b.status));
  const upcomingRecv = recv.filter((b) => b.status === "pending" || b.status === "partial" || b.status === "overdue").slice(0, 5);
  const upcomingPay = pay.filter((b) => b.status === "pending" || b.status === "overdue").slice(0, 5);

  const overdueCount = overdueRecv.length + overduePay.length;

  return (
    <DashboardShell title="Painel Financeiro">
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas e fluxo de caixa da clínica."
      />

      {overdueCount > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            Você tem {overdueCount} conta{overdueCount > 1 ? "s" : ""} vencida
            {overdueCount > 1 ? "s" : ""}.
          </span>
          <Link
            to="/financial/receivables"
            className="cursor-pointer text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
          >
            Ver detalhes →
          </Link>
        </div>
      )}

      <PageSection title="Resumo do mês">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Receita do mês" value={fmt(monthIncome)} icon={TrendingUp} tone="success" />
          <StatCard label="A receber" value={fmt(toReceive)} icon={Wallet} />
          <StatCard label="A pagar" value={fmt(toPay)} icon={TrendingDown} tone="warning" />
          <StatCard
            label="Resultado do mês"
            value={fmt(result)}
            icon={BarChart3}
            tone={result >= 0 ? "success" : "danger"}
          />
        </div>
      </PageSection>

      <div className="space-y-6">

        <Card>
          <CardHeader><CardTitle className="text-base">Fluxo de caixa — últimos 30 dias</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <ComposedChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="income" name="Receita" fill="var(--color-success)" />
                  <Bar dataKey="expense" name="Despesa" fill="var(--color-destructive)" />
                  <Line type="monotone" dataKey="balance" name="Saldo acumulado" stroke="var(--color-primary)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Próximos a receber</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Paciente</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcomingRecv.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nada pendente</TableCell></TableRow> :
                    upcomingRecv.map((b) => (
                      <TableRow key={b.id} className={isOverdue(b.due_date, b.status) ? "border-l-4 border-l-red-500" : ""}>
                        <TableCell>{b.patients?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{b.description}</TableCell>
                        <TableCell>{fmt(b.amount)}</TableCell>
                        <TableCell>{fmtDate(b.due_date)}</TableCell>
                        <TableCell><Badge className={BILL_STATUS_CLASS[isOverdue(b.due_date,b.status)?"overdue":b.status]}>{BILL_STATUS_LABEL[isOverdue(b.due_date,b.status)?"overdue":b.status]}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody></Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Próximas a pagar</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {upcomingPay.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nada pendente</TableCell></TableRow> :
                    upcomingPay.map((b) => (
                      <TableRow key={b.id} className={isOverdue(b.due_date, b.status) ? "border-l-4 border-l-red-500" : ""}>
                        <TableCell className="text-sm">{b.description}</TableCell>
                        <TableCell className="text-sm">{b.supplier ?? "—"}</TableCell>
                        <TableCell>{fmt(b.amount)}</TableCell>
                        <TableCell>{fmtDate(b.due_date)}</TableCell>
                        <TableCell><Badge className={BILL_STATUS_CLASS[isOverdue(b.due_date,b.status)?"overdue":b.status]}>{BILL_STATUS_LABEL[isOverdue(b.due_date,b.status)?"overdue":b.status]}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody></Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}