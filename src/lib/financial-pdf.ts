import { jsPDF } from "jspdf";
import type { LetterheadPdfAsset } from "@/lib/letterhead";
import {
  paintLetterhead,
  pdfContentW,
  pdfContentX,
  resolvePdfPadding,
} from "@/lib/letterhead-pdf";
import { fmt, fmtDate } from "./currency";
import { paymentLabel } from "./payment-methods";

export interface ClinicHeader {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  cnpj?: string | null;
}

export interface ReceiptData {
  clinic: ClinicHeader;
  number: number | string;
  patientName: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
  paidDate: string;
  professional?: string | null;
  letterhead: LetterheadPdfAsset;
}

function drawClinicHeader(
  doc: jsPDF,
  clinic: ClinicHeader,
  w: number,
  x: number,
  y: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clinic.name, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let yy = y + 5;
  if (clinic.address) {
    doc.text(clinic.address, x, yy);
    yy += 4;
  }
  const l2 = [clinic.phone, clinic.email].filter(Boolean).join(" · ");
  if (l2) {
    doc.text(l2, x, yy);
    yy += 4;
  }
  if (clinic.cnpj) {
    doc.text(`CNPJ: ${clinic.cnpj}`, x, yy);
    yy += 4;
  }
  doc.setDrawColor(120);
  doc.line(x, yy + 1, w - x, yy + 1);
  return yy + 6;
}

function pageStart(
  doc: jsPDF,
  clinic: ClinicHeader,
  w: number,
  h: number,
  letterhead?: LetterheadPdfAsset | null,
) {
  const pad = resolvePdfPadding(letterhead);
  const x = pdfContentX(pad);
  const contentW = pdfContentW(w, pad);

  if (letterhead) {
    paintLetterhead(doc, letterhead, w, h);
    return { y: pad.top, x, pad, contentW };
  }

  const y = drawClinicHeader(doc, clinic, w, x, pad.top);
  return { y, x, pad, contentW };
}

export function generateReceiptPDF(r: ReceiptData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = 148;
  const H = 210;
  const { y: startY, x, contentW } = pageStart(doc, r.clinic, W, H, r.letterhead);
  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECIBO DE PAGAMENTO", x + contentW / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nº ${String(r.number).padStart(6, "0")}`, x + contentW, y, { align: "right" });
  y += 8;
  doc.setFontSize(11);
  const body = `Recebi de ${r.patientName} a quantia de ${fmt(r.amount)} referente a ${r.description}.`;
  const lines = doc.splitTextToSize(body, contentW);
  doc.text(lines, x, y);
  y += lines.length * 5 + 4;
  doc.setFontSize(9);
  doc.text(
    `Forma de pagamento: ${r.paymentMethod ? paymentLabel(r.paymentMethod) : "—"}`,
    x,
    y,
  );
  y += 5;
  doc.text(`Data do pagamento: ${fmtDate(r.paidDate)}`, x, y);
  y += 12;
  doc.line(x + contentW * 0.2, y, x + contentW * 0.8, y);
  y += 4;
  doc.text(r.professional ?? r.clinic.name, x + contentW / 2, y, { align: "center" });
  return doc.output("blob");
}

export interface BudgetPDFData {
  clinic: ClinicHeader;
  number: number | string;
  date: string;
  validUntil: string | null;
  patientName: string;
  professionalName: string;
  items: { description: string; quantity: number; unit_price: number; total_price: number }[];
  subtotal: number;
  discountValue: number;
  finalValue: number;
  notes?: string | null;
  letterhead: LetterheadPdfAsset;
}

export function generateBudgetPDF(b: BudgetPDFData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const H = 297;
  const { y: startY, x, contentW, pad } = pageStart(doc, b.clinic, W, H, b.letterhead);
  let y = startY;
  const bottomLimit = H - pad.bottom;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ORÇAMENTO", x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nº ORÇ-${String(b.number).padStart(4, "0")}`, x + contentW, y, { align: "right" });
  y += 7;
  doc.setFontSize(9);
  doc.text(`Paciente: ${b.patientName}`, x, y);
  doc.text(`Data: ${fmtDate(b.date)}`, x + contentW, y, { align: "right" });
  y += 5;
  doc.text(`Profissional: ${b.professionalName}`, x, y);
  if (b.validUntil) doc.text(`Válido até: ${fmtDate(b.validUntil)}`, x + contentW, y, { align: "right" });
  y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(x, y - 4, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Item", x + 2, y);
  doc.text("Descrição", x + 12, y);
  doc.text("Qtd", x + contentW * 0.57, y, { align: "right" });
  doc.text("Preço Unit.", x + contentW * 0.71, y, { align: "right" });
  doc.text("Total", x + contentW - 2, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");

  b.items.forEach((it, i) => {
    const descW = contentW * 0.45;
    const lines = doc.splitTextToSize(it.description, descW);
    const rowH = Math.max(5, lines.length * 4.5);
    if (y + rowH > bottomLimit - 30) return;
    doc.text(String(i + 1), x + 2, y);
    doc.text(lines, x + 12, y);
    doc.text(String(it.quantity), x + contentW * 0.57, y, { align: "right" });
    doc.text(fmt(it.unit_price), x + contentW * 0.71, y, { align: "right" });
    doc.text(fmt(it.total_price), x + contentW - 2, y, { align: "right" });
    y += rowH;
  });

  y += 4;
  doc.line(x + contentW * 0.52, y, x + contentW, y);
  y += 5;
  doc.text("Subtotal:", x + contentW * 0.62, y);
  doc.text(fmt(b.subtotal), x + contentW - 2, y, { align: "right" });
  y += 5;
  doc.text("Desconto:", x + contentW * 0.62, y);
  doc.text(`- ${fmt(b.discountValue)}`, x + contentW - 2, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total Final:", x + contentW * 0.62, y);
  doc.text(fmt(b.finalValue), x + contentW - 2, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (b.validUntil) {
    doc.text(`Este orçamento é válido até ${fmtDate(b.validUntil)}.`, x, y);
    y += 5;
  }
  if (b.notes) {
    y += 2;
    if (y < bottomLimit - 20) {
      doc.setFont("helvetica", "bold");
      doc.text("Observações:", x, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const ln = doc.splitTextToSize(b.notes, contentW);
      doc.text(ln, x, y);
      y += ln.length * 4.5;
    }
  }
  const signY = Math.min(y + 12, bottomLimit - 6);
  doc.text("De acordo: _________________________________________   Data: _______________", x, signY);
  return doc.output("blob");
}
