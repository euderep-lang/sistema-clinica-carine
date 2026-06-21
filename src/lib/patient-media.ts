import { fmtDateFromDate } from "@/lib/locale";

export type PhotoUploadKind = "exams" | "before_after";

export function photoDateLabel(date = new Date()) {
  return fmtDateFromDate(date);
}

export function photoGroupCaption(kind: PhotoUploadKind, dateLabel = photoDateLabel()) {
  return kind === "exams" ? `Exame do dia ${dateLabel}` : `Foto do dia ${dateLabel}`;
}

export function photoAttachmentCaption(dateLabel = photoDateLabel()) {
  return `Anexo do dia ${dateLabel}`;
}
