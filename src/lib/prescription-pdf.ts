import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { LetterheadPdfAsset } from "@/lib/letterhead";
import { paintLetterhead, pdfContentW, resolvePdfPadding } from "@/lib/letterhead-pdf";
import { ITI_VALIDATOR_HOST, ITI_VALIDATOR_URL } from "@/lib/iti-validation";
import { TYPE_LABEL, type RxType } from "./medications";
import { maskCPF, ageFromBirthDate } from "./patient-utils";

export interface RxItem {
  position: number;
  medication: string;
  concentration?: string | null;
  pharmaceutical_form?: string | null;
  quantity?: string | null;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export interface RxData {
  type: RxType;
  date: string;
  notes?: string | null;
  clinic: {
    name: string;
    address?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    phone?: string | null;
    email?: string | null;
    cnpj?: string | null;
  };
  patient: {
    full_name: string;
    cpf?: string | null;
    birth_date?: string | null;
    address?: string | null;
  };
  professional: {
    full_name: string;
    crm?: string | null;
    specialty?: string | null;
    profession?: string | null;
    cpf?: string | null;
  };
  items: RxItem[];
  letterhead?: LetterheadPdfAsset | null;
  /** Quando true, inclui QR de validação ICP-Brasil acima da margem inferior. */
  digitalSignature?: boolean;
}

function validationHintY(pageY: number, pageH: number, padB: number) {
  return pageY + pageH - padB - 2;
}

function drawPadesValidationHint(
  doc: jsPDF,
  leftX: number,
  y: number,
  maxWidth: number,
  qrDataUrl: string,
) {
  const qrMm = 11;
  doc.addImage(qrDataUrl, "PNG", leftX, y - qrMm + 1.5, qrMm, qrMm);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(90);
  const line = `Assinatura digital PAdES/ICP-Brasil. Valide em ${ITI_VALIDATOR_HOST}`;
  const textX = leftX + qrMm + 2;
  const textW = Math.max(40, maxWidth - qrMm - 4);
  const lines = doc.splitTextToSize(line, textW);
  doc.text(lines, textX, y);
  doc.setTextColor(0);
}

const GOLD: [number, number, number] = [197, 179, 88];
const GREEN: [number, number, number] = [26, 48, 33];

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function formatRxQuantityLabel(quantity: string | null | undefined) {
  const q = quantity?.trim();
  return q ? q.toUpperCase() : "QUANTIDADE A SER COMPRADA";
}

function formatQuantityLine(form: string | null | undefined, quantity: string | null | undefined) {
  const q = quantity?.trim();
  if (!q) return form ?? "";
  if (/caixa/i.test(q)) return q;
  if (form) return `${form} — ${q}`;
  return q;
}

function buildPosology(it: RxItem) {
  return [
    it.dosage,
    it.route ? `via ${it.route.toLowerCase()}` : null,
    it.frequency,
    it.duration ? `por ${it.duration}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatSignedProfessionalName(fullName: string) {
  const name = fullName.trim();
  if (/^dr[a]?\.\s/i.test(name)) return name;
  return `Dr(a). ${name}`;
}

export const SIMPLE_RX_PAGE_H_MM = 297;
export const SIGNATURE_STAMP_GAP_MM = 5;

const VALIDATION_HINT_RESERVE_MM = 15;
const VALIDATION_HINT_GAP_MM = 3;
const SIGNATURE_BLOCK_HEIGHT_MM = 32;

/** Ancora fixa do bloco de assinatura (linha + nome + conselho + CPF) na receita simples. */
export function computeSimpleSignatureAnchor(
  pageH: number,
  padB: number,
  digitalSignature: boolean,
) {
  const reservedBelow =
    padB +
    (digitalSignature ? VALIDATION_HINT_RESERVE_MM + VALIDATION_HINT_GAP_MM : 0) +
    SIGNATURE_BLOCK_HEIGHT_MM;
  const signatureStartY = pageH - reservedBelow;
  const signatureLineY = signatureStartY + 12;
  return { signatureStartY, signatureLineY };
}

function drawSimpleProfessionalSignature(
  doc: jsPDF,
  rx: RxData,
  contentX: number,
  contentW: number,
  y: number,
) {
  let cy = y + 12;
  const lineW = contentW * 0.55;
  const lineX = contentX + (contentW - lineW) / 2;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(lineX, cy, lineX + lineW, cy);
  cy += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(formatSignedProfessionalName(rx.professional.full_name), contentX + contentW / 2, cy, {
    align: "center",
  });
  cy += 5;

  doc.setFontSize(9);
  if (rx.professional.crm?.trim()) {
    doc.text(rx.professional.crm.trim(), contentX + contentW / 2, cy, { align: "center" });
    cy += 4.5;
  }
  if (rx.professional.cpf?.trim()) {
    doc.text(`CPF: ${maskCPF(rx.professional.cpf)}`, contentX + contentW / 2, cy, { align: "center" });
    cy += 4.5;
  }

  return cy;
}

function drawSimpleFooter(doc: jsPDF, x: number, w: number, bottomY: number) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(x, bottomY - 7, x + w, bottomY - 7);
  doc.setFillColor(...GREEN);
  doc.rect(x, bottomY - 6, w, 5, "F");
}

function drawSimpleHeaderNoLetterhead(doc: jsPDF, rx: RxData, cx: number, y: number) {
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(rx.professional.full_name.toUpperCase(), cx, y, { align: "center" });
  y += 6;
  if (rx.professional.profession || rx.professional.crm) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const sub = [rx.professional.profession, rx.professional.crm].filter(Boolean).join(" · ").toUpperCase();
    doc.text(sub, cx, y, { align: "center" });
    y += 4;
  }
  doc.setTextColor(0);
  return y + 10;
}

function drawMedicationHeaderRow(
  doc: jsPDF,
  x: number,
  y: number,
  contentW: number,
  position: number,
  medication: string,
  concentration: string | null | undefined,
  quantity: string | null | undefined,
) {
  doc.setFontSize(10);
  const prefix = `${position}. `;
  const med = `${medication.toUpperCase()}${concentration ? ` ${concentration}` : ""}`;
  const right = formatRxQuantityLabel(quantity);

  doc.setFont("helvetica", "normal");
  const prefixW = doc.getTextWidth(prefix);
  doc.setFont("helvetica", "bold");
  const medW = doc.getTextWidth(med);
  doc.setFont("helvetica", "normal");
  const rightW = doc.getTextWidth(right);
  const dashW = doc.getTextWidth("-");

  const leftW = prefixW + medW;
  const midStart = x + leftW + 2;
  const midEnd = x + contentW - rightW - 2;
  const available = Math.max(0, midEnd - midStart);
  const dashCount = Math.max(6, Math.floor(available / dashW));

  doc.setFont("helvetica", "normal");
  doc.text(prefix, x, y);
  doc.setFont("helvetica", "bold");
  doc.text(med, x + prefixW, y);
  doc.setFont("helvetica", "normal");
  if (available > 8) {
    const dashes = "-".repeat(dashCount);
    const dashTextW = doc.getTextWidth(dashes);
    doc.text(dashes, midStart + (available - dashTextW) / 2, y);
  }
  doc.text(right, x + contentW, y, { align: "right" });
}

function drawSimplePrescription(
  doc: jsPDF,
  rx: RxData,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl?: string | null,
) {
  const lh = rx.letterhead;
  const pad = resolvePdfPadding(lh ?? null);
  const padL = lh ? pad.left : 18;
  const padR = lh ? pad.right : 18;
  const padT = lh ? pad.top : 42;
  const padB = lh ? pad.bottom : 14;
  const contentW = pdfContentW(w, { left: padL, right: padR });
  const contentX = x + padL;

  if (lh) paintLetterhead(doc, lh, w, h, x, y);

  let cy = y + padT;

  if (!lh) {
    cy = drawSimpleHeaderNoLetterhead(doc, rx, x + w / 2, cy);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const title = "RECEITUÁRIO";
  const titleW = doc.getTextWidth(title);
  const titleX = contentX + contentW / 2;
  doc.text(title, titleX, cy, { align: "center" });
  cy += 2.5;
  doc.setDrawColor(0);
  doc.setLineWidth(0.35);
  doc.line(titleX - titleW / 2, cy, titleX + titleW / 2, cy);
  cy += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DADOS DO PACIENTE", contentX, cy);
  cy += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(rx.patient.full_name, contentX, cy);
  cy += 5;
  const age = ageFromBirthDate(rx.patient.birth_date ?? null);
  const patientMeta = [
    rx.patient.cpf ? `CPF: ${maskCPF(rx.patient.cpf)}` : null,
    age !== null ? `Idade: ${age} anos` : null,
    `Data: ${fmtDate(rx.date)}`,
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.setFontSize(8);
  doc.text(patientMeta, contentX, cy);
  cy += 10;

  rx.items.forEach((it) => {
    if (!it.medication.trim()) return;

    drawMedicationHeaderRow(
      doc,
      contentX,
      cy,
      contentW,
      it.position,
      it.medication,
      it.concentration,
      it.quantity,
    );
    cy += 5.5;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const pos = buildPosology(it);
    if (pos) {
      const lines = doc.splitTextToSize(`Tomar ${pos}.`, contentW - 8);
      doc.text(lines, contentX + 6, cy);
      cy += lines.length * 4.2;
    }
    if (it.instructions) {
      const lines = doc.splitTextToSize(it.instructions, contentW - 8);
      doc.text(lines, contentX + 6, cy);
      cy += lines.length * 4.2;
    }
    doc.setFont("helvetica", "normal");
    cy += 4;
  });

  if (rx.notes) {
    cy += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(rx.notes, contentW);
    doc.text(lines, contentX, cy);
    cy += lines.length * 4;
    doc.setFont("helvetica", "normal");
  }

  const signatureY = rx.digitalSignature
    ? computeSimpleSignatureAnchor(h, padB, true).signatureStartY
    : cy;
  drawSimpleProfessionalSignature(doc, rx, contentX, contentW, signatureY);

  if (!lh) {
    drawSimpleFooter(doc, x, w, y + h - padB);
  }
  if (rx.digitalSignature && qrDataUrl) {
    drawPadesValidationHint(
      doc,
      contentX,
      validationHintY(y, h, padB),
      contentW,
      qrDataUrl,
    );
  }
}

function drawStandardPrescription(
  doc: jsPDF,
  rx: RxData,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl?: string | null,
  label?: string,
) {
  const lh = rx.letterhead;
  const pad = resolvePdfPadding(lh ?? null);
  const padL = lh ? pad.left : 8;
  const padR = lh ? pad.right : 8;
  const padT = lh ? pad.top : 8;
  const padB = lh ? pad.bottom : 8;
  const contentW = lh ? pdfContentW(w, pad) : w - padL - padR;
  let cy = y + padT;

  const accent =
    rx.type === "especial" || rx.type === "especial_2vias"
      ? ([37, 99, 235] as [number, number, number])
      : ([217, 119, 6] as [number, number, number]);

  if (lh) paintLetterhead(doc, lh, w, h, x, y);

  if (label) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(label, x + w - padR, y + Math.min(padT * 0.35, 8), { align: "right" });
    doc.setTextColor(0);
  }

  if (!lh) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(rx.clinic.name, x + padL, cy);
    cy += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (rx.clinic.address) {
      doc.text(rx.clinic.address, x + padL, cy);
      cy += 4;
    }
    const line2 = [rx.clinic.phone, rx.clinic.email].filter(Boolean).join(" · ");
    if (line2) {
      doc.text(line2, x + padL, cy);
      cy += 4;
    }
    if (rx.clinic.cnpj) {
      doc.text(`CNPJ: ${rx.clinic.cnpj}`, x + padL, cy);
      cy += 4;
    }
    cy += 2;
  }

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  doc.line(x + padL, cy + 1, x + w - padR, cy + 1);
  cy += 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(TYPE_LABEL[rx.type].toUpperCase(), x + padL + contentW / 2, cy, { align: "center" });
  doc.setTextColor(0);
  cy += 5;
  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(x + padL, cy, x + w - padR, cy);
  cy += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Paciente: ${rx.patient.full_name}`, x + padL, cy);
  doc.text(`Data: ${fmtDate(rx.date)}`, x + w - padR, cy, { align: "right" });
  cy += 4.5;
  const age = ageFromBirthDate(rx.patient.birth_date ?? null);
  doc.text(`CPF: ${rx.patient.cpf ? maskCPF(rx.patient.cpf) : "—"}`, x + padL, cy);
  if (age !== null) doc.text(`Idade: ${age} anos`, x + w - padR, cy, { align: "right" });
  cy += 6;

  doc.setFontSize(10);
  rx.items.forEach((it) => {
    const head = `${it.position}. ${it.medication.toUpperCase()}${it.concentration ? ` ${it.concentration}` : ""}`;
    doc.setFont("helvetica", "bold");
    const headLines = doc.splitTextToSize(head, contentW);
    doc.text(headLines, x + padL, cy);
    cy += headLines.length * 4.5;
    doc.setFont("helvetica", "normal");
    const sub: string[] = [];
    const qtyLine = formatQuantityLine(it.pharmaceutical_form, it.quantity);
    if (qtyLine) sub.push(qtyLine);
    const pos = buildPosology(it);
    if (pos) sub.push(`Tomar ${pos}.`);
    if (it.instructions) sub.push(it.instructions);
    sub.forEach((s) => {
      const lines = doc.splitTextToSize(s, contentW - 4);
      doc.text(lines, x + padL + 4, cy);
      cy += lines.length * 4.2;
    });
    cy += 2;
  });

  if (rx.notes) {
    cy += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(`Obs.: ${rx.notes}`, contentW);
    doc.text(lines, x + padL, cy);
    cy += lines.length * 4;
    doc.setFont("helvetica", "normal");
  }

  const fy = y + h - padB - 22;
  doc.setDrawColor(120);
  doc.line(x + padL, fy, x + w - padR, fy);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(rx.professional.full_name, x + padL + contentW / 2, fy + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const cf = [rx.professional.crm, rx.professional.profession].filter(Boolean).join(" · ");
  if (cf) doc.text(cf, x + padL + contentW / 2, fy + 9, { align: "center" });
  doc.text("Assinatura: _____________________________", x + padL + contentW / 2, fy + 16, {
    align: "center",
  });
  if (rx.digitalSignature && qrDataUrl) {
    drawPadesValidationHint(
      doc,
      x + padL,
      validationHintY(y, h, padB),
      contentW,
      qrDataUrl,
    );
  }
}

const SPECIAL_CONTROL_FOOTER_H = 52;

function drawEmitterIdentificationBox(
  doc: jsPDF,
  rx: RxData,
  x: number,
  y: number,
  w: number,
) {
  const h = 44;
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h);

  const cx = x + w / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("IDENTIFICAÇÃO DO EMITENTE", cx, y + 6, { align: "center" });

  let ey = y + 12;
  doc.setFontSize(10.5);
  doc.text(rx.professional.full_name, cx, ey, { align: "center", maxWidth: w - 6 });
  ey += 6;

  doc.setFontSize(9);
  const detailLines = [
    rx.professional.profession?.trim() || null,
    rx.professional.crm?.trim() || null,
    rx.clinic.address_line1?.trim() || null,
    rx.clinic.address_line2?.trim() || null,
    rx.clinic.phone?.trim() ? `Tel: ${rx.clinic.phone.trim()}` : null,
  ].filter(Boolean) as string[];

  for (const line of detailLines) {
    doc.text(line, cx, ey, { align: "center", maxWidth: w - 6 });
    ey += 4.8;
  }

  return y + h;
}

function drawSpecialControlFooter(
  doc: jsPDF,
  rx: RxData,
  contentX: number,
  contentW: number,
  pageBottom: number,
) {
  const boxesH = 38;
  const signBlockH = 11;
  const boxesY = pageBottom - boxesH;
  const signY = boxesY - signBlockH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`DATA: ${fmtDate(rx.date)}`, contentX, signY);

