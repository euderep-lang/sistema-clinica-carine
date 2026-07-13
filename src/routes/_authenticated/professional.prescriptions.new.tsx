import { useEffect, useMemo, useState } from "react";
import { todayISO, fmtDate } from "@/lib/locale";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Trash2, Stethoscope, AlertTriangle, Shield, Copy, FileDown, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendPrescriptionViaCrm } from "@/lib/whatsapp.functions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  MEDICATIONS,
  TYPE_LABEL,
  type RxType,
} from "@/lib/medications";
import { maskCPF, ageFromBirthDate, formatPatientAddress } from "@/lib/patient-utils";
import { matchesSearch, normalizeSearch } from "@/lib/search";
import { loadLetterheadForPdf } from "@/lib/letterhead";
import { savePrescriptionToPatientHistory } from "@/lib/prescription-history";
import {
  computeSimpleSignatureAnchor,
  formatRxQuantityLabel,
  formatSignedProfessionalName,
  generatePrescriptionPDF,
  SIMPLE_RX_PAGE_H_MM,
  type RxData,
} from "@/lib/prescription-pdf";
import { formatClinicAddress, formatClinicAddressLines, getTenantSetting, type ClinicAddress } from "@/lib/settings-helpers";
import { blobToBase64, base64ToBlob } from "@/lib/blob-utils";
import {
  getDigitalCertificateStatus,
  getSafeIdSignatureAuthStatus,
  signPrescriptionPdf,
  type DigitalCertificateStatus,
} from "@/lib/digital-certificate.functions";
import { SafeIdSignatureAuthDialog } from "@/components/professional/safe-id-signature-auth-dialog";
import { isSafeIdSessionExpiredMessage } from "@/lib/safeid-auth";

export const Route = createFileRoute("/_authenticated/professional/prescriptions/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    patient_id: typeof s.patient_id === "string" ? s.patient_id : undefined,
    duplicate: typeof s.duplicate === "string" ? s.duplicate : undefined,
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  component: NewPrescription,
});

