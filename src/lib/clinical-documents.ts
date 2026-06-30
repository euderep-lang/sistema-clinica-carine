import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/locale";
import { randomUUID } from "@/lib/utils";
import { softDelete } from "@/lib/trash";
import {
  CLINICAL_DOC_TITLE,
  type ClinicalDocType,
} from "@/lib/clinical-document-pdf";

export interface AtestadoPayload {
  days?: number;
  cid?: string;
  cidDescription?: string;
  rest?: string;
  customBody?: string;
}

export interface DeclaracaoPayload {
  periodStart?: string;
  periodEnd?: string;
  companion?: string;
  customBody?: string;
}

export interface ExamesPayload {
  exams?: string[];
  clinicalIndication?: string;
}

/** Conteúdo do corpo em HTML formatado (editor de texto rico). */
export interface RichBodyPayload {
  bodyHtml?: string;
}

export type ClinicalDocPayload = AtestadoPayload &
  DeclaracaoPayload &
  ExamesPayload &
  RichBodyPayload;

export type TemplateCategory = "exames" | "formulas" | "orientacoes" | "outros";

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "exames", label: "Exames" },
  { value: "formulas", label: "Fórmulas" },
  { value: "orientacoes", label: "Orientações Médicas" },
  { value: "outros", label: "Outros" },
];

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  exames: "Exames",
  formulas: "Fórmulas",
  orientacoes: "Orientações Médicas",
  outros: "Outros",
};

export interface ClinicalDocTemplate {
  id: string;
  doc_type: ClinicalDocType;
  category: TemplateCategory;
  name: string;
  payload: ClinicalDocPayload;
  is_default: boolean;
  position: number;
}

export async function loadClinicalTemplates(
  professionalId: string,
  docType: ClinicalDocType,
): Promise<ClinicalDocTemplate[]> {
  const { data, error } = await supabase
    .from("clinical_document_templates" as never)
    .select("id, doc_type, category, name, payload, is_default, position")
    .eq("professional_id", professionalId)
    .eq("doc_type", docType)
    .order("position")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ClinicalDocTemplate[];
}

export async function saveClinicalTemplate(opts: {
  tenantId: string;
  professionalId: string;
  docType: ClinicalDocType;
  category?: TemplateCategory;
  name: string;
  payload: ClinicalDocPayload;
  isDefault?: boolean;
  templateId?: string | null;
}): Promise<string> {
  const category = opts.category ?? (opts.docType === "exames" ? "exames" : "outros");
  if (opts.isDefault) {
    await supabase
      .from("clinical_document_templates" as never)
      .update({ is_default: false } as never)
      .eq("professional_id", opts.professionalId)
      .eq("doc_type", opts.docType);
  }

  if (opts.templateId) {
    const { error } = await supabase
      .from("clinical_document_templates" as never)
      .update({
        name: opts.name,
        category,
        payload: opts.payload,
        is_default: opts.isDefault ?? false,
      } as never)
      .eq("id", opts.templateId);
    if (error) throw new Error(error.message);
    return opts.templateId;
  }

  const id = randomUUID();
  const { error } = await supabase.from("clinical_document_templates" as never).insert({
    id,
    tenant_id: opts.tenantId,
    professional_id: opts.professionalId,
    doc_type: opts.docType,
    category,
    name: opts.name,
    payload: opts.payload,
    is_default: opts.isDefault ?? false,
  } as never);
  if (error) throw new Error(error.message);
  return id;
}

export async function deleteClinicalTemplate(templateId: string): Promise<void> {
  const { data: row } = await supabase
    .from("clinical_document_templates" as never)
    .select("name, doc_type")
    .eq("id", templateId)
    .maybeSingle();
  const r = row as { name?: string | null; doc_type?: string | null } | null;
  await softDelete({
    entityType: "clinical_template",
    table: "clinical_document_templates",
    id: templateId,
    label: r?.name?.trim() || "Modelo de documento",
    summary: r?.doc_type ?? null,
  });
}

const DOC_SLUG: Record<ClinicalDocType, string> = {
  atestado: "atestado",
  declaracao: "declaracao",
  exames: "solicitacao_exames",
};

/** Salva o PDF gerado no histórico de mídia do paciente e registra o documento. */
export async function saveClinicalDocumentToHistory(opts: {
  tenantId: string;
  patientId: string;
  professionalId: string;
  docType: ClinicalDocType;
  date: string;
  payload: ClinicalDocPayload;
  summary?: string;
  pdfBlob: Blob;
}): Promise<{ mediaId: string; documentId: string }> {
  const mediaId = randomUUID();
  const documentId = randomUUID();
  const dateSlug = opts.date.replace(/-/g, "");
  const slug = DOC_SLUG[opts.docType];
  const storagePath = `${opts.patientId}/clinical-documents/${documentId}/${dateSlug}_${slug}.pdf`;
  const title = CLINICAL_DOC_TITLE[opts.docType];
  const caption = opts.summary
    ? `${title} — ${fmtDate(opts.date)} — ${opts.summary}`
    : `${title} — ${fmtDate(opts.date)}`;
  const fileName = `${slug}_${dateSlug}.pdf`;
  const fileSizeKb = Math.round((opts.pdfBlob.size / 1024) * 100) / 100;

  const { error: upErr } = await supabase.storage
    .from("patient-documents")
    .upload(storagePath, opts.pdfBlob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: mediaErr } = await supabase.from("patient_media_history" as never).insert({
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
  if (mediaErr) throw new Error(mediaErr.message);

  const { error: docErr } = await supabase.from("clinical_documents" as never).insert({
    id: documentId,
    tenant_id: opts.tenantId,
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    doc_type: opts.docType,
    title,
    payload: opts.payload,
    media_id: mediaId,
    date: opts.date,
  } as never);
  if (docErr) throw new Error(docErr.message);

  return { mediaId, documentId };
}
