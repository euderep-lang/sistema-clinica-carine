import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calendar as CalIcon, MessageCircle, Pencil, Upload, Download, Trash2, FileText, Eye, FileDown, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PatientFormDialog, type PatientFormData } from "@/components/patient-form-dialog";
import { pushRecentPatient } from "@/components/command-palette";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import { initials, avatarColor, maskCPF, maskPhone, ageFromBirthDate } from "@/lib/patient-utils";

const PATIENT_TABS = ["dados", "consultas", "prontuarios", "prescricoes", "documentos", "financeiro"] as const;
type PatientTab = (typeof PATIENT_TABS)[number];

export const Route = createFileRoute("/_authenticated/reception/pacientes/$id")({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = String(search.tab ?? "dados");
    return { tab: (PATIENT_TABS.includes(tab as PatientTab) ? tab : "dados") as PatientTab };
  },
  component: PatientProfile,
});

interface PatientFull extends PatientFormData {
  id: string;
  active: boolean;
}

interface AppointmentRow {
  id: string;
  date: string;
  start_time: string;
  status: string | null;
  type: string | null;
  professional_id: string | null;
  room_id: string | null;
}

interface DocFile { name: string; size: number; created_at: string; }

interface MedicalRecordRow {
  id: string;
  date: string;
  professional_id: string | null;
  chief_complaint: string | null;
  history: string | null;
  physical_exam: string | null;
  diagnosis: string | null;
  icd10_code: string | null;
  icd10_description: string | null;
  conduct: string | null;
  notes: string | null;
  profiles: { full_name: string; specialty: string | null } | null;
}

