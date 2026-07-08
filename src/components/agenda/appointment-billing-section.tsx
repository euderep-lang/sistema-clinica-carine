import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { todayISO } from "@/lib/locale";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fmt, parseBRLInput } from "@/lib/currency";
import {
  activePaymentMethods,
  calculatePaymentFee,
  getCachedPaymentMethodConfigs,
  loadPaymentMethodConfigs,
} from "@/lib/payment-methods";
import type { FeeBearer } from "@/lib/payment-methods";
import {
  PaymentFeeBearerField,
  requiresFeeBearerChoice,
} from "@/components/professional/payment-fee-bearer-field";
import type { AppointmentProfessionalOption } from "@/lib/appointment-professional";

export interface AppointmentBillingHandle {
  /** Lança a fatura da consulta (e pagamento, se marcado). Best-effort. */
  runBilling: (appointmentId: string) => Promise<void>;
}

interface AppointmentBillingSectionProps {
  professional: AppointmentProfessionalOption | undefined;
  modality: string;
}

interface ConsultationService {
  id: string;
  name: string;
  default_price: number;
}

export const AppointmentBillingSection = forwardRef<
  AppointmentBillingHandle,
  AppointmentBillingSectionProps
>(function AppointmentBillingSection({ professional, modality }, ref) {
  const [service, setService] = useState<ConsultationService | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [payNow, setPayNow] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [installments, setInstallments] = useState("1");
  const [paidDate, setPaidDate] = useState(todayISO());
  const [feeBearer, setFeeBearer] = useState<FeeBearer | null>(null);
  const [methods, setMethods] = useState(() =>
    activePaymentMethods(getCachedPaymentMethodConfigs()),
  );

  const serviceId =
    modality === "online"
      ? professional?.online_consultation_service_id
      : professional?.consultation_service_id;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const configs = await loadPaymentMethodConfigs();
        if (active) setMethods(activePaymentMethods(configs));
      } catch {
        /* mantém cache */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!serviceId) {
      setService(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, default_price")
        .eq("id", serviceId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const svc = { ...data, default_price: Number(data.default_price) } as ConsultationService;
        setService(svc);
        setAmount(svc.default_price > 0 ? fmt(svc.default_price) : "");
      } else {
        setService(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [serviceId]);

  useEffect(() => {
    setFeeBearer(null);
  }, [method, installments, amount]);

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

  useImperativeHandle(
    ref,
    () => ({
      runBilling: async (appointmentId: string) => {
        if (!enabled || !service) return;
        if (
          payNow &&
          payValue > 0 &&
          feePreview &&
          requiresFeeBearerChoice(feePreview.fee, payValue) &&
          !feeBearer
        ) {
          toast.error("Informe quem assume as taxas do pagamento da consulta");
          return;
        }
        const { error } = await supabase.rpc("create_consultation_bill" as never, {
          p_appointment_id: appointmentId,
          p_pay_now: payNow && payValue > 0,
          p_amount: payNow ? payValue : null,
          p_method: method,
          p_paid_date: paidDate,
          p_fee_bearer: feeBearer ?? "company",
          p_installments: selectedMethod?.supports_installments ? installmentCount : 1,
        } as never);
        if (error) {
          toast.error(`Consulta agendada, mas a fatura não foi lançada: ${error.message}`);
        } else {
          toast.success(payNow ? "Fatura da consulta lançada e paga" : "Fatura da consulta lançada");
        }
      },
    }),
    [enabled, service, payNow, payValue, feePreview, feeBearer, method, paidDate, selectedMethod, installmentCount],
  );

  if (!serviceId || !service) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        Consulta {modality === "online" ? "online" : "presencial"} sem procedimento padrão
        configurado. Configure em <strong>Meus procedimentos → Consulta padrão</strong> para lançar a
        fatura automaticamente.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Label className="text-sm">Lançar fatura da consulta</Label>
          <p className="truncate text-xs text-muted-foreground">
            {service.name} · {fmt(service.default_price)}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div className="flex items-center gap-2">
            <Switch checked={payNow} onCheckedChange={setPayNow} />
            <Label className="text-sm">Paciente já pagou</Label>
          </div>

          {payNow && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor pago</Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Forma de pagamento</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMethod(m.value);
                        if (!m.supports_installments) setInstallments("1");
                      }}
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
                  <Label className="text-xs">Parcelamento</Label>
                  <div className="mt-1 grid grid-cols-6 gap-1">
                    {Array.from(
                      { length: Math.max(1, selectedMethod.max_installments ?? 12) },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setInstallments(String(n))}
                        className={`rounded-md border p-1.5 text-xs ${
                          Number(installments) === n
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border"
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
        </>
      )}
    </div>
  );
});
