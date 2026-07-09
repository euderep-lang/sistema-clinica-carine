import { useEffect, useMemo, useState } from "react";
import { todayISO, shiftDateISO } from "@/lib/locale";
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
import { BUDGET_STATUS_LABEL, fmt, parseBRLInput } from "@/lib/currency";
import { MoneyInput } from "@/components/ui/money-input";
import { maskCPF } from "@/lib/patient-utils";
import { matchesSearch } from "@/lib/search";

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

export interface BudgetItemForm {
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

const emptyItem = (): BudgetItemForm => ({
  service_id: null,
  description: "",
  quantity: 1,
  unit_price: 0,
});

const EDITABLE_STATUSES = ["draft", "sent", "approved", "rejected"] as const;

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId?: string | null;
  defaultPatientId?: string | null;
  onSaved: () => void;
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  budgetId,
  defaultPatientId,
  onSaved,
}: BudgetFormDialogProps) {
  const { profile, tenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patientId, setPatientId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [date, setDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState<(typeof EDITABLE_STATUSES)[number]>("draft");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountValueInput, setDiscountValueInput] = useState("");
  const [discountSource, setDiscountSource] = useState<"percent" | "value">("percent");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BudgetItemForm[]>([emptyItem()]);
  const [converted, setConverted] = useState(false);
  const [budgetNumber, setBudgetNumber] = useState<number | null>(null);

  const resetForm = () => {
    setPatientId("");
    setDate(todayISO());
    setValidUntil(shiftDateISO(todayISO(), 15));
    setStatus("draft");
    setDiscountPercent("0");
    setDiscountValueInput("");
    setDiscountSource("percent");
    setNotes("");
    setItems([emptyItem()]);
    setConverted(false);
    setBudgetNumber(null);
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

      if (budgetId) {
        const { data: budget, error } = await supabase
          .from("budgets")
          .select("*")
          .eq("id", budgetId)
          .eq("professional_id", profile.id)
          .maybeSingle();
        if (error || !budget) {
          toast.error("Orçamento não encontrado");
          onOpenChange(false);
          return;
        }

        const { data: bill } = await supabase
          .from("bills_receivable")
          .select("id, status")
          .eq("budget_id", budgetId)
          .maybeSingle();
        // Uma fatura com status 'budget' é apenas o orçamento no financeiro,
        // não uma venda. Só consideramos "convertido" quando virou venda real.
        setConverted(Boolean(bill) && bill?.status !== "budget");

        const { data: budgetItems } = await supabase
          .from("budget_items")
          .select("*")
          .eq("budget_id", budgetId)
          .order("position");

        setPatientId(budget.patient_id ?? "");
        setBudgetNumber(budget.number);
        setDate(budget.date);
        setValidUntil(budget.valid_until ?? "");
        setStatus(budget.status as (typeof EDITABLE_STATUSES)[number]);
        const loadedDiscount = Number(budget.discount_value ?? 0);
        setDiscountPercent(String(budget.discount_percent ?? 0));
        setDiscountValueInput(loadedDiscount > 0 ? fmt(loadedDiscount) : "");
        setDiscountSource("percent");
        setNotes(budget.notes ?? "");
        setItems(
          budgetItems?.length
            ? budgetItems.map((it) => ({
                service_id: it.service_id,
                description: it.description,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
              }))
            : [emptyItem()],
        );
      } else {
        resetForm();
        if (defaultPatientId) setPatientId(defaultPatientId);
      }
      setLoading(false);
    })();
  }, [open, budgetId, defaultPatientId, profile, onOpenChange]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    return patients
      .filter(
        (p) =>
          matchesSearch(p.full_name, q) ||
          (p.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 30);
  }, [patients, patientSearch]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items],
  );

  const discountValue = useMemo(() => {
    if (discountSource === "value") {
      return Math.min(subtotal, parseBRLInput(discountValueInput) || 0);
    }
    const pct = Number(discountPercent.replace(",", ".")) || 0;
    return Math.round(subtotal * (pct / 100) * 100) / 100;
  }, [subtotal, discountPercent, discountValueInput, discountSource]);

  const discountPercentSaved = useMemo(() => {
    if (subtotal <= 0) return 0;
    return Math.round((discountValue / subtotal) * 10000) / 100;
  }, [subtotal, discountValue]);

  const finalValue = Math.max(0, Math.round((subtotal - discountValue) * 100) / 100);

  useEffect(() => {
    if (discountSource === "percent") {
      const pct = Number(discountPercent.replace(",", ".")) || 0;
      const value = Math.round(subtotal * (pct / 100) * 100) / 100;
      setDiscountValueInput(value > 0 ? fmt(value) : "");
      return;
    }
    const value = Math.min(subtotal, parseBRLInput(discountValueInput) || 0);
    if (subtotal > 0) {
      setDiscountPercent(String(Math.round((value / subtotal) * 10000) / 100));
    } else {
      setDiscountPercent("0");
    }
    if (value > 0) {
      setDiscountValueInput(fmt(value));
    }
    // Recalcula o campo complementar quando o subtotal muda (itens adicionados/removidos).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers cobrem edição manual
  }, [subtotal]);

  const onDiscountPercentChange = (raw: string) => {
    setDiscountSource("percent");
    setDiscountPercent(raw);
    const pct = Number(raw.replace(",", ".")) || 0;
    const value = Math.round(subtotal * (pct / 100) * 100) / 100;
    setDiscountValueInput(value > 0 ? fmt(value) : "");
  };

  const onDiscountValueChange = (raw: string) => {
    setDiscountSource("value");
    setDiscountValueInput(raw);
    const value = Math.min(subtotal, parseBRLInput(raw) || 0);
    if (subtotal > 0) {
      setDiscountPercent(String(Math.round((value / subtotal) * 10000) / 100));
    } else {
      setDiscountPercent("0");
    }
  };

  const updateItem = (index: number, patch: Partial<BudgetItemForm>) => {
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

  const save = async () => {
    if (!profile || !tenant) return;
    if (!patientId) {
      toast.error("Selecione o paciente");
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Adicione ao menos um procedimento");
      return;
    }
    if (converted) {
      toast.error("Orçamento já convertido em venda — não pode ser editado");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        patient_id: patientId,
        professional_id: profile.id,
        date,
        valid_until: validUntil || null,
        status,
        notes: notes.trim() || null,
        subtotal,
        discount_percent: discountPercentSaved,
        discount_value: discountValue,
        final_value: finalValue,
      };

      let id = budgetId;

      if (budgetId) {
        const { error } = await supabase.from("budgets").update(payload).eq("id", budgetId);
        if (error) throw error;
        await supabase.from("budget_items").delete().eq("budget_id", budgetId);
      } else {
        const { data, error } = await supabase.from("budgets").insert(payload).select("id").single();
        if (error || !data) throw error ?? new Error("Erro ao criar orçamento");
        id = data.id;
      }

      const rows = validItems.map((it, i) => ({
        budget_id: id!,
        service_id: it.service_id,
        position: i + 1,
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: Math.round(it.quantity * it.unit_price * 100) / 100,
      }));
      const { error: itemsErr } = await supabase.from("budget_items").insert(rows);
      if (itemsErr) throw itemsErr;

      // Reflete o orçamento no financeiro como uma fatura com status "Orçamento".
      const { error: billErr } = await supabase.rpc("upsert_budget_bill" as never, {
        p_budget_id: id!,
      } as never);
      if (billErr) throw new Error(billErr.message);

      toast.success(budgetId ? "Orçamento atualizado" : "Orçamento criado");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const patient = patients.find((p) => p.id === patientId);
  const readOnly = converted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {budgetId && budgetNumber ? `Orçamento #${budgetNumber}` : "Novo orçamento"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {converted && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Este orçamento já foi convertido em venda e não pode mais ser editado.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Paciente *</Label>
                <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start font-normal"
                      disabled={readOnly}
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
                                  <div className="text-xs text-muted-foreground">{maskCPF(p.cpf)}</div>
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
                <Label>Situação</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as (typeof EDITABLE_STATUSES)[number])}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITABLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BUDGET_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="space-y-1">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Procedimentos</Label>
              {items.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <Select
                      value={it.service_id ?? ""}
                      onValueChange={(v) => pickService(i, v)}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Procedimento" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — {fmt(s.default_price)}
                            {s.session_count > 1 ? ` (${s.session_count} sessões)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Descrição"
                      value={it.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <MoneyInput
                      placeholder="Preço unit."
                      value={it.unit_price}
                      onValueChange={(v) => updateItem(i, { unit_price: v })}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-sm font-medium">{fmt(it.quantity * it.unit_price)}</span>
                    {!readOnly && items.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!readOnly && (
                <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, emptyItem()])}>
                  <Plus className="mr-1 size-4" />
                  Adicionar procedimento
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label>Desconto (%)</Label>
                <Input
                  value={discountPercent}
                  onChange={(e) => onDiscountPercentChange(e.target.value)}
                  disabled={readOnly}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Desconto (R$)</Label>
                <Input
                  value={discountValueInput}
                  onChange={(e) => onDiscountValueChange(e.target.value)}
                  disabled={readOnly}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 sm:col-span-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Desconto</span>
                  <span>- {fmt(discountValue)}</span>
                </div>
                <div className="mt-1 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{fmt(finalValue)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!readOnly && (
            <Button onClick={() => void save()} disabled={saving || loading}>
              {saving ? "Salvando…" : budgetId ? "Salvar alterações" : "Criar orçamento"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
