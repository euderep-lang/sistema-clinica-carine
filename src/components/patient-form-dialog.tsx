import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { maskCPF, maskPhoneByDdi, phonePlaceholderByDdi, maskCEP, isValidCPF, ageFromBirthDate, fetchCEP, DEFAULT_PHONE_DDI, PHONE_DDI_OPTIONS, sanitizeDdi } from "@/lib/patient-utils";

export interface PatientFormData {
  id?: string;
  record_number?: number | null;
  full_name: string;
  cpf: string;
  rg: string;
  birth_date: string;
  gender: string;
  how_did_you_find_us: string;
  phone_ddi: string;
  phone: string;
  email: string;
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  blood_type: string;
  health_insurance: string;
  health_insurance_number: string;
  allergies: string;
  notes: string;
  emergency_contact_name: string;
  emergency_contact_phone_ddi: string;
  emergency_contact_phone: string;
}

const empty: PatientFormData = {
  full_name: "", cpf: "", rg: "", birth_date: "", gender: "", how_did_you_find_us: "",
  phone_ddi: DEFAULT_PHONE_DDI, phone: "", email: "",
  address_zip: "", address_street: "", address_number: "", address_complement: "",
  address_neighborhood: "", address_city: "", address_state: "",
  blood_type: "", health_insurance: "", health_insurance_number: "",
  allergies: "", notes: "",
  emergency_contact_name: "", emergency_contact_phone_ddi: DEFAULT_PHONE_DDI, emergency_contact_phone: "",
};

export function PatientFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<PatientFormData> | null;
  onSaved?: (id: string) => void;
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState<PatientFormData>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const base = { ...empty, ...(initial ?? {}) } as PatientFormData;
      base.phone_ddi = sanitizeDdi(base.phone_ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
      base.emergency_contact_phone_ddi =
        sanitizeDdi(base.emergency_contact_phone_ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
      base.phone = maskPhoneByDdi(base.phone, base.phone_ddi);
      base.emergency_contact_phone = maskPhoneByDdi(
        base.emergency_contact_phone,
        base.emergency_contact_phone_ddi,
      );
      setForm(base);
      setErrors({});
    }
  }, [open, initial]);

  const set = (k: keyof PatientFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const setPhoneDdi = (ddi: string) => {
    setForm((f) => ({
      ...f,
      phone_ddi: ddi,
      phone: maskPhoneByDdi(f.phone, ddi),
    }));
  };

  const setEmergencyPhoneDdi = (ddi: string) => {
    setForm((f) => ({
      ...f,
      emergency_contact_phone_ddi: ddi,
      emergency_contact_phone: maskPhoneByDdi(f.emergency_contact_phone, ddi),
    }));
  };
  const age = ageFromBirthDate(form.birth_date);

  const onCepBlur = async () => {
    if (form.address_zip.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await fetchCEP(form.address_zip);
    setCepLoading(false);
    if (r) setForm((f) => ({ ...f, ...r }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Obrigatório";
    if (form.cpf && !isValidCPF(form.cpf)) e.cpf = "CPF inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !profile) return;
    setSaving(true);
    const payload = {
      ...form,
      tenant_id: profile.tenant_id,
      birth_date: form.birth_date || null,
      cpf: form.cpf || null,
      email: form.email || null,
      phone: form.phone || null,
      phone_ddi: sanitizeDdi(form.phone_ddi) || DEFAULT_PHONE_DDI,
      emergency_contact_phone_ddi: sanitizeDdi(form.emergency_contact_phone_ddi) || DEFAULT_PHONE_DDI,
    };
    delete (payload as { id?: string }).id;
    let res;
    if (initial?.id) {
      res = await supabase.from("patients").update(payload).eq("id", initial.id).select("id").single();
    } else {
      res = await supabase.from("patients").insert(payload).select("id").single();
    }
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(initial?.id ? "Paciente atualizado" : "Paciente cadastrado");
    onOpenChange(false);
    onSaved?.(res.data!.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          {initial?.id && "record_number" in initial && initial.record_number != null && (
            <p className="text-sm text-muted-foreground">
              Nº prontuário: <span className="font-mono font-medium">{initial.record_number}</span>
            </p>
          )}
          {!initial?.id && (
            <p className="text-sm text-muted-foreground">
              O número de prontuário será gerado automaticamente na ordem de cadastro.
            </p>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)}
                  className={errors.full_name ? "border-destructive" : ""} />
                {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={errors.cpf ? "border-destructive" : ""} />
                {errors.cpf && <p className="text-xs text-destructive mt-1">{errors.cpf}</p>}
              </div>
              <div>
                <Label>RG</Label>
                <Input value={form.rg} onChange={(e) => set("rg", e.target.value)} />
              </div>
              <div>
                <Label>Data de nascimento {age !== null && <span className="text-muted-foreground text-xs">({age} anos)</span>}</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Como nos conheceu</Label>
                <Select value={form.how_did_you_find_us} onValueChange={(v) => set("how_did_you_find_us", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Indicacao">Indicacao</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-40">
                  <Label>DDI</Label>
                  <Select value={form.phone_ddi} onValueChange={setPhoneDdi}>
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
                <div className="flex-1">
                  <Label>Telefone / WhatsApp</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", maskPhoneByDdi(e.target.value, form.phone_ddi))}
                    placeholder={phonePlaceholderByDdi(form.phone_ddi)}
                  />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <Label>CEP {cepLoading && <Loader2 className="inline h-3 w-3 animate-spin" />}</Label>
                <Input value={form.address_zip} onChange={(e) => set("address_zip", maskCEP(e.target.value))}
                  onBlur={onCepBlur} placeholder="00000-000" />
              </div>
              <div className="md:col-span-2 grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.address_neighborhood} onChange={(e) => set("address_neighborhood", e.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.address_state} onChange={(e) => set("address_state", e.target.value.toUpperCase().slice(0, 2))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Saúde</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo sanguíneo</Label>
                <Select value={form.blood_type} onValueChange={(v) => set("blood_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Convênio</Label>
                <Input value={form.health_insurance} onChange={(e) => set("health_insurance", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Número da carteirinha</Label>
                <Input value={form.health_insurance_number} onChange={(e) => set("health_insurance_number", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Alergias</Label>
                <Textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} rows={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Observações gerais</Label>
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Contato de Emergência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-40">
                  <Label>DDI</Label>
                  <Select
                    value={form.emergency_contact_phone_ddi}
                    onValueChange={setEmergencyPhoneDdi}
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
                <div className="flex-1">
                  <Label>Telefone</Label>
                  <Input
                    value={form.emergency_contact_phone}
                    onChange={(e) =>
                      set(
                        "emergency_contact_phone",
                        maskPhoneByDdi(e.target.value, form.emergency_contact_phone_ddi),
                      )
                    }
                    placeholder={phonePlaceholderByDdi(form.emergency_contact_phone_ddi)}
                  />
                </div>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}