import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientSearchField } from "@/components/patient-search-field";
import { PatientMediaAttacher } from "@/components/professional/patient-media-attacher";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/anexar")({
  head: () => ({
    meta: [{ title: "Anexar no prontuário" }],
  }),
  component: AnexarPage,
});

function AnexarPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [lastUpload, setLastUpload] = useState(0);

  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 py-6">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/inicio" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>

        <h1 className="font-display text-xl font-bold text-foreground">
          Anexar no prontuário
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque o paciente e envie uma foto ou documento.
        </p>

        <div className="mt-6 space-y-5">
          {!patientId ? (
            <PatientSearchField
              value={patientName}
              patientId={patientId}
              onChange={(id, name) => {
                setPatientId(id);
                setPatientName(name);
              }}
              label="Paciente"
              placeholder="Digite o nome ou WhatsApp do paciente"
            />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{patientName}</p>
                  <p className="text-xs text-muted-foreground">Paciente selecionado</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPatientId("");
                  setPatientName("");
                }}
              >
                Trocar
              </Button>
            </div>
          )}

          {patientId && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">O que deseja anexar?</p>
              <PatientMediaAttacher
                key={patientId}
                patientId={patientId}
                onUploaded={() => setLastUpload((n) => n + 1)}
              />
              {lastUpload > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <Check className="size-4" />
                  Anexo enviado ao prontuário de {patientName.split(" ")[0]}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