  const sigX = contentX + contentW * 0.48;
  const sigW = contentX + contentW - sigX;
  doc.line(sigX, signY + 0.8, contentX + contentW, signY + 0.8);
  doc.setFontSize(7);
  doc.text("Assinatura e Carimbo do Emitente", sigX + sigW / 2, signY + 4.5, { align: "center" });

  const gap = 4;
  const boxWidth = (contentW - gap) / 2;
  const leftBoxX = contentX;
  const rightBoxX = contentX + boxWidth + gap;

  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(leftBoxX, boxesY, boxWidth, boxesH);
  doc.rect(rightBoxX, boxesY, boxWidth, boxesH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("IDENTIFICAÇÃO DO COMPRADOR", leftBoxX + boxWidth / 2, boxesY + 4.5, { align: "center" });
  doc.text("IDENTIFICAÇÃO DO FORNECEDOR", rightBoxX + boxWidth / 2, boxesY + 4.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const buyerFields = [
    "Nome: _____________________________________________",
    "Ident.: ___________________  Org. Emissor: _____________",
    "End.: _______________________________________________",
    "Cidade: __________________________  UF: ____",
    "Telefone: ___________________________________________",
  ];
  let by = boxesY + 9;
  buyerFields.forEach((f) => {
    doc.text(f, leftBoxX + 2, by);
    by += 4.8;
  });

  doc.setFontSize(6);
  doc.text(
    "ASSINATURA DO FARMACÊUTICO   DATA: ___/___/___",
    rightBoxX + boxWidth / 2,
    boxesY + boxesH - 4,
    { align: "center" },
  );

  return signY;
}

function drawSpecialControlCopy(
  doc: jsPDF,
  rx: RxData,
  viaLabel: string,
  x: number,
  y: number,
  w: number,
  h: number,
  qrDataUrl?: string | null,
) {
  const m = 12;
  const padB = rx.letterhead?.margins.bottom ?? m;
  const contentX = x + m;
  const contentW = w - m * 2;
  const pageCx = x + w / 2;
  const pageBottom = y + h - m;
  const footerTop = pageBottom - SPECIAL_CONTROL_FOOTER_H;
  const maxPrescriptionY = footerTop - 6;

  let cy = y + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RECEITUÁRIO CONTROLE ESPECIAL", pageCx, cy, { align: "center" });
  cy += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(viaLabel, x + w - m, cy, { align: "right" });
  cy += 6;

  const emitterW = 108;
  cy = drawEmitterIdentificationBox(doc, rx, contentX, cy, emitterW) + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Paciente:", contentX, cy);
  doc.text(rx.patient.full_name, contentX + 21, cy - 0.3);
  doc.line(contentX + 20, cy + 0.8, contentX + contentW, cy + 0.8);
  cy += 7;

  doc.setFontSize(9);
  doc.text("Endereço:", contentX, cy);
  const addr = rx.patient.address?.trim() ?? "";
  if (addr) {
    const addrLines = doc.splitTextToSize(addr, contentW - 24);
    addrLines.forEach((line: string, i: number) => {
      doc.text(line, contentX + 21, cy - 0.3 + i * 4.5);
      doc.line(contentX + 20, cy + 0.8 + i * 4.5, contentX + contentW, cy + 0.8 + i * 4.5);
    });
    cy += Math.max(7, addrLines.length * 4.5 + 2);
  } else {
    doc.line(contentX + 20, cy + 0.8, contentX + contentW, cy + 0.8);
    cy += 6;
    doc.line(contentX + 20, cy + 0.8, contentX + contentW, cy + 0.8);
    cy += 7;
  }

  doc.setFontSize(9);
  doc.text("Prescrição:", contentX, cy);
  cy += 10;

  rx.items.forEach((it) => {
    if (!it.medication.trim() || cy > maxPrescriptionY - 12) return;

    drawMedicationHeaderRow(
      doc,
      contentX,
      cy,
      contentW,
      it.position,
      it.medication,
      it.concentration,
      it.quantity,
    );
    cy += 5;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const pos = buildPosology(it);
    if (pos && cy <= maxPrescriptionY) {
      const lines = doc.splitTextToSize(`Tomar ${pos}.`, contentW - 6);
      doc.text(lines, contentX + 4, cy);
      cy += lines.length * 3.8;
    }
    if (it.instructions && cy <= maxPrescriptionY) {
      const lines = doc.splitTextToSize(it.instructions, contentW - 6);
      doc.text(lines, contentX + 4, cy);
      cy += lines.length * 3.8;
    }
    doc.setFont("helvetica", "normal");
    cy += 2.5;
  });

  if (rx.notes && cy <= maxPrescriptionY) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(rx.notes, contentW);
    doc.text(lines, contentX, cy);
    doc.setFont("helvetica", "normal");
  }

  drawSpecialControlFooter(doc, rx, contentX, contentW, pageBottom);
  if (rx.digitalSignature && qrDataUrl) {
    drawPadesValidationHint(
      doc,
      contentX,
      validationHintY(y, h, padB),
      contentW,
      qrDataUrl,
    );
  }
}

function drawOfficialSpecialControlTwoCopy(doc: jsPDF, rx: RxData, qrDataUrl?: string | null) {
  const pageW = 210;
  const pageH = 297;
  drawSpecialControlCopy(doc, rx, "1ª VIA - RETENÇÃO DA FARMÁCIA", 0, 0, pageW, pageH, qrDataUrl);
  doc.addPage();
  drawSpecialControlCopy(doc, rx, "2ª VIA - ORIENTAÇÃO DO PACIENTE", 0, 0, pageW, pageH, qrDataUrl);
}

export async function generatePrescriptionPDF(rx: RxData): Promise<Blob> {
  const qrDataUrl = rx.digitalSignature
    ? await QRCode.toDataURL(ITI_VALIDATOR_URL, { width: 120, margin: 0 })
    : null;

  if (rx.type === "simples") {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    drawSimplePrescription(doc, rx, 0, 0, 210, 297, qrDataUrl);
    return doc.output("blob");
  }

  if (rx.type === "controlada" || rx.type === "especial_2vias") {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    drawOfficialSpecialControlTwoCopy(doc, rx, qrDataUrl);
    return doc.output("blob");
  }

  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  drawStandardPrescription(doc, rx, 0, 0, 148, 210, qrDataUrl);
  return doc.output("blob");
}
