import { jsx } from "react/jsx-runtime";
import { GripVertical } from "lucide-react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { E as cn } from "./router-D_mhnWOa.js";
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
const ResizablePanelGroup = ({ className, ...props }) => /* @__PURE__ */ jsx(
  Group,
  {
    className: cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className),
    ...props
  }
);
const ResizablePanel = Panel;
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  Separator,
  {
    className: cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    ),
    ...props,
    children: withHandle && /* @__PURE__ */ jsx("div", { className: "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border", children: /* @__PURE__ */ jsx(GripVertical, { className: "h-2.5 w-2.5" }) })
  }
);
export {
  ResizablePanelGroup as R,
  ResizablePanel as a,
  ResizableHandle as b,
  compressForUpload as c,
  formatFileSizeKb as f
};
