import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { todayISO } from "@/components/professional/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, fmtDate, PAYMENT_LABEL } from "@/lib/currency";
import { loadProfessionalExpenses, loadTenantExpenses } from "@/lib/expenses";
import { FinancialProfessionalFilter } from "@/components/professional/financial-professional-filter";
import {
  applyPaymentProfessionalFilter,
  type FinancialTabScopeProps,
} from "@/lib/financial-scope";

interface CashPayment {
  id: string;
  amount: number;
  net_amount: number | null;
  fee_amount: number | null;
  payment_method: string;
  paid_date: string;
  notes: string | null;
  patients: { full_name: string } | null;
  bills_receivable: { description: string } | null;
}

export function FinancialCaixaTab({
  scope,
  professionalFilter,
  onProfessionalFilterChange,
}: FinancialTabScopeProps) {
  const { profile } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<CashPayment[]>([]);
  const [expenses, setExpenses] = useState<
    { id: string; description: string; amount: number; category: string | null; payment_method: string | null }[]
  >([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const payQuery = applyPaymentProfessionalFilter(
        supabase
          .from("bill_payments" as never)
          .select(
            "id, amount, net_amount, fee_amount, payment_method, paid_date, notes, patients(full_name), bills_receivable(description), profiles:professional_id(full_name)",
          )
          .eq("status", "active")
          .eq("paid_date", date)
          .order("created_at", { ascending: false }),
        { scope, profileId: profile.id, professionalFilter },
      );
      const [{ data: payData, error: payError }, expenseData] = await Promise.all([
        payQuery,
        scope === "clinic"
          ? loadTenantExpenses({
              from: date,
              to: date,
              dateField: "paid_date",
              status: "paid",
              professionalFilter,
            })
          : loadProfessionalExpenses(profile.id, {
              from: date,
              to: date,
              dateField: "paid_date",
              status: "paid",
            }),
      ]);
      if (payError) throw new Error(payError.message);
      setPayments((payData ?? []) as CashPayment[]);
      setExpenses(expenseData);
    } finally {
      setLoading(false);
    }
  }, [profile, date, scope, professionalFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        (p.patients?.full_name?.toLowerCase().includes(q) ?? false) ||
        (p.bills_receivable?.description?.toLowerCase().includes(q) ?? false) ||
        (p.notes?.toLowerCase().includes(q) ?? false),
    );
  }, [payments, search]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => e.description.toLowerCase().includes(q));
  }, [expenses, search]);

  const stats = useMemo(() => {
    const inflow = payments.reduce((s, p) => s + Number(p.net_amount ?? p.amount), 0);
    const fees = payments.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
    const outflow = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byMethod = new Map<string, number>();
    for (const p of payments) {
      const k = p.payment_method;
      byMethod.set(k, (byMethod.get(k) ?? 0) + Number(p.net_amount ?? p.amount));
    }
    return { inflow, fees, outflow, balance: inflow - outflow, byMethod };
  }, [payments, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        {scope === "clinic" && (
          <FinancialProfessionalFilter value={professionalFilter} onChange={onProfessionalFilterChange} />
        )}
        <div>
          <Label className="text-xs">Data do caixa</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <Input
          placeholder="Buscar movimentação…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <PageSection title={`Caixa — ${fmtDate(date)}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Entradas (líquido)" value={fmt(stats.inflow)} icon={ArrowDownLeft} tone="success" />
          <StatCard label="Taxas" value={fmt(stats.fees)} icon={Landmark} tone="warning" />
          <StatCard label="Saídas" value={fmt(stats.outflow)} icon={ArrowUpRight} tone="danger" />
          <StatCard label="Saldo do dia" value={fmt(stats.balance)} icon={Landmark} />
        </div>
      </PageSection>

      {stats.byMethod.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Array.from(stats.byMethod.entries()).map(([method, value]) => (
              <Badge key={method} variant="secondary" className="px-3 py-1">
                {PAYMENT_LABEL[method] ?? method}: {fmt(value)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-700">Recebimentos do dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Forma</TableHead>
                  <TableHead className="text-center">Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum recebimento neste dia.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.patients?.full_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {p.bills_receivable?.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">{PAYMENT_LABEL[p.payment_method] ?? p.payment_method}</TableCell>
                      <TableCell className="text-center font-medium tabular-nums">
                        {fmt(p.net_amount ?? p.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">Despesas pagas no dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Forma</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhuma despesa paga neste dia.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{e.category ?? "—"}</TableCell>
                      <TableCell className="text-center">{e.payment_method ? PAYMENT_LABEL[e.payment_method] : "—"}</TableCell>
                      <TableCell className="text-center font-medium tabular-nums">{fmt(e.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
