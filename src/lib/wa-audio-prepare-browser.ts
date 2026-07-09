import { Mp3Encoder } from "@breezystack/lamejs";
import { isIosSafari, isMobileViewport } from "@/lib/crm-pwa";
import {
  isRecordedVoiceFile,
  isWhatsAppReadyAudio,
  mimeFromFilename,
} from "@/lib/wa-audio-prepare";

function isMobileAudioDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    isMobileViewport() ||
    isIosSafari() ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function floatTo16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

const VOICE_SAMPLE_RATE = 44_100;
const VOICE_BITRATE = 128;

async function resampleToMonoVoiceBuffer(decoded: AudioBuffer): Promise<{ left: Int16Array; sampleRate: number }> {
  const durationSec = decoded.duration;
  const frameCount = Math.max(1, Math.ceil(durationSec * VOICE_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frameCount, VOICE_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return { left: floatTo16(rendered.getChannelData(0)), sampleRate: VOICE_SAMPLE_RATE };
}

async function encodeVoiceBufferToMp3(decoded: AudioBuffer): Promise<Blob> {
  const { left, sampleRate } = await resampleToMonoVoiceBuffer(decoded);
  const encoder = new Mp3Encoder(1, sampleRate, VOICE_BITRATE);
  const mp3Chunks: Uint8Array[] = [];
  const block = 1152;

  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, i + block);
    const buf = encoder.encodeBuffer(l);
    if (buf.length > 0) mp3Chunks.push(buf);
  }

  const tail = encoder.flush();
  if (tail.length > 0) mp3Chunks.push(tail);

  return new Blob(mp3Chunks as BlobPart[], { type: "audio/mpeg" });
}

async function convertAudioToMp3(file: File): Promise<File> {
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const blob = await encodeVoiceBufferToMp3(decoded);
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

function normalizeWhatsAppAudioFile(file: File, mime: string): File {
  const normalizedMime = mime.includes("ogg")
    ? "audio/ogg"
    : mime.includes("mp4") || mime.includes("m4a") || mime.includes("caf")
      ? "audio/mp4"
      : mime.includes("mpeg") || mime.includes("mp3")
        ? "audio/mpeg"
        : mime;
  const ext = normalizedMime.includes("ogg") ? ".ogg" : normalizedMime.includes("mp4") ? ".m4a" : ".mp3";
  if (file.type === normalizedMime && file.name.toLowerCase().endsWith(ext)) return file;
  return new File([file], file.name.replace(/\.\w+$/, "") + ext, { type: normalizedMime });
}

async function convertToWhatsAppVoiceOggDesktop(file: File): Promise<File> {
  const { convertToWhatsAppVoiceOgg } = await import("@/lib/wa-audio-ffmpeg-browser");
  return convertToWhatsAppVoiceOgg(file);
}

/** Mobile: evita ffmpeg.wasm (trava Safari/PWA). Envia OGG nativo ou M4A/WebM sem re-encode pesado. */
async function prepareRecordedVoiceOnMobile(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();

  if (mime.includes("ogg") || mime.includes("opus")) {
    return normalizeWhatsAppAudioFile(file, "audio/ogg");
  }

  if (
    mime.includes("mp4") ||
    mime.includes("m4a") ||
    mime.includes("aac") ||
    mime.includes("caf")
  ) {
    return normalizeWhatsAppAudioFile(file, "audio/mp4");
  }

  if (mime.includes("webm")) {
    try {
      return await withTimeout(
        convertAudioToMp3(file),
        20_000,
        "Conversão de áudio demorou demais",
      );
    } catch {
      return normalizeWhatsAppAudioFile(file, mime);
    }
  }

  return normalizeWhatsAppAudioFile(file, mime || "audio/mp4");
}

async function prepareRecordedVoiceForWhatsApp(file: File): Promise<File> {
  if (isMobileAudioDevice()) {
    return prepareRecordedVoiceOnMobile(file);
  }

  try {
    return await withTimeout(
      convertToWhatsAppVoiceOggDesktop(file),
      45_000,
      "Conversão de áudio demorou demais",
    );
  } catch {
    return withTimeout(
      convertAudioToMp3(file),
      45_000,
      "Conversão de áudio demorou demais",
    );
  }
}

/** Converte gravação para OGG Opus (nota de voz WhatsApp). */
export async function prepareAudioFileForWhatsApp(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();

  if (isRecordedVoiceFile(file)) {
    return prepareRecordedVoiceForWhatsApp(file);
  }

  if (isWhatsAppReadyAudio(mime)) {
    return normalizeWhatsAppAudioFile(file, mime);
  }
  return convertAudioToMp3(file);
}
