import { compressForUpload } from "@/lib/media-compress";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "ogg", "m4a", "aac", "webm", "wav", "opus"]);

function mimeFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
    case "heif":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "m4a":
    case "aac":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "wav":
      return "audio/wav";
    default:
      return "";
  }
}

export function guessMediaTypeFromFile(file: File): "image" | "audio" | "video" | "document" {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && IMAGE_EXTENSIONS.has(ext)) return "image";
  if (ext && AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (ext === "pdf") return "document";
  return "document";
}

/** Comprime fotos para JPEG leve (Z-API / WhatsApp). */
export async function prepareImageFileForWhatsApp(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  if (mime.includes("heic") || mime.includes("heif")) {
    throw new Error(
      "Fotos HEIC não são suportadas aqui. No iPhone: Ajustes → Câmera → Formatos → Mais compatível, ou envie JPG/PNG.",
    );
  }
  try {
    const { file: compressed } = await compressForUpload(file);
    return compressed;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("Formato não suportado")) {
      throw new Error("Use JPG, PNG ou WebP para enviar fotos.");
    }
    throw e;
  }
}

/** Prepara PDF para envio como documento. */
export async function prepareDocumentFileForWhatsApp(file: File): Promise<File> {
  const { file: prepared } = await compressForUpload(file);
  return prepared;
}