interface ItemForm {
  medication: string;
  concentration: string;
  pharmaceutical_form: string;
  quantity: string;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyItem = (): ItemForm => ({
  medication: "",
  concentration: "",
  pharmaceutical_form: "",
  quantity: "",
  doseValue: "",
  doseUnit: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
});

interface PatientLite {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}
interface TenantInfo { id: string; name: string; address: string | null; phone: string | null; email: string | null; cnpj: string | null; }

function TypeCard({ active, onClick, icon: Icon, title, sub, color, bg }: {
  active: boolean; onClick: () => void; icon: typeof Stethoscope; title: string; sub?: string;
  color: string; bg: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 text-left rounded-lg border-2 p-3 transition ${active ? color : "border-border bg-card"} ${active ? bg : ""}`}>
      <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" />{title}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </button>
  );
}

function MedAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const trimmed = value.trim();
  const matches = MEDICATIONS.filter((m) => matchesSearch(m, trimmed)).slice(0, 12);
  const hasExactMatch = normalizeSearch(value) !== "" && MEDICATIONS.some(
    (m) => normalizeSearch(m) === normalizeSearch(value),
  );
  const showCustomOption = trimmed.length > 0 && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") setOpen(false);
          }}
          placeholder="Buscar ou digitar medicamento"
        />
      </PopoverAnchor>
      <PopoverContent className="w-80 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList>
            {matches.length === 0 && !showCustomOption && (
              <CommandEmpty>Digite o nome do medicamento</CommandEmpty>
            )}
            <CommandGroup>
              {matches.map((m) => (
                <CommandItem
                  key={m}
                  value={m}
                  onSelect={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                >
                  {m}
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  value={`custom-${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setOpen(false);
                  }}
                >
                  Usar &quot;{trimmed}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function mapDbItemsToForm(
  srcItems: Array<{
    medication: string;
    concentration: string | null;
    pharmaceutical_form: string | null;
    quantity: string | null;
    dosage: string | null;
    route: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
  }>,
): ItemForm[] {
  return srcItems.map((it) => {
    const [dv, ...du] = (it.dosage ?? "").split(" ");
    return {
      medication: it.medication,
      concentration: it.concentration ?? "",
      pharmaceutical_form: it.pharmaceutical_form ?? "",
      quantity: it.quantity ?? "",
      doseValue: dv ?? "",
      doseUnit: du.join(" ") || "",
      route: it.route ?? "",
      frequency: it.frequency ?? "",
      duration: it.duration ?? "",
      instructions: it.instructions ?? "",
    };
  });
}

function NewPrescription() {
  const navigate = useNavigate();
  const { profile, tenant } = useAuth();
  const search = useSearch({ from: Route.id });

  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [clinicAddress, setClinicAddress] = useState<ClinicAddress | null>(null);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [patientId, setPatientId] = useState<string>(search.patient_id ?? "");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [date, setDate] = useState<string>(todayISO());
  const [type, setType] = useState<RxType>("simples");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(search.edit));
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [doneDialog, setDoneDialog] = useState<{
    blob: Blob;
    url: string;
    path: string;
    signed: boolean;
    prescriptionId: string;
  } | null>(null);
  const [sendingWhats, setSendingWhats] = useState(false);
  const sendPrescriptionFn = useServerFn(sendPrescriptionViaCrm);
  const [safeIdDialogOpen, setSafeIdDialogOpen] = useState(false);
  const [safeIdRenewal, setSafeIdRenewal] = useState(false);
  const [certStatus, setCertStatus] = useState<DigitalCertificateStatus | null>(null);
  const fetchCertStatus = useServerFn(getDigitalCertificateStatus);
  const fetchSafeIdAuthStatus = useServerFn(getSafeIdSignatureAuthStatus);
  const signPdf = useServerFn(signPrescriptionPdf);

  // Load tenant info, patients, optional duplicate
  useEffect(() => {
    (async () => {
      if (tenant?.id) {
        const [{ data }, addr] = await Promise.all([
          supabase.from("tenants").select("id, name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle(),
          getTenantSetting<ClinicAddress>(tenant.id, "address"),
        ]);
        if (data) setTenantInfo(data as TenantInfo);
        setClinicAddress(addr);
      }
      if (profile) {
        const { data: pts } = await supabase
          .from("patients")
          .select(
            "id, full_name, cpf, birth_date, phone, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip",
          )
          .eq("tenant_id", profile.tenant_id)
          .eq("active", true)
          .order("full_name");
        setPatients((pts ?? []) as PatientLite[]);
      }

      if (search.edit && profile) {
        setLoadingDraft(true);
        const { data: src } = await supabase
          .from("prescriptions" as never)
          .select("*")
          .eq("id", search.edit)
          .eq("professional_id", profile.id)
          .eq("status", "draft")
          .maybeSingle() as never;
        if (!src) {
          toast.error("Rascunho não encontrado ou já finalizado");
          navigate({ to: "/professional/prescriptions" });
          return;
        }
        const s = src as { id: string; patient_id: string; date: string; type: RxType; notes: string | null };
        const { data: srcItems } = await supabase
          .from("prescription_items" as never)
          .select("*")
          .eq("prescription_id", s.id)
          .order("position") as never;
        setDraftId(s.id);
        setPatientId(s.patient_id);
        setDate(s.date);
        setType(s.type);
        setNotes(s.notes ?? "");
        if (srcItems && (srcItems as unknown[]).length) {
          setItems(mapDbItemsToForm(srcItems as Parameters<typeof mapDbItemsToForm>[0]));
        }
        setLoadingDraft(false);
      } else if (search.duplicate && profile) {
        const { data: src } = await supabase
          .from("prescriptions" as never)
          .select("*")
          .eq("id", search.duplicate)
          .eq("professional_id", profile.id)
          .maybeSingle() as never;
        const { data: srcItems } = await supabase.from("prescription_items" as never).select("*").eq("prescription_id", search.duplicate).order("position") as never;
        if (src) {
          const s = src as { patient_id: string; type: RxType; notes: string | null };
          setPatientId(s.patient_id);
          setType(s.type);
          setNotes(s.notes ?? "");
        }
        if (srcItems && (srcItems as unknown[]).length) {
          setItems(mapDbItemsToForm(srcItems as Parameters<typeof mapDbItemsToForm>[0]));
        }
      }
    })();
  }, [tenant?.id, search.duplicate, search.edit, profile?.id, navigate]);

  useEffect(() => {
    if (!profile || profile.role !== "professional") return;
    fetchCertStatus()
      .then(setCertStatus)
      .catch(() => setCertStatus(null));
  }, [profile?.id, profile?.role]);

  const patient = patients.find((p) => p.id === patientId) ?? null;

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim();
    if (!q) return patients.slice(0, 30);
    const digits = q.replace(/\D/g, "");
    return patients
      .filter((p) => {
        if (matchesSearch(p.full_name, q)) return true;
        if (digits && (p.cpf ?? "").replace(/\D/g, "").includes(digits)) return true;
        if (digits && (p.phone ?? "").replace(/\D/g, "").includes(digits)) return true;
        return false;
      })
      .slice(0, 30);
  }, [patients, patientSearch]);

