import { useCallback, useEffect, useMemo, useState } from "react";
import { matchesSearch } from "@/lib/search";
import {
  HandCoins,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { BillDetailDialog } from "@/components/professional/bill-detail-dialog";
import { PaymentHistoryDialog } from "@/components/professional/payment-history-dialog";
import { StandaloneSaleDialog } from "@/components/professional/standalone-sale-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
} from "@/lib/currency";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import {
  aggregateNetRevenueByChannel,
  aggregatePeriodPaymentTotals,
  computeCompetencePeriodStats,
  computeOpenBudgetsStats,
  computeTotalOpenBalance,
  filterBillsForCompetencePeriod,
  filterOpenBudgetBills,
  filterPendingMonthBills,
  filterProductionBills,
  filterReceivedBills,
  filterTotalOpenBills,
  FINANCIAL_SUMMARY_META,
  financialSummaryDescription,
  paymentBillIdsInPeriod,
  type FinancialSummaryKind,
  type PeriodPaymentDetail,
} from "@/lib/financial-competence";
import { FinancialSummaryDialog } from "@/components/professional/financial-summary-dialog";
import {
  billCanDelete,
  billCanReverse,
  billHasSaleItems,
  billIsBudget,
  billIsEditable,
  convertBudgetToSale,
  deleteBill,
  reverseSale,
  type SaleBillRow,
} from "@/lib/sales";
import { FinancialProfessionalFilter } from "@/components/professional/financial-professional-filter";
import {
  applyPaymentProfessionalFilter,
  applyReceivableProfessionalFilter,
  RECEIVABLE_BILL_SELECT,
  type FinancialTabScopeProps,
} from "@/lib/financial-scope";
import { billOpenAmount, emitBillNfse, formatNfseLabel } from "@/lib/nfse";

