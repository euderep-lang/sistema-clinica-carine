import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Binário do ffmpeg:
 * - Vercel: copiado para a raiz da função por scripts/copy-ffmpeg-vercel.ts (/var/task/ffmpeg)
 * - Local: node_modules/ffmpeg-static/ffmpeg (baixado no install)
 * - Fallback: ffmpeg do sistema (PATH)
 */
function resolveFfmpegBinary(): string {
  const candidates = [
    process.env.FFMPEG_PATH,
    join(process.cwd(), "ffmpeg"),
    join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return "ffmpeg";
}

/** Converte áudio para OGG Opus (nota de voz WhatsApp) no servidor. */
export async function convertAudioBase64ToWhatsAppOgg(
  base64: string,
  inputMime: string,
): Promise<{ base64: string; mimeType: string; filename: string } | null> {
  const mime = inputMime.toLowerCase();
  // Só OGG container está pronto; webm;codecs=opus precisa de remux/re-encode.
  if (mime.includes("audio/ogg") || mime.includes("application/ogg")) return null;

  const ext = mime.includes("webm")
    ? "webm"
    : mime.includes("wav")
      ? "wav"
      : mime.includes("mpeg") || mime.includes("mp3")
        ? "mp3"
        : mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac") || mime.includes("caf")
          ? "m4a"
          : "bin";

  const dir = await mkdtemp(join(tmpdir(), "wa-audio-"));
  const inputPath = join(dir, `in.${ext}`);
  const outputPath = join(dir, "out.ogg");

  try {
    await writeFile(inputPath, Buffer.from(base64, "base64"));
    await execFileAsync(resolveFfmpegBinary(), [
      "-y",
      "-i",
      inputPath,
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
      outputPath,
    ]);
    const out = await readFile(outputPath);
    return {
      base64: out.toString("base64"),
      mimeType: "audio/ogg",
      filename: "audio.ogg",
    };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** @deprecated Use convertAudioBase64ToWhatsAppOgg */
export async function convertAudioBase64ToMp3(
  base64: string,
  inputMime: string,
): Promise<{ base64: string; mimeType: string; filename: string } | null> {
  return convertAudioBase64ToWhatsAppOgg(base64, inputMime);
}