interface PrescriptionRow {
  id: string;
  date: string;
  type: string;
  status: string;
  pdf_url: string | null;
  professional_id: string | null;
  profiles: { full_name: string; specialty: string | null } | null;
  prescription_items: { medication: string; position: number }[];
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function PatientProfile() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<AppointmentRow[]>([]);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [records, setRecords] = useState<MedicalRecordRow[]>([]);
  const [recordOpen, setRecordOpen] = useState<MedicalRecordRow | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [filterProf, setFilterProf] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Paciente não encontrado");
      setLoading(false);
      return;
    }
    setPatient(data as PatientFull);
    pushRecentPatient({ id: data.id, full_name: data.full_name, cpf: data.cpf, phone: data.phone });

    const { data: aps } = await supabase
      .from("appointments")
      .select("id, date, start_time, status, type, professional_id, room_id")
      .eq("patient_id", id)
      .order("date", { ascending: false });
    setAppts((aps ?? []) as AppointmentRow[]);

    const { data: mrs } = await supabase
      .from("medical_records")
      .select("id, date, professional_id, chief_complaint, history, physical_exam, diagnosis, icd10_code, icd10_description, conduct, notes, profiles:professional_id(full_name, specialty)")
      .eq("patient_id", id)
      .order("date", { ascending: false });
    setRecords((mrs ?? []) as unknown as MedicalRecordRow[]);

    const { data: rxs } = await supabase
      .from("prescriptions" as never)
      .select("id, date, type, status, pdf_url, professional_id, profiles:professional_id(full_name, specialty), prescription_items(medication, position)")
      .eq("patient_id", id)
      .order("date", { ascending: false }) as never;
    setPrescriptions(((rxs ?? []) as unknown) as PrescriptionRow[]);

    const { data: files } = await supabase.storage.from("patient-documents").list(id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    setDocs(((files ?? []) as { name: string; metadata?: { size?: number }; created_at?: string }[])
      .filter((f) => f.name)
      .map((f) => ({ name: f.name, size: f.metadata?.size ?? 0, created_at: f.created_at ?? "" })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("patient-documents").upload(path, file);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento enviado");
    e.target.value = "";
    load();
  };

  const onDownload = async (name: string) => {
    const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(`${id}/${name}`, 60);
    if (error || !data) { toast.error("Erro ao baixar"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const onDelete = async (name: string) => {
    if (!confirm("Excluir este documento?")) return;
    const { error } = await supabase.storage.from("patient-documents").remove([`${id}/${name}`]);
    if (error) { toast.error(error.message); return; }
    toast.success("Documento excluído");
    load();
  };

  const openWhats = () => {
    if (!patient?.phone) { toast.error("Paciente sem telefone"); return; }
    const d = patient.phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${d}`, "_blank");
  };

  if (loading) return <DashboardShell title="Paciente"><div className="text-muted-foreground">Carregando...</div></DashboardShell>;
  if (!patient) return <DashboardShell title="Paciente"><div>Paciente não encontrado</div></DashboardShell>;

  const age = ageFromBirthDate(patient.birth_date);

  return (
    <DashboardShell title={patient.full_name}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start">
            <div className={`h-24 w-24 rounded-full grid place-items-center text-white text-2xl font-bold shrink-0 ${avatarColor(patient.full_name)}`}>
              {initials(patient.full_name)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{patient.full_name}</h1>
                {"record_number" in patient && patient.record_number != null && (
                  <Badge variant="outline" className="font-mono tabular-nums">
                    Prontuário {patient.record_number}
                  </Badge>
                )}
                {patient.health_insurance
                  ? <Badge variant="secondary">{patient.health_insurance}</Badge>
                  : <Badge variant="outline">Particular</Badge>}
                {!patient.active && <Badge variant="destructive">Inativo</Badge>}
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                {age !== null && <span>{age} anos</span>}
                {patient.cpf && <span>CPF: {maskCPF(patient.cpf)}</span>}
                {patient.phone && <span>{maskPhone(patient.phone)}</span>}
                {patient.email && <span>{patient.email}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/reception/agenda" })}>
                <CalIcon className="h-4 w-4 mr-2" /> Agendar
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              <Button onClick={openWhats}>
                <MessageCircle className="h-4 w-4 mr-2" /> Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate({ to: "/reception/pacientes/$id", params: { id }, search: { tab: value as PatientTab }, replace: true })
          }
        >
          <TabsList>
            <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="consultas">Consultas</TabsTrigger>
            <TabsTrigger value="prontuarios">Prontuários</TabsTrigger>
            <TabsTrigger value="prescricoes">Prescrições</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Informações</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome" value={patient.full_name} />
                <Field label="CPF" value={patient.cpf ? maskCPF(patient.cpf) : null} />
                <Field label="RG" value={patient.rg} />
                <Field label="Nascimento" value={patient.birth_date} />
                <Field label="Sexo" value={patient.gender} />
                <Field label="Como nos conheceu" value={patient.how_did_you_find_us} />
                <Field label="Telefone" value={patient.phone ? maskPhone(patient.phone) : null} />
                <Field label="E-mail" value={patient.email} />
                <Field label="Endereço" value={[patient.address_street, patient.address_number, patient.address_neighborhood, patient.address_city, patient.address_state].filter(Boolean).join(", ")} />
                <Field label="CEP" value={patient.address_zip} />
                <Field label="Tipo sanguíneo" value={patient.blood_type} />
                <Field label="Convênio" value={patient.health_insurance} />
                <Field label="Carteirinha" value={patient.health_insurance_number} />
                <Field label="Alergias" value={patient.allergies} />
                <Field label="Contato emergência" value={patient.emergency_contact_name} />
                <Field label="Telefone emergência" value={patient.emergency_contact_phone ? maskPhone(patient.emergency_contact_phone) : null} />
                <div className="md:col-span-2">
                  <Field label="Observações" value={patient.notes} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Histórico de consultas</CardTitle>
                <Button size="sm" onClick={() => navigate({ to: "/reception/agenda" })}>
                  <CalIcon className="h-4 w-4 mr-2" /> Novo Agendamento
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appts.length === 0
                      ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma consulta</TableCell></TableRow>
                      : appts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.date}</TableCell>
                          <TableCell>{a.start_time?.slice(0, 5)}</TableCell>
                          <TableCell>{APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline">{APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—"}</Badge></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prontuarios">
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Prontuários</CardTitle>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Select value={filterProf} onValueChange={setFilterProf}>
                    <SelectTrigger className="w-full md:w-60"><SelectValue placeholder="Profissional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos profissionais</SelectItem>
                      {Array.from(new Map(records.filter((r) => r.profiles).map((r) => [r.professional_id!, r.profiles!.full_name])).entries())
                        .map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="md:w-40" />
                  <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="md:w-40" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const filtered = records.filter((r) => {
                    if (filterProf !== "all" && r.professional_id !== filterProf) return false;
                    if (filterFrom && r.date < filterFrom) return false;
                    if (filterTo && r.date > filterTo) return false;
                    return true;
                  });
                  if (records.length === 0) {
                    return <div className="py-12 text-center text-muted-foreground">Nenhum prontuário registrado para este paciente</div>;
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Profissional</TableHead>
                          <TableHead>CID</TableHead>
                          <TableHead>Diagnóstico</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{new Date(r.date).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                            <TableCell>{r.icd10_code ? <Badge variant="secondary">{r.icd10_code}</Badge> : "—"}</TableCell>
                            <TableCell className="max-w-xs truncate">{r.diagnosis ?? r.chief_complaint ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => setRecordOpen(r)}>
                                <Eye className="h-4 w-4 mr-1" /> Ver detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescricoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Prescrições</CardTitle>
                <Button size="sm" onClick={() => navigate({ to: "/professional/prescriptions/new", search: { patient_id: id } as never })}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Receita
                </Button>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">Nenhuma receita emitida para este paciente</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Medicamentos</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((r) => {
                        const meds = [...r.prescription_items].sort((a, b) => a.position - b.position);
                        const list = meds.slice(0, 2).map((m) => m.medication).join(", ") + (meds.length > 2 ? "..." : "");
                        const tColor =
                          r.type === "controlada"
                            ? "bg-red-100 text-red-700"
                            : r.type === "especial_2vias"
                              ? "bg-sky-100 text-sky-800"
                              : r.type === "especial"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700";
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{new Date(r.date).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                            <TableCell><Badge className={`${tColor} hover:${tColor}`}>{r.type[0].toUpperCase() + r.type.slice(1)}</Badge></TableCell>
                            <TableCell className="text-sm">{list || "—"}</TableCell>
                            <TableCell>{r.status === "finalized" ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finalizada</Badge> : <Badge variant="secondary">Rascunho</Badge>}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" disabled={!r.pdf_url} onClick={async () => {
                                if (!r.pdf_url) return;
                                const { data } = await supabase.storage.from("prescriptions").createSignedUrl(r.pdf_url, 60);
                                if (data) window.open(data.signedUrl, "_blank");
                              }}><FileDown className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/professional/prescriptions/new", search: { duplicate: r.id } as never })}><Copy className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Documentos</CardTitle>
                <label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onUpload} />
                  <Button asChild size="sm"><span><Upload className="h-4 w-4 mr-2" /> Enviar arquivo</span></Button>
                </label>
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">Nenhum documento enviado</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {docs.map((d) => (
                      <Card key={d.name} className="p-3 flex items-start gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.name.replace(/^\d+_/, "")}</div>
                          <div className="text-xs text-muted-foreground">
                            {(d.size / 1024).toFixed(1)} KB
                            {d.created_at && ` · ${new Date(d.created_at).toLocaleDateString("pt-BR")}`}
                          </div>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" onClick={() => onDownload(d.name)}>
                              <Download className="h-3 w-3 mr-1" /> Baixar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => onDelete(d.name)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total gasto</CardTitle></CardHeader><CardContent className="text-2xl font-bold">R$ 0,00</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent className="text-2xl font-bold">R$ 0,00</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Última consulta paga</CardTitle></CardHeader><CardContent className="text-2xl font-bold">—</CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} initial={patient} onSaved={() => load()} />

      <Sheet open={!!recordOpen} onOpenChange={(v) => !v && setRecordOpen(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Prontuário · {recordOpen && new Date(recordOpen.date).toLocaleDateString("pt-BR")}</SheetTitle>
          </SheetHeader>
          {recordOpen && (
            <div className="mt-4 space-y-3 text-sm">
              <div><span className="text-muted-foreground">Profissional: </span>{recordOpen.profiles?.full_name ?? "—"}{recordOpen.profiles?.specialty ? ` · ${recordOpen.profiles.specialty}` : ""}</div>
              {recordOpen.icd10_code && (
                <div><Badge variant="secondary">{recordOpen.icd10_code} - {recordOpen.icd10_description}</Badge></div>
              )}
              <Field label="Queixa principal" value={recordOpen.chief_complaint} />
              <Field label="História" value={recordOpen.history} />
              <Field label="Exame físico" value={recordOpen.physical_exam} />
              <Field label="Diagnóstico" value={recordOpen.diagnosis} />
              <Field label="Conduta" value={recordOpen.conduct} />
              <Field label="Observações" value={recordOpen.notes} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardShell>
  );
}