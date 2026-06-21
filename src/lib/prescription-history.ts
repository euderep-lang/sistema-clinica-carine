import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/locale";
import { TYPE_LABEL, type RxType } from "@/lib/medications";
import { randomUUID } from "@/lib/utils";

export function buildPrescriptionCaption(
  type: RxType,
  date: string,
  medications: string[],
): string {
  const typeLabel = TYPE_LABEL[type] ?? "Receita médica";
  const dateFmt = fmtDate(date);
  const meds = medications
    .map((m) => m.trim())
    .filter(Boolean)
    .join(", ");
  return meds ? `${typeLabel} — ${dateFmt} — ${meds}` : `${typeLabel} — ${dateFmt}`;
}

export async function savePrescriptionToPatientHistory(opts: {
  tenantId: string;
  patientId: string;
  professionalId: string;
  prescriptionId: string;
  type: RxType;
  date: string;
  medications: string[];
  pdfBlob: Blob;
}) {
  const mediaId = randomUUID();
  const dateSlug = opts.date.replace(/-/g, "");
  const storagePath = `${opts.patientId}/prescriptions/${opts.prescriptionId}/${dateSlug}_receita.pdf`;
  const caption = buildPrescriptionCaption(opts.type, opts.date, opts.medications);
  const fileName = `receita_${dateSlug}.pdf`;
  const fileSizeKb = Math.round((opts.pdfBlob.size / 1024) * 100) / 100;

  const { error: upErr } = await supabase.storage
    .from("patient-documents")
    .upload(storagePath, opts.pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(upErr.message);

  const { error: dbErr } = await supabase.from("patient_media_history" as never).insert({
    id: mediaId,
    tenant_id: opts.tenantId,
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: "application/pdf",
    file_size_kb: fileSizeKb,
    caption,
  } as never);

  if (dbErr) throw new Error(dbErr.message);

  return { mediaId, caption, storagePath };
}
