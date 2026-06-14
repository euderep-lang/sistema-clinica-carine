import type { jsPDF } from "jspdf";
import type { LetterheadPdfAsset } from "@/lib/letterhead";

export const DEFAULT_PDF_PADDING = { top: 12, right: 10, bottom: 10, left: 10 };

export function resolvePdfPadding(lh: LetterheadPdfAsset | null | undefined) {
  if (lh) return lh.margins;
  return DEFAULT_PDF_PADDING;
}

export function paintLetterhead(
  doc: jsPDF,
  lh: LetterheadPdfAsset | null | undefined,
  w: number,
  h: number,
  x = 0,
  y = 0,
) {
  if (!lh) return;
  doc.addImage(lh.imageData, lh.format, x, y, w, h);
}

export function pdfContentX(pad: { left: number }, base = 0) {
  return base + pad.left;
}

export function pdfContentW(w: number, pad: { left: number; right: number }) {
  return w - pad.left - pad.right;
}
