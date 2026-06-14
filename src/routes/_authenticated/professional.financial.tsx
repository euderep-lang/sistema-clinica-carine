import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
  PAYMENT_LABEL,
} from "@/lib/currency";
import { currentYearMonth, periodFromYearMonth } from "@/lib/commission";

export const Route = createFileRoute("/_authenticated/professional/financial")({
  component: ProfessionalFinancialPage,
});

interface BillRow {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  status: string;
  patients: { full_name: string } | null;
}

function ProfessionalFinancialPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<BillRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionPct, setCommissionPct] = useState(0);

  const period = periodFromYearMonth(currentYearMonth());

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("commission_pct")
        .eq("id", profile.id)
        .maybeSingle();
      setCommissionPct(Number(prof?.commission_pct ?? 0));

      let q = supabase
        .from("bills_receivable")
        .select(
          "id,description,amount,paid_amount,due_date,paid_date,payment_method,status,patients(full_name)",
        )
        .or(`professional_id.eq.${profile.id},professional_id.is.null`)
        .order("due_date", { ascending: false })
        .limit(100);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      setRows((data ?? []) as BillRow[]);
      setLoading(false);
    })();
  }, [profile, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        (r.patients?.full_name?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    if (!period) return { production: 0, received: 0, pending: 0 };
    let production = 0;
    let received = 0;
    let pending = 0;
    for (const r of rows) {
      if (r.due_date >= period.from && r.due_date <= period.to) {
        production += Number(r.amount);
        if (["pending", "partial", "overdue"].includes(r.status)) {
          pending += Number(r.amount) - Number(r.paid_amount);
        }
      }
      if (
        r.paid_date &&
        r.paid_date >= period.from &&
        r.paid_date <= period.to &&
        (r.status === "paid" || r.status === "partial")
      ) {
        received += Number(r.paid_amount);
      }
    }
    return { production, received, pending };
  }, [rows, period]);

  const commissionEst = stats.received * (commissionPct / 100);

  return (
    <DashboardShell title="Financeiro">
      <div className="space-y-6">
        <PageHeader
          title="Meu financeiro"
          description="Cobranças vinculadas aos seus atendimentos e estimativa de comissão do mês."
        />

        <PageSection title="Resumo do mês">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Produção" value={fmt(stats.production)} icon={Wallet} />
            <StatCard label="Recebido" value={fmt(stats.received)} icon={TrendingUp} tone="success" />
            <StatCard label="Pendente" value={fmt(stats.pending)} icon={TrendingDown} tone="warning" />
            <StatCard
              label="Comissão estimada"
              value={fmt(commissionEst)}
              sub={`${commissionPct}% sobre recebido`}
              icon={Wallet}
            />
          </div>
        </PageSection>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Buscar paciente ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(BILL_STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhuma cobrança encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.description}</TableCell>
                        <TableCell>{fmt(r.amount)}</TableCell>
                        <TableCell>{fmt(r.paid_amount)}</TableCell>
                        <TableCell>{fmtDate(r.due_date)}</TableCell>
                        <TableCell className="text-sm">
                          {r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={BILL_STATUS_CLASS[eff]}>
                            {BILL_STATUS_LABEL[eff]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
