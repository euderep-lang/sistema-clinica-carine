import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { fmt, fmtDate } from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import {
  loadBillPayments,
  paymentCanReverse,
  reverseBillPayment,
  type BillPaymentRow,
} from "@/lib/payments";

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId?: string | null;
  patientId?: string | null;
  onChanged?: () => void;
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  billId,
  patientId,
  onChanged,
}: PaymentHistoryDialogProps) {
  const [rows, setRows] = useState<BillPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reverseTarget, setReverseTarget] = useState<BillPaymentRow | null>(null);
  const [reversing, setReversing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBillPayments({
        billId: billId ?? undefined,
        patientId: patientId ?? undefined,
        limit: 200,
      });
      setRows(data);
    } catch (e) {
      toast.error((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [billId, patientId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "active" && r.status !== "active") return false;
      if (statusFilter === "reversed" && r.status !== "reversed") return false;
      if (!q) return true;
      return (
        matchesSearch(r.patients?.full_name, q) ||
        matchesSearch(r.bills_receivable?.description, q) ||
        matchesSearch(paymentLabel(r.payment_method), q)
      );
    });
  }, [rows, search, statusFilter]);

  const confirmReverse = async () => {
    if (!reverseTarget) return;
    setReversing(true);
    try {
      await reverseBillPayment(reverseTarget.id, "Estorno manual");
      toast.success("Pagamento estornado — saldo da cobrança atualizado");
      setReverseTarget(null);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReversing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Histórico de pagamentos
            </DialogTitle>
            <DialogDescription>
              {billId
                ? "Pagamentos desta cobrança. Estorne um lançamento para reabrir o saldo."
                : "Todos os recebimentos registrados. Estorne pagamentos individuais quando necessário."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar paciente ou descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="reversed">Estornados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum pagamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} className={r.status === "reversed" ? "opacity-60" : undefined}>
                      <TableCell className="whitespace-nowrap">{fmtDate(r.paid_date)}</TableCell>
                      <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate text-sm">{r.bills_receivable?.description ?? "—"}</div>
                        {r.bills_receivable?.installment_count != null &&
                          r.bills_receivable.installment_count > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              Parcela {r.bills_receivable.installment_number}/
                              {r.bills_receivable.installment_count}
                            </span>
                          )}
                      </TableCell>
                      <TableCell className="font-medium">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {paymentLabel(r.payment_method)}
                      </TableCell>
                      <TableCell>
                        {r.status === "active" ? (
                          <Badge className="bg-green-100 text-green-800">Confirmado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Estornado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {paymentCanReverse(r) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            title="Estornar pagamento"
                            onClick={() => setReverseTarget(r)}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(reverseTarget)} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento de <strong>{reverseTarget && fmt(reverseTarget.amount)}</strong> em{" "}
              <strong>{reverseTarget && fmtDate(reverseTarget.paid_date)}</strong> será estornado.
              O saldo da cobrança será recalculado e a parcela voltará a ficar em aberto, se
              aplicável.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={reversing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmReverse();
              }}
            >
              Confirmar estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