export function FinancialCobrancasTab({
  scope,
  professionalFilter,
  onProfessionalFilterChange,
}: FinancialTabScopeProps) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<SaleBillRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionPct, setCommissionPct] = useState(0);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [detailBillId, setDetailBillId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<SaleBillRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaleBillRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBillId, setHistoryBillId] = useState<string | null>(null);
  const [summaryKind, setSummaryKind] = useState<FinancialSummaryKind | null>(null);
  const [periodFrom, setPeriodFrom] = useState(firstDayOfMonth());
  const [periodTo, setPeriodTo] = useState(todayISO());
  const [periodPayments, setPeriodPayments] = useState<PeriodPaymentDetail[]>([]);
  const period = useMemo(() => {
    if (!periodFrom || !periodTo || periodFrom > periodTo) return null;
    return { from: periodFrom, to: periodTo };
  }, [periodFrom, periodTo]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("commission_pct")
      .eq("id", profile.id)
      .maybeSingle();
    setCommissionPct(Number(prof?.commission_pct ?? 0));
    // Carrega TODAS as faturas via paginação. Um teto fixo (ex.: 200) escondia
    // faturas antigas — inclusive faturas legítimas de pacientes com saldo/recebimento
    // dentro do período. A paginação mantém a tela correta conforme o histórico cresce.
    const PAGE = 1000;
    const all: SaleBillRow[] = [];
    let fetchError: string | null = null;
    for (let offset = 0; ; offset += PAGE) {
      const q = applyReceivableProfessionalFilter(
        supabase
          .from("bills_receivable")
          .select(RECEIVABLE_BILL_SELECT)
          .order("due_date", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + PAGE - 1),
        { scope, profileId: profile.id, professionalFilter },
      );
      const { data, error } = await q;
      if (error) {
        fetchError = error.message;
        break;
      }
      const batch = (data ?? []) as SaleBillRow[];
      all.push(...batch);
      if (batch.length < PAGE) break;
    }
    if (fetchError) toast.error(fetchError);
    setRows(all);

    if (periodFrom && periodTo && periodFrom <= periodTo) {
      const payQuery = applyPaymentProfessionalFilter(
        supabase
          .from("bill_payments" as never)
          .select("payment_method, net_amount, amount, bill_receivable_id, paid_date")
          .eq("status", "active")
          .gte("paid_date", periodFrom)
          .lte("paid_date", periodTo),
        { scope, profileId: profile.id, professionalFilter },
      );
      const { data: payData, error: payError } = await payQuery;
      if (payError) toast.error(payError.message);
      else setPeriodPayments((payData ?? []) as PeriodPaymentDetail[]);
    } else {
      setPeriodPayments([]);
    }

    setLoading(false);
  }, [profile, scope, professionalFilter, periodFrom, periodTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const paymentBillIds = useMemo(() => paymentBillIdsInPeriod(periodPayments), [periodPayments]);

  const periodRows = useMemo(() => {
    if (!period) return rows;
    return filterBillsForCompetencePeriod(rows, period, paymentBillIds) as SaleBillRow[];
  }, [rows, period, paymentBillIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Busca por nome/descrição ignora o período: mostra faturas de qualquer data.
    let list = q || status === "budget" ? rows : periodRows;
    if (status !== "all") {
      list = list.filter((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return eff === status;
      });
    }
    if (!q) return list;
    return list.filter(
      (r) => matchesSearch(r.description, q) || matchesSearch(r.patients?.full_name, q),
    );
  }, [periodRows, rows, search, status]);

  const stats = useMemo(() => {
    if (!period) return { production: 0, received: 0, receivedNet: 0, pending: 0 };
    return computeCompetencePeriodStats(periodRows, period, { periodPayments });
  }, [periodRows, period, periodPayments]);

  const paymentTotals = useMemo(
    () => aggregatePeriodPaymentTotals(periodPayments),
    [periodPayments],
  );

  const totalOpen = useMemo(() => computeTotalOpenBalance(rows), [rows]);
  const openBudgets = useMemo(() => computeOpenBudgetsStats(rows), [rows]);

  const summaryBills = useMemo((): SaleBillRow[] => {
    if (!summaryKind) return [];
    if (!period && summaryKind !== "totalOpen" && summaryKind !== "openBudgets") return [];

    let filtered: SaleBillRow[];
    switch (summaryKind) {
      case "production":
        filtered = filterProductionBills(rows, period!) as SaleBillRow[];
        break;
      case "received":
        filtered = filterReceivedBills(rows, period!, paymentBillIds) as SaleBillRow[];
        break;
      case "pending":
        filtered = filterPendingMonthBills(rows, period!) as SaleBillRow[];
        break;
      case "totalOpen":
        filtered = filterTotalOpenBills(rows) as SaleBillRow[];
        break;
      case "openBudgets":
        filtered = filterOpenBudgetBills(rows) as SaleBillRow[];
        break;
      default:
        filtered = [];
    }

    return [...filtered].sort((a, b) => b.due_date.localeCompare(a.due_date));
  }, [rows, period, summaryKind, paymentBillIds]);

  const receivedPaymentsForSummary = useMemo(() => {
    if (!period) return [];
    const billMap = new Map(rows.map((r) => [r.id, r]));
    return [...periodPayments]
      .map((payment) => ({ payment, bill: billMap.get(payment.bill_receivable_id) }))
      .sort((a, b) => b.payment.paid_date.localeCompare(a.payment.paid_date));
  }, [periodPayments, rows, period]);

  const summaryMeta = summaryKind ? FINANCIAL_SUMMARY_META[summaryKind] : null;
  const summaryDescription = summaryKind
    ? financialSummaryDescription(summaryKind, period, fmtDate)
    : "";

  const commissionEst = stats.received * (commissionPct / 100);
  const netRevenueByChannel = useMemo(
    () => aggregateNetRevenueByChannel(periodPayments),
    [periodPayments],
  );
  const detailBill = useMemo(
    () => rows.find((r) => r.id === detailBillId) ?? null,
    [rows, detailBillId],
  );

  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      const result = (await reverseSale(
        reverseTarget.id,
        scope === "clinic" ? "Estorno pela clínica" : "Estorno pelo profissional",
      )) as { payments_reversed?: number } | null;
      const paymentsMsg =
        result?.payments_reversed && result.payments_reversed > 0
          ? ` · ${result.payments_reversed} pagamento(s) estornado(s)`
          : "";
      toast.success(
        (billHasSaleItems(reverseTarget) ? "Venda estornada" : "Cobrança cancelada") + paymentsMsg,
      );
      setReverseTarget(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteBill(deleteTarget.id);
      toast.success("Cobrança movida para a lixeira");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const convertBudget = async (row: SaleBillRow) => {
    if (!row.budget_id) {
      toast.error("Orçamento sem vínculo");
      return;
    }
    setActionLoading(true);
    try {
      const result = await convertBudgetToSale(row.budget_id);
      toast.success(`Orçamento convertido em venda — ${fmt(result.amount)}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const tableColSpan = 9;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-full justify-center sm:h-10 sm:w-auto"
          onClick={() => { setHistoryBillId(null); setHistoryOpen(true); }}
        >
          <History className="mr-1.5 size-4" />
          <span className="truncate">Histórico</span>
          <span className="hidden sm:inline">&nbsp;de pagamentos</span>
        </Button>
        <Button
          size="sm"
          className="h-9 w-full justify-center sm:h-10 sm:w-auto"
          onClick={() => { setEditBillId(null); setSaleOpen(true); }}
        >
          <Plus className="mr-1.5 size-4" />
          <span className="truncate">Nova venda</span>
          <span className="hidden sm:inline">&nbsp;avulsa</span>
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2.5 rounded-lg border bg-muted/20 p-3 sm:gap-3 sm:p-4">
        <DateRangeFilter
          from={periodFrom}
          to={periodTo}
          onFromChange={setPeriodFrom}
          onToChange={setPeriodTo}
        />
        {scope === "clinic" && (
          <FinancialProfessionalFilter value={professionalFilter} onChange={onProfessionalFilterChange} />
        )}
        <Input
          placeholder="Buscar paciente ou descrição…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1"
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
        {periodFrom > periodTo && (
          <p className="w-full text-sm text-destructive">A data inicial não pode ser maior que a final.</p>
        )}
      </div>

      <PageSection
        title="Resumo do período"
        description={
          period
            ? `${fmtDate(period.from)} – ${fmtDate(period.to)}`
            : "Selecione um período válido"
        }
      >
        {period ? (
          <div className="mb-4 rounded-lg border bg-background p-4">
            <p className="text-sm font-medium text-foreground">Dentro do período selecionado:</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Receita líquida por forma de pagamento (entradas registradas no período):
            </p>
            <ol className="mt-3 space-y-1.5 text-sm">
              <li className="flex flex-wrap items-baseline justify-between gap-2 sm:justify-start sm:gap-8">
                <span>1. Dinheiro:</span>
                <span className="font-semibold tabular-nums">{fmt(netRevenueByChannel.cash)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-2 sm:justify-start sm:gap-8">
                <span>2. Cartão (débito ou crédito):</span>
                <span className="font-semibold tabular-nums">{fmt(netRevenueByChannel.card)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-2 sm:justify-start sm:gap-8">
                <span>3. PIX:</span>
                <span className="font-semibold tabular-nums">{fmt(netRevenueByChannel.pix)}</span>
              </li>
            </ol>
            <div className="mt-3 space-y-1 border-t pt-3 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-muted-foreground sm:justify-start sm:gap-8">
                <span>Total bruto recebido:</span>
                <span className="font-semibold tabular-nums text-foreground">{fmt(paymentTotals.gross)}</span>
              </p>
              {paymentTotals.fees > 0 ? (
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-muted-foreground sm:justify-start sm:gap-8">
                  <span>Taxas de cartão:</span>
                  <span className="font-semibold tabular-nums text-foreground">− {fmt(paymentTotals.fees)}</span>
                </p>
              ) : null}
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-muted-foreground sm:justify-start sm:gap-8">
                <span>Total líquido (Dinheiro + Cartão + PIX):</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {fmt(netRevenueByChannel.total)}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            size="sm"
            label="Produção"
            value={fmt(stats.production)}
            sub="Competência no período"
            icon={Wallet}
            onClick={() => period && setSummaryKind("production")}
          />
          <StatCard
            size="sm"
            label="Recebido bruto"
            value={fmt(stats.received)}
            sub="Data do pagamento"
            icon={TrendingUp}
            tone="success"
            onClick={() => period && setSummaryKind("received")}
          />
          <StatCard
            size="sm"
            label="A receber"
            value={fmt(stats.pending)}
            sub="Saldo em aberto (competência)"
            icon={TrendingDown}
            tone="warning"
            onClick={() => period && setSummaryKind("pending")}
          />
          <StatCard
            size="sm"
            label={scope === "clinic" ? "Total em aberto (clínica)" : "Total em aberto"}
            value={fmt(totalOpen)}
            sub="Todas as faturas em aberto"
            icon={HandCoins}
            tone="danger"
            onClick={() => setSummaryKind("totalOpen")}
          />
          <StatCard
            size="sm"
            label="Orçamentos em aberto"
            value={fmt(openBudgets.total)}
            sub={
              openBudgets.count === 1
                ? "1 orçamento"
                : `${openBudgets.count} orçamentos`
            }
            icon={Receipt}
            onClick={() => setSummaryKind("openBudgets")}
          />
          {scope === "professional" ? (
            <StatCard
              size="sm"
              label="Comissão estimada"
              value={fmt(commissionEst)}
              sub={`${commissionPct}% sobre recebido bruto`}
              icon={Wallet}
            />
          ) : (
            <StatCard size="sm" label="Cobranças" value={String(filtered.length)} sub="No período selecionado" icon={Wallet} />
          )}
        </div>
      </PageSection>
      <Card>
        <CardContent className="min-w-0 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-center">NFSe</TableHead>
                <TableHead className="text-center">Valor Total</TableHead>
                <TableHead className="text-center">Valor Pago</TableHead>
                <TableHead className="text-center">Valor em Aberto</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={tableColSpan} className="py-10 text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={tableColSpan} className="py-10 text-center text-muted-foreground">Nenhuma cobrança encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((r) => {
                  const isBudget = billIsBudget(r);
                  const eff = isBudget
                    ? "budget"
                    : isOverdue(r.due_date, r.status)
                      ? "overdue"
                      : r.status;
                  const openAmount = billOpenAmount(r.amount, r.paid_amount);
                  const nfseLabel = formatNfseLabel(r);
                  const hasNfse = Boolean(r.nfse_number);
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailBillId(r.id)}>
                      <TableCell className="font-medium">{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.profiles?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            hasNfse
                              ? "font-mono text-xs text-foreground"
                              : r.nfse_status === "failed"
                                ? "text-xs text-destructive"
                                : "text-xs text-muted-foreground"
                          }
                        >
                          {nfseLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-center tabular-nums">{fmt(r.paid_amount)}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        <span className={openAmount > 0 ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                          {fmt(openAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{fmtDate(r.due_date)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={BILL_STATUS_CLASS[eff]}>{BILL_STATUS_LABEL[eff]}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isBudget && (
                              <>
                                <DropdownMenuItem
                                  className="text-emerald-700 focus:text-emerald-700"
                                  onClick={() => void convertBudget(r)}
                                >
                                  <ShoppingCart className="mr-2 size-4" />
                                  Converter em venda
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setDetailBillId(r.id)}><HandCoins className="mr-2 size-4" />Abrir conta</DropdownMenuItem>
                            {!isBudget && (
                              <DropdownMenuItem
                                disabled={hasNfse}
                                onClick={() => void emitBillNfse(r.id)}
                              >
                                <Receipt className="mr-2 size-4" />
                                {hasNfse ? "NFS-e emitida" : "Emitir NFSe"}
                              </DropdownMenuItem>
                            )}
                            {billIsEditable(r) && <DropdownMenuItem onClick={() => { setEditBillId(r.id); setSaleOpen(true); }}><Pencil className="mr-2 size-4" />Editar venda</DropdownMenuItem>}
                            {billCanReverse(r) && <DropdownMenuItem onClick={() => setReverseTarget(r)}><RotateCcw className="mr-2 size-4" />Estornar</DropdownMenuItem>}
                            {billCanDelete(r) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="mr-2 size-4" />Excluir</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FinancialSummaryDialog
        open={Boolean(summaryKind)}
        onOpenChange={(open) => !open && setSummaryKind(null)}
        kind={summaryKind}
        title={summaryMeta?.title ?? ""}
        description={summaryDescription}
        bills={summaryBills}
        receivedPayments={summaryKind === "received" ? receivedPaymentsForSummary : undefined}
        showProfessional={scope === "clinic"}
        onBillClick={(billId) => {
          setSummaryKind(null);
          setDetailBillId(billId);
        }}
      />
      <StandaloneSaleDialog open={saleOpen} onOpenChange={setSaleOpen} billId={editBillId} scope={scope} onSaved={() => void load()} />
      <BillDetailDialog open={Boolean(detailBillId)} onOpenChange={(open) => !open && setDetailBillId(null)} bill={detailBill} onChanged={() => void load()} />
      <PaymentHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} billId={historyBillId} onChanged={() => void load()} />
      <AlertDialog open={Boolean(reverseTarget)} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              A cobrança <strong>{reverseTarget?.description}</strong> será cancelada.
              {reverseTarget && Number(reverseTarget.paid_amount) > 0 ? (
                <>
                  {" "}
                  Os pagamentos registrados ({fmt(Number(reverseTarget.paid_amount))}) serão estornados
                  automaticamente antes do cancelamento.
                </>
              ) : null}{" "}
              Insumos de sessões já utilizadas voltam ao estoque e as sessões do paciente serão
              removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading} onClick={(e) => { e.preventDefault(); void confirmReverse(); }}>Confirmar estorno</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir cobrança?</AlertDialogTitle><AlertDialogDescription>A cobrança <strong>{deleteTarget?.description}</strong> será movida para a lixeira por 30 dias.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
