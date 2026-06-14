import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { compressForUpload } from "@/lib/media-compress";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientSessionsDialog } from "@/components/professional/patient-sessions-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { DashboardShell } from "@/components/dashboard-shell";
import { EvolutionEditor } from "@/components/professional/evolution-editor";
import { RecordBottomBar } from "@/components/professional/record-bottom-bar";
import {
  buildClinicalHistory,
  buildEvolutionText,
  type EvolutionFormValues,
} from "@/lib/evolution-build";
import { EvolutionHistory } from "@/components/professional/evolution-history";
import {
  MediaCaptionDialog,
  type PendingMediaItem,
} from "@/components/professional/media-caption-dialog";
import type { EvolutionEntry } from "@/components/professional/evolution-history-types";
import {
  historyHighlightKey,
  mergeHistory,
  type HistoryRecord,
  type MediaHistoryEntry,
} from "@/lib/patient-history";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { randomUUID } from "@/lib/utils";
import { useAuth } from "@/lib/mock-auth";
import { ageFromBirthDate, shortDisplayName } from "@/lib/patient-utils";
import {
  ensureTodayConsultationLinked,
  findPatientAppointmentToday,
} from "@/lib/patient-appointment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professional/patients/$id/record")({
  component: RecordPage,
});

interface Patient {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
}

