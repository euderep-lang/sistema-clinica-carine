import { useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/locale";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { parseBRLInput, fmt, fmtDate } from "@/lib/currency";
import { generateReceiptPDF } from "@/lib/financial-pdf";
import { loadLetterheadForPdf, resolveLetterheadProfessionalId, DEFAULT_LETTERHEAD_MARGINS } from "@/lib/letterhead";
import { receiveBillPayment } from "@/lib/sales";
import { activePaymentMethods, calculatePaymentFee, getCachedPaymentMethodConfigs, loadPaymentMethodConfigs, paymentLabel } from "@/lib/payment-methods";
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

interface Patient { id: string; full_name: string; }
interface Bill {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  receipt_number: number;
  professional_id: string | null;
  profiles: { full_name: string } | null;
}

export function ReceivePaymentDialog({ open, onOpenChange, onSaved, defaultPatientId }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void; defaultPatientId?: string;
}) {
  const { tenant, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [psearch, setPsearch] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidDate, setPaidDate] = useState(todayISO());
  const [retroactivePayment, setRetroactivePayment] = useState(false);
  const [notes, setNotes] = useState("");
  const [partial, setPartial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ pdfUrl: string } | null>(null);
  const [methods, setMethods] = useState(() =>
    activePaymentMethods(getCachedPaymentMethodConfigs()),
  );
  const [installments, setInstallments] = useState("1");
  const [feeBearer, setFeeBearer] = useState<FeeBearer | null>(null);
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
    if (!open) return;
    setStep(1); setSelected({}); setAmount(""); setNotes(""); setPartial(false); setDone(null); setInstallments("1"); setFeeBearer(null);
    setPaidDate(todayISO()); setRetroactivePayment(false);
    if (defaultPatientId) setPatientId(defaultPatientId);
    (async () => {
      const { data } = await supabase.from("patients").select("id, full_name").eq("active", true).order("full_name");
      setPatients((data ?? []) as Patient[]);
      try {
        const configs = await loadPaymentMethodConfigs();
        setMethods(activePaymentMethods(configs));
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
  }, [open, defaultPatientId]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      const { data } = await supabase.from("bills_receivable" as never)
        .select("id, description, amount, paid_amount, due_date, status, receipt_number, professional_id, profiles(full_name)")
        .eq("patient_id", patientId).in("status", ["pending","partial","overdue"]).order("due_date") as never;
      setBills(((data ?? []) as unknown) as Bill[]);
    })();
  }, [patientId]);

  const selectedBills = bills.filter((b) => selected[b.id]);
  const totalSelected = useMemo(() => selectedBills.reduce((s, b) => s + (Number(b.amount) - Number(b.paid_amount)), 0), [selectedBills]);

  useEffect(() => { if (step === 3 && !amount) setAmount(totalSelected.toFixed(2).replace(".", ",")); }, [step, totalSelected, amount]);

  const patient = patients.find((p) => p.id === patientId);
  const filtered = patients.filter((p) => !psearch || p.full_name.toLowerCase().includes(psearch.toLowerCase())).slice(0, 30);

  const confirm = async () => {
    if (!tenant || selectedBills.length === 0) return;
    const dateError = validatePaymentDate(paidDate);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    const effectivePayDate = resolvePaymentDate(paidDate, retroactivePayment);
    const received = parseBRLInput(amount);
    if (
      received > 0 &&
      feePreview &&
      requiresFeeBearerChoice(feePreview.fee, received) &&
      !feeBearer
    ) {
      toast.error("Informe quem assume as taxas");
      return;
    }
    setSaving(true);
    try {
      let remaining = received;
      for (const b of selectedBills) {
        const outstanding = Number(b.amount) - Number(b.paid_amount);
        const pay = partial ? Math.min(remaining, outstanding) : outstanding;
        if (pay <= 0) continue;
        await receiveBillPayment(
          b.id,
          pay,
          method,
          effectivePayDate,
          notes || undefined,
          0,
          selectedMethod?.supports_installments ? Number(installments) || 1 : 1,
          feeBearer ?? "company",
        );
        remaining -= pay;
        if (partial && remaining <= 0) break;
      }
      const { data: tdata } = await supabase.from("tenants").select("name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle();
      const totalReceived = received;
      const profId = resolveLetterheadProfessionalId(profile, selectedBills[0].professional_id);
      const letterhead = profId
        ? await loadLetterheadForPdf(profId)
        : { margins: DEFAULT_LETTERHEAD_MARGINS };
      const blob = generateReceiptPDF({
        clinic: { name: tdata?.name ?? tenant.name, address: tdata?.address, phone: tdata?.phone, email: tdata?.email, cnpj: tdata?.cnpj },
        number: selectedBills[0].receipt_number,
        patientName: patient?.full_name ?? "",
        description: selectedBills.map((b) => b.description).join(", "),
        amount: totalReceived,
        paymentMethod: method,
        paidDate,
        professional: selectedBills[0].profiles?.full_name ?? null,
        letterhead,
      });
      const url = URL.createObjectURL(blob);
      setDone({ pdfUrl: url });
      toast.success("Pagamento registrado");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && done) URL.revokeObjectURL(done.pdfUrl); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Receber pagamento — passo {step}/4</DialogTitle></DialogHeader>
        {step === 1 && (
          <div className="space-y-3">
            <Label>Paciente</Label>
            <Popover open={patientOpen} onOpenChange={setPatientOpen}>
              <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start font-normal">{patient ? patient.full_name : "Selecionar..."}</Button></PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar..." value={psearch} onValueChange={setPsearch} />
                  <CommandList><CommandEmpty>Nenhum</CommandEmpty><CommandGroup>
                    {filtered.map((p) => (<CommandItem key={p.id} value={p.id} onSelect={() => { setPatientId(p.id); setPatientOpen(false); }}>{p.full_name}</CommandItem>))}
                  </CommandGroup></CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bills.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma cobrança aberta para este paciente</p> :
              bills.map((b) => (
                <label key={b.id} className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={!!selected[b.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [b.id]: !!v }))} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{b.description}</div>
                    <div className="text-xs text-muted-foreground">Vence {fmtDate(b.due_date)} · resta {fmt(Number(b.amount) - Number(b.paid_amount))}</div>
                  </div>
                  <div className="font-semibold">{fmt(b.amount)}</div>
                </label>
              ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <div><Label>Valor recebido</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Forma de pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button key={m.value} type="button" onClick={() => { setMethod(m.value); if (!m.supports_installments) setInstallments("1"); }}
                    className={`p-2 rounded-md border-2 text-sm ${method === m.value ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="text-lg">{m.icon}</div>{m.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedMethod?.supports_installments && (
              <div>
                <Label>Parcelamento</Label>
                <div className="grid grid-cols-6 gap-1 mt-1">
                  {Array.from({ length: Math.max(1, selectedMethod.max_installments ?? 12) }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" onClick={() => setInstallments(String(n))}
                      className={`p-1.5 rounded-md border text-xs ${Number(installments) === n ? "border-primary bg-primary/5 font-medium" : "border-border"}`}>
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
              suggestedDate={selectedBills[0]?.due_date}
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
            <div className="flex items-center gap-2"><Switch checked={partial} onCheckedChange={setPartial} /><Label>Pagamento parcial</Label></div>
            <div><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            {done ? (
              <div className="space-y-3 text-sm">
                <p>Pagamento de <strong>{fmt(parseBRLInput(amount))}</strong> registrado com sucesso.</p>
                <Button variant="outline" onClick={() => window.open(done.pdfUrl, "_blank")}><Printer className="h-4 w-4 mr-2" />Imprimir Recibo</Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p><strong>{selectedBills.length}</strong> cobrança(s) selecionada(s)</p>
                <p>Valor a receber: <strong>{fmt(parseBRLInput(amount))}</strong></p>
                <p>Forma: <strong>{paymentLabel(method)}</strong></p>
                <p>Data: <strong>{fmtDate(resolvePaymentDate(paidDate, retroactivePayment))}</strong></p>
                {partial && <p className="text-orange-600">Pagamento parcial — saldo remanescente continuará em aberto.</p>}
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          {step > 1 && !done && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Voltar</Button>}
          {step === 1 && <Button onClick={() => patientId && setStep(2)} disabled={!patientId}>Continuar</Button>}
          {step === 2 && <Button onClick={() => selectedBills.length > 0 && setStep(3)} disabled={selectedBills.length === 0}>Continuar</Button>}
          {step === 3 && (
            <Button
              onClick={() => setStep(4)}
              disabled={
                payValue > 0 &&
                feePreview != null &&
                requiresFeeBearerChoice(feePreview.fee, payValue) &&
                !feeBearer
              }
            >
              Continuar
            </Button>
          )}
          {step === 4 && !done && <Button onClick={confirm} disabled={saving}>Confirmar Recebimento</Button>}
          {done && <Button onClick={() => onOpenChange(false)}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}