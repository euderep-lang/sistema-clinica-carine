import { Mp3Encoder } from "@breezystack/lamejs";

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

function floatTo16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Voz: mono 24 kHz / 64 kbps — mais rápido no celular e suficiente para WhatsApp. */
const VOICE_SAMPLE_RATE = 24_000;
const VOICE_BITRATE = 64;
const SILENCE_THRESHOLD = 0.012;
const SILENCE_WINDOW_SEC = 0.02;
const TRIM_PADDING_SEC = 0.04;
const MAX_LEADING_SCAN_SEC = 2.5;

function findTrimStartSample(channel: Float32Array, sampleRate: number): number {
  const windowSize = Math.max(1, Math.floor(sampleRate * SILENCE_WINDOW_SEC));
  const maxScan = Math.min(channel.length, Math.floor(sampleRate * MAX_LEADING_SCAN_SEC));
  const padding = Math.floor(sampleRate * TRIM_PADDING_SEC);

  for (let i = 0; i < maxScan; i += windowSize) {
    let peak = 0;
    const end = Math.min(i + windowSize, channel.length);
    for (let j = i; j < end; j++) peak = Math.max(peak, Math.abs(channel[j]));
    if (peak > SILENCE_THRESHOLD) return Math.max(0, i - padding);
  }
  return 0;
}

function trimDecodedBuffer(ctx: BaseAudioContext, decoded: AudioBuffer): AudioBuffer {
  const startSample = findTrimStartSample(decoded.getChannelData(0), decoded.sampleRate);
  const minSamples = Math.floor(decoded.sampleRate * 0.25);
  if (startSample <= 0 || decoded.length - startSample < minSamples) return decoded;

  const trimmedLength = decoded.length - startSample;
  const trimmed = ctx.createBuffer(decoded.numberOfChannels, trimmedLength, decoded.sampleRate);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    trimmed.getChannelData(c).set(decoded.getChannelData(c).subarray(startSample));
  }
  return trimmed;
}

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

async function encodeVoiceBufferToMp3(decoded: AudioBuffer): Promise<File> {
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

  const blob = new Blob(mp3Chunks as BlobPart[], { type: "audio/mpeg" });
  return new File([blob], `audio-${Date.now()}.mp3`, { type: "audio/mpeg" });
}

async function convertAudioToMp3(file: File, trimLeading = false): Promise<File> {
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    let decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    if (trimLeading) decoded = trimDecodedBuffer(ctx, decoded);
    const out = await encodeVoiceBufferToMp3(decoded);
    const baseName = file.name.replace(/\.[^.]+$/, "") || `audio-${Date.now()}`;
    return new File([out], `${baseName}.mp3`, { type: "audio/mpeg" });
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

/** Gravações do botão de microfone (nome `audio-<timestamp>.*`). */
export function isRecordedVoiceFile(file: File): boolean {
  return /^audio-\d+\.[a-z0-9]+$/i.test(file.name);
}

function normalizeWhatsAppAudioFile(file: File, mime: string): File {
  const normalizedMime = mime.includes("mp4") || mime.includes("m4a") || mime.includes("caf")
    ? "audio/mp4"
    : mime.includes("ogg")
      ? "audio/ogg"
      : mime.includes("mpeg") || mime.includes("mp3")
        ? "audio/mpeg"
        : mime;
  const ext = normalizedMime.includes("mp4") ? ".m4a" : normalizedMime.includes("ogg") ? ".ogg" : ".mp3";
  if (file.type === normalizedMime && file.name.toLowerCase().endsWith(ext)) return file;
  return new File([file], file.name.replace(/\.\w+$/, "") + ext, { type: normalizedMime });
}

/** Converte WebM/gravação do browser para MP3 (formato aceito pela Z-API / WhatsApp). */
export async function prepareAudioFileForWhatsApp(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  const recorded = isRecordedVoiceFile(file);

  // Celular grava M4A/OGG — envia direto (conversão MP3 no browser trava iOS/Android).
  if (recorded && isWhatsAppReadyAudio(mime)) {
    return normalizeWhatsAppAudioFile(file, mime);
  }

  if (recorded) {
    try {
      const converted = await Promise.race([
        convertAudioToMp3(file, true),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Conversão de áudio demorou demais")), 20_000),
        ),
      ]);
      return converted;
    } catch {
      if (mime.includes("webm")) {
        return new File([file], file.name.replace(/\.\w+$/, ".webm"), { type: "audio/webm" });
      }
      throw new Error("Não foi possível preparar o áudio gravado. Tente novamente.");
    }
  }

  if (isWhatsAppReadyAudio(mime)) {
    return normalizeWhatsAppAudioFile(file, mime);
  }
  return convertAudioToMp3(file, false);
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
