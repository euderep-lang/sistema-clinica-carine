import { jsPDF } from "jspdf";
import type { LetterheadPdfAsset } from "@/lib/letterhead";
import { paintLetterhead, pdfContentW, resolvePdfPadding } from "@/lib/letterhead-pdf";
import { maskCPF, ageFromBirthDate } from "@/lib/patient-utils";

export type ClinicalDocType = "atestado" | "declaracao" | "exames";

export const CLINICAL_DOC_TITLE: Record<ClinicalDocType, string> = {
  atestado: "ATESTADO MÉDICO",
  declaracao: "DECLARAÇÃO DE COMPARECIMENTO",
  exames: "SOLICITAÇÃO DE EXAMES",
};

export interface ClinicalDocData {
  type: ClinicalDocType;
  date: string;
  /** Parágrafos do corpo do documento (texto livre já montado). */
  bodyParagraphs: string[];
  /**
   * Conteúdo do corpo em HTML formatado (editor de texto rico). Quando
   * presente, substitui `bodyParagraphs`/`examItems`/`cidLine` e é renderizado
   * exatamente como foi escrito (fonte, tamanho, negrito, itálico, listas).
   */
  bodyHtml?: string | null;
  /** Para solicitação de exames: lista numerada de exames. */
  examItems?: string[];
  /** Linha de CID exibida ao final (atestado). */
  cidLine?: string | null;
  clinic: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    cnpj?: string | null;
    city?: string | null;
  };
  patient: {
    full_name: string;
    cpf?: string | null;
    birth_date?: string | null;
  };
  professional: {
    full_name: string;
    crm?: string | null;
    specialty?: string | null;
    profession?: string | null;
    cpf?: string | null;
  };
  letterhead?: LetterheadPdfAsset | null;
}

const GOLD: [number, number, number] = [197, 179, 88];
const GREEN: [number, number, number] = [26, 48, 33];

function fmtDateBR(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtDateLongBR(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${String(day).padStart(2, "0")} de ${months[(m ?? 1) - 1]} de ${y}`;
}

function formatSignedName(fullName: string) {
  const name = fullName.trim();
  if (/^dr[a]?\.\s/i.test(name)) return name;
  return `Dr(a). ${name}`;
}

function drawHeaderNoLetterhead(doc: jsPDF, data: ClinicalDocData, cx: number, y: number) {
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(data.professional.full_name.toUpperCase(), cx, y, { align: "center" });
  y += 6;
  const sub = [data.professional.profession, data.professional.crm].filter(Boolean).join(" · ").toUpperCase();
  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(sub, cx, y, { align: "center" });
    y += 4;
  }
  doc.setTextColor(0);
  return y + 10;
}

function drawFooter(doc: jsPDF, x: number, w: number, bottomY: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(x, bottomY - 7, x + w, bottomY - 7);
  doc.setFillColor(...GREEN);
  doc.rect(x, bottomY - 6, w, 5, "F");
}

/* -------------------------------------------------------------------------- */
/* Renderização de HTML formatado (editor de texto rico) para o PDF           */
/* -------------------------------------------------------------------------- */

const PT_TO_MM = 0.352777;

interface InlineStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  font: string;
  size: number;
  align: string;
}

interface RichSeg {
  text: string;
  style: InlineStyle;
}

interface RichPara {
  segs: RichSeg[];
  list: null | "ol" | "ul";
  index: number;
  indent: number;
  align: string;
  /** Id do grupo de duas colunas a que o parágrafo pertence (ou null). */
  col?: number | null;
}

interface WalkCtx {
  /** Próximo id de grupo de colunas. */
  next: number;
}

function isTwoColBlock(el: HTMLElement): boolean {
  if (el.dataset?.rteCols === "1") return true;
  const cc = el.style?.columnCount;
  return !!cc && parseInt(cc, 10) >= 2;
}

const BLOCK_TAGS = new Set([
  "P", "DIV", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE",
]);

function mapPdfFont(family?: string | null): string {
  const v = (family || "").toLowerCase();
  if (v.includes("times") || v.includes("georgia") || v.includes("serif")) return "times";
  if (v.includes("courier") || v.includes("mono")) return "courier";
  return "helvetica";
}

function pdfFontStyle(s: InlineStyle): string {
  if (s.bold && s.italic) return "bolditalic";
  if (s.bold) return "bold";
  if (s.italic) return "italic";
  return "normal";
}

function deriveStyle(inh: InlineStyle, el: HTMLElement): InlineStyle {
  const s: InlineStyle = { ...inh };
  const tag = el.tagName;
  if (tag === "B" || tag === "STRONG") s.bold = true;
  if (tag === "I" || tag === "EM") s.italic = true;
  if (tag === "U") s.underline = true;
  const st = el.style;
  if (st) {
    const fw = st.fontWeight;
    if (fw === "bold" || fw === "bolder" || Number(fw) >= 600) s.bold = true;
    if (fw === "normal" || fw === "400") s.bold = false;
    if (st.fontStyle === "italic") s.italic = true;
    if (st.fontStyle === "normal") s.italic = false;
    if (st.textDecorationLine?.includes("underline") || st.textDecoration?.includes("underline")) {
      s.underline = true;
    }
    if (st.fontFamily) s.font = mapPdfFont(st.fontFamily);
    if (st.fontSize) {
      const m = st.fontSize.match(/([\d.]+)\s*(pt|px)?/);
      if (m) {
        let n = parseFloat(m[1]);
        if (m[2] === "px") n = n * 0.75;
        if (n > 0) s.size = n;
      }
    }
    if (st.textAlign) s.align = st.textAlign;
  }
  const face = el.getAttribute?.("face");
  if (face) s.font = mapPdfFont(face);
  return s;
}

function collectSegs(node: Node, inh: InlineStyle, out: RichSeg[]) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const t = (child.nodeValue || "").replace(/\s+/g, " ");
      if (t) out.push({ text: t, style: inh });
    } else if (child.nodeType === 1) {
      const el = child as HTMLElement;
      if (el.tagName === "BR") {
        out.push({ text: "\n", style: inh });
        return;
      }
      collectSegs(el, deriveStyle(inh, el), out);
    }
  });
}

function hasBlockChild(el: HTMLElement): boolean {
  return Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName));
}

function walkBlocks(
  node: Node,
  inh: InlineStyle,
  paras: RichPara[],
  indent: number,
  col: number | null,
  ctx: WalkCtx,
) {
  let inline: RichPara | null = null;
  const flush = () => {
    if (inline && inline.segs.length) paras.push(inline);
    inline = null;
  };
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const t = (child.nodeValue || "").replace(/\s+/g, " ");
      if (t.trim()) {
        if (!inline) inline = { segs: [], list: null, index: 0, indent, align: inh.align, col };
        inline.segs.push({ text: t, style: inh });
      }
      return;
    }
    if (child.nodeType !== 1) return;
    const el = child as HTMLElement;
    const tag = el.tagName;

    if (tag === "BR") {
      flush();
      paras.push({ segs: [], list: null, index: 0, indent, align: inh.align, col });
      return;
    }

    if (tag === "UL" || tag === "OL") {
      flush();
      let i = 1;
      Array.from(el.children).forEach((liEl) => {
        if (liEl.tagName !== "LI") return;
        const li = liEl as HTMLElement;
        const st = deriveStyle(inh, li);
        const segs: RichSeg[] = [];
        li.childNodes.forEach((c) => {
          if (c.nodeType === 3) {
            const t = (c.nodeValue || "").replace(/\s+/g, " ");
            if (t) segs.push({ text: t, style: st });
          } else if (c.nodeType === 1 && !BLOCK_TAGS.has((c as HTMLElement).tagName)) {
            collectSegs(c, deriveStyle(st, c as HTMLElement), segs);
          }
        });
        paras.push({
          segs,
          list: tag === "OL" ? "ol" : "ul",
          index: i,
          indent: indent + 1,
          align: "left",
          col,
        });
        if (hasBlockChild(li)) walkBlocks(li, st, paras, indent + 1, col, ctx);
        i++;
      });
      return;
    }

    if (BLOCK_TAGS.has(tag)) {
      flush();
      const st = deriveStyle(inh, el);
      const childCol = col == null && isTwoColBlock(el) ? ++ctx.next : col;
      if (hasBlockChild(el)) {
        walkBlocks(el, st, paras, indent, childCol, ctx);
      } else {
        const segs: RichSeg[] = [];
        collectSegs(el, st, segs);
        paras.push({ segs, list: null, index: 0, indent, align: st.align, col: childCol });
      }
      return;
    }

    // inline element no nível atual
    if (!inline) inline = { segs: [], list: null, index: 0, indent, align: inh.align, col };
    collectSegs(el, deriveStyle(inh, el), inline.segs);
  });
  flush();
}

/**
 * Renderiza HTML formatado no documento jsPDF a partir de `y`, com quebra de
 * linha por largura, listas e quebra de página. Retorna o novo `y`.
 */
export function renderRichTextToPdf(
  doc: jsPDF,
  html: string,
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    maxY: number;
    baseFont: string;
    baseSize: number;
    newPage: () => number;
  },
): number {
  let y = opts.y;
  const { x, maxWidth, maxY, baseFont, baseSize, newPage } = opts;

  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body.firstElementChild;
  if (!root) return y;

  const base: InlineStyle = {
    bold: false,
    italic: false,
    underline: false,
    font: baseFont,
    size: baseSize,
    align: "left",
  };
  const paras: RichPara[] = [];
  walkBlocks(root, base, paras, 0, null, { next: 0 });

  const measure = (text: string, s: InlineStyle) => {
    doc.setFont(s.font, pdfFontStyle(s));
    doc.setFontSize(s.size);
    return doc.getTextWidth(text);
  };

  /**
   * Renderiza (ou apenas mede, quando `draw=false`) um parágrafo numa coluna de
   * largura `colWidth` iniciando em (`colX`, `startY`). Retorna o `y` final.
   */
  const renderPara = (
    para: RichPara,
    colX: number,
    startY: number,
    colWidth: number,
    draw: boolean,
    allowBreak: boolean,
  ): number => {
    let cy = startY;
    const indentMM = para.indent * 6;
    let marker = "";
    if (para.list === "ol") marker = `${para.index}. `;
    else if (para.list === "ul") marker = "•  ";
    const markerStyle: InlineStyle = para.segs[0]
      ? { ...para.segs[0].style, bold: false, italic: false, underline: false }
      : { ...base };
    const markerW = marker ? measure(marker, markerStyle) : 0;
    const leftX = colX + indentMM;
    const textX = leftX + markerW;
    const wrapW = Math.max(20, colWidth - indentMM - markerW);

    if (para.segs.length === 0) {
      cy += baseSize * PT_TO_MM * 1.4;
      if (allowBreak && cy > maxY) cy = newPage();
      return cy;
    }

    type Word = { text?: string; style?: InlineStyle; space?: boolean; brk?: boolean; w?: number };
    const words: Word[] = [];
    for (const seg of para.segs) {
      const chunks = seg.text.split("\n");
      chunks.forEach((chunk, ci) => {
        if (ci > 0) words.push({ brk: true });
        chunk.split(/(\s+)/).forEach((p) => {
          if (p === "") return;
          words.push({ text: p, style: seg.style, space: /^\s+$/.test(p) });
        });
      });
    }

    const lines: Word[][] = [];
    let line: Word[] = [];
    let lineW = 0;
    const pushLine = () => {
      while (line.length && line[line.length - 1].space) line.pop();
      lines.push(line);
      line = [];
      lineW = 0;
    };
    for (const word of words) {
      if (word.brk) {
        pushLine();
        continue;
      }
      const ww = measure(word.text!, word.style!);
      word.w = ww;
      if (word.space) {
        if (line.length === 0) continue;
        line.push(word);
        lineW += ww;
        continue;
      }
      if (lineW + ww > wrapW && line.length > 0) pushLine();
      line.push(word);
      lineW += ww;
    }
    pushLine();

    lines.forEach((ln, idx) => {
      const sizes = ln.map((s) => s.style?.size ?? baseSize);
      const maxSize = sizes.length ? Math.max(...sizes) : baseSize;
      const lh = maxSize * PT_TO_MM * 1.45;
      if (allowBreak && cy + lh > maxY) cy = newPage();
      const baseline = cy + lh * 0.75;

      if (draw && idx === 0 && marker) {
        doc.setFont(markerStyle.font, "normal");
        doc.setFontSize(markerStyle.size);
        doc.text(marker, leftX, baseline);
      }

      let startX = textX;
      if (para.align === "center" || para.align === "right") {
        const totalW = ln.reduce((a, s) => a + (s.w ?? 0), 0);
        if (para.align === "center") startX = colX + (colWidth - totalW) / 2;
        else startX = colX + colWidth - totalW;
      }

      if (draw) {
        let cx = startX;
        for (const seg of ln) {
          const st = seg.style!;
          doc.setFont(st.font, pdfFontStyle(st));
          doc.setFontSize(st.size);
          doc.text(seg.text!, cx, baseline);
          if (st.underline && !seg.space) {
            const uw = seg.w ?? doc.getTextWidth(seg.text!);
            doc.setLineWidth(0.2);
            doc.line(cx, baseline + 0.8, cx + uw, baseline + 0.8);
          }
          cx += seg.w ?? 0;
        }
      }
      cy += lh;
    });
    cy += baseSize * PT_TO_MM * 0.6;
    return cy;
  };

  // Agrupa parágrafos em itens: parágrafo simples ou bloco de duas colunas.
  type Item = { kind: "para"; para: RichPara } | { kind: "cols"; paras: RichPara[] };
  const items: Item[] = [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (p.col == null) {
      items.push({ kind: "para", para: p });
      continue;
    }
    const group: RichPara[] = [p];
    while (i + 1 < paras.length && paras[i + 1].col === p.col) {
      group.push(paras[++i]);
    }
    items.push({ kind: "cols", paras: group });
  }

  for (const item of items) {
    if (item.kind === "para") {
      y = renderPara(item.para, x, y, maxWidth, true, true);
      continue;
    }

    // Bloco de duas colunas: distribui os parágrafos equilibrando a altura.
    const colGap = 8;
    const colW = (maxWidth - colGap) / 2;
    const heights = item.paras.map((p) => renderPara(p, x, 0, colW, false, false));
    const total = heights.reduce((a, b) => a + b, 0);
    let acc = 0;
    let split = item.paras.length;
    for (let i = 0; i < item.paras.length; i++) {
      acc += heights[i];
      if (acc >= total / 2) {
        split = i + 1;
        break;
      }
    }
    const col1 = item.paras.slice(0, split);
    const col2 = item.paras.slice(split);
    const h1 = heights.slice(0, split).reduce((a, b) => a + b, 0);
    const h2 = heights.slice(split).reduce((a, b) => a + b, 0);
    const groupH = Math.max(h1, h2);
    if (y + groupH > maxY) y = newPage();

    let y1 = y;
    for (const p of col1) y1 = renderPara(p, x, y1, colW, true, false);
    let y2 = y;
    for (const p of col2) y2 = renderPara(p, x + colW + colGap, y2, colW, true, false);
    y = Math.max(y1, y2) + baseSize * PT_TO_MM * 0.4;
  }

  doc.setTextColor(0);
  return y;
}

/** Verifica se um HTML possui conteúdo de texto significativo. */
export function richHtmlHasContent(html?: string | null): boolean {
  if (!html) return false;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, "")
    .trim();
  return text.length > 0;
}

export function generateClinicalDocumentPDF(data: ClinicalDocData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const w = 210;
  const h = 297;
  const x = 0;
  const y = 0;

  const lh = data.letterhead;
  const pad = resolvePdfPadding(lh ?? null);
  const padL = lh ? pad.left : 20;
  const padR = lh ? pad.right : 20;
  const padT = lh ? pad.top : 42;
  const padB = lh ? pad.bottom : 16;
  const contentW = pdfContentW(w, { left: padL, right: padR });
  const contentX = x + padL;

  if (lh) paintLetterhead(doc, lh, w, h, x, y);

  let cy = y + padT;

  if (!lh) {
    cy = drawHeaderNoLetterhead(doc, data, x + w / 2, cy);
  }

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const title = CLINICAL_DOC_TITLE[data.type];
  const titleW = doc.getTextWidth(title);
  const titleX = contentX + contentW / 2;
  doc.text(title, titleX, cy, { align: "center" });
  cy += 2.5;
  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  doc.line(titleX - titleW / 2, cy, titleX + titleW / 2, cy);
  cy += 12;

  // Dados do paciente
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const age = ageFromBirthDate(data.patient.birth_date ?? null);
  const patientMeta = [
    data.patient.cpf ? `CPF: ${maskCPF(data.patient.cpf)}` : null,
    age !== null ? `${age} anos` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.setFont("helvetica", "bold");
  doc.text(data.patient.full_name, contentX, cy);
  if (patientMeta) {
    cy += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(patientMeta, contentX, cy);
  }
  cy += 12;

  const useRich = richHtmlHasContent(data.bodyHtml);

  const newPage = (): number => {
    doc.addPage();
    if (lh) paintLetterhead(doc, lh, w, h, x, y);
    return y + padT;
  };

  if (useRich) {
    // Corpo formatado (editor de texto rico) — renderizado conforme escrito.
    cy = renderRichTextToPdf(doc, data.bodyHtml!, {
      x: contentX,
      y: cy,
      maxWidth: contentW,
      maxY: h - padB - 6,
      baseFont: "helvetica",
      baseSize: 11,
      newPage,
    });
  } else {
    // Corpo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lineGap = 6.2;
    for (const para of data.bodyParagraphs) {
      if (!para.trim()) {
        cy += lineGap;
        continue;
      }
      const lines = doc.splitTextToSize(para, contentW);
      doc.text(lines, contentX, cy, { align: "justify", lineHeightFactor: 1.5, maxWidth: contentW });
      cy += lines.length * lineGap + 3;
    }

    // Exames numerados
    if (data.examItems && data.examItems.length > 0) {
      cy += 2;
      doc.setFontSize(11);
      data.examItems.forEach((exam, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${exam}`, contentW - 4);
        doc.text(lines, contentX + 2, cy);
        cy += lines.length * 5.4 + 1.5;
      });
    }

    // CID (atestado)
    if (data.cidLine) {
      cy += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(data.cidLine, contentX, cy);
      doc.setFont("helvetica", "normal");
      cy += 8;
    }
  }

  // Garante espaço para data + assinatura; se não couber, nova página.
  if (cy + 44 > h - padB) {
    cy = newPage();
  }

  // Local e data
  cy += 6;
  doc.setFontSize(10.5);
  const cityPart = data.clinic.city ? `${data.clinic.city}, ` : "";
  doc.text(`${cityPart}${fmtDateLongBR(data.date)}.`, contentX + contentW, cy, { align: "right" });

  // Assinatura (âncora fixa próxima ao rodapé)
  const signatureY = Math.max(cy + 24, h - padB - 34);
  const lineW = contentW * 0.58;
  const lineX = contentX + (contentW - lineW) / 2;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(lineX, signatureY, lineX + lineW, signatureY);
  let sy = signatureY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(formatSignedName(data.professional.full_name), contentX + contentW / 2, sy, { align: "center" });
  sy += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const sig = [data.professional.profession, data.professional.crm].filter(Boolean).join(" · ");
  if (sig) {
    doc.text(sig, contentX + contentW / 2, sy, { align: "center" });
    sy += 4.5;
  }

  if (!lh) {
    drawFooter(doc, x, w, y + h - padB);
  }

  return doc.output("blob");
}

