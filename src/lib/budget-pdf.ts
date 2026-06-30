import { jsPDF } from "jspdf";
import type { ParsedBudgetData } from "@/lib/budget-ai";
import type { LetterheadPdfAsset } from "@/lib/letterhead";
import { paintLetterhead, pdfContentW, resolvePdfPadding } from "@/lib/letterhead-pdf";

/** Verde institucional do orçamento (#14381A). */
const GREEN: [number, number, number] = [20, 56, 26];
const GREY: [number, number, number] = [85, 85, 85];
const SOFT_GREY: [number, number, number] = [119, 119, 119];

const PAGE_W = 210;
const PAGE_H = 297;

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Quebra de texto com alinhamento; retorna a altura ocupada (mm). */
function flowText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  lineH: number,
  style: "normal" | "italic" | "bold",
  align: "left" | "center" | "right",
  color: [number, number, number],
  draw: boolean,
): number {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, width) as string[];
  if (draw) {
    doc.setTextColor(...color);
    lines.forEach((ln, i) => {
      const by = y + i * lineH + lineH * 0.74;
      let sx = x;
      if (align === "center") sx = x + width / 2;
      else if (align === "right") sx = x + width;
      doc.text(ln, sx, by, { align });
    });
  }
  return Math.max(lines.length, 1) * lineH;
}

export function generateBudgetPDF(opts: {
  data: ParsedBudgetData;
  letterhead?: LetterheadPdfAsset | null;
}): Blob {
  const { data, letterhead: lh } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pad = resolvePdfPadding(lh ?? null);
  const padL = lh ? pad.left : 18;
  const padR = lh ? pad.right : 18;
  const padT = lh ? pad.top : 30;
  const padB = lh ? pad.bottom : 16;
  const contentW = pdfContentW(PAGE_W, { left: padL, right: padR });
  const contentX = padL;
  const maxY = PAGE_H - padB;

  if (lh) paintLetterhead(doc, lh, PAGE_W, PAGE_H, 0, 0);

  let y = padT;

  const newPage = () => {
    doc.addPage();
    if (lh) paintLetterhead(doc, lh, PAGE_W, PAGE_H, 0, 0);
    y = padT;
  };

  // Título — ORÇAMENTO - <nome> (verde, centralizado, sublinhado)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GREEN);
  const title = `ORÇAMENTO - ${data.paciente}`;
  const titleX = contentX + contentW / 2;
  doc.text(title, titleX, y + 4, { align: "center" });
  const titleW = Math.min(doc.getTextWidth(title), contentW);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(titleX - titleW / 2, y + 6.5, titleX + titleW / 2, y + 6.5);
  y += 13;

  // Data (direita, itálico)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...GREY);
  doc.text(data.dataFormatada, contentX + contentW, y, { align: "right" });
  y += 8;

  // Frase objetivo (itálico)
  if (data.frase) {
    const h = flowText(doc, data.frase, contentX, y, contentW, 11.5, 6, "italic", "left", [68, 68, 68], false);
    if (y + h > maxY) newPage();
    flowText(doc, data.frase, contentX, y, contentW, 11.5, 6, "italic", "left", [68, 68, 68], true);
    y += h + 8;
  }

  // Título "Descrição:"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...GREEN);
  doc.text("Descrição:", contentX, y);
  y += 7;

  // Lista de itens
  doc.setTextColor(51, 51, 51);
  for (const it of data.itens) {
    const qtd = it.quantidade > 1 ? ` - ${it.quantidade}` : "";
    const line = `•  ${it.desc}${qtd}`;
    const h = flowText(doc, line, contentX + 3, y, contentW - 3, 11, 6, "normal", "left", [51, 51, 51], false);
    if (y + h > maxY) newPage();
    flowText(doc, line, contentX + 3, y, contentW - 3, 11, 6, "normal", "left", [51, 51, 51], true);
    y += h + 2;
  }
  y += 6;

  // Benefícios (opcional)
  if (data.beneficios.length > 0) {
    if (y + 16 > maxY) newPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...GREEN);
    doc.text("O que você pode esperar deste tratamento:", contentX, y);
    y += 7;
    doc.setTextColor(51, 51, 51);
    for (const b of data.beneficios) {
      const line = `•  ${b}`;
      const h = flowText(doc, line, contentX + 3, y, contentW - 3, 10.5, 5.6, "normal", "left", [51, 51, 51], false);
      if (y + h > maxY) newPage();
      flowText(doc, line, contentX + 3, y, contentW - 3, 10.5, 5.6, "normal", "left", [51, 51, 51], true);
      y += h + 1.5;
    }
    y += 6;
  }

  // Investimento (direita)
  if (y + 24 > maxY) newPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...GREEN);
  doc.text(`Investimento: ${fmtBRL(data.valorFinal)}`, contentX + contentW, y, { align: "right" });
  y += 6;

  // Parcela (direita, itálico)
  const parcela = data.valorFinal / 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...SOFT_GREY);
  doc.text(`10 x ${fmtBRL(parcela)}`, contentX + contentW, y, { align: "right" });
  y += 12;

  // Pontos Importantes
  if (y + 30 > maxY) newPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...GREEN);
  doc.text("Pontos Importantes:", contentX, y);
  y += 8;

  const pixValue = data.valorFinal * 0.93;
  const points: { plain: string; bold: string; tail?: string }[] = [
    { plain: "Parcelamos este valor em até ", bold: "10x sem juros", tail: " no cartão de crédito" },
    { plain: "PIX/Dinheiro: ", bold: `7% de desconto: ${fmtBRL(pixValue)}` },
    { plain: "Orçamento válido por ", bold: "5 dias" },
  ];

  for (const p of points) {
    if (y + 8 > maxY) newPage();
    // checkbox
    doc.setDrawColor(...SOFT_GREY);
    doc.setLineWidth(0.4);
    doc.rect(contentX, y - 3.2, 4, 4);
    // texto
    const tx = contentX + 7;
    const baseline = y;
    doc.setTextColor(51, 51, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    let cx = tx;
    doc.text(p.plain, cx, baseline);
    cx += doc.getTextWidth(p.plain);
    doc.setFont("helvetica", "bold");
    doc.text(p.bold, cx, baseline);
    cx += doc.getTextWidth(p.bold);
    if (p.tail) {
      doc.setFont("helvetica", "normal");
      doc.text(p.tail, cx, baseline);
    }
    y += 8;
  }
  y += 6;

  // Rodapé (itálico)
  if (y + 10 > maxY) newPage();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...SOFT_GREY);
  flowText(
    doc,
    "Pode me chamar aqui para agendarmos ou tirar qualquer dúvida.",
    contentX,
    y,
    contentW,
    10.5,
    5.5,
    "italic",
    "left",
    SOFT_GREY,
    true,
  );

  return doc.output("blob");
}
