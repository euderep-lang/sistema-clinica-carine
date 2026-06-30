import { jsPDF } from "jspdf";
import type { ParsedPlanData, PlanMeal } from "@/lib/meal-plan";

/** Verde institucional do plano (#14381A). */
const GREEN: [number, number, number] = [20, 56, 26];
const GREY: [number, number, number] = [120, 120, 120];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const MARGIN_TOP = 14;
const MARGIN_BOTTOM = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const BOTTOM_Y = PAGE_H - MARGIN_BOTTOM;

const CELL_PAD_X = 3;
const CELL_PAD_Y = 2.5;

interface Seg {
  text: string;
  bold: boolean;
}

function fmtBR(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

/**
 * Fluxo de texto com segmentos (negrito/normal), quebra por largura e
 * alinhamento. Retorna a altura ocupada (mm). Com `draw=false` apenas mede.
 */
function flowSegments(
  doc: jsPDF,
  segs: Seg[],
  x: number,
  y: number,
  width: number,
  size: number,
  lineH: number,
  align: "left" | "center",
  color: [number, number, number],
  draw: boolean,
): number {
  doc.setFontSize(size);
  const wordWidth = (w: { t: string; bold: boolean }) => {
    doc.setFont("helvetica", w.bold ? "bold" : "normal");
    return doc.getTextWidth(w.t);
  };

  const words: { t: string; bold: boolean; space: boolean }[] = [];
  for (const s of segs) {
    for (const tok of s.text.split(/(\s+)/)) {
      if (tok === "") continue;
      words.push({ t: tok, bold: s.bold, space: /^\s+$/.test(tok) });
    }
  }

  const lines: { t: string; bold: boolean; space: boolean }[][] = [];
  let line: typeof words = [];
  let lw = 0;
  const trimTrailing = () => {
    while (line.length && line[line.length - 1].space) lw -= wordWidth(line.pop()!);
  };
  for (const w of words) {
    const ww = wordWidth(w);
    if (w.space) {
      if (line.length === 0) continue;
      line.push(w);
      lw += ww;
      continue;
    }
    if (lw + ww > width && line.length > 0) {
      trimTrailing();
      lines.push(line);
      line = [];
      lw = 0;
    }
    line.push(w);
    lw += ww;
  }
  if (line.length) {
    trimTrailing();
    lines.push(line);
  }

  if (draw) {
    doc.setTextColor(...color);
    lines.forEach((ln, i) => {
      const total = ln.reduce((a, w) => a + wordWidth(w), 0);
      let sx = x;
      if (align === "center") sx = x + (width - total) / 2;
      const by = y + i * lineH + lineH * 0.72;
      let cx = sx;
      for (const w of ln) {
        doc.setFont("helvetica", w.bold ? "bold" : "normal");
        doc.text(w.t, cx, by);
        cx += wordWidth(w);
      }
    });
  }

  return Math.max(lines.length, 1) * lineH;
}

const NAME_SIZE = 11;
const NAME_LH = 5;
const ITEM_SIZE = 9.5;
const ITEM_LH = 4.5;

function optionSegments(itemText: string, multi: boolean): Seg[] {
  const prefix = multi ? "-  " : "";
  const m = /^(op[çc][ãa]o\s*\d+)\s*[:\-–]?\s*(.*)$/i.exec(itemText);
  if (m) {
    return [
      { text: `${prefix}${m[1]}: `, bold: true },
      { text: m[2], bold: false },
    ];
  }
  return [{ text: `${prefix}${itemText}`, bold: false }];
}

function itemDisplay(item: { texto: string; quantidade: string }): string {
  return item.quantidade ? `${item.texto} (${item.quantidade})` : item.texto;
}

/** Mede ou desenha um bloco de refeição numa célula. Retorna a altura (mm). */
function mealCell(
  doc: jsPDF,
  meal: PlanMeal,
  cellX: number,
  cellY: number,
  cellW: number,
  draw: boolean,
): number {
  const innerX = cellX + CELL_PAD_X;
  const innerW = cellW - CELL_PAD_X * 2;
  let y = cellY + CELL_PAD_Y;

  if (meal.nome) {
    y += flowSegments(
      doc,
      [{ text: meal.nome.toUpperCase(), bold: true }],
      innerX,
      y,
      innerW,
      NAME_SIZE,
      NAME_LH,
      "center",
      GREEN,
      draw,
    );
    y += 0.8;
  }

  const multi = meal.itens.length > 1;
  for (const item of meal.itens) {
    const display = itemDisplay(item);
    const segs = optionSegments(display, multi);
    y += flowSegments(
      doc,
      segs,
      innerX,
      y,
      innerW,
      ITEM_SIZE,
      ITEM_LH,
      multi ? "left" : "center",
      GREEN,
      draw,
    );
  }

  return y - cellY + CELL_PAD_Y;
}

export function generateMealPlanPDF(
  plan: ParsedPlanData,
  opts: { cid?: string },
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = MARGIN_TOP;

  const newPage = () => {
    doc.addPage();
    y = MARGIN_TOP;
  };

  // 1. Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...GREEN);
  doc.text(`PLANO TERAPÊUTICO – ${plan.paciente}`, PAGE_W / 2, y + 3, { align: "center" });
  y += 9;

  // 2/3. Objetivo + CID
  const labelValue = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GREEN);
    doc.text(label, MARGIN_X, y);
    const w = doc.getTextWidth(`${label} `);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN_X + w, y);
    y += 5;
  };
  if (plan.objetivo) labelValue("Objetivo:", plan.objetivo);
  if (opts.cid) labelValue("CID:", opts.cid.toUpperCase());

  // 4. Renovação (esq) + Data (dir)
  const hoje = new Date();
  const renov = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Renovação da dieta:", MARGIN_X, y);
  doc.setFont("helvetica", "normal");
  const renovLabelW = doc.getTextWidth("Renovação da dieta: ");
  doc.text(fmtBR(renov), MARGIN_X + renovLabelW, y);

  const dataValue = fmtBR(hoje);
  doc.setFont("helvetica", "normal");
  const dataValueW = doc.getTextWidth(dataValue);
  doc.setFont("helvetica", "bold");
  const dataLabelW = doc.getTextWidth("Data: ");
  const dataX = MARGIN_X + CONTENT_W - dataValueW - dataLabelW;
  doc.text("Data:", dataX, y);
  doc.setFont("helvetica", "normal");
  doc.text(dataValue, dataX + dataLabelW, y);
  y += 7;

  // 5. Tabela de refeições (duas colunas)
  const colW = CONTENT_W / 2;
  const leftX = MARGIN_X;
  const rightX = MARGIN_X + colW;
  const rows = Math.max(plan.colunaEsquerda.length, plan.colunaDireita.length);
  const tableTop = y;
  let tableStartY = y;

  doc.setDrawColor(...GREY);
  for (let i = 0; i < rows; i++) {
    const left = plan.colunaEsquerda[i];
    const right = plan.colunaDireita[i];
    const hL = left ? mealCell(doc, left, leftX, y, colW, false) : 0;
    const hR = right ? mealCell(doc, right, rightX, y, colW, false) : 0;
    const rowH = Math.max(hL, hR, 10);

    if (y + rowH > BOTTOM_Y) {
      // fecha a borda da página atual e continua na próxima
      doc.setLineWidth(0.2);
      doc.rect(MARGIN_X, tableStartY, CONTENT_W, y - tableStartY);
      doc.line(rightX, tableStartY, rightX, y);
      newPage();
      tableStartY = y;
    }

    if (left) mealCell(doc, left, leftX, y, colW, true);
    if (right) mealCell(doc, right, rightX, y, colW, true);

    y += rowH;

    if (i < rows - 1) {
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([0.8, 0.8], 0);
      doc.line(MARGIN_X, y, MARGIN_X + CONTENT_W, y);
      doc.setLineDashPattern([], 0);
    }
  }

  // Borda externa + divisória vertical da tabela
  doc.setDrawColor(...GREY);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_X, tableStartY, CONTENT_W, y - tableStartY);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.line(rightX, tableStartY, rightX, y);
  doc.setLineDashPattern([], 0);
  void tableTop;
  y += 7;

  // 6. Barra de hidratação
  if (plan.litrosAgua && Number(plan.litrosAgua) > 0) {
    const firstName = plan.paciente.trim().split(/\s+/)[0] || plan.paciente;
    const waterText = `${firstName}, para um bom desempenho você deve consumir no mínimo ${plan.litrosAgua} litros de água por dia.`;
    const barInnerW = CONTENT_W - 8;
    const textH = flowSegments(
      doc,
      [{ text: waterText, bold: true }],
      MARGIN_X + 4,
      0,
      barInnerW,
      9.5,
      4.6,
      "center",
      [255, 255, 255],
      false,
    );
    const barH = Math.max(textH + 5, 10);
    if (y + barH > BOTTOM_Y) newPage();
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN_X, y, CONTENT_W, barH, "F");
    flowSegments(
      doc,
      [{ text: waterText, bold: true }],
      MARGIN_X + 4,
      y + 2.5,
      barInnerW,
      9.5,
      4.6,
      "center",
      [255, 255, 255],
      true,
    );
    y += barH + 5;
  }

  // 7. Frase motivacional
  if (plan.fraseMotivacional) {
    const h = flowSegments(
      doc,
      [{ text: plan.fraseMotivacional, bold: true }],
      MARGIN_X,
      y,
      CONTENT_W,
      10,
      5,
      "center",
      GREEN,
      false,
    );
    if (y + h > BOTTOM_Y) newPage();
    flowSegments(
      doc,
      [{ text: plan.fraseMotivacional, bold: true }],
      MARGIN_X,
      y,
      CONTENT_W,
      10,
      5,
      "center",
      GREEN,
      true,
    );
    y += h + 6;
  }

  // 8. Refeição livre
  if (plan.refeicaoLivre.length > 0) {
    if (y + 16 > BOTTOM_Y) newPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text("SOBRE SUA REFEIÇÃO LIVRE", PAGE_W / 2, y + 3, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Escolha APENAS 1 das ${plan.refeicaoLivre.length} opções abaixo`,
      PAGE_W / 2,
      y,
      { align: "center" },
    );
    y += 6;

    plan.refeicaoLivre.forEach((opt, i) => {
      const segs: Seg[] = [{ text: `${i + 1}) ${opt}`, bold: false }];
      const h = flowSegments(doc, segs, MARGIN_X, 0, CONTENT_W, 10, 5, "left", GREEN, false);
      if (y + h > BOTTOM_Y) newPage();
      flowSegments(doc, segs, MARGIN_X, y, CONTENT_W, 10, 5, "left", GREEN, true);
      y += h + 0.5;
    });
  }

  return doc.output("blob");
}
