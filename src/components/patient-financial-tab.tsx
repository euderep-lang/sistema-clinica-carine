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
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
} from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import { computeTotalOpenBalance } from "@/lib/financial-competence";
import { RECEIVABLE_BILL_SELECT } from "@/lib/financial-scope";
import { billOpenAmount, emitBillNfse, formatNfseLabel } from "@/lib/nfse";
import {
  billCanDelete,
  billCanReverse,
  billHasSaleItems,
  billIsBudget,
  billIsEditable,
  convertBudgetToSale,
  deleteBill,
  loadBillSessionPackages,
  reverseRemainingSessions,
  reverseSale,
  type BillSessionPackage,
  type SaleBillRow,
} from "@/lib/sales";

interface PatientFinancialTabProps {
  patientId: string;
}

export function PatientFinancialTab({ patientId }: PatientFinancialTabProps) {
  const [rows, setRows] = useState<SaleBillRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailBillId, setDetailBillId] = useState<string | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<SaleBillRow | null>(null);
  const [reversePackages, setReversePackages] = useState<BillSessionPackage[]>([]);
  const [reversePkgsLoading, setReversePkgsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SaleBillRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bills_receivable")
      .select(RECEIVABLE_BILL_SELECT)
      .eq("patient_id", patientId)
      .order("due_date", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data ?? []) as SaleBillRow[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (status !== "all") {
      list = list.filter((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return eff === status;
      });
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) => matchesSearch(r.description, q) || matchesSearch(r.profiles?.full_name, q),
    );
  }, [rows, search, status]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== "cancelled" && r.status !== "budget");
    const totalPaid = active.reduce((s, r) => s + Number(r.paid_amount), 0);
    const totalBilled = active.reduce((s, r) => s + Number(r.amount), 0);
    const pending = computeTotalOpenBalance(rows);
    const paidDates = active
      .map((r) => r.paid_date)
      .filter((d): d is string => Boolean(d))
      .sort()
      .reverse();
    return {
      totalPaid,
      totalBilled,
      pending,
      lastPaidDate: paidDates[0] ?? null,
      billCount: active.length,
    };
  }, [rows]);

  const detailBill = useMemo(
    () => rows.find((r) => r.id === detailBillId) ?? null,
    [rows, detailBillId],
  );

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

  useEffect(() => {
    if (!reverseTarget) {
      setReversePackages([]);
      return;
    }
    let active = true;
    setReversePkgsLoading(true);
    (async () => {
      try {
        const pkgs = await loadBillSessionPackages(reverseTarget.id);
        if (active) setReversePackages(pkgs);
      } catch {
        if (active) setReversePackages([]);
      } finally {
        if (active) setReversePkgsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reverseTarget]);

  const reverseSessionInfo = useMemo(() => {
    const withRemaining = reversePackages.filter((p) => p.used_sessions < p.total_sessions);
    const usedTotal = reversePackages.reduce((s, p) => s + p.used_sessions, 0);
    const remainingTotal = withRemaining.reduce(
      (s, p) => s + (p.total_sessions - p.used_sessions),
      0,
    );
    const anyUsed = reversePackages.some((p) => p.used_sessions > 0);
    // Preview do novo valor (preciso quando há um único pacote no título).
    let keptPreview: number | null = null;
    if (reverseTarget && reversePackages.length === 1) {
      const p = reversePackages[0];
      if (p.total_sessions > 0) {
        keptPreview = Math.round((p.used_sessions / p.total_sessions) * Number(reverseTarget.amount) * 100) / 100;
      }
    }
    return {
      hasPackages: reversePackages.length > 0,
      anyUsed,
      usedTotal,
      remainingTotal,
      canPartial: remainingTotal > 0,
      keptPreview,
    };
  }, [reversePackages, reverseTarget]);

  const confirmReverseRemaining = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      const res = await reverseRemainingSessions(
        reverseTarget.id,
        "Estorno de sessões restantes",
      );
      toast.success(
        `${res.sessions_cancelled} sessão(ões) restante(s) estornada(s). Cobrança ajustada para ${fmt(res.new_amount)}.`,
      );
      setReverseTarget(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      await reverseSale(reverseTarget.id, "Estorno pela recepção");
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

  const tableColSpan = 9;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setHistoryOpen(true)}>
          <History className="mr-2 size-4" />
          Histórico de pagamentos
        </Button>
        <Button onClick={() => { setEditBillId(null); setSaleOpen(true); }}>
          <Plus className="mr-2 size-4" />
          Nova venda
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-4" />
              Total pago
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(stats.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="size-4" />
              Total faturado
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(stats.totalBilled)}</p>
            <p className="text-xs text-muted-foreground">{stats.billCount} cobrança(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="size-4" />
              Em aberto
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {fmt(stats.pending)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Último pagamento</div>
            <p className="mt-1 text-2xl font-bold">
              {stats.lastPaidDate ? fmtDate(stats.lastPaidDate) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <Input
          placeholder="Buscar descrição ou profissional…"
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-center">NFSe</TableHead>
                <TableHead className="text-center">Valor total</TableHead>
                <TableHead className="text-center">Valor pago</TableHead>
                <TableHead className="text-center">Em aberto</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} className="py-10 text-center text-muted-foreground">
                    Nenhuma cobrança para este paciente.
                  </TableCell>
                </TableRow>
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
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailBillId(r.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{r.description}</div>
                        {r.payment_method && r.status === "paid" && (
                          <div className="text-xs text-muted-foreground">
                            {paymentLabel(r.payment_method)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.profiles?.full_name ?? "—"}
                      </TableCell>
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
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
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
                            <DropdownMenuItem onClick={() => setDetailBillId(r.id)}>
                              <HandCoins className="mr-2 size-4" />
                              Abrir conta
                            </DropdownMenuItem>
                            {!isBudget && (
                              <DropdownMenuItem disabled={hasNfse} onClick={() => void emitBillNfse(r.id)}>
                                <Receipt className="mr-2 size-4" />
                                {hasNfse ? "NFS-e emitida" : "Emitir NFSe"}
                              </DropdownMenuItem>
                            )}
                            {billIsEditable(r) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditBillId(r.id);
                                  setSaleOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 size-4" />
                                Editar venda
                              </DropdownMenuItem>
                            )}
                            {billCanReverse(r) && (
                              <DropdownMenuItem onClick={() => setReverseTarget(r)}>
                                <RotateCcw className="mr-2 size-4" />
                                Estornar
                              </DropdownMenuItem>
                            )}
                            {billCanDelete(r) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(r)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Excluir
                                </DropdownMenuItem>
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

      <StandaloneSaleDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        billId={editBillId}
        defaultPatientId={patientId}
        scope="clinic"
        onSaved={() => void load()}
      />
      <BillDetailDialog
        open={Boolean(detailBillId)}
        onOpenChange={(open) => !open && setDetailBillId(null)}
        bill={detailBill}
        onChanged={() => void load()}
      />
      <PaymentHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        patientId={patientId}
        onChanged={() => void load()}
      />
      <AlertDialog open={Boolean(reverseTarget)} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar cobrança?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  A cobrança <strong>{reverseTarget?.description}</strong>
                  {reverseSessionInfo.anyUsed ? " possui sessões já realizadas." : " será cancelada."}
                </p>
                {reversePkgsLoading && (
                  <p className="text-xs text-muted-foreground">Verificando sessões…</p>
                )}
                {!reversePkgsLoading && reverseSessionInfo.anyUsed && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">
                      {reverseSessionInfo.usedTotal} sessão(ões) já realizada(s)
                      {reverseSessionInfo.remainingTotal > 0 &&
                        ` · ${reverseSessionInfo.remainingTotal} restante(s)`}
                    </p>
                    {reverseSessionInfo.canPartial ? (
                      <p className="mt-1">
                        Não é possível estornar a venda inteira. Você pode estornar apenas as
                        sessões <strong>restantes</strong>: as realizadas continuam cobradas
                        {reverseSessionInfo.keptPreview != null && (
                          <>
                            {" "}e a cobrança passa de{" "}
                            <strong>{fmt(Number(reverseTarget?.amount ?? 0))}</strong> para{" "}
                            <strong>~{fmt(reverseSessionInfo.keptPreview)}</strong>
                          </>
                        )}
                        .
                      </p>
                    ) : (
                      <p className="mt-1">
                        Pacote totalmente utilizado — não há sessões restantes para estornar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            {reverseSessionInfo.anyUsed ? (
              reverseSessionInfo.canPartial && (
                <AlertDialogAction
                  className="bg-amber-600 text-white hover:bg-amber-600/90"
                  disabled={actionLoading || reversePkgsLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    void confirmReverseRemaining();
                  }}
                >
                  Estornar sessões restantes
                </AlertDialogAction>
              )
            ) : (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={actionLoading || reversePkgsLoading}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmReverse();
                }}
              >
                Confirmar estorno
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              A cobrança <strong>{deleteTarget?.description}</strong> será movida para a lixeira por 30 dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
