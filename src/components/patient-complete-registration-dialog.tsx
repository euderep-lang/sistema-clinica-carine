import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ageFromBirthDate,
  DEFAULT_PHONE_DDI,
  fetchCEP,
  isValidCPF,
  maskCEP,
  maskCPF,
  maskPhoneByDdi,
  phonePlaceholderByDdi,
  PHONE_DDI_OPTIONS,
  sanitizeDdi,
} from "@/lib/patient-utils";

export type CompleteRegistrationPatient = {
  id: string;
  full_name: string;
  cpf?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  phone_ddi?: string | null;
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
};

type FormState = {
  full_name: string;
  cpf: string;
  gender: string;
  birth_date: string;
  phone_ddi: string;
  phone: string;
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
};

function digitsOnly(v: string): string {
  return v.replace(/\D/g, "");
}

function toForm(p: CompleteRegistrationPatient): FormState {
  const ddi = sanitizeDdi(p.phone_ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
  return {
    full_name: p.full_name ?? "",
    cpf: maskCPF(p.cpf ?? ""),
    gender: p.gender ?? "",
    birth_date: p.birth_date ?? "",
    phone_ddi: ddi,
    phone: maskPhoneByDdi(p.phone ?? "", ddi),
    address_zip: maskCEP(p.address_zip ?? ""),
    address_street: p.address_street ?? "",
    address_number: p.address_number ?? "",
    address_complement: p.address_complement ?? "",
    address_neighborhood: p.address_neighborhood ?? "",
    address_city: p.address_city ?? "",
    address_state: p.address_state ?? "",
  };
}

/**
 * Popup bloqueante para completar ficha mínima ao iniciar consulta de paciente novo.
 */
export function PatientCompleteRegistrationDialog({
  open,
  patient,
  onCompleted,
}: {
  open: boolean;
  patient: CompleteRegistrationPatient | null;
  onCompleted: (updated: CompleteRegistrationPatient) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const wasOpen = useRef(false);

  // Só hidrata o form ao abrir (não a cada update do patient) — evita tela em branco.
  useEffect(() => {
    if (open && patient) {
      if (!wasOpen.current) {
        setForm(toForm(patient));
        setErrors({});
        setSaving(false);
        wasOpen.current = true;
      }
      return;
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false;
      // Limpa depois da animação de fechamento do Radix.
      const t = window.setTimeout(() => setForm(null), 220);
      return () => window.clearTimeout(t);
    }
  }, [open, patient]);

  const set = (k: keyof FormState, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const age = form ? ageFromBirthDate(form.birth_date) : null;

  const onCepBlur = async () => {
    if (!form || digitsOnly(form.address_zip).length !== 8) return;
    setCepLoading(true);
    const r = await fetchCEP(form.address_zip);
    setCepLoading(false);
    if (r) {
      setForm((f) =>
        f
          ? {
              ...f,
              address_street: r.address_street || f.address_street,
              address_neighborhood: r.address_neighborhood || f.address_neighborhood,
              address_city: r.address_city || f.address_city,
              address_state: r.address_state || f.address_state,
            }
          : f,
      );
    }
  };

  const validate = (f: FormState) => {
    const e: Record<string, string> = {};
    if (!f.full_name.trim()) e.full_name = "Obrigatório";
    if (!f.cpf.trim()) e.cpf = "Obrigatório";
    else if (!isValidCPF(f.cpf)) e.cpf = "CPF inválido";
    if (!f.gender.trim()) e.gender = "Obrigatório";
    if (!f.birth_date.trim()) e.birth_date = "Obrigatório";
    if (digitsOnly(f.phone).length < 8) e.phone = "Informe o WhatsApp";
    if (digitsOnly(f.address_zip).length !== 8) e.address_zip = "CEP inválido";
    if (!f.address_street.trim()) e.address_street = "Obrigatório";
    if (!f.address_number.trim()) e.address_number = "Obrigatório";
    if (!f.address_neighborhood.trim()) e.address_neighborhood = "Obrigatório";
    if (!f.address_city.trim()) e.address_city = "Obrigatório";
    if (f.address_state.trim().length < 2) e.address_state = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!patient || !form) return;
    if (!validate(form)) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      cpf: digitsOnly(form.cpf) || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      phone_ddi: sanitizeDdi(form.phone_ddi) || DEFAULT_PHONE_DDI,
      phone: digitsOnly(form.phone) || null,
      address_zip: digitsOnly(form.address_zip) || null,
      address_street: form.address_street.trim() || null,
      address_number: form.address_number.trim() || null,
      address_complement: form.address_complement.trim() || null,
      address_neighborhood: form.address_neighborhood.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim().toUpperCase().slice(0, 2) || null,
    };
    const { data, error } = await supabase
      .from("patients")
      .update(payload)
      .eq("id", patient.id)
      .select(
        "id, full_name, cpf, gender, birth_date, phone, phone_ddi, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state",
      )
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cadastro completo");
    onCompleted((data ?? { id: patient.id, ...payload }) as CompleteRegistrationPatient);
  };

  // Sempre monta o Dialog controlado — nunca `return null` com overlay aberto (fica em branco).
  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueante até salvar */ }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete o cadastro do paciente</DialogTitle>
          <DialogDescription>
            Este paciente foi agendado com ficha incompleta. Preencha os dados abaixo para continuar
            o atendimento.
          </DialogDescription>
        </DialogHeader>

        {!form ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                className={errors.full_name ? "border-destructive" : ""}
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => set("cpf", maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={errors.cpf ? "border-destructive" : ""}
                />
                {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Data de nascimento *{" "}
                {age !== null && <span className="text-xs text-muted-foreground">({age} anos)</span>}
              </Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
                className={errors.birth_date ? "border-destructive" : ""}
              />
              {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-36 space-y-1.5">
                <Label>DDI *</Label>
                <Select
                  value={form.phone_ddi}
                  onValueChange={(ddi) =>
                    setForm((f) =>
                      f ? { ...f, phone_ddi: ddi, phone: maskPhoneByDdi(f.phone, ddi) } : f,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="+55" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_DDI_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Telefone / WhatsApp *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", maskPhoneByDdi(e.target.value, form.phone_ddi))}
                  placeholder={phonePlaceholderByDdi(form.phone_ddi)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <h3 className="text-sm font-semibold">Endereço *</h3>
              <div className="space-y-1.5">
                <Label>
                  CEP {cepLoading ? <Loader2 className="inline size-3 animate-spin" /> : null}
                </Label>
                <Input
                  value={form.address_zip}
                  onChange={(e) => set("address_zip", maskCEP(e.target.value))}
                  onBlur={() => void onCepBlur()}
                  placeholder="00000-000"
                  className={errors.address_zip ? "border-destructive" : ""}
                />
                {errors.address_zip && (
                  <p className="text-xs text-destructive">{errors.address_zip}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Logradouro *</Label>
                  <Input
                    value={form.address_street}
                    onChange={(e) => set("address_street", e.target.value)}
                    className={errors.address_street ? "border-destructive" : ""}
                  />
                  {errors.address_street && (
                    <p className="text-xs text-destructive">{errors.address_street}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Número *</Label>
                  <Input
                    value={form.address_number}
                    onChange={(e) => set("address_number", e.target.value)}
                    className={errors.address_number ? "border-destructive" : ""}
                  />
                  {errors.address_number && (
                    <p className="text-xs text-destructive">{errors.address_number}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Complemento</Label>
                  <Input
                    value={form.address_complement}
                    onChange={(e) => set("address_complement", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro *</Label>
                  <Input
                    value={form.address_neighborhood}
                    onChange={(e) => set("address_neighborhood", e.target.value)}
                    className={errors.address_neighborhood ? "border-destructive" : ""}
                  />
                  {errors.address_neighborhood && (
                    <p className="text-xs text-destructive">{errors.address_neighborhood}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cidade *</Label>
                  <Input
                    value={form.address_city}
                    onChange={(e) => set("address_city", e.target.value)}
                    className={errors.address_city ? "border-destructive" : ""}
                  />
                  {errors.address_city && (
                    <p className="text-xs text-destructive">{errors.address_city}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Estado *</Label>
                  <Input
                    value={form.address_state}
                    onChange={(e) => set("address_state", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SC"
                    className={errors.address_state ? "border-destructive" : ""}
                  />
                  {errors.address_state && (
                    <p className="text-xs text-destructive">{errors.address_state}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Salvar e continuar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
