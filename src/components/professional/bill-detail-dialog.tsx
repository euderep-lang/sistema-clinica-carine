import { useCallback, useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/locale";
import { Loader2, RotateCcw, ShoppingBag } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
  PAYMENT_LABEL,
  parseBRLInput,
} from "@/lib/currency";
import {
  activePaymentMethods,
  calculatePaymentFee,
  loadPaymentMethodConfigs,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import {
  loadBillPayments,
  paymentCanReverse,
  reverseBillPayment,
  type BillPaymentRow,
} from "@/lib/payments";
import {
  billCanReceive,
  loadSaleChargeItems,
  receiveBillPayment,
  type SaleBillRow,
  type SaleChargeItem,
} from "@/lib/sales";

const CREDIT_INSTALLMENTS = Array.from({ length: 12 }, (_, i) => i + 1);

function todayISO() {
  return todayISO();
}

function buildPaymentNotes(
  userNotes: string,
  method: string,
  creditInstallments: number,
): string | undefined {
  const parts: string[] = [];
  if (method === "credit_card") {
    parts.push(
      creditInstallments === 1
        ? "Crédito à vista"
        : `Crédito em ${creditInstallments}x`,
    );
  }
  const trimmed = userNotes.trim();
  if (trimmed) parts.push(trimmed);
  return parts.length ? parts.join(" · ") : undefined;
}

interface BillDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: SaleBillRow | null;
  onChanged: () => void;
}

