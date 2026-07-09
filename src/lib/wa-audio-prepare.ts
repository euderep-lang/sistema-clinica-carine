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

/** Gravações do botão de microfone (nome `audio-<timestamp>.*`). */
export function isRecordedVoiceFile(file: File): boolean {
  return /^audio-\d+\.[a-z0-9]+$/i.test(file.name);
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
export { mimeFromFilename };
