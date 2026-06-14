const DEFAULT_PDF_PADDING = { top: 12, right: 10, bottom: 10, left: 10 };
function resolvePdfPadding(lh) {
  if (lh) return lh.margins;
  return DEFAULT_PDF_PADDING;
}
function paintLetterhead(doc, lh, w, h, x = 0, y = 0) {
  if (!lh) return;
  doc.addImage(lh.imageData, lh.format, x, y, w, h);
}
function pdfContentX(pad, base = 0) {
  return base + pad.left;
}
function pdfContentW(w, pad) {
  return w - pad.left - pad.right;
}
export {
  paintLetterhead as a,
  pdfContentW as b,
  pdfContentX as p,
  resolvePdfPadding as r
};
