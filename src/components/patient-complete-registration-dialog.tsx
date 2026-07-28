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
import { syncPatientWhatsAppPhoneFn } from "@/lib/whatsapp-crm.functions";
import { phonesMatch } from "@/lib/wa-phone";

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
 * Vale para qualquer perfil que abra o prontuário.
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
  /** Fecha na hora após save OK, mesmo se o pai ainda não atualizou `open`. */
  const [forceClosed, setForceClosed] = useState(false);
  const hydratedForOpen = useRef(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  // Hidrata só ao ABRIR o popup — nunca ao atualizar `patient` no meio do preenchimento/save.
  useEffect(() => {
    if (!open) {
      hydratedForOpen.current = false;
      setForceClosed(false);
      const t = window.setTimeout(() => setForm(null), 220);
      return () => window.clearTimeout(t);
    }
    if (open && patient && !hydratedForOpen.current && !forceClosed) {
      hydratedForOpen.current = true;
      setForm(toForm(patient));
      setErrors({});
      setSaving(false);
    }
  }, [open, patient, forceClosed]);

  const set = (k: keyof FormState, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const age = form ? ageFromBirthDate(form.birth_date) : null;
  const dialogOpen = Boolean(open && patient && !forceClosed);

  const onCepBlur = async () => {
    if (!form || digitsOnly(form.address_zip).length !== 8) return;
    if (/^0{8}$/.test(digitsOnly(form.address_zip))) return;
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
    const cep = digitsOnly(f.address_zip);
    if (cep.length !== 8 || /^0{8}$/.test(cep)) e.address_zip = "Informe um CEP válido";
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
    if (!patient || !form || saving) return;
    if (!validate(form)) {
      toast.error("Preencha todos os campos obrigatórios, inclusive o endereço completo.");
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
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
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Não foi possível salvar o cadastro. Tente novamente.");
      return;
    }
    const updated = data as CompleteRegistrationPatient;
    const phoneChanged = !phonesMatch(patient.phone ?? "", form.phone ?? "");
    if (phoneChanged) {
      void syncPatientWhatsAppPhoneFn({ data: { patientId: patient.id } }).catch((err) =>
        console.error("[patient] sync WhatsApp phone:", err),
      );
    }
    // Fecha já no dialog; não depende do pai (evita corrida que reabre em branco).
    setForceClosed(true);
    hydratedForOpen.current = false;
    toast.success("Cadastro completo");
    onCompleted(updated);
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        // Bloqueia ESC/overlay; fechamento só após save (forceClosed).
        if (!next && !forceClosed) return;
      }}
    >
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div ref={formTopRef} />
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
                {age !== null ? (
                  <span className="font-normal text-muted-foreground">({age} anos)</span>
                ) : null}
              </Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => set("birth_date", e.target.value)}
                className={errors.birth_date ? "border-destructive" : ""}
              />
              {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date}</p>}
            </div>

            <div className="grid grid-cols-[7.5rem_1fr] gap-3">
              <div className="space-y-1.5">
                <Label>DDI</Label>
                <Select value={form.phone_ddi} onValueChange={(v) => set("phone_ddi", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_DDI_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
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

            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium">Endereço *</p>
              <div className="space-y-1.5">
                <Label>CEP *</Label>
                <Input
                  value={form.address_zip}
                  onChange={(e) => set("address_zip", maskCEP(e.target.value))}
                  onBlur={() => void onCepBlur()}
                  placeholder="00000-000"
                  className={errors.address_zip ? "border-destructive" : ""}
                />
                {cepLoading ? (
                  <p className="text-xs text-muted-foreground">Buscando CEP…</p>
                ) : null}
                {errors.address_zip && (
                  <p className="text-xs text-destructive">{errors.address_zip}</p>
                )}
              </div>
              <div className="space-y-1.5">
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
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label>Complemento</Label>
                  <Input
                    value={form.address_complement}
                    onChange={(e) => set("address_complement", e.target.value)}
                  />
                </div>
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
              <div className="grid grid-cols-2 gap-3">
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
                    placeholder="MG"
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
