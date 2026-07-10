import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, HandCoins, Download } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmt, fmtDate, BILL_STATUS_LABEL, BILL_STATUS_CLASS, isOverdue } from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import { NewBillReceivableDialog } from "@/components/bill-receivable-dialog";
import { ReceivePaymentDialog } from "@/components/receive-payment-dialog";

export const Route = createFileRoute("/_authenticated/financial/receivables")({ component: Page });

interface Row { id: string; description: string; amount: number; due_date: string; payment_method: string | null; status: string; patients: { full_name: string } | null; profiles: { full_name: string } | null; }

export function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(0); const [total, setTotal] = useState(0);
  const [newOpen, setNewOpen] = useState(false); const [recvOpen, setRecvOpen] = useState(false);

  const load = async () => {
    let qy = supabase.from("bills_receivable" as never)
      .select("id, description, amount, due_date, payment_method, status, patients(full_name), profiles:professional_id(full_name)", { count: "exact" })
      .order("due_date", { ascending: false })
      .range(page * 20, page * 20 + 19) as never;
    if (status !== "all") qy = (qy as never as { eq: (a:string,b:string)=>unknown }).eq("status", status) as never;
    if (from) qy = (qy as never as { gte: (a:string,b:string)=>unknown }).gte("due_date", from) as never;
    if (to) qy = (qy as never as { lte: (a:string,b:string)=>unknown }).lte("due_date", to) as never;
    if (q) qy = (qy as never as { ilike: (a:string,b:string)=>unknown }).ilike("description", `%${q}%`) as never;
    const { data, count, error } = await qy;
    if (error) {
      toast.error(error.message);
      setRows([]);
      setTotal(0);
      return;
    }
    setRows(data ?? []);
    setTotal(count ?? 0);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status, from, to, q]);

  const exportCsv = () => {
    const head = "Paciente,Descricao,Valor,Vencimento,Forma,Situacao\n";
    const body = rows.map((r) => [r.patients?.full_name ?? "", r.description, r.amount, r.due_date, r.payment_method ?? "", r.status].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob); window.open(url, "_blank");
  };

  return (
    <DashboardShell title="Contas a Receber">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end justify-between">
          <div className="flex flex-wrap gap-2 items-end">
            <Input placeholder="Buscar descrição" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} className="w-56" />
            <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(BILL_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} className="w-40" />
            <Input type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Planilha</Button>
            <Button variant="outline" onClick={() => setRecvOpen(true)}><HandCoins className="h-4 w-4 mr-2" />Receber Pagamento</Button>
            <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Cobrança</Button>
          </div>
        </div>
        <Card><CardContent className="min-w-0 p-0"><Table>
          <TableHeader><TableRow><TableHead>Paciente</TableHead><TableHead>Profissional</TableHead><TableHead>Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Forma</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhuma cobrança</TableCell></TableRow> :
              rows.map((r) => {
                const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="font-medium">{fmt(r.amount)}</TableCell>
                    <TableCell>{fmtDate(r.due_date)}</TableCell>
                    <TableCell className="text-sm">{r.payment_method ? paymentLabel(r.payment_method) : "—"}</TableCell>
                    <TableCell><Badge className={BILL_STATUS_CLASS[eff]}>{BILL_STATUS_LABEL[eff]}</Badge></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table></CardContent></Card>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
      <NewBillReceivableDialog open={newOpen} onOpenChange={setNewOpen} onSaved={load} />
      <ReceivePaymentDialog open={recvOpen} onOpenChange={setRecvOpen} onSaved={load} />
    </DashboardShell>
  );
}