import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, parseBRLInput } from "@/lib/currency";
import { maskCPF } from "@/lib/patient-utils";
import {
  createStandaloneSale,
  loadSaleChargeItems,
  previewInstallments,
  updateStandaloneSale,
  type SaleItemInput,
} from "@/lib/sales";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  full_name: string;
  cpf: string | null;
}

interface Service {
  id: string;
  name: string;
  default_price: number;
  session_count: number;
}

interface SaleItemForm {
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

const emptyItem = (): SaleItemForm => ({
  service_id: null,
  description: "",
  quantity: 1,
  unit_price: 0,
});

interface StandaloneSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId?: string | null;
  defaultPatientId?: string;
  onSaved: () => void;
}

export function StandaloneSaleDialog({
  open,
  onOpenChange,
  billId,
  defaultPatientId,
  onSaved,
}: StandaloneSaleDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItemForm[]>([emptyItem()]);
  const [paymentMode, setPaymentMode] = useState<"cash" | "installment">("cash");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [installmentInterval, setInstallmentInterval] = useState("1");

  const isEdit = Boolean(billId);

  const resetForm = () => {
    setPatientId(defaultPatientId ?? "");
    setDueDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setItems([emptyItem()]);
    setPaymentMode("cash");
    setInstallmentCount("3");
    setInstallmentInterval("1");
  };

  useEffect(() => {
    if (!open || !profile) return;

    (async () => {
      setLoading(true);
      const [{ data: pts }, { data: svcs }] = await Promise.all([
        supabase
          .from("patients")
          .select("id, full_name, cpf")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("full_name"),
        supabase
          .from("services")
          .select("id, name, default_price, session_count")
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .or(`professional_id.eq.${profile.id},professional_id.is.null`)
          .order("name"),
      ]);
      setPatients((pts ?? []) as Patient[]);
      setServices((svcs ?? []) as Service[]);

      if (billId) {
        const { data: bill, error } = await supabase
          .from("bills_receivable")
          .select("patient_id, due_date, notes, installment_count")
          .eq("id", billId)
          .maybeSingle();
        if (error || !bill) {
          toast.error("Venda não encontrada");
          onOpenChange(false);
          return;
        }
        const chargeItems = await loadSaleChargeItems(billId);
        setPatientId(bill.patient_id ?? "");
        setDueDate(bill.due_date);
        setNotes(bill.notes ?? "");
        if (bill.installment_count && bill.installment_count > 1) {
          setPaymentMode("installment");
          setInstallmentCount(String(bill.installment_count));
        } else {
          setPaymentMode("cash");
        }
        setItems(
          chargeItems.length > 0
            ? chargeItems.map((it) => ({
                service_id: it.service_id,
                description: it.services?.name ?? "",
                quantity: it.quantity,
                unit_price: Number(it.unit_price),
              }))
            : [emptyItem()],
        );
      } else {
        resetForm();
      }
      setLoading(false);
    })();
  }, [open, profile, billId, defaultPatientId, onOpenChange]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return patients
      .filter(
        (p) =>
          !q ||
          p.full_name.toLowerCase().includes(q) ||
          (p.cpf ?? "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 30);
  }, [patients, patientSearch]);

  const total = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items],
  );

  const installments = useMemo(() => {
    const count = Math.max(2, Math.min(48, Number(installmentCount) || 2));
    if (paymentMode !== "installment" || total <= 0) return [];
    return previewInstallments(
      total,
      dueDate,
      count,
      Math.max(1, Number(installmentInterval) || 1),
    );
  }, [paymentMode, total, dueDate, installmentCount, installmentInterval]);

  const updateItem = (index: number, patch: Partial<SaleItemForm>) => {
    setItems((arr) => arr.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const pickService = (index: number, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    updateItem(index, {
      service_id: svc.id,
      description: svc.name,
      unit_price: Number(svc.default_price),
    });
  };

  const toPayload = (): SaleItemInput[] =>
    items
      .filter((it) => it.service_id && it.quantity > 0)
      .map((it) => ({
        service_id: it.service_id!,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));

  const save = async () => {
    if (!profile) return;
    if (!patientId) {
      toast.error("Selecione o paciente");
      return;
    }
    const payload = toPayload();
    if (payload.length === 0) {
      toast.error("Adicione ao menos um procedimento");
      return;
    }

    setSaving(true);
    try {
      const count = paymentMode === "installment" ? Math.max(2, Number(installmentCount) || 2) : 1;
      const interval = Math.max(1, Number(installmentInterval) || 1);
      const options = {
        notes: notes.trim() || undefined,
        installmentCount: count,
        installmentIntervalMonths: interval,
      };

      if (billId) {
        await updateStandaloneSale(billId, payload, dueDate, options);
        toast.success(count > 1 ? "Venda parcelada atualizada" : "Venda atualizada");
      } else {
        const result = await createStandaloneSale(patientId, payload, dueDate, options);
        toast.success(
          result.installment_count > 1
            ? `Venda parcelada em ${result.installment_count}x criada`
            : "Venda criada — estoque atualizado",
        );
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const patient = patients.find((p) => p.id === patientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar venda" : "Nova venda avulsa"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A venda gera cobrança, pacote de sessões (se aplicável) e baixa automática no
              estoque.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Paciente *</Label>
                <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                      disabled={isEdit}
                    >
                      {patient ? patient.full_name : "Selecionar paciente…"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar nome ou CPF…"
                        value={patientSearch}
                        onValueChange={setPatientSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente</CommandEmpty>
                        <CommandGroup>
                          {filteredPatients.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setPatientId(p.id);
                                setPatientOpen(false);
                              }}
                            >
                              <div>
                                <div className="font-medium">{p.full_name}</div>
                                {p.cpf && (
                                  <div className="text-xs text-muted-foreground">
                                    {maskCPF(p.cpf)}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>{paymentMode === "installment" ? "1ª parcela (vencimento) *" : "Vencimento *"}</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label>Forma de pagamento</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("cash")}
                  className={cn(
                    "flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors",
                    paymentMode === "cash"
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  À vista
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("installment")}
                  className={cn(
                    "flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium transition-colors",
                    paymentMode === "installment"
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  Parcelado
                </button>
              </div>

              {paymentMode === "installment" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Número de parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      max={48}
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Intervalo (meses)</Label>
                    <Select value={installmentInterval} onValueChange={setInstallmentInterval}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Mensal</SelectItem>
                        <SelectItem value="2">Bimestral</SelectItem>
                        <SelectItem value="3">Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Procedimentos *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((arr) => [...arr, emptyItem()])}
                >
                  <Plus className="mr-1 size-3.5" />
                  Adicionar
                </Button>
              </div>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_72px_120px_40px]"
                >
                  <Select
                    value={item.service_id ?? ""}
                    onValueChange={(v) => pickService(index, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Procedimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.session_count > 1 ? ` (${s.session_count} sessões)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <Input
                    placeholder="R$ 0,00"
                    value={item.unit_price ? fmt(item.unit_price) : ""}
                    onChange={(e) =>
                      updateItem(index, { unit_price: parseBRLInput(e.target.value) })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={items.length === 1}
                    onClick={() => setItems((arr) => arr.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Opcional"
              />
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Total da venda: </span>
                <span className="text-lg font-semibold">{fmt(total)}</span>
              </div>
              {installments.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Parcelas ({installments.length}x)
                  </p>
                  <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                    {installments.map((p) => (
                      <li
                        key={p.number}
                        className="flex items-center justify-between rounded bg-background/80 px-2 py-1"
                      >
                        <span>
                          {p.number}/{installments.length} ·{" "}
                          {new Date(p.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <span className="font-medium">{fmt(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