function RecordPage() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem[]>([]);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [financialPending, setFinancialPending] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [todayAppointmentLinked, setTodayAppointmentLinked] = useState(false);

  const clearPendingMedia = useCallback(() => {
    setPendingMedia((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setCaptionDialogOpen(false);
  }, []);

  const loadHistory = useCallback(async () => {
    const [evRes, mediaRes] = await Promise.all([
      supabase
        .from("patient_evolutions")
        .select(
          "id, date, created_at, evolution_text, professional_id, profiles:professional_id(full_name, specialty), evolution_attachments(id, storage_path, file_name, mime_type, file_size_kb, caption)",
        )
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("patient_media_history" as never)
        .select(
          "id, created_at, storage_path, file_name, mime_type, file_size_kb, caption, professional_id, profiles:professional_id(full_name, specialty)",
        )
        .eq("patient_id", id)
        .order("created_at", { ascending: false }) as never,
    ]);

    if (evRes.error) toast.error(evRes.error.message);
    const mediaError = (mediaRes as { error: { message: string } | null }).error;
    if (mediaError) toast.error(mediaError.message);

    const evolutions = (evRes.data ?? []) as EvolutionEntry[];
    const media = ((mediaRes.data ?? []) as unknown) as MediaHistoryEntry[];
    setHistory(mergeHistory(evolutions, media));
  }, [id]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("patients")
        .select("id, full_name, cpf, phone, email, birth_date")
        .eq("id", id)
        .maybeSingle();
      setPatient(p as Patient | null);
      const [finRes, , linkResult] = await Promise.all([
        supabase.rpc("patient_has_financial_pending", { p_patient_id: id }),
        loadHistory(),
        ensureTodayConsultationLinked(id, profile.id, profile.tenant_id),
      ]);
      setFinancialPending(Boolean(finRes.data));
      setTodayAppointmentLinked(linkResult.linked);
      setLoading(false);
    })();
  }, [id, profile, loadHistory]);

  const prepareMediaFiles = async (list: FileList) => {
    setCompressing(true);
    try {
      const items: PendingMediaItem[] = [];
      for (const raw of Array.from(list)) {
        const { file, sizeKb } = await compressForUpload(raw);
        items.push({
          id: randomUUID(),
          file,
          sizeKb,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          caption: "",
        });
      }
      setPendingMedia(items);
      setCaptionDialogOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCompressing(false);
    }
  };

  const confirmMediaUpload = async () => {
    if (!profile || pendingMedia.length === 0) return;
    if (pendingMedia.some((item) => !item.caption.trim())) {
      toast.error("Preencha a legenda de todos os arquivos.");
      return;
    }

    setUploading(true);
    let saved = 0;
    let lastId: string | null = null;
    try {
      for (const item of pendingMedia) {
        const mediaId = randomUUID();
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${id}/media/${mediaId}/${Date.now()}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("patient-documents")
          .upload(storagePath, item.file, { upsert: false, contentType: item.file.type });
        if (upErr) throw new Error(upErr.message);

        const { data: row, error: dbErr } = await supabase
          .from("patient_media_history" as never)
          .insert({
            id: mediaId,
            tenant_id: profile.tenant_id,
            patient_id: id,
            professional_id: profile.id,
            storage_path: storagePath,
            file_name: item.file.name,
            mime_type: item.file.type,
            file_size_kb: item.sizeKb,
            caption: item.caption.trim(),
          } as never)
          .select("id")
          .single();

        if (dbErr || !row) throw new Error((dbErr as { message: string } | null)?.message ?? "Erro ao salvar anexo");
        saved += 1;
        lastId = (row as { id: string }).id;
      }

      clearPendingMedia();
      await loadHistory();
      if (lastId) setHighlightKey(historyHighlightKey("media", lastId));
      toast.success(saved === 1 ? "Anexo salvo no histórico" : `${saved} anexos salvos no histórico`);
      setTimeout(() => setHighlightKey(null), 4000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (
    form: EvolutionFormValues,
    options?: { writeMode?: boolean; freeText?: string },
  ) => {
    if (!profile) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const appointmentId = await findPatientAppointmentToday(id, profile.id);
      let evId: string;

      if (options?.writeMode && options.freeText) {
        let medicalRecordId: string | null = null;
        if (appointmentId) {
          const { data: linked } = await supabase
            .from("medical_records")
            .select("id")
            .eq("appointment_id", appointmentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          medicalRecordId = linked?.id ?? null;

          if (!medicalRecordId) {
            const { data: mr, error: mrErr } = await supabase
              .from("medical_records")
              .insert({
                tenant_id: profile.tenant_id,
                patient_id: id,
                professional_id: profile.id,
                appointment_id: appointmentId,
                date: today,
                notes: options.freeText,
              })
              .select("id")
              .single();
            if (mrErr || !mr) throw new Error(mrErr?.message ?? "Erro ao vincular prontuário");
            medicalRecordId = mr.id;
          }
        }

        const { data, error } = await supabase
          .from("patient_evolutions")
          .insert({
            tenant_id: profile.tenant_id,
            patient_id: id,
            professional_id: profile.id,
            medical_record_id: medicalRecordId,
            date: today,
            evolution_text: options.freeText,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Erro ao salvar evolução");
        evId = data.id;
        setTodayAppointmentLinked(Boolean(appointmentId && medicalRecordId));
      } else {
        const evolutionText = buildEvolutionText(form) || form.consultReason.trim();
        const clinicalHistory = buildClinicalHistory(form);

        const { data: mr, error: mrErr } = await supabase
          .from("medical_records")
          .insert({
            tenant_id: profile.tenant_id,
            patient_id: id,
            professional_id: profile.id,
            appointment_id: appointmentId,
            date: today,
            chief_complaint: form.consultReason || null,
            history: clinicalHistory || null,
            physical_exam: null,
            diagnosis: form.diagnosis || null,
            icd10_code: form.cid?.code ?? null,
            icd10_description: form.cid?.description ?? null,
            conduct: form.conduct || null,
            notes: form.notes || null,
          })
          .select("id")
          .single();

        if (mrErr || !mr) throw new Error(mrErr?.message ?? "Erro ao salvar prontuário");

        const { data, error } = await supabase
          .from("patient_evolutions")
          .insert({
            tenant_id: profile.tenant_id,
            patient_id: id,
            professional_id: profile.id,
            medical_record_id: mr.id,
            date: today,
            evolution_text: evolutionText,
            bp_systolic: form.systolic ? parseInt(form.systolic, 10) : null,
            bp_diastolic: form.diastolic ? parseInt(form.diastolic, 10) : null,
            heart_rate: form.hr ? parseInt(form.hr, 10) : null,
            temperature: form.temp ? parseFloat(form.temp) : null,
            weight: form.weight ? parseFloat(form.weight) : null,
            height: form.height ? parseFloat(form.height) : null,
            spo2: form.spo2 ? parseInt(form.spo2, 10) : null,
            blood_glucose: form.glucose ? parseInt(form.glucose, 10) : null,
          })
          .select("id")
          .single();

        if (error || !data) throw new Error(error?.message ?? "Erro ao salvar evolução");
        evId = data.id;
        setTodayAppointmentLinked(Boolean(appointmentId));
      }

      await loadHistory();
      setHighlightKey(historyHighlightKey("evolution", evId));
      toast.success(
        appointmentId
          ? "Evolução salva e vinculada à consulta de hoje"
          : "Evolução salva no histórico",
      );
      setTimeout(() => setHighlightKey(null), 4000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Prontuário">
        <div className="text-muted-foreground">Carregando…</div>
      </DashboardShell>
    );
  }

  if (!patient) {
    return (
      <DashboardShell title="Prontuário">
        <div>Paciente não encontrado</div>
      </DashboardShell>
    );
  }

  const age = ageFromBirthDate(patient.birth_date);
  const displayName = shortDisplayName(patient.full_name);

  return (
    <DashboardShell title={`Prontuário · ${displayName}`} fullWidth>
      <div className="flex h-[calc(100dvh-4.5rem)] min-h-[36rem] flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{displayName}</span>
          {age !== null && (
            <>
              <span className="text-muted-foreground">,</span>
              <span className="text-muted-foreground">{age} anos</span>
            </>
          )}
          <span className="text-muted-foreground">,</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default">
                  <DollarSign
                    className={cn(
                      "size-4",
                      financialPending ? "text-destructive" : "text-emerald-600",
                    )}
                    aria-label={financialPending ? "Pendência financeira" : "Financeiro em dia"}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {financialPending ? "Pendência financeira" : "Financeiro em dia"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {todayAppointmentLinked && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-800"
            >
              <CheckCircle2 className="size-3" />
              Consulta de hoje vinculada
            </Badge>
          )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setSessionsOpen(true)}
          >
            <CalendarCheck className="size-4" />
            Sessões
          </Button>
        </div>

        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={56} minSize={30} className="min-h-0 pr-1">
            <EvolutionHistory
              entries={history}
              loading={loading}
              highlightKey={highlightKey}
              uploading={uploading || compressing}
              onAddFiles={(files) => void prepareMediaFiles(files)}
            />
          </ResizablePanel>
          <ResizableHandle className="w-1 rounded-full bg-border transition-colors hover:bg-primary/30" />
          <ResizablePanel defaultSize={44} minSize={28} className="min-h-0 pl-1">
            <div className="flex h-full min-h-0 flex-col rounded-xl border border-primary/10 bg-muted/40 p-2 ring-1 ring-inset ring-primary/5">
              <EvolutionEditor saving={saving} onSave={handleSave} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <MediaCaptionDialog
          open={captionDialogOpen}
          items={pendingMedia}
          uploading={uploading}
          onCaptionChange={(itemId, caption) =>
            setPendingMedia((prev) =>
              prev.map((item) => (item.id === itemId ? { ...item, caption } : item)),
            )
          }
          onConfirm={() => void confirmMediaUpload()}
          onCancel={clearPendingMedia}
        />

        <RecordBottomBar patientId={id} />

        <PatientSessionsDialog
          open={sessionsOpen}
          onOpenChange={setSessionsOpen}
          patientId={id}
          patientName={displayName}
        />
      </div>
    </DashboardShell>
  );
}
