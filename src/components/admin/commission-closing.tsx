import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback-states";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";
import {
  buildProfessionalProduction,
  commissionValue,
  currentYearMonth,
  effectiveCommissionPct,
  periodFromYearMonth,
  type ProfessionalProduction,
} from "@/lib/commission";
import { logCommissionAuditEvent, type LogCommissionAuditInput } from "@/lib/commission.functions";

interface ClosingRow {
  id: string;
  professional_id: string;
  period_year: number;
  period_month: number;
  appointments_completed: number;
  production_total: number;
  received_total: number;
  pending_total: number;
  base_commission_pct: number;
  adjusted_commission_pct: number | null;
  commission_amount: number;
  status: "open" | "closed";
  notes: string | null;
  professional?: { full_name: string } | null;
}

interface CommissionClosingProps {
  yearMonth?: string;
  onYearMonthChange?: (value: string) => void;
}

export function CommissionClosing({ yearMonth: controlledMonth, onYearMonthChange }: CommissionClosingProps) {
  const { profile } = useAuth();
  const [internalMonth, setInternalMonth] = useState(currentYearMonth());
  const yearMonth = controlledMonth ?? internalMonth;
  const setYearMonth = onYearMonthChange ?? setInternalMonth;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [closings, setClosings] = useState<ClosingRow[]>([]);
  const [liveStats, setLiveStats] = useState<ProfessionalProduction[]>([]);
  const [draftPct, setDraftPct] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState("");

  const period = useMemo(() => periodFromYearMonth(yearMonth), [yearMonth]);
  const isClosed = closings.length > 0 && closings.every((c) => c.status === "closed");

  const load = useCallback(async () => {
    if (!profile || !period) return;
    setLoading(true);
    try {
      const [{ data: profs }, { data: bills }, { data: appts }, { data: existing }] = await Promise.all([
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
        supabase
          .from("commission_closings")
          .select(
            "id, professional_id, period_year, period_month, appointments_completed, production_total, received_total, pending_total, base_commission_pct, adjusted_commission_pct, commission_amount, status, notes, professional:profiles!commission_closings_professional_id_fkey(full_name)",
          )
          .eq("period_year", period.year)
          .eq("period_month", period.month),
      ]);

      const stats = buildProfessionalProduction(
        (profs ?? []) as Parameters<typeof buildProfessionalProduction>[0],
        (bills ?? []) as Parameters<typeof buildProfessionalProduction>[1],
        (appts ?? []) as Parameters<typeof buildProfessionalProduction>[2],
        period,
      );
      setLiveStats(stats);
      setClosings((existing ?? []) as ClosingRow[]);

      const pctDraft: Record<string, string> = {};
      for (const c of (existing ?? []) as ClosingRow[]) {
        const pct = effectiveCommissionPct(c.base_commission_pct, c.adjusted_commission_pct);
        pctDraft[c.professional_id] = String(pct);
      }
      for (const s of stats) {
        if (!pctDraft[s.id]) pctDraft[s.id] = String(s.commissionPct);
      }
      setDraftPct(pctDraft);
      setDraftNotes(((existing ?? [])[0] as ClosingRow | undefined)?.notes ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => {
    if (closings.length > 0) {
      return closings.map((c) => {
        const pct = effectiveCommissionPct(c.base_commission_pct, c.adjusted_commission_pct);
        return {
          id: c.professional_id,
          name: c.professional?.full_name ?? "—",
          appointments: c.appointments_completed,
          production: Number(c.production_total),
          received: Number(c.received_total),
          pending: Number(c.pending_total),
          commissionPct: pct,
          commissionAmount: Number(c.commission_amount),
          closingId: c.id,
          status: c.status,
        };
      });
    }
    return liveStats.map((s) => ({
      id: s.id,
      name: s.name,
      appointments: s.appointments,
      production: s.production,
      received: s.received,
      pending: s.pending,
      commissionPct: s.commissionPct,
      commissionAmount: s.commissionAmount,
      closingId: null as string | null,
      status: "open" as const,
    }));
  }, [closings, liveStats]);

  const totals = useMemo(
    () =>
      displayRows.reduce(
        (acc, r) => ({
          appointments: acc.appointments + r.appointments,
          production: acc.production + r.production,
          received: acc.received + r.received,
          pending: acc.pending + r.pending,
          commission: acc.commission + r.commissionAmount,
        }),
        { appointments: 0, production: 0, received: 0, pending: 0, commission: 0 },
      ),
    [displayRows],
  );

  const periodLabel = `${String(period?.month).padStart(2, "0")}/${period?.year}`;

  const writeAudit = async (input: LogCommissionAuditInput) => {
    try {
      await logCommissionAuditEvent({ data: input });
    } catch (e) {
      console.error("[commission audit]", e);
    }
  };

  const syncPeriod = async () => {
    if (!profile || !period || isClosed) return;
    setBusy(true);
    try {
      const rows = liveStats.map((s) => {
        const adjusted = Number(draftPct[s.id] ?? s.commissionPct);
        const pct = Number.isFinite(adjusted) ? adjusted : s.commissionPct;
        return {
          tenant_id: profile.tenant_id,
          professional_id: s.id,
          period_year: period.year,
          period_month: period.month,
          appointments_completed: s.appointments,
          production_total: s.production,
          received_total: s.received,
          pending_total: s.pending,
          base_commission_pct: s.commissionPct,
          adjusted_commission_pct: pct !== s.commissionPct ? pct : null,
          commission_amount: commissionValue(s.received, pct),
          status: "open" as const,
          notes: draftNotes || null,
        };
      });

      const { error } = await supabase.from("commission_closings").upsert(rows, {
        onConflict: "tenant_id,professional_id,period_year,period_month",
      });
      if (error) throw error;
      const totalCommission = rows.reduce((s, r) => s + r.commission_amount, 0);
      await writeAudit({
        action: "financial.commission_period_saved",
        summary: `Período de comissão ${periodLabel} salvo (${rows.length} profissional${rows.length === 1 ? "" : "is"})`,
        periodYear: period.year,
        periodMonth: period.month,
        notes: draftNotes || null,
        professionalsCount: rows.length,
        totalCommission,
      });
      toast.success("Período atualizado com os dados do mês");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const closePeriod = async () => {
    if (!profile || !period) return;
    setBusy(true);
    try {
      if (closings.length === 0) await syncPeriod();
      const { error } = await supabase
        .from("commission_closings")
        .update({
          status: "closed",
          closed_by: profile.id,
          closed_at: new Date().toISOString(),
          notes: draftNotes || null,
        })
        .eq("period_year", period.year)
        .eq("period_month", period.month);
      if (error) throw error;
      await writeAudit({
        action: "financial.commission_period_closed",
        summary: `Mês de comissão ${periodLabel} fechado`,
        periodYear: period.year,
        periodMonth: period.month,
        notes: draftNotes || null,
        professionalsCount: displayRows.length,
        totalCommission: totals.commission,
      });
      toast.success("Mês fechado — comissões bloqueadas para edição automática");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reopenPeriod = async () => {
    if (!profile || !period) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("commission_closings")
        .update({ status: "open", closed_by: null, closed_at: null })
        .eq("period_year", period.year)
        .eq("period_month", period.month);
      if (error) throw error;
      await writeAudit({
        action: "financial.commission_period_reopened",
        summary: `Mês de comissão ${periodLabel} reaberto para ajustes`,
        periodYear: period.year,
        periodMonth: period.month,
      });
      toast.success("Período reaberto para ajustes");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveOverride = async (professionalId: string) => {
    if (!period || isClosed) return;
    const stat = liveStats.find((s) => s.id === professionalId);
    if (!stat) return;
    const pct = Number(draftPct[professionalId]);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Comissão deve estar entre 0 e 100");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        tenant_id: profile!.tenant_id,
        professional_id: professionalId,
        period_year: period.year,
        period_month: period.month,
        appointments_completed: stat.appointments,
        production_total: stat.production,
        received_total: stat.received,
        pending_total: stat.pending,
        base_commission_pct: stat.commissionPct,
        adjusted_commission_pct: pct !== stat.commissionPct ? pct : null,
        commission_amount: commissionValue(stat.received, pct),
        status: "open" as const,
        notes: draftNotes || null,
      };
      const { error } = await supabase.from("commission_closings").upsert(payload, {
        onConflict: "tenant_id,professional_id,period_year,period_month",
      });
      if (error) throw error;
      const professionalName =
        liveStats.find((s) => s.id === professionalId)?.name ??
        displayRows.find((r) => r.id === professionalId)?.name ??
        "Profissional";
      const amount = commissionValue(stat.received, pct);
      await writeAudit({
        action: "financial.commission_applied",
        summary: `Comissão aplicada: ${professionalName} — ${pct}% sobre ${fmt(stat.received)} = ${fmt(amount)} (${periodLabel})`,
        periodYear: period.year,
        periodMonth: period.month,
        professionalId,
        professionalName,
        baseCommissionPct: stat.commissionPct,
        adjustedCommissionPct: pct !== stat.commissionPct ? pct : null,
        commissionAmount: amount,
        receivedTotal: stat.received,
        productionTotal: stat.production,
        notes: draftNotes || null,
      });
      toast.success("Comissão ajustada");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!period) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Período inválido.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Fechamento de comissão</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Comissão calculada sobre o <strong>recebido no período</strong>. Ajuste retroativo antes de fechar o mês.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Mês de referência</Label>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 size-4" />
            Atualizar
          </Button>
          {!isClosed ? (
            <>
              <Button size="sm" onClick={() => void syncPeriod()} disabled={busy || loading}>
                Salvar período
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void closePeriod()} disabled={busy || loading}>
                <Lock className="mr-2 size-4" />
                Fechar mês
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void reopenPeriod()} disabled={busy}>
              <Unlock className="mr-2 size-4" />
              Reabrir mês
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={isClosed ? "secondary" : "default"}>{isClosed ? "Fechado" : "Em aberto"}</Badge>
          <span className="text-sm text-muted-foreground">
            {period.from} até {period.to}
          </span>
        </div>

        {!isClosed && (
          <div>
            <Label className="text-xs">Observações do fechamento</Label>
            <Textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Ex.: Ajuste de comissão acordado com Dr. João…"
              rows={2}
            />
          </div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : displayRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum profissional ativo no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Consultas</TableHead>
                  <TableHead>Produção</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>Comissão %</TableHead>
                  <TableHead>Valor comissão</TableHead>
                  {!isClosed && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.appointments}</TableCell>
                    <TableCell>{fmt(row.production)}</TableCell>
                    <TableCell>{fmt(row.received)}</TableCell>
                    <TableCell className="text-amber-600">{fmt(row.pending)}</TableCell>
                    <TableCell>
                      {isClosed ? (
                        <span>{row.commissionPct}%</span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={draftPct[row.id] ?? String(row.commissionPct)}
                          onChange={(e) => setDraftPct((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmt(
                        isClosed
                          ? row.commissionAmount
                          : commissionValue(row.received, Number(draftPct[row.id] ?? row.commissionPct)),
                      )}
                    </TableCell>
                    {!isClosed && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => void saveOverride(row.id)} disabled={busy}>
                          Aplicar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{totals.appointments}</TableCell>
                  <TableCell>{fmt(totals.production)}</TableCell>
                  <TableCell>{fmt(totals.received)}</TableCell>
                  <TableCell className="text-amber-600">{fmt(totals.pending)}</TableCell>
                  <TableCell />
                  <TableCell>{fmt(totals.commission)}</TableCell>
                  {!isClosed && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
