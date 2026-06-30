import lamejs from "lamejs";
import { isIosSafari } from "@/lib/crm-pwa";

const WHATSAPP_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/aac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/x-caf",
]);

function mimeFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "m4a":
    case "aac":
    case "caf":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "wav":
      return "audio/wav";
    default:
      return "";
  }
}

export function isWhatsAppReadyAudio(mime: string): boolean {
  const m = mime.toLowerCase();
  if (WHATSAPP_AUDIO_MIMES.has(m)) return true;
  return m.includes("ogg") || m.includes("mpeg") || m.includes("mp3") || m.includes("mp4") || m.includes("m4a");
}

function getMp3Encoder() {
  const lib = lamejs as typeof lamejs & { default?: { Mp3Encoder?: typeof lamejs.Mp3Encoder } };
  const Enc = lib.Mp3Encoder ?? lib.default?.Mp3Encoder;
  if (!Enc) throw new Error("Conversão MP3 indisponível neste navegador.");
  return Enc;
}

function floatTo16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

async function convertAudioToMp3(file: File): Promise<File> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const sampleRate = decoded.sampleRate;
    const left = floatTo16(decoded.getChannelData(0));
    const channels = decoded.numberOfChannels;
    const right = channels > 1 ? floatTo16(decoded.getChannelData(1)) : left;

    const Mp3Encoder = getMp3Encoder();
    const encoder = new Mp3Encoder(channels, sampleRate, 128);
    const mp3Chunks: Int8Array[] = [];
    const block = 1152;

    for (let i = 0; i < left.length; i += block) {
      const l = left.subarray(i, i + block);
      const r = right.subarray(i, i + block);
      const buf = channels > 1 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
      if (buf.length > 0) mp3Chunks.push(buf);
    }

    const tail = encoder.flush();
    if (tail.length > 0) mp3Chunks.push(tail);

    const blob = new Blob(mp3Chunks as BlobPart[], { type: "audio/mpeg" });
    const baseName = file.name.replace(/\.[^.]+$/, "") || `audio-${Date.now()}`;
    return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    if (/decode|encoding|not supported/i.test(msg)) {
      throw new Error(
        "Este aparelho não converteu a gravação. Use o clipe para anexar MP3, OGG ou M4A.",
      );
    }
    throw new Error(`Falha ao converter áudio: ${msg}`);
  } finally {
    await ctx.close();
  }
}

/** Converte WebM/gravação do browser para MP3 (formato aceito pela Z-API / WhatsApp). */
export async function prepareAudioFileForWhatsApp(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  if (isWhatsAppReadyAudio(mime)) {
    const normalizedMime =
      mime.includes("mp4") || mime.includes("m4a") || mime.includes("caf")
        ? "audio/mp4"
        : mime.includes("ogg")
          ? "audio/ogg"
          : mime.includes("mpeg") || mime.includes("mp3")
            ? "audio/mpeg"
            : mime;
    if (!file.type || file.type !== normalizedMime) {
      return new File([file], file.name.replace(/\.\w+$/, "") + (normalizedMime.includes("mp4") ? ".m4a" : normalizedMime.includes("ogg") ? ".ogg" : ".mp3"), {
        type: normalizedMime,
      });
    }
    return file;
  }
  return convertAudioToMp3(file);
}

export function canRecordAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export { guessMediaTypeFromFile } from "@/lib/wa-media-prepare";
