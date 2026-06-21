import lamejs from "lamejs";

const WHATSAPP_AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/aac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
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
  return m.includes("ogg") || m.includes("mpeg") || m.includes("mp3");
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

    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
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
  } finally {
    await ctx.close();
  }
}

/** Converte WebM/gravação do browser para MP3 (formato aceito pela Z-API / WhatsApp). */
export async function prepareAudioFileForWhatsApp(file: File): Promise<File> {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  if (isWhatsAppReadyAudio(mime)) {
    if (!file.type && mime) {
      return new File([file], file.name, { type: mime });
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
