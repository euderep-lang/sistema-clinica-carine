import { Mp3Encoder } from "@breezystack/lamejs";
import { convertToWhatsAppVoiceOgg } from "@/lib/wa-audio-ffmpeg-browser";
import {
  isRecordedVoiceFile,
  isWhatsAppReadyAudio,
  mimeFromFilename,
} from "@/lib/wa-audio-prepare";

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

async function prepareRecordedVoiceForWhatsApp(file: File): Promise<File> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Conversão de áudio demorou demais")), 45_000),
  );

  try {
    return await Promise.race([convertToWhatsAppVoiceOgg(file), timeout]);
  } catch {
    return Promise.race([convertAudioToMp3(file), timeout]);
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
