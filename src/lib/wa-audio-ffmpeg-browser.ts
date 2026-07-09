import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loading) return loading;

  loading = (async () => {
    const instance = new FFmpeg();
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.6/dist/esm";
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  return loading;
}

function inputName(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ["m4a", "mp4", "webm", "ogg", "mp3", "wav", "aac", "caf"].includes(ext)) {
    return `input.${ext}`;
  }
  if (file.type.includes("mp4") || file.type.includes("m4a")) return "input.m4a";
  if (file.type.includes("webm")) return "input.webm";
  if (file.type.includes("ogg")) return "input.ogg";
  if (file.type.includes("mpeg") || file.type.includes("mp3")) return "input.mp3";
  return "input.bin";
}

/** Converte gravação para OGG Opus compatível com nota de voz do WhatsApp. */
export async function convertToWhatsAppVoiceOgg(file: File): Promise<File> {
  const ff = await getFfmpeg();
  const inFile = inputName(file);
  const outFile = "output.ogg";

  await ff.writeFile(inFile, await fetchFile(file));
  await ff.exec([
    "-y",
    "-i",
    inFile,
    "-vn",
    "-c:a",
    "libopus",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-b:a",
    "64k",
    "-application",
    "voip",
    "-map_metadata",
    "-1",
    "-f",
    "ogg",
    outFile,
  ]);

  const data = await ff.readFile(outFile);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const blob = new Blob([bytes as BlobPart], { type: "audio/ogg" });
  return new File([blob], `audio-${Date.now()}.ogg`, { type: "audio/ogg" });
}