export function BillDetailDialog({
  open,
  onOpenChange,
  bill,
  onChanged,
}: BillDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SaleChargeItem[]>([]);
  const [payments, setPayments] = useState<BillPaymentRow[]>([]);
  const [methodConfigs, setMethodConfigs] = useState<PaymentMethodConfig[]>([]);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState("");
  const [creditInstallments, setCreditInstallments] = useState("1");
  const [paySaving, setPaySaving] = useState(false);

  const [reversePaymentTarget, setReversePaymentTarget] = useState<BillPaymentRow | null>(null);
  const [reversingPayment, setReversingPayment] = useState(false);

  const outstanding = bill
    ? Math.max(0, Number(bill.amount) - Number(bill.paid_amount))
    : 0;

  const payValue = parseBRLInput(payAmount);
  const installmentCount = Number(creditInstallments) || 1;
  const installmentValue = useMemo(() => {
    if (payMethod !== "credit_card" || payValue <= 0 || installmentCount <= 1) return 0;
    return payValue / installmentCount;
  }, [payMethod, payValue, installmentCount]);

  const paymentMethods = useMemo(() => activePaymentMethods(methodConfigs), [methodConfigs]);

  const feePreview = useMemo(() => {
    const config = methodConfigs.find((c) => c.method === payMethod && c.active);
    if (!config || payValue <= 0) return null;
    return calculatePaymentFee(payValue, config);
  }, [methodConfigs, payMethod, payValue]);

  const loadDetails = useCallback(async () => {
    if (!bill) return;
    setLoading(true);
    try {
      const [chargeItems, billPayments, configs] = await Promise.all([
        loadSaleChargeItems(bill.id),
        loadBillPayments({ billId: bill.id, limit: 50 }),
        loadPaymentMethodConfigs(),
      ]);
      setItems(chargeItems);
      setPayments(billPayments);
      setMethodConfigs(configs);
      setPayAmount(outstanding > 0 ? outstanding.toFixed(2).replace(".", ",") : "");
      setPayDate(todayISO());
      setPayMethod("pix");
      setCreditInstallments("1");
      setPayNotes("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bill, outstanding]);

  useEffect(() => {
    if (!open || !bill) return;
    void loadDetails();
  }, [open, bill, loadDetails]);

  const refreshAll = async () => {
    await loadDetails();
    onChanged();
  };

  const submitPayment = async () => {
    if (!bill) return;
    const value = parseBRLInput(payAmount);
    if (value <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    if (payMethod === "credit_card" && (!creditInstallments || installmentCount < 1)) {
      toast.error("Informe o parcelamento no cartão");
      return;
    }
    setPaySaving(true);
    try {
      const notes = buildPaymentNotes(payNotes, payMethod, installmentCount);
      await receiveBillPayment(bill.id, value, payMethod, payDate, notes);
      toast.success("Pagamento registrado");
      setPayNotes("");
      setCreditInstallments("1");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaySaving(false);
    }
  };

  const confirmReversePayment = async () => {
    if (!reversePaymentTarget) return;
    setReversingPayment(true);
    try {
      await reverseBillPayment(reversePaymentTarget.id, "Estorno manual");
      toast.success("Pagamento estornado");
      setReversePaymentTarget(null);
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReversingPayment(false);
    }
  };

  if (!bill) return null;

  const effStatus = isOverdue(bill.due_date, bill.status) ? "overdue" : bill.status;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg">
                  {bill.patients?.full_name ?? "Paciente"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  {bill.description}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge className={BILL_STATUS_CLASS[effStatus]}>
                  {BILL_STATUS_LABEL[effStatus]}
                </Badge>
                <span className="text-muted-foreground">
                  Vence {fmtDate(bill.due_date)}
                </span>
                {bill.competence_date && bill.competence_date !== bill.due_date && (
                  <span className="text-muted-foreground">
                    · Competência {fmtDate(bill.competence_date)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                Total: <strong>{fmt(bill.amount)}</strong>
              </span>
              <span>
                Recebido: <strong className="text-emerald-700">{fmt(bill.paid_amount)}</strong>
              </span>
              <span>
                Em aberto: <strong className="text-amber-700">{fmt(outstanding)}</strong>
              </span>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
                <section className="shrink-0 border-b p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ShoppingBag className="size-4 text-primary" />
                    O que comprou nesta conta
                  </h3>
                  {items.length > 0 ? (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                        >
                          <span>
                            {item.quantity}x {item.services?.name ?? "Procedimento"}
                            {item.services && item.services.session_count > 1 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.services.session_count} sessões/un)
                              </span>
                            )}
                          </span>
                          <span className="font-medium">{fmt(item.total_price)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{bill.description}</p>
                  )}
                </section>

                <section className="flex min-h-0 flex-1 flex-col p-5">
                  <h3 className="mb-3 text-sm font-semibold">Histórico de pagamentos</h3>
                  <ScrollArea className="min-h-0 flex-1">
                    {payments.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum pagamento registrado.
                      </p>
                    ) : (
                      <ul className="space-y-2 pr-3">
                        {payments.map((p) => (
                          <li
                            key={p.id}
                            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${p.status === "reversed" ? "opacity-60" : ""}`}
                          >
                            <div className="min-w-0">
                              <div className="font-medium">{fmt(p.amount)}</div>
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(p.paid_date)} · {PAYMENT_LABEL[p.payment_method]}
                                {p.fee_amount != null && Number(p.fee_amount) > 0 && (
                                  <> · Líquido {fmt(p.net_amount ?? p.amount)}</>
                                )}
                                {p.status === "reversed" && " · Estornado"}
                              </div>
                              {p.notes && (
                                <div className="mt-0.5 text-xs text-muted-foreground">{p.notes}</div>
                              )}
                            </div>
                            {paymentCanReverse(p) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-destructive hover:text-destructive"
                                title="Estornar pagamento"
                                onClick={() => setReversePaymentTarget(p)}
                              >
                                <RotateCcw className="size-4" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                </section>
              </div>

              <div className="flex min-h-0 flex-col p-5">
                <h3 className="mb-3 text-sm font-semibold">Lançar pagamento</h3>
                {billCanReceive(bill) ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Valor</Label>
                        <Input
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Data</Label>
                        <Input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Forma de pagamento</Label>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {paymentMethods.filter((m) => m.value !== "other").map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => {
                              setPayMethod(m.value);
                              if (m.value !== "credit_card") setCreditInstallments("1");
                            }}
                            className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                              payMethod === m.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <span className="mr-1">{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {payMethod === "credit_card" && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                        <Label className="text-xs">Parcelamento no cartão</Label>
                        <Select
                          value={creditInstallments}
                          onValueChange={setCreditInstallments}
                        >
                          <SelectTrigger className="mt-1 bg-background">
                            <SelectValue placeholder="Selecione as parcelas" />
                          </SelectTrigger>
                          <SelectContent>
                            {CREDIT_INSTALLMENTS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 1 ? "À vista (1x)" : `${n}x no cartão`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {installmentCount > 1 && payValue > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {installmentCount}x de <strong>{fmt(installmentValue)}</strong> no
                            cartão
                          </p>
                        )}
                      </div>
                    )}
                    {feePreview && feePreview.fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Taxa estimada: <strong>{fmt(feePreview.fee)}</strong> · Líquido:{" "}
                        <strong>{fmt(feePreview.net)}</strong>
                      </p>
                    )}
                    <div>
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        rows={3}
                        placeholder="Opcional"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => void submitPayment()}
                      disabled={paySaving}
                    >
                      {paySaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Confirmar recebimento
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta cobrança está quitada ou cancelada.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(reversePaymentTarget)}
        onOpenChange={(o) => !o && setReversePaymentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento de{" "}
              <strong>{reversePaymentTarget && fmt(reversePaymentTarget.amount)}</strong> será
              estornado e o saldo em aberto da cobrança será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversingPayment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reversingPayment}
              onClick={(e) => {
                e.preventDefault();
                void confirmReversePayment();
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
