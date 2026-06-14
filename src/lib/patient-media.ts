export type PhotoUploadKind = "exams" | "before_after";

export function photoDateLabel(date = new Date()) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function photoGroupCaption(kind: PhotoUploadKind, dateLabel = photoDateLabel()) {
  return kind === "exams" ? `Exame do dia ${dateLabel}` : `Foto do dia ${dateLabel}`;
}

export function photoAttachmentCaption(dateLabel = photoDateLabel()) {
  return dateLabel;
}
