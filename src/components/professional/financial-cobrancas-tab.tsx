import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HandCoins,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
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
  PAYMENT_LABEL,
} from "@/lib/currency";
import { currentYearMonth, periodFromYearMonth } from "@/lib/commission";
import { computeCompetencePeriodStats } from "@/lib/financial-competence";
import {
  billCanDelete,
  billCanReverse,
  billHasSaleItems,
  billIsEditable,
  billIsInstallment,
  deleteBill,
  reverseSale,
  type SaleBillRow,
} from "@/lib/sales";

export function FinancialCobrancasTab() {
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
  const period = periodFromYearMonth(currentYearMonth());

  const load = useCallback(async () => {
    if (!profile) return;
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
        "id, description, amount, paid_amount, due_date, paid_date, competence_date, payment_method, status, notes, budget_id, patient_id, installment_number, installment_count, consultation_charge_id, patients(full_name)",
      )
      .or(`professional_id.eq.${profile.id},professional_id.is.null`)
      .order("due_date", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as SaleBillRow[]);
    setLoading(false);
  }, [profile, status]);

  useEffect(() => {
    void load();
  }, [load]);

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
    return computeCompetencePeriodStats(rows, period);
  }, [rows, period]);

  const commissionEst = stats.received * (commissionPct / 100);
  const detailBill = useMemo(
    () => rows.find((r) => r.id === detailBillId) ?? null,
    [rows, detailBillId],
  );

  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setActionLoading(true);
    try {
      await reverseSale(reverseTarget.id, "Estorno pelo profissional");
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
      toast.success("Cobrança excluída");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

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
      <PageSection title="Resumo do mês">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Produção" value={fmt(stats.production)} icon={Wallet} />
          <StatCard label="Recebido" value={fmt(stats.received)} icon={TrendingUp} tone="success" />
          <StatCard label="Pendente" value={fmt(stats.pending)} icon={TrendingDown} tone="warning" />
          <StatCard label="Comissão estimada" value={fmt(commissionEst)} sub={`${commissionPct}% sobre recebido`} icon={Wallet} />
        </div>
      </PageSection>
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar paciente ou descrição…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(BILL_STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma cobrança encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((r) => {
                  const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailBillId(r.id)}>
                      <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.description}</div>
                        {billIsInstallment(r) && (
                          <Badge variant="outline" className="mt-1 text-[10px]">Parcela {r.installment_number}/{r.installment_count}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{fmt(r.amount)}</TableCell>
                      <TableCell>{fmt(r.paid_amount)}</TableCell>
                      <TableCell>{fmtDate(r.due_date)}</TableCell>
                      <TableCell className="text-sm">{r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—"}</TableCell>
                      <TableCell><Badge className={BILL_STATUS_CLASS[eff]}>{BILL_STATUS_LABEL[eff]}</Badge></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailBillId(r.id)}><HandCoins className="mr-2 size-4" />Abrir conta</DropdownMenuItem>
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
      <StandaloneSaleDialog open={saleOpen} onOpenChange={setSaleOpen} billId={editBillId} onSaved={() => void load()} />
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
          <AlertDialogHeader><AlertDialogTitle>Excluir cobrança?</AlertDialogTitle><AlertDialogDescription>A cobrança <strong>{deleteTarget?.description}</strong> será removida permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={actionLoading} onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
