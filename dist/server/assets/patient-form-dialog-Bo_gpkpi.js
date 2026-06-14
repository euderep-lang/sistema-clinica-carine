import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { u as useAuth, o as Dialog, p as DialogContent, q as DialogHeader, r as DialogTitle, L as Label, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, T as Textarea, s as DialogFooter, B as Button } from "./router-CL5eFCiw.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { d as ageFromBirthDate, m as maskCPF, b as maskPhone, e as maskCEP, f as fetchCEP, c as isValidCPF } from "./patient-utils-YNqCHR6o.js";
const empty = {
  full_name: "",
  cpf: "",
  rg: "",
  birth_date: "",
  gender: "",
  how_did_you_find_us: "",
  phone: "",
  email: "",
  address_zip: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  blood_type: "",
  health_insurance: "",
  health_insurance_number: "",
  allergies: "",
  notes: "",
  emergency_contact_name: "",
  emergency_contact_phone: ""
};
function PatientFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ ...empty, ...initial ?? {} });
      setErrors({});
    }
  }, [open, initial]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const age = ageFromBirthDate(form.birth_date);
  const onCepBlur = async () => {
    if (form.address_zip.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const r = await fetchCEP(form.address_zip);
    setCepLoading(false);
    if (r) setForm((f) => ({ ...f, ...r }));
  };
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Obrigatório";
    if (form.cpf && !isValidCPF(form.cpf)) e.cpf = "CPF inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !profile) return;
    setSaving(true);
    const payload = {
      ...form,
      tenant_id: profile.tenant_id,
      birth_date: form.birth_date || null,
      cpf: form.cpf || null,
      email: form.email || null,
      phone: form.phone || null
    };
    delete payload.id;
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
    onSaved?.(res.data.id);
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-3xl max-h-[90vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: initial?.id ? "Editar paciente" : "Novo paciente" }),
      initial?.id && "record_number" in initial && initial.record_number != null && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "Nº prontuário: ",
        /* @__PURE__ */ jsx("span", { className: "font-mono font-medium", children: initial.record_number })
      ] }),
      !initial?.id && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "O número de prontuário será gerado automaticamente na ordem de cadastro." })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Dados Pessoais" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Nome completo *" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: form.full_name,
                onChange: (e) => set("full_name", e.target.value),
                className: errors.full_name ? "border-destructive" : ""
              }
            ),
            errors.full_name && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive mt-1", children: errors.full_name })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "CPF" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: form.cpf,
                onChange: (e) => set("cpf", maskCPF(e.target.value)),
                placeholder: "000.000.000-00",
                className: errors.cpf ? "border-destructive" : ""
              }
            ),
            errors.cpf && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive mt-1", children: errors.cpf })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "RG" }),
            /* @__PURE__ */ jsx(Input, { value: form.rg, onChange: (e) => set("rg", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(Label, { children: [
              "Data de nascimento ",
              age !== null && /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground text-xs", children: [
                "(",
                age,
                " anos)"
              ] })
            ] }),
            /* @__PURE__ */ jsx(Input, { type: "date", value: form.birth_date, onChange: (e) => set("birth_date", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Sexo" }),
            /* @__PURE__ */ jsxs(Select, { value: form.gender, onValueChange: (v) => set("gender", v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "Masculino", children: "Masculino" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Feminino", children: "Feminino" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Outro", children: "Outro" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Como nos conheceu" }),
            /* @__PURE__ */ jsxs(Select, { value: form.how_did_you_find_us, onValueChange: (v) => set("how_did_you_find_us", v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "Facebook", children: "Facebook" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Instagram", children: "Instagram" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Indicacao", children: "Indicacao" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Google", children: "Google" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "Outros", children: "Outros" })
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Contato" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Telefone / WhatsApp" }),
            /* @__PURE__ */ jsx(Input, { value: form.phone, onChange: (e) => set("phone", maskPhone(e.target.value)), placeholder: "(00) 00000-0000" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "E-mail" }),
            /* @__PURE__ */ jsx(Input, { type: "email", value: form.email, onChange: (e) => set("email", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(Label, { children: [
              "CEP ",
              cepLoading && /* @__PURE__ */ jsx(Loader2, { className: "inline h-3 w-3 animate-spin" })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: form.address_zip,
                onChange: (e) => set("address_zip", maskCEP(e.target.value)),
                onBlur: onCepBlur,
                placeholder: "00000-000"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 grid grid-cols-3 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
              /* @__PURE__ */ jsx(Label, { children: "Logradouro" }),
              /* @__PURE__ */ jsx(Input, { value: form.address_street, onChange: (e) => set("address_street", e.target.value) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { children: "Número" }),
              /* @__PURE__ */ jsx(Input, { value: form.address_number, onChange: (e) => set("address_number", e.target.value) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Complemento" }),
            /* @__PURE__ */ jsx(Input, { value: form.address_complement, onChange: (e) => set("address_complement", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Bairro" }),
            /* @__PURE__ */ jsx(Input, { value: form.address_neighborhood, onChange: (e) => set("address_neighborhood", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Cidade" }),
            /* @__PURE__ */ jsx(Input, { value: form.address_city, onChange: (e) => set("address_city", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Estado" }),
            /* @__PURE__ */ jsx(Input, { value: form.address_state, onChange: (e) => set("address_state", e.target.value.toUpperCase().slice(0, 2)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Saúde" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Tipo sanguíneo" }),
            /* @__PURE__ */ jsxs(Select, { value: form.blood_type, onValueChange: (v) => set("blood_type", v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
              /* @__PURE__ */ jsx(SelectContent, { children: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => /* @__PURE__ */ jsx(SelectItem, { value: b, children: b }, b)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Convênio" }),
            /* @__PURE__ */ jsx(Input, { value: form.health_insurance, onChange: (e) => set("health_insurance", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Número da carteirinha" }),
            /* @__PURE__ */ jsx(Input, { value: form.health_insurance_number, onChange: (e) => set("health_insurance_number", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Alergias" }),
            /* @__PURE__ */ jsx(Textarea, { value: form.allergies, onChange: (e) => set("allergies", e.target.value), rows: 2 })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Observações gerais" }),
            /* @__PURE__ */ jsx(Textarea, { value: form.notes, onChange: (e) => set("notes", e.target.value), rows: 3 })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Contato de Emergência" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Nome" }),
            /* @__PURE__ */ jsx(Input, { value: form.emergency_contact_name, onChange: (e) => set("emergency_contact_name", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Telefone" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: form.emergency_contact_phone,
                onChange: (e) => set("emergency_contact_phone", maskPhone(e.target.value)),
                placeholder: "(00) 00000-0000"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: saving, children: [
          saving && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
          "Salvar"
        ] })
      ] })
    ] })
  ] }) });
}
export {
  PatientFormDialog as P
};
