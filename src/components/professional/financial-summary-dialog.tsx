import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
} from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import type { FinancialSummaryKind } from "@/lib/financial-competence";
import { billOpenAmount } from "@/lib/nfse";
import type { SaleBillRow } from "@/lib/sales";

interface FinancialSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: FinancialSummaryKind | null;
  title: string;
  description: string;
  bills: SaleBillRow[];
  showProfessional?: boolean;
  onBillClick: (billId: string) => void;
}

export function FinancialSummaryDialog({
  open,
  onOpenChange,
  kind,
  title,
  description,
  bills,
  showProfessional = true,
  onBillClick,
}: FinancialSummaryDialogProps) {
  const paymentSummary = useMemo(() => {
    if (kind !== "received") return [];
    const map = new Map<string, number>();
    for (const bill of bills) {
      const method = bill.payment_method ?? "other";
      map.set(method, (map.get(method) ?? 0) + Number(bill.paid_amount));
    }
    return Array.from(map.entries())
      .map(([method, amount]) => ({
        method,
        label: paymentLabel(method),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [bills, kind]);

  const total = useMemo(() => {
    if (kind === "received") {
      return bills.reduce((sum, bill) => sum + Number(bill.paid_amount), 0);
    }
    if (kind === "pending" || kind === "totalOpen") {
      return bills.reduce((sum, bill) => sum + billOpenAmount(bill.amount, bill.paid_amount), 0);
    }
    return bills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  }, [bills, kind]);

  const totalLabel =
    kind === "received"
      ? "Total recebido"
      : kind === "pending" || kind === "totalOpen"
        ? "Total em aberto"
        : kind === "openBudgets"
          ? "Total em orçamentos"
          : "Total";

  const countLabel =
    kind === "openBudgets"
      ? bills.length === 1
        ? "orçamento"
        : "orçamentos"
      : bills.length === 1
        ? "fatura"
        : "faturas";

  const colSpan =
    kind === "received"
      ? showProfessional
        ? 5
        : 4
      : kind === "pending" || kind === "totalOpen"
        ? showProfessional
          ? 7
          : 6
        : showProfessional
          ? 5
          : 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <p className="pt-1 text-sm font-medium text-foreground">
            {totalLabel}: {fmt(total)} · {bills.length} {countLabel}
          </p>
        </DialogHeader>
        <div
          className={`overflow-y-auto overscroll-contain ${
            kind === "received" && paymentSummary.length > 0
              ? "max-h-[calc(85vh-14rem)]"
              : "max-h-[calc(85vh-9rem)]"
          }`}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              <TableRow>
                <TableHead>Paciente</TableHead>
                {showProfessional && <TableHead>Profissional</TableHead>}
                {kind === "received" ? (
                  <>
                    <TableHead className="text-center">Recebido</TableHead>
                    <TableHead className="text-center">Data</TableHead>
                    <TableHead className="text-center">Forma</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-center">Valor Total</TableHead>
                    {(kind === "pending" || kind === "totalOpen") && (
                      <>
                        <TableHead className="text-center">Valor Pago</TableHead>
                        <TableHead className="text-center">Em Aberto</TableHead>
                      </>
                    )}
                    <TableHead className="text-center">Vencimento</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                    Nenhuma fatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => {
                  const eff =
                    bill.status === "budget"
                      ? "budget"
                      : isOverdue(bill.due_date, bill.status)
                        ? "overdue"
                        : bill.status;
                  const open = billOpenAmount(bill.amount, bill.paid_amount);
                  return (
                    <TableRow
                      key={bill.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onBillClick(bill.id)}
                    >
                      <TableCell className="font-medium">{bill.patients?.full_name ?? "—"}</TableCell>
                      {showProfessional && (
                        <TableCell className="text-xs text-muted-foreground">
                          {bill.profiles?.full_name ?? "—"}
                        </TableCell>
                      )}
                      {kind === "received" ? (
                        <>
                          <TableCell className="text-center tabular-nums">{fmt(bill.paid_amount)}</TableCell>
                          <TableCell className="text-center">{bill.paid_date ? fmtDate(bill.paid_date) : "—"}</TableCell>
                          <TableCell className="text-center text-sm">
                            {bill.payment_method ? paymentLabel(bill.payment_method) : "—"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center tabular-nums">{fmt(bill.amount)}</TableCell>
                          {(kind === "pending" || kind === "totalOpen") && (
                            <>
                              <TableCell className="text-center tabular-nums">{fmt(bill.paid_amount)}</TableCell>
                              <TableCell className="text-center tabular-nums text-amber-700 dark:text-amber-400">
                                {fmt(open)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-center">{fmtDate(bill.due_date)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={BILL_STATUS_CLASS[eff]}>{BILL_STATUS_LABEL[eff]}</Badge>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {kind === "received" && paymentSummary.length > 0 && (
          <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo por forma de pagamento
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {paymentSummary.map((row) => (
                <div key={row.method} className="flex items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{fmt(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
