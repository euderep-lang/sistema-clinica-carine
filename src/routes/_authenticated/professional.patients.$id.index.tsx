import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Stethoscope } from "lucide-react";
import { PatientSessionsContent } from "@/components/professional/patient-sessions-content";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import {
  fmtDate,
} from "@/lib/currency";
import {
  ageFromBirthDate,
  avatarColor,
  formatPhoneWithDdi,
  initials,
  maskCPF,
} from "@/lib/patient-utils";
import type { PatientFormData } from "@/components/patient-form-dialog";
import { PatientFormDialog } from "@/components/patient-form-dialog";

const PATIENT_TABS = ["dados", "consultas", "sessoes"] as const;
type PatientTab = (typeof PATIENT_TABS)[number];

export const Route = createFileRoute("/_authenticated/professional/patients/$id/")({
  validateSearch: (search: Record<string, unknown>) => {
    const tab = String(search.tab ?? "dados");
    return {
      tab: (PATIENT_TABS.includes(tab as PatientTab) ? tab : "dados") as PatientTab,
    };
  },
  component: ProfessionalPatientPage,
});

interface AppointmentRow {
  id: string;
  date: string;
  start_time: string;
  status: string | null;
  type: string | null;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function ProfessionalPatientPage() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [patient, setPatient] = useState<PatientFormData | null>(null);
  const [appts, setAppts] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Paciente não encontrado");
      setLoading(false);
      return;
    }
    setPatient(data as PatientFormData);

    const { data: apptData } = await supabase
      .from("appointments")
      .select("id,date,start_time,status,type")
      .eq("patient_id", id)
      .eq("professional_id", profile.id)
      .order("date", { ascending: false });
    setAppts((apptData ?? []) as AppointmentRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile]);

  if (loading || !patient) {
    return (
      <DashboardShell title="Paciente">
        <p className="py-16 text-center text-muted-foreground">Carregando…</p>
      </DashboardShell>
    );
  }

  const age = patient.birth_date ? ageFromBirthDate(patient.birth_date) : null;

  return (
    <DashboardShell title={patient.full_name}>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/professional/patients">
            <ArrowLeft className="mr-2 size-4" />
            Voltar aos pacientes
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
            <div
              className={`grid size-20 shrink-0 place-items-center rounded-full text-2xl font-bold text-white ${avatarColor(patient.full_name)}`}
            >
              {initials(patient.full_name)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{patient.full_name}</h1>
                {patient.record_number != null && (
                  <Badge variant="outline" className="font-mono tabular-nums">
                    Prontuário {patient.record_number}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {age !== null && <span>{age} anos</span>}
                {patient.cpf && <span>CPF: {maskCPF(patient.cpf)}</span>}
                {patient.phone && <span>{formatPhoneWithDdi(patient.phone, patient.phone_ddi)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Editar ficha
              </Button>
              <Button asChild>
                <Link to="/professional/patients/$id/record" params={{ id }}>
                  <Stethoscope className="mr-2 size-4" />
                  Abrir prontuário
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate({
              to: "/professional/patients/$id",
              params: { id },
              search: { tab: value as PatientTab },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="dados">Cadastro</TabsTrigger>
            <TabsTrigger value="consultas">Agendamentos</TabsTrigger>
            <TabsTrigger value="sessoes">Sessões</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dados cadastrais</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome" value={patient.full_name} />
                <Field label="CPF" value={patient.cpf ? maskCPF(patient.cpf) : null} />
                <Field label="RG" value={patient.rg} />
                <Field label="Nascimento" value={patient.birth_date} />
                <Field label="Sexo" value={patient.gender} />
                <Field label="Como nos conheceu" value={patient.how_did_you_find_us} />
                <Field label="Telefone" value={patient.phone ? formatPhoneWithDdi(patient.phone, patient.phone_ddi) : null} />
                <Field label="E-mail" value={patient.email} />
                <Field
                  label="Endereço"
                  value={[
                    patient.address_street,
                    patient.address_number,
                    patient.address_complement,
                    patient.address_neighborhood,
                    patient.address_city,
                    patient.address_state,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Field label="CEP" value={patient.address_zip} />
                <Field label="Tipo sanguíneo" value={patient.blood_type} />
                <Field label="Convênio" value={patient.health_insurance} />
                <Field label="Carteirinha" value={patient.health_insurance_number} />
                <Field label="Alergias" value={patient.allergies} />
                <Field label="Contato emergência" value={patient.emergency_contact_name} />
                <Field
                  label="Telefone emergência"
                  value={
                    patient.emergency_contact_phone
                      ? formatPhoneWithDdi(
                          patient.emergency_contact_phone,
                          patient.emergency_contact_phone_ddi,
                        )
                      : null
                  }
                />
                <div className="md:col-span-2">
                  <Field label="Observações" value={patient.notes} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agendamentos deste paciente</CardTitle>
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
                    {appts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          Nenhum agendamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      appts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            {fmtDate(a.date)}
                          </TableCell>
                          <TableCell>{a.start_time?.slice(0, 5)}</TableCell>
                          <TableCell>
                            {APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessoes">
            <PatientSessionsContent
              patientId={id}
              patientName={patient.full_name}
              active={tab === "sessoes"}
            />
          </TabsContent>
        </Tabs>
      </div>

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={patient}
        onSaved={() => void load()}
      />
    </DashboardShell>
  );
}
