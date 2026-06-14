import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { r as resolvePdfPadding, b as pdfContentW, a as paintLetterhead } from "./letterhead-pdf-4K2s0GWH.js";
import { d as ageFromBirthDate, m as maskCPF } from "./patient-utils-YNqCHR6o.js";
const ITI_VALIDATOR_URL = "https://validar.iti.gov.br";
const ITI_VALIDATOR_HOST = "validar.iti.gov.br";
const MEDICATIONS = [
  "Amoxicilina",
  "Azitromicina",
  "Cefalexina",
  "Ciprofloxacino",
  "Metronidazol",
  "Dipirona",
  "Paracetamol",
  "Ibuprofeno",
  "Nimesulida",
  "Dexametasona",
  "Prednisona",
  "Omeprazol",
  "Pantoprazol",
  "Ranitidina",
  "Metoclopramida",
  "Ondansetrona",
  "Loratadina",
  "Cetirizina",
  "Desloratadina",
  "Fluconazol",
  "Nistatina",
  "Aciclovir",
  "Ivermectina",
  "Albendazol",
  "Metformina",
  "Glibenclamida",
  "Insulina NPH",
  "Enalapril",
  "Losartana",
  "Anlodipino",
  "Atenolol",
  "Propranolol",
  "Hidroclorotiazida",
  "Furosemida",
  "Espironolactona",
  "Sinvastatina",
  "Atorvastatina",
  "AAS",
  "Clopidogrel",
  "Warfarina",
  "Heparina",
  "Clonazepam",
  "Alprazolam",
  "Diazepam",
  "Bromazepam",
  "Zolpidem",
  "Fluoxetina",
  "Sertralina",
  "Escitalopram",
  "Venlafaxina",
  "Bupropiona",
  "Amitriptilina",
  "Nortriptilina",
  "Haloperidol",
  "Risperidona",
  "Quetiapina",
  "Olanzapina",
  "Carbamazepina",
  "Fenitoína",
  "Valproato",
  "Topiramato",
  "Gabapentina",
  "Pregabalina",
  "Tramadol",
  "Codeína",
  "Morfina",
  "Oxicodona",
  "Metadona",
  "Dorflex",
  "Miosan",
  "Ciclobenzaprina",
  "Carisoprodol",
  "Meloxicam",
  "Piroxicam",
  "Celecoxibe",
  "Colchicina",
  "Alopurinol",
  "Levotiroxina",
  "Carbonato de Cálcio",
  "Vitamina D",
  "Sulfato Ferroso",
  "Ácido Fólico",
  "Vitamina B12",
  "Complexo B"
];
const FORMS = ["Comprimido", "Cápsula", "Solução oral", "Pomada", "Creme", "Gel", "Injetável", "Gotas", "Spray", "Supositório", "Xarope", "Outro"];
const ROUTES = ["Oral", "Tópica", "Inalatória", "Subcutânea", "Intramuscular", "Endovenosa", "Ocular", "Nasal", "Retal"];
const FREQUENCIES = ["1x ao dia", "2x ao dia", "3x ao dia", "4x ao dia", "A cada 6 horas", "A cada 8 horas", "A cada 12 horas", "Se necessário", "Uso contínuo", "Outro"];
const DOSE_UNITS = ["comprimido(s)", "mL", "gota(s)", "aplicação(ões)", "cápsula(s)"];
const QUANTITY_MODES = [
  { value: "unidade", label: "Por unidade" },
  { value: "caixa", label: "Por caixa" }
];
const FORM_UNIT = {
  Comprimido: "comprimido",
  Cápsula: "cápsula",
  "Solução oral": "frasco",
  Pomada: "bisnaga",
  Creme: "bisnaga",
  Gel: "bisnaga",
  Injetável: "ampola",
  Gotas: "frasco",
  Spray: "frasco",
  Supositório: "supositório",
  Xarope: "frasco"
};
function pluralizePt(word, count) {
  if (count === 1) return word;
  if (word.endsWith("ão")) return `${word.slice(0, -2)}ões`;
  if (word.endsWith("m")) return `${word}ns`;
  return `${word}s`;
}
function formatPrescriptionQuantity(mode, value, pharmaceuticalForm) {
  const raw = value.trim();
  if (!raw) return "";
  const num = Number(raw.replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return raw;
  const n = Number.isInteger(num) ? num : num;
  const nLabel = Number.isInteger(num) ? String(num) : String(num);
  if (mode === "caixa") {
    return n === 1 ? "1 caixa" : `${nLabel} caixas`;
  }
  const form = pharmaceuticalForm?.trim();
  const unit = form ? FORM_UNIT[form] ?? form.toLowerCase() : "unidade";
  return `${nLabel} ${pluralizePt(unit, n)}`;
}
function parsePrescriptionQuantity(stored) {
  const q = (stored ?? "").trim();
  if (!q) return { mode: "unidade", value: "" };
  const caixaMatch = q.match(/^(\d+(?:[.,]\d+)?)\s+caixas?$/i);
  if (caixaMatch) return { mode: "caixa", value: caixaMatch[1].replace(",", ".") };
  const numMatch = q.match(/^(\d+(?:[.,]\d+)?)/);
  return { mode: "unidade", value: numMatch ? numMatch[1].replace(",", ".") : q };
}
const TYPE_LABEL = {
  simples: "Receita Médica Simples",
  controlada: "Receituário Controle Especial",
  especial: "Receita Especial",
  especial_2vias: "Receituário Controle Especial"
};
function validationHintY(pageY, pageH, padB) {
  return pageY + pageH - padB - 2;
}
function drawPadesValidationHint(doc, leftX, y, maxWidth, qrDataUrl) {
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
const GOLD = [197, 179, 88];
const GREEN = [26, 48, 33];
function fmtDate(d) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatRxQuantityLabel(quantity) {
  const q = quantity?.trim();
  return q ? q.toUpperCase() : "QUANTIDADE A SER COMPRADA";
}
function formatQuantityLine(form, quantity) {
  const q = quantity?.trim();
  if (!q) return form ?? "";
  if (/caixa/i.test(q)) return q;
  if (form) return `${form} — ${q}`;
  return q;
}
function buildPosology(it) {
  return [
    it.dosage,
    it.route ? `via ${it.route.toLowerCase()}` : null,
    it.frequency,
    it.duration ? `por ${it.duration}` : null
  ].filter(Boolean).join(", ");
}
function formatSignedProfessionalName(fullName) {
  const name = fullName.trim();
  if (/^dr[a]?\.\s/i.test(name)) return name;
  return `Dr(a). ${name}`;
}
const SIMPLE_RX_PAGE_H_MM = 297;
const SIGNATURE_STAMP_GAP_MM = 5;
const VALIDATION_HINT_RESERVE_MM = 15;
const VALIDATION_HINT_GAP_MM = 3;
const SIGNATURE_BLOCK_HEIGHT_MM = 32;
function computeSimpleSignatureAnchor(pageH, padB, digitalSignature) {
  const reservedBelow = padB + (VALIDATION_HINT_RESERVE_MM + VALIDATION_HINT_GAP_MM) + SIGNATURE_BLOCK_HEIGHT_MM;
  const signatureStartY = pageH - reservedBelow;
  const signatureLineY = signatureStartY + 12;
  return { signatureStartY, signatureLineY };
}
function drawSimpleProfessionalSignature(doc, rx, contentX, contentW, y) {
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
    align: "center"
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
function drawSimpleFooter(doc, x, w, bottomY) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(x, bottomY - 7, x + w, bottomY - 7);
  doc.setFillColor(...GREEN);
  doc.rect(x, bottomY - 6, w, 5, "F");
}
function drawSimpleHeaderNoLetterhead(doc, rx, cx, y) {
  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(rx.professional.full_name.toUpperCase(), cx, y, { align: "center" });
  y += 6;
  if (rx.professional.specialty || rx.professional.crm) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const sub = [rx.professional.specialty, rx.professional.crm].filter(Boolean).join(" · ").toUpperCase();
    doc.text(sub, cx, y, { align: "center" });
    y += 4;
  }
  doc.setTextColor(0);
  return y + 10;
}
function drawMedicationHeaderRow(doc, x, y, contentW, position, medication, concentration, quantity) {
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
function drawSimplePrescription(doc, rx, x, y, w, h, qrDataUrl) {
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
    `Data: ${fmtDate(rx.date)}`
  ].filter(Boolean).join("   ·   ");
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
      it.quantity
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
  const signatureY = rx.digitalSignature ? computeSimpleSignatureAnchor(h, padB).signatureStartY : cy;
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
      qrDataUrl
    );
  }
}
function drawStandardPrescription(doc, rx, x, y, w, h, qrDataUrl, label) {
  const lh = rx.letterhead;
  const pad = resolvePdfPadding(lh ?? null);
  const padL = lh ? pad.left : 8;
  const padR = lh ? pad.right : 8;
  const padT = lh ? pad.top : 8;
  const padB = lh ? pad.bottom : 8;
  const contentW = lh ? pdfContentW(w, pad) : w - padL - padR;
  let cy = y + padT;
  const accent = rx.type === "especial" || rx.type === "especial_2vias" ? [37, 99, 235] : [217, 119, 6];
  if (lh) paintLetterhead(doc, lh, w, h, x, y);
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
    const sub = [];
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
  const cf = [rx.professional.crm, rx.professional.specialty].filter(Boolean).join(" · ");
  if (cf) doc.text(cf, x + padL + contentW / 2, fy + 9, { align: "center" });
  doc.text("Assinatura: _____________________________", x + padL + contentW / 2, fy + 16, {
    align: "center"
  });
  if (rx.digitalSignature && qrDataUrl) {
    drawPadesValidationHint(
      doc,
      x + padL,
      validationHintY(y, h, padB),
      contentW,
      qrDataUrl
    );
  }
}
const SPECIAL_CONTROL_FOOTER_H = 52;
function drawEmitterIdentificationBox(doc, rx, x, y, w) {
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
    rx.professional.specialty?.trim() || null,
    rx.professional.crm?.trim() || null,
    rx.clinic.address_line1?.trim() || null,
    rx.clinic.address_line2?.trim() || null,
    rx.clinic.phone?.trim() ? `Tel: ${rx.clinic.phone.trim()}` : null
  ].filter(Boolean);
  for (const line of detailLines) {
    doc.text(line, cx, ey, { align: "center", maxWidth: w - 6 });
    ey += 4.8;
  }
  return y + h;
}
function drawSpecialControlFooter(doc, rx, contentX, contentW, pageBottom) {
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
    "Telefone: ___________________________________________"
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
    { align: "center" }
  );
  return signY;
}
function drawSpecialControlCopy(doc, rx, viaLabel, x, y, w, h, qrDataUrl) {
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
    addrLines.forEach((line, i) => {
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
      it.quantity
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
      qrDataUrl
    );
  }
}
function drawOfficialSpecialControlTwoCopy(doc, rx, qrDataUrl) {
  const pageW = 210;
  const pageH = 297;
  drawSpecialControlCopy(doc, rx, "1ª VIA - RETENÇÃO DA FARMÁCIA", 0, 0, pageW, pageH, qrDataUrl);
  doc.addPage();
  drawSpecialControlCopy(doc, rx, "2ª VIA - ORIENTAÇÃO DO PACIENTE", 0, 0, pageW, pageH, qrDataUrl);
}
async function generatePrescriptionPDF(rx) {
  const qrDataUrl = rx.digitalSignature ? await QRCode.toDataURL(ITI_VALIDATOR_URL, { width: 120, margin: 0 }) : null;
  if (rx.type === "simples") {
    const doc2 = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    drawSimplePrescription(doc2, rx, 0, 0, 210, 297, qrDataUrl);
    return doc2.output("blob");
  }
  if (rx.type === "controlada" || rx.type === "especial_2vias") {
    const doc2 = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    drawOfficialSpecialControlTwoCopy(doc2, rx, qrDataUrl);
    return doc2.output("blob");
  }
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  drawStandardPrescription(doc, rx, 0, 0, 148, 210, qrDataUrl);
  return doc.output("blob");
}
export {
  DOSE_UNITS as D,
  FORMS as F,
  ITI_VALIDATOR_URL as I,
  MEDICATIONS as M,
  QUANTITY_MODES as Q,
  ROUTES as R,
  SIGNATURE_STAMP_GAP_MM as S,
  TYPE_LABEL as T,
  FREQUENCIES as a,
  SIMPLE_RX_PAGE_H_MM as b,
  computeSimpleSignatureAnchor as c,
  formatRxQuantityLabel as d,
  formatSignedProfessionalName as e,
  formatPrescriptionQuantity as f,
  generatePrescriptionPDF as g,
  parsePrescriptionQuantity as p
};
