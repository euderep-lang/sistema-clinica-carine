import { useEffect, useMemo, useState } from "react";
import { todayISO, fmtDate } from "@/lib/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fmt, parseBRLInput } from "@/lib/currency";
import { receiveBillPayment } from "@/lib/sales";
import { activePaymentMethods, calculatePaymentFee, getCachedPaymentMethodConfigs, loadPaymentMethodConfigs } from "@/lib/payment-methods";
import type { FeeBearer } from "@/lib/payment-methods";
import {
  PaymentFeeBearerField,
  requiresFeeBearerChoice,
} from "@/components/professional/payment-fee-bearer-field";
import {
  RetroactivePaymentDateField,
  resolvePaymentDate,
  validatePaymentDate,
} from "@/components/professional/retroactive-payment-date-field";

interface BillQuickReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string | null;
  onSaved: () => void;
}

export function BillQuickReceiveDialog({
  open,
  onOpenChange,
  billId,
  onSaved,
}: BillQuickReceiveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [outstanding, setOutstanding] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [paidDate, setPaidDate] = useState(todayISO());
  const [retroactivePayment, setRetroactivePayment] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [installments, setInstallments] = useState("1");
  const [feeBearer, setFeeBearer] = useState<FeeBearer | null>(null);
  const [methods, setMethods] = useState(() =>
    activePaymentMethods(getCachedPaymentMethodConfigs()),
  );
  const selectedMethod = methods.find((m) => m.value === method);
  const payValue = parseBRLInput(amount);
  const installmentCount = Number(installments) || 1;
  const feePreview = useMemo(() => {
    if (!selectedMethod || payValue <= 0) return null;
    return calculatePaymentFee(
      payValue,
      selectedMethod,
      selectedMethod.supports_installments ? installmentCount : 1,
    );
  }, [selectedMethod, payValue, installmentCount]);

  useEffect(() => {
    setFeeBearer(null);
  }, [method, installments, amount]);

  useEffect(() => {
    if (!open || !billId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills_receivable")
        .select("description, amount, paid_amount, due_date")
        .eq("id", billId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Cobrança não encontrada");
        onOpenChange(false);
        return;
      }
      const rest = Number(data.amount) - Number(data.paid_amount);
      setDescription(data.description);
      setOutstanding(rest);
      setAmount(rest.toFixed(2).replace(".", ","));
      setPaidDate(todayISO());
      setRetroactivePayment(false);
      setDueDate(data.due_date ?? null);
      setInstallments("1");
      setFeeBearer(null);
      try {
        const configs = await loadPaymentMethodConfigs();
        setMethods(activePaymentMethods(configs));
      } catch (e) {
        toast.error((e as Error).message);
      }
      setLoading(false);
    })();
  }, [open, billId, onOpenChange]);

  const confirm = async () => {
    if (!billId) return;
    const value = parseBRLInput(amount);
    if (value <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    const dateError = validatePaymentDate(paidDate);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    const effectivePayDate = resolvePaymentDate(paidDate, retroactivePayment);
    if (
      feePreview &&
      requiresFeeBearerChoice(feePreview.fee, value) &&
      !feeBearer
    ) {
      toast.error("Informe quem assume as taxas");
      return;
    }
    setSaving(true);
    try {
      await receiveBillPayment(
        billId,
        value,
        method,
        effectivePayDate,
        undefined,
        0,
        selectedMethod?.supports_installments ? Number(installments) || 1 : 1,
        feeBearer ?? "company",
      );
      toast.success(
        retroactivePayment
          ? `Pagamento registrado em ${fmtDate(effectivePayDate)}`
          : "Pagamento registrado",
      );
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receber pagamento</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-sm">
              Saldo em aberto: <strong>{fmt(outstanding)}</strong>
            </p>
            <div>
              <Label>Valor recebido</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setMethod(m.value); if (!m.supports_installments) setInstallments("1"); }}
                    className={`rounded-md border-2 p-2 text-xs ${
                      method === m.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="text-base">{m.icon}</div>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedMethod?.supports_installments && (
              <div>
                <Label>Parcelamento</Label>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {Array.from({ length: Math.max(1, selectedMethod.max_installments ?? 12) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(String(n))}
                      className={`rounded-md border p-1.5 text-xs ${
                        Number(installments) === n ? "border-primary bg-primary/5 font-medium" : "border-border"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>
            )}
            <RetroactivePaymentDateField
              value={paidDate}
              onChange={setPaidDate}
              retroactive={retroactivePayment}
              onRetroactiveChange={setRetroactivePayment}
              suggestedDate={dueDate ?? undefined}
            />
            {feePreview && payValue > 0 && (
              <PaymentFeeBearerField
                fee={feePreview.fee}
                net={feePreview.net}
                amount={payValue}
                value={feeBearer}
                onChange={setFeeBearer}
              />
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirm()}
            disabled={
              saving ||
              loading ||
              (payValue > 0 &&
                feePreview != null &&
                requiresFeeBearerChoice(feePreview.fee, payValue) &&
                !feeBearer)
            }
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
