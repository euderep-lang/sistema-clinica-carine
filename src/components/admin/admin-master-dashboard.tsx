import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Package, Stethoscope, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback-states";
import { CommissionClosing } from "@/components/admin/commission-closing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";
import {
  buildProfessionalProduction,
  currentYearMonth,
  periodFromYearMonth,
  todayISO,
} from "@/lib/commission";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function AdminMasterDashboard() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [patientCount, setPatientCount] = useState(0);
  const [todayAppts, setTodayAppts] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [professionals, setProfessionals] = useState<
    ReturnType<typeof buildProfessionalProduction>
  >([]);

  const period = useMemo(() => periodFromYearMonth(yearMonth), [yearMonth]);
  const today = todayISO();
  const primary = tenant?.primary_color ?? "#1a2b4a";

  useEffect(() => {
    if (!period) return;
    (async () => {
      setLoading(true);
      const [
        { count: patients },
        { count: apptsToday },
        { data: profs },
        { data: bills },
        { data: appts },
        { data: inventory },
      ] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("active", true),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("date", today)
          .neq("status", "cancelled"),
        supabase
          .from("profiles")
          .select("id, full_name, specialty, commission_pct")
          .eq("role", "professional")
          .eq("active", true),
        supabase
          .from("bills_receivable")
          .select(
            "id, professional_id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id",
          )
          .or(
            `and(competence_date.gte.${period.from},competence_date.lte.${period.to}),and(paid_date.gte.${period.from},paid_date.lte.${period.to})`,
          ),
        supabase
          .from("appointments")
          .select("professional_id, status, date")
          .eq("status", "completed")
          .gte("date", period.from)
          .lte("date", period.to),
        supabase.from("inventory_items" as never).select("id, current_stock, min_stock"),
      ]);

      setPatientCount(patients ?? 0);
      setTodayAppts(apptsToday ?? 0);
      const inv = (inventory ?? []) as { current_stock: number; min_stock: number }[];
      setLowStock(inv.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length);

      setProfessionals(
        buildProfessionalProduction(
          (profs ?? []) as Parameters<typeof buildProfessionalProduction>[0],
          (bills ?? []) as Parameters<typeof buildProfessionalProduction>[1],
          (appts ?? []) as Parameters<typeof buildProfessionalProduction>[2],
          period,
        ),
      );
      setLoading(false);
    })();
  }, [period, today]);

  const monthReceived = professionals.reduce((s, p) => s + p.received, 0);
  const monthProduction = professionals.reduce((s, p) => s + p.production, 0);
  const monthCommission = professionals.reduce((s, p) => s + p.commissionAmount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Controle geral da clínica"
        description="Visão consolidada de operação, produção por profissional e fechamento de comissão."
      />

      <PageSection title="Indicadores do mês">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pacientes ativos" value={loading ? "…" : patientCount} icon={Users} />
          <StatCard
            label="Agendamentos hoje"
            value={loading ? "…" : todayAppts}
            icon={Calendar}
            sub={today}
          />
          <StatCard
            label="Recebido no mês"
            value={loading ? "…" : fmt(monthReceived)}
            icon={Wallet}
            tone="success"
            sub={`Produção ${fmt(monthProduction)}`}
          />
          <StatCard
            label="Itens em alerta de estoque"
            value={loading ? "…" : lowStock}
            icon={Package}
            tone={lowStock > 0 ? "warning" : "default"}
            action={
              lowStock > 0 ? (
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link to="/financial/inventory">Ver estoque</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      </PageSection>

      <PageSection
        title="Produção por profissional"
        description={`Referência: ${yearMonth}. Comissão estimada total: ${loading ? "…" : fmt(monthCommission)}.`}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/relatorios">Relatórios detalhados</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/services">Catálogo de serviços</Link>
          </Button>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : professionals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum profissional ativo com movimentação no período.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Ranking de produção</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={professionals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} angle={-12} textAnchor="end" height={56} />
                    <YAxis fontSize={11} tickFormatter={(v) => fmt(v as number)} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="production" fill={primary} name="Produção" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Consultas</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionals.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.specialty && (
                            <div className="text-xs text-muted-foreground">{p.specialty}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{p.appointments}</TableCell>
                        <TableCell className="text-right">{fmt(p.received)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && professionals.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Consultas</TableHead>
                    <TableHead>Produção</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="size-4 text-muted-foreground" />
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell>{p.appointments}</TableCell>
                      <TableCell>{fmt(p.production)}</TableCell>
                      <TableCell>{fmt(p.received)}</TableCell>
                      <TableCell className="text-amber-600">{fmt(p.pending)}</TableCell>
                      <TableCell className="font-medium">{fmt(p.commissionAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.commissionPct}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageSection>

      <CommissionClosing yearMonth={yearMonth} onYearMonthChange={setYearMonth} />
    </div>
  );
}
