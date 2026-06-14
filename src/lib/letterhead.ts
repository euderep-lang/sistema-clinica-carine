import { supabase } from "@/integrations/supabase/client";

export interface LetterheadMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LetterheadSettings {
  path: string | null;
  margins: LetterheadMargins;
}

export const DEFAULT_LETTERHEAD_MARGINS: LetterheadMargins = {
  top: 45,
  right: 20,
  bottom: 25,
  left: 20,
};

export interface LetterheadPdfAsset {
  imageData: string;
  format: "JPEG" | "PNG" | "WEBP";
  margins: LetterheadMargins;
}

function mimeToFormat(mime: string): LetterheadPdfAsset["format"] {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  return "JPEG";
}

export async function loadLetterheadSettings(
  professionalId: string,
): Promise<LetterheadSettings> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "letterhead_path,letterhead_margin_top_mm,letterhead_margin_right_mm,letterhead_margin_bottom_mm,letterhead_margin_left_mm",
    )
    .eq("id", professionalId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    path: data?.letterhead_path ?? null,
    margins: {
      top: Number(data?.letterhead_margin_top_mm ?? DEFAULT_LETTERHEAD_MARGINS.top),
      right: Number(data?.letterhead_margin_right_mm ?? DEFAULT_LETTERHEAD_MARGINS.right),
      bottom: Number(data?.letterhead_margin_bottom_mm ?? DEFAULT_LETTERHEAD_MARGINS.bottom),
      left: Number(data?.letterhead_margin_left_mm ?? DEFAULT_LETTERHEAD_MARGINS.left),
    },
  };
}

export async function loadLetterheadForPdf(
  professionalId: string,
): Promise<LetterheadPdfAsset | null> {
  const settings = await loadLetterheadSettings(professionalId);
  if (!settings.path) return null;

  const { data: signed, error: signErr } = await supabase.storage
    .from("professional-assets")
    .createSignedUrl(settings.path, 120);
  if (signErr || !signed?.signedUrl) return null;

  const response = await fetch(signed.signedUrl);
  if (!response.ok) return null;

  const blob = await response.blob();
  const compressed = await compressLetterheadImage(blob);

  return {
    imageData: compressed.base64,
    format: compressed.format,
    margins: settings.margins,
  };
}

const LETTERHEAD_MAX_WIDTH = 1240;
const LETTERHEAD_JPEG_QUALITY = 0.82;

async function compressLetterheadImage(blob: Blob): Promise<{
  base64: string;
  format: LetterheadPdfAsset["format"];
}> {
  if (typeof document === "undefined") {
    const base64 = await blobToBase64(blob);
    return { base64, format: mimeToFormat(blob.type || "image/png") };
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, LETTERHEAD_MAX_WIDTH / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const base64 = await blobToBase64(blob);
      return { base64, format: mimeToFormat(blob.type || "image/png") };
    }
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", LETTERHEAD_JPEG_QUALITY);
    return { base64: dataUrl.split(",")[1] ?? "", format: "JPEG" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erro ao carregar imagem do papel timbrado"));
    img.src = src;
  });
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Erro ao ler imagem do papel timbrado"));
    reader.readAsDataURL(blob);
  });
}

export function letterheadStoragePath(professionalId: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "png";
  return `${professionalId}/letterhead.${ext}`;
}

/** Profissional cujo timbrado deve ser usado (filtro explícito ou usuário logado). */
export function resolveLetterheadProfessionalId(
  profile: { id: string; role: string } | null | undefined,
  explicitId?: string | null,
): string | null {
  if (explicitId) return explicitId;
  if (profile?.role === "professional") return profile.id;
  return null;
}