/** Constrói o corpo padrão do documento a partir dos campos estruturados. */
export function buildClinicalDocBody(opts: {
  type: ClinicalDocType;
  patientName: string;
  professionalName: string;
  date: string;
  // atestado
  days?: number;
  rest?: string;
  // declaracao
  periodStart?: string;
  periodEnd?: string;
  companion?: string;
  // livre
  customBody?: string;
}): string[] {
  const dateBR = fmtDateBR(opts.date);
  if (opts.customBody && opts.customBody.trim()) {
    return opts.customBody.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim());
  }

  if (opts.type === "atestado") {
    const dias = opts.days && opts.days > 0
      ? ` pelo período de ${opts.days} ${opts.days === 1 ? "dia" : "dias"}`
      : "";
    const rest = opts.rest?.trim()
      ? ` ${opts.rest.trim()}`
      : " devendo permanecer em repouso/afastamento de suas atividades";
    return [
      `Atesto, para os devidos fins, que o(a) paciente ${opts.patientName} esteve sob meus cuidados médicos nesta data (${dateBR}), necessitando de afastamento de suas atividades${dias}.${rest}.`,
    ];
  }

  if (opts.type === "declaracao") {
    const periodo =
      opts.periodStart && opts.periodEnd
        ? ` no período das ${opts.periodStart} às ${opts.periodEnd}`
        : "";
    const acompanhante = opts.companion?.trim()
      ? ` Acompanhado(a) de ${opts.companion.trim()}.`
      : "";
    return [
      `Declaro, para os devidos fins, que o(a) paciente ${opts.patientName} compareceu a consulta/atendimento neste estabelecimento no dia ${dateBR}${periodo}.${acompanhante}`,
    ];
  }

  // exames
  return ["Solicito os exames abaixo relacionados:"];
}
