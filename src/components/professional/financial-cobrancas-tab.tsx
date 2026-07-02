import { useCallback, useEffect, useMemo, useState } from "react";
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
  type FinancialSummaryKind,
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
    setLoading(false);
  }, [profile, scope, professionalFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodRows = useMemo(() => {
    if (!period) return rows;
    return filterBillsForCompetencePeriod(rows, period) as SaleBillRow[];
  }, [rows, period]);

  const filtered = useMemo(() => {
    let list = status === "budget" ? rows : periodRows;
    if (status !== "all") {
      list = list.filter((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return eff === status;
      });
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        (r.patients?.full_name?.toLowerCase().includes(q) ?? false),
    );
  }, [periodRows, rows, search, status]);

  const stats = useMemo(() => {
    if (!period) return { production: 0, received: 0, pending: 0 };
    return computeCompetencePeriodStats(periodRows, period);
  }, [periodRows, period]);

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
        filtered = filterReceivedBills(rows, period!) as SaleBillRow[];
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
  }, [rows, period, summaryKind]);

  const summaryMeta = summaryKind ? FINANCIAL_SUMMARY_META[summaryKind] : null;
  const summaryDescription = summaryKind
    ? financialSummaryDescription(summaryKind, period, fmtDate)
    : "";

  const commissionEst = stats.received * (commissionPct / 100);
  const detailBill = useMemo(
    () => rows.find((r) => r.id === detailBillId) ?? null,
    [rows, detailBillId],
  );

  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      await reverseSale(reverseTarget.id, scope === "clinic" ? "Estorno pela clínica" : "Estorno pelo profissional");
      toast.success(billHasSaleItems(reverseTarget) ? "Venda estornada" : "Cobrança cancelada");
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
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => { setHistoryBillId(null); setHistoryOpen(true); }}>
          <History className="mr-2 size-4" />
          Histórico de pagamentos
        </Button>
        <Button onClick={() => { setEditBillId(null); setSaleOpen(true); }}>
          <Plus className="mr-2 size-4" />
          Nova venda avulsa
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            label="Produção"
            value={fmt(stats.production)}
            sub="Vendas no período"
            icon={Wallet}
            onClick={() => period && setSummaryKind("production")}
          />
          <StatCard
            label="Recebido"
            value={fmt(stats.received)}
            sub="Entradas no período"
            icon={TrendingUp}
            tone="success"
            onClick={() => period && setSummaryKind("received")}
          />
          <StatCard
            label="A receber"
            value={fmt(stats.pending)}
            sub="Pendentes + vencidas do período"
            icon={TrendingDown}
            tone="warning"
            onClick={() => period && setSummaryKind("pending")}
          />
          <StatCard
            label={scope === "clinic" ? "Total em aberto (clínica)" : "Total em aberto"}
            value={fmt(totalOpen)}
            sub="Todas as faturas em aberto"
            icon={HandCoins}
            tone="danger"
            onClick={() => setSummaryKind("totalOpen")}
          />
          <StatCard
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
            <StatCard label="Comissão estimada" value={fmt(commissionEst)} sub={`${commissionPct}% sobre recebido`} icon={Wallet} />
          ) : (
            <StatCard label="Cobranças" value={String(filtered.length)} sub="No período selecionado" icon={Wallet} />
          )}
        </div>
      </PageSection>
      <Card>
        <CardContent className="p-0">
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
          <AlertDialogHeader><AlertDialogTitle>Estornar cobrança?</AlertDialogTitle><AlertDialogDescription>A cobrança <strong>{reverseTarget?.description}</strong> será cancelada.</AlertDialogDescription></AlertDialogHeader>
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