  const updateItem = (i: number, patch: Partial<ItemForm>) =>
    setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, emptyItem()]);

  const clinicAddrLines = formatClinicAddressLines(clinicAddress);
  const clinicAddressFormatted =
    formatClinicAddress(clinicAddress) ?? tenantInfo?.address ?? null;

  const buildRxData = (): RxData => ({
    type, date, notes,
    clinic: {
      name: tenantInfo?.name ?? tenant?.name ?? "Clínica",
      address: clinicAddressFormatted,
      address_line1: clinicAddrLines.line1 ?? (tenantInfo?.address && !clinicAddrLines.line2 ? tenantInfo.address : null),
      address_line2: clinicAddrLines.line2,
      phone: tenantInfo?.phone ?? null,
      email: tenantInfo?.email ?? null,
      cnpj: tenantInfo?.cnpj ?? null,
    },
    patient: {
      full_name: patient?.full_name ?? "—",
      cpf: patient?.cpf ?? null,
      birth_date: patient?.birth_date ?? null,
      address: patient ? formatPatientAddress(patient) || null : null,
    },
    professional: {
      full_name: profile?.display_name?.trim() || profile?.full_name || "",
      crm: profile?.crm ?? null,
      specialty: profile?.specialty ?? null,
      profession: profile?.profession ?? null,
      cpf: profile?.cpf ?? null,
    },
    items: items.map((it, idx) => ({
      position: idx + 1,
      medication: it.medication,
      concentration: it.concentration || null,
      pharmaceutical_form: it.pharmaceutical_form || null,
      quantity: it.quantity.trim() || null,
      dosage: [it.doseValue, it.doseUnit].filter(Boolean).join(" ").trim() || null,
      route: it.route || null,
      frequency: it.frequency || null,
      duration: it.duration || null,
      instructions: it.instructions || null,
    })),
  });

  const validate = (): string | null => {
    if (!patientId) return "Selecione o paciente";
    if (items.length === 0 || !items.some((i) => i.medication.trim())) return "Adicione ao menos um medicamento";
    return null;
  };

  const canSignWithCert =
    certStatus?.configured &&
    (certStatus.signingMode === "safeid_cloud" || !certStatus.isExpired);

  const finalizeLabel = canSignWithCert ? "Assinar e finalizar" : "Finalizar e gerar documento";

  const openSafeIdAuthDialog = (renewal: boolean) => {
    setSafeIdRenewal(renewal);
    setSafeIdDialogOpen(true);
  };

  const onFinalizeClick = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (certStatus?.configured && certStatus.signingMode === "safeid_cloud") {
      void (async () => {
        try {
          const status = await fetchSafeIdAuthStatus({ data: { origin: window.location.origin } });
          if (status.ready) {
            void save(true, { sign: true });
            return;
          }
          openSafeIdAuthDialog(Boolean(status.sessionExpired));
        } catch {
          openSafeIdAuthDialog(false);
        }
      })();
      return;
    }
    void save(true, { sign: canSignWithCert });
  };

  const onDownloadPdfClick = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    void save(true, { sign: false });
  };

  const save = async (finalize: boolean, options?: { sign?: boolean }) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!profile || !tenant) return;
    setSaving(true);
    try {
      const shouldSign =
        finalize && (options?.sign !== undefined ? options.sign : canSignWithCert);
      const data = buildRxData();
      const itemsInsert = data.items.filter((i) => i.medication.trim()).map((i) => ({
        position: i.position,
        medication: i.medication,
        concentration: i.concentration,
        pharmaceutical_form: i.pharmaceutical_form,
        quantity: i.quantity,
        dosage: i.dosage,
        route: i.route,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
      }));

      let rxId = draftId;

      if (draftId) {
        const { error: rxErr } = await supabase
          .from("prescriptions" as never)
          .update({
            patient_id: patientId,
            date,
            type,
            status: finalize ? "finalized" : "draft",
            notes: notes || null,
          } as never)
          .eq("id", draftId)
          .eq("professional_id", profile.id)
          .eq("status", "draft") as never;
        if (rxErr) throw new Error(rxErr.message);

        const { error: delErr } = await supabase
          .from("prescription_items" as never)
          .delete()
          .eq("prescription_id", draftId) as never;
        if (delErr) throw new Error(delErr.message);
      } else {
        const { data: rxIns, error: rxErr } = await supabase.from("prescriptions" as never).insert({
          tenant_id: tenant.id, patient_id: patientId, professional_id: profile.id,
          date, type, status: finalize ? "finalized" : "draft", notes: notes || null,
        } as never).select("id").single() as never;
        if (rxErr || !rxIns) throw new Error((rxErr as { message: string } | null)?.message ?? "Erro ao salvar");
        rxId = (rxIns as { id: string }).id;
      }

      if (!rxId) throw new Error("Erro ao salvar receita");

      if (itemsInsert.length) {
        const { error: itErr } = await supabase.from("prescription_items" as never).insert(
          itemsInsert.map((i) => ({ ...i, prescription_id: rxId })) as never,
        );
        if (itErr) throw new Error(itErr.message);
      }

      if (finalize) {
        const letterhead = await loadLetterheadForPdf(profile.id);
        let blob = await generatePrescriptionPDF({
          ...data,
          letterhead,
          digitalSignature: shouldSign,
        });
        let signed = false;
        let signedAt: string | null = null;
        let signatureCn: string | null = null;

        if (shouldSign) {
          const bottomMarginMm = letterhead?.margins.bottom ?? (type === "simples" ? 14 : 25);
          const signatureLineMmFromTop =
            type === "simples"
              ? computeSimpleSignatureAnchor(SIMPLE_RX_PAGE_H_MM, bottomMarginMm, true).signatureLineY
              : undefined;
          const signedResult = await signPdf({
            data: {
              pdfBase64: await blobToBase64(blob),
              reason: `Receita médica — ${TYPE_LABEL[type]}`,
              location: data.clinic.name,
              bottomMarginMm,
              signatureLineMmFromTop,
              referencePageHeightMm: type === "simples" ? SIMPLE_RX_PAGE_H_MM : undefined,
            },
          });
          blob = base64ToBlob(signedResult.pdfBase64);
          signed = true;
          signedAt = signedResult.signedAt;
          signatureCn = signedResult.signatureCn;
        } else if (certStatus?.configured && certStatus.signingMode === "a1_file" && certStatus.isExpired) {
          throw new Error("Certificado SafeID expirado. Atualize em Minhas configurações → Certificado digital.");
        }

        const path = `${tenant.id}/${rxId}.pdf`;
        const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, blob, { contentType: "application/pdf", upsert: true });
        if (upErr) throw new Error(upErr.message);
        await supabase.from("prescriptions" as never).update({
          pdf_url: path,
          signed_at: signedAt,
          signature_cn: signatureCn,
        } as never).eq("id", rxId);

        const medNames = data.items
          .filter((i) => i.medication.trim())
          .map((i) => (i.concentration ? `${i.medication} ${i.concentration}` : i.medication));
        await savePrescriptionToPatientHistory({
          tenantId: tenant.id,
          patientId,
          professionalId: profile.id,
          prescriptionId: rxId,
          type,
          date,
          medications: medNames,
          pdfBlob: blob,
        });

        const url = URL.createObjectURL(blob);
        setDoneDialog({ blob, url, path, signed, prescriptionId: rxId });
        toast.success(
          signed
            ? "Receita assinada digitalmente e salva no histórico do paciente"
            : shouldSign
              ? "Receita finalizada e salva no histórico do paciente"
              : "PDF gerado sem assinatura digital e salvo no histórico do paciente",
        );
      } else {
        toast.success(draftId ? "Rascunho atualizado" : "Rascunho salvo");
        navigate({ to: "/professional/prescriptions" });
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (certStatus?.signingMode === "safeid_cloud" && isSafeIdSessionExpiredMessage(msg)) {
        openSafeIdAuthDialog(true);
        return;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const sendWhats = async () => {
    if (!doneDialog?.prescriptionId) return;
    if (!doneDialog.signed) {
      toast.error("A receita precisa estar assinada digitalmente para envio pelo CRM");
      return;
    }
    if (!patient?.phone) {
      toast.error("Paciente sem telefone cadastrado");
      return;
    }

    setSendingWhats(true);
    try {
      const result = await sendPrescriptionFn({ data: { prescriptionId: doneDialog.prescriptionId } });
      toast.success("Receita enviada pelo CRM WhatsApp");
      if (result.conversationId) {
        navigate({ to: "/crm/inbox", search: { conversation: result.conversationId } });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingWhats(false);
    }
  };

  if (loadingDraft) {
    return (
      <DashboardShell title={draftId ? "Editar rascunho" : "Nova Receita"}>
        <div className="py-20 text-center text-muted-foreground">Carregando rascunho…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={draftId ? "Editar rascunho" : "Nova Receita"}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-24">
        {/* FORM */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
          </div>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">1. Cabeçalho</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Paciente</Label>
                  <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        {patient ? patient.full_name : "Selecionar paciente..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Buscar nome ou CPF..." value={patientSearch} onValueChange={setPatientSearch} />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente</CommandEmpty>
                          <CommandGroup>
                            {filteredPatients.map((p) => (
                              <CommandItem key={p.id} value={p.id} onSelect={() => { setPatientId(p.id); setPatientOpen(false); }}>
                                <div>
                                  <div className="font-medium">{p.full_name}</div>
                                  {p.cpf && <div className="text-xs text-muted-foreground">{maskCPF(p.cpf)}</div>}
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
                  <Label>Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Tipo de Receita</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <TypeCard active={type === "simples"} onClick={() => setType("simples")}
                    icon={Stethoscope} title="Receita Simples" color="border-blue-500" bg="bg-blue-50" />
                  <TypeCard active={type === "controlada"} onClick={() => setType("controlada")}
                    icon={AlertTriangle} title="Receita de Controle Especial" sub="(Receita Amarela — 2 vias)" color="border-orange-500" bg="bg-amber-50" />
                  <TypeCard active={type === "especial"} onClick={() => setType("especial")}
                    icon={Shield} title="Receita Especial" sub="(Receita Azul)" color="border-sky-500" bg="bg-sky-50" />
                  <TypeCard active={type === "especial_2vias"} onClick={() => setType("especial_2vias")}
                    icon={Copy} title="Receita Especial 2 Vias" sub="(Receita Azul — 2 vias)" color="border-sky-600" bg="bg-sky-50" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observações gerais</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">2. Medicamentos</h2>
              {items.map((it, i) => (
                <div key={i} className="rounded-md border p-3 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-bold">{i + 1}</span>
                      <span className="text-sm font-medium">Medicamento</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <Label>Medicamento</Label>
                      <MedAutocomplete value={it.medication} onChange={(v) => updateItem(i, { medication: v })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Concentração</Label>
                      <Input value={it.concentration} placeholder="ex: 500mg" onChange={(e) => updateItem(i, { concentration: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Forma farmacêutica</Label>
                      <Input
                        value={it.pharmaceutical_form}
                        placeholder="ex: Comprimido"
                        onChange={(e) => updateItem(i, { pharmaceutical_form: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label>Quantidade a dispensar</Label>
                      <Input
                        value={it.quantity}
                        placeholder="ex: 30 comprimidos ou 1 caixa"
                        onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Dose</Label>
                      <div className="flex gap-2">
                        <Input
                          className="w-20"
                          value={it.doseValue}
                          placeholder="1"
                          onChange={(e) => updateItem(i, { doseValue: e.target.value })}
                        />
                        <Input
                          className="flex-1"
                          value={it.doseUnit}
                          placeholder="comprimido(s)"
                          onChange={(e) => updateItem(i, { doseUnit: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Via</Label>
                      <Input
                        value={it.route}
                        placeholder="ex: Oral"
                        onChange={(e) => updateItem(i, { route: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Frequência</Label>
                      <Input
                        value={it.frequency}
                        placeholder="ex: 1x ao dia"
                        onChange={(e) => updateItem(i, { frequency: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Duração</Label>
                      <Input value={it.duration} placeholder="ex: 7 dias" onChange={(e) => updateItem(i, { duration: e.target.value })} />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label>Instruções adicionais</Label>
                      <Input value={it.instructions} placeholder="ex: Tomar em jejum" onChange={(e) => updateItem(i, { instructions: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-2" />Adicionar Medicamento</Button>
            </CardContent>
          </Card>
        </div>

        {/* PREVIEW */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Pré-visualização</h3>
            <PreviewPanel data={buildRxData()} />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-background/95 backdrop-blur border-t z-30">
        <div className="flex justify-between items-center gap-2 px-4 py-3 max-w-screen-2xl mx-auto">
          <Button variant="ghost" onClick={() => setCancelOpen(true)}>Cancelar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>Salvar Rascunho</Button>
            {canSignWithCert && (
              <Button variant="outline" onClick={onDownloadPdfClick} disabled={saving}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            )}
            <Button onClick={onFinalizeClick} disabled={saving}>
              {finalizeLabel}
            </Button>
          </div>
        </div>
      </div>

      <SafeIdSignatureAuthDialog
        open={safeIdDialogOpen}
        onOpenChange={setSafeIdDialogOpen}
        renewal={safeIdRenewal}
        saving={saving}
        onAuthorized={() => void save(true, { sign: true })}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Descartar alterações?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Os dados não salvos serão perdidos.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Continuar editando</Button>
            <Button variant="destructive" onClick={() => navigate({ to: "/professional/prescriptions" })}>Descartar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!doneDialog} onOpenChange={(v) => { if (!v) { if (doneDialog) URL.revokeObjectURL(doneDialog.url); setDoneDialog(null); navigate({ to: "/professional/prescriptions" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receita gerada com sucesso</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {doneDialog?.signed
              ? certStatus?.signingMode === "safeid_cloud"
                ? "A receita foi assinada com seu certificado SafeID em nuvem e está pronta."
                : "A receita foi assinada digitalmente com seu certificado SafeID e está pronta."
              : "A receita foi finalizada e o documento está pronto."}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => doneDialog && window.open(doneDialog.url, "_blank")}><FileDown className="h-4 w-4 mr-2" />Baixar documento</Button>
            <Button onClick={() => void sendWhats()} disabled={sendingWhats || !doneDialog?.signed}>
              {sendingWhats ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar pelo CRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function PreviewPanel({ data }: { data: RxData }) {
  if (data.type === "simples") return <SimplePreviewPanel data={data} />;
  if (data.type === "controlada" || data.type === "especial_2vias") {
    return <SpecialControlPreview data={data} />;
  }
  return <StandardPreviewPanel data={data} />;
}

function SpecialControlPreview({ data }: { data: RxData }) {
  const border =
    data.type === "controlada" ? "border-orange-500/50" : "border-sky-600/40";
  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] text-muted-foreground">
        Pré-visualização da 1ª via · PDF com 2 páginas A4
      </p>
      <Card className={`overflow-hidden border-2 ${border}`}>
        <CardContent className="flex min-h-[520px] flex-col bg-white p-5 text-[10px] text-black">
          <p className="text-center text-sm font-bold">RECEITUÁRIO CONTROLE ESPECIAL</p>
          <p className="mt-1 text-right text-[8px] leading-tight text-muted-foreground">
            1ª VIA - RETENÇÃO DA FARMÁCIA
          </p>

          <div className="mt-3 w-[52%] rounded border border-black px-3 py-2.5 text-center">
            <p className="text-[9px] font-bold">IDENTIFICAÇÃO DO EMITENTE</p>
            <p className="mt-1.5 text-[13px] font-bold leading-tight">{data.professional.full_name}</p>
            {data.professional.profession && <p className="mt-1 text-[11px] font-bold">{data.professional.profession}</p>}
            {data.professional.crm && <p className="text-[11px] font-bold">{data.professional.crm}</p>}
            {data.clinic.address_line1 && <p className="text-[10px] font-bold">{data.clinic.address_line1}</p>}
            {data.clinic.address_line2 && <p className="text-[10px] font-bold">{data.clinic.address_line2}</p>}
            {data.clinic.phone && <p className="text-[10px] font-bold">Tel: {data.clinic.phone}</p>}
          </div>

          <div className="mt-4 space-y-2">
            <p className="border-b border-black/30 pb-0.5 text-[11px]">
              <span className="font-medium">Paciente:</span> {data.patient.full_name}
            </p>
            <p className="border-b border-black/30 pb-0.5 text-[11px]">
              <span className="font-medium">Endereço:</span> {data.patient.address || ""}
            </p>
          </div>

          <div className="mt-3 flex-1">
            <p className="mb-4 font-medium">Prescrição:</p>
            {data.items
              .filter((i) => i.medication.trim())
              .map((i) => (
                <div key={i.position} className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span>
                      {i.position}.{" "}
                      <span className="font-bold">
                        {i.medication.toUpperCase()}
                        {i.concentration ? ` ${i.concentration}` : ""}
                      </span>
                    </span>
                    <span className="min-w-3 flex-1 border-b border-dotted border-black/40" />
                    <span className="text-[9px]">{formatRxQuantityLabel(i.quantity)}</span>
                  </div>
                  {(i.dosage || i.route || i.frequency || i.duration) && (
                    <p className="pl-3 italic">
                      Tomar{" "}
                      {[i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null]
                        .filter(Boolean)
                        .join(", ")}
                      .
                    </p>
                  )}
                  {i.instructions && <p className="pl-3 italic">{i.instructions}</p>}
                </div>
              ))}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <div className="flex items-end justify-between gap-4">
              <span className="text-[11px]">DATA: {fmtDate(data.date)}</span>
              <div className="flex-1 text-center">
                <div className="border-b border-black/50" />
                <p className="mt-1 text-[8px]">Assinatura e Carimbo do Emitente</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-black p-2 text-[7px]">
                <p className="mb-2 text-center font-bold">IDENTIFICAÇÃO DO COMPRADOR</p>
                <p>Nome: _____________________________________________</p>
                <p>Ident.: ___________________ Org. Emissor: _____________</p>
                <p>End.: _______________________________________________</p>
                <p>Cidade: __________________________ UF: ____</p>
                <p>Telefone: ___________________________________________</p>
              </div>
              <div className="flex flex-col rounded border border-black p-2 text-[7px]">
                <p className="text-center font-bold">IDENTIFICAÇÃO DO FORNECEDOR</p>
                <p className="mt-auto text-center">ASSINATURA DO FARMACÊUTICO DATA: ___/___/___</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SimplePreviewPanel({ data }: { data: RxData }) {
  const age = ageFromBirthDate(data.patient.birth_date ?? null);
  return (
    <Card className="overflow-hidden border-2 border-[#C5B358]/40">
      <CardContent className="relative min-h-[420px] space-y-4 bg-white p-6 text-black">
        <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center opacity-[0.06]">
          <div className="size-40 rounded-full border-[3px] border-[#C5B358] font-serif text-7xl leading-[10rem] text-[#C5B358]">
            C
          </div>
        </div>

        <div className="relative text-center">
          <p className="font-serif text-lg font-bold tracking-wide text-[#C5B358]">
            {data.professional.full_name.toUpperCase()}
          </p>
          {(data.professional.profession || data.professional.crm) && (
            <p className="mt-1 text-[9px] uppercase tracking-widest text-[#C5B358]/90">
              {[data.professional.profession, data.professional.crm].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="relative text-center">
          <p className="text-sm font-bold underline decoration-1 underline-offset-4">RECEITUÁRIO</p>
        </div>

        <div className="relative space-y-1 text-[11px]">
          <p className="text-[10px] font-bold uppercase tracking-wide">Dados do paciente</p>
          <p className="text-sm font-medium">{data.patient.full_name}</p>
          <p className="text-[10px] text-muted-foreground">
            {[
              data.patient.cpf ? `CPF: ${maskCPF(data.patient.cpf)}` : null,
              age !== null ? `Idade: ${age} anos` : null,
              `Data: ${fmtDate(data.date)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="relative space-y-4 text-[11px]">
          {data.items
            .filter((i) => i.medication.trim())
            .map((i) => (
              <div key={i.position}>
                <div className="flex items-baseline gap-1">
                  <span className="shrink-0">
                    {i.position}.{" "}
                    <span className="font-bold">
                      {i.medication.toUpperCase()}
                      {i.concentration ? ` ${i.concentration}` : ""}
                    </span>
                  </span>
                  <span className="min-w-4 flex-1 border-b border-dotted border-black/40" />
                  <span className="shrink-0 text-right text-[10px] font-normal">
                    {formatRxQuantityLabel(i.quantity)}
                  </span>
                </div>
                {(i.dosage || i.route || i.frequency || i.duration) && (
                  <p className="mt-1 pl-4 italic">
                    Tomar{" "}
                    {[i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null]
                      .filter(Boolean)
                      .join(", ")}
                    .
                  </p>
                )}
                {i.instructions && <p className="pl-4 italic">{i.instructions}</p>}
              </div>
            ))}
        </div>

        {data.notes && <p className="relative text-[11px] italic">{data.notes}</p>}

        <div className="relative mt-8 space-y-1 text-center text-[11px]">
          <div className="mx-auto w-3/5 border-t border-black" />
          <p>{formatSignedProfessionalName(data.professional.full_name)}</p>
          {data.professional.crm && <p>{data.professional.crm}</p>}
          {data.professional.cpf && (
            <p>CPF: {maskCPF(data.professional.cpf)}</p>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="h-px bg-[#C5B358]" />
          <div className="h-3 bg-[#1A3021]" />
        </div>
      </CardContent>
    </Card>
  );
}

function StandardPreviewPanel({ data }: { data: RxData }) {
  const accent = data.type === "especial" ? "border-sky-500" : "border-orange-500";
  const age = ageFromBirthDate(data.patient.birth_date ?? null);
  return (
    <Card className={`border-2 ${accent}`}>
      <CardContent className="space-y-3 bg-white p-5 font-serif text-xs text-black">
        <div className="flex justify-between gap-2">
          <div>
            <div className="text-sm font-bold">{data.clinic.name}</div>
            {data.clinic.address && <div className="text-[10px]">{data.clinic.address}</div>}
            <div className="text-[10px]">{[data.clinic.phone, data.clinic.email].filter(Boolean).join(" · ")}</div>
            {data.clinic.cnpj && <div className="text-[10px]">CNPJ: {data.clinic.cnpj}</div>}
          </div>
        </div>
        <div className="border-y py-1 text-center font-bold uppercase tracking-wide">
          {TYPE_LABEL[data.type]}
        </div>
        <div className="flex justify-between text-[11px]">
          <span>
            Paciente: <strong>{data.patient.full_name}</strong>
          </span>
          <span>Data: {fmtDate(data.date)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>CPF: {data.patient.cpf ? maskCPF(data.patient.cpf) : "—"}</span>
          {age !== null && <span>Idade: {age} anos</span>}
        </div>
        <div className="space-y-3">
          {data.items
            .filter((i) => i.medication.trim())
            .map((i) => (
              <div key={i.position}>
                <div className="font-bold">
                  {i.position}. {i.medication.toUpperCase()}
                  {i.concentration ? ` ${i.concentration}` : ""}
                </div>
                {(i.pharmaceutical_form || i.quantity) && (
                  <div className="pl-3">
                    {i.quantity && /caixa/i.test(i.quantity)
                      ? i.quantity
                      : [i.pharmaceutical_form, i.quantity].filter(Boolean).join(" — ")}
                  </div>
                )}
                {(i.dosage || i.route || i.frequency || i.duration) && (
                  <div className="pl-3">
                    Tomar{" "}
                    {[i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null]
                      .filter(Boolean)
                      .join(", ")}
                    .
                  </div>
                )}
                {i.instructions && <div className="pl-3 italic">{i.instructions}</div>}
              </div>
            ))}
        </div>
        {data.notes && <div className="border-t pt-2 text-[11px] italic">Obs.: {data.notes}</div>}
        <div className="border-t pt-3 text-center">
          <div className="font-bold">{data.professional.full_name}</div>
          <div className="text-[10px]">
            {[data.professional.crm, data.professional.profession].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-3 text-[10px]">Assinatura: ______________________________</div>
        </div>
      </CardContent>
    </Card>
  );
}