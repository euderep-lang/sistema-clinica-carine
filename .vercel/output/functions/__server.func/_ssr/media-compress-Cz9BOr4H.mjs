const IMAGE_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const PDF_TYPE = "application/pdf";
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Falha ao comprimir imagem.")),
      type,
      quality
    );
  });
}
async function compressImage(file, maxSizeKb = 400) {
  const img = await loadImage(file);
  const maxSide = 1280;
  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  ctx.drawImage(img, 0, 0, width, height);
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size / 1024 > maxSizeKb && quality > 0.35) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
async function compressForUpload(file) {
  if (IMAGE_TYPES.has(file.type) || file.type.startsWith("image/")) {
    const compressed = await compressImage(file);
    return { file: compressed, sizeKb: Math.round(compressed.size / 1024 * 10) / 10 };
  }
  if (file.type === PDF_TYPE) {
    const sizeKb = file.size / 1024;
    if (sizeKb > 2048) {
      throw new Error("PDF muito grande. Máximo 2 MB — prefira fotos ou PDFs menores.");
    }
    return { file, sizeKb: Math.round(sizeKb * 10) / 10 };
  }
  throw new Error("Formato não suportado. Use fotos (JPG, PNG) ou PDF.");
}
function formatFileSizeKb(kb) {
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
export {
  compressForUpload as c,
  formatFileSizeKb as f
};
