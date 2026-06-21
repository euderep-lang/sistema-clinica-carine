import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Converte áudio para MP3 no servidor (fallback se ffmpeg estiver instalado). */
export async function convertAudioBase64ToMp3(
  base64: string,
  inputMime: string,
): Promise<{ base64: string; mimeType: string; filename: string } | null> {
  const mime = inputMime.toLowerCase();
  if (mime.includes("mpeg") || mime.includes("mp3") || mime.includes("ogg")) {
    return null;
  }

  const ext = mime.includes("webm") ? "webm" : mime.includes("wav") ? "wav" : mime.includes("mp4") ? "m4a" : "bin";
  const dir = await mkdtemp(join(tmpdir(), "wa-audio-"));
  const inputPath = join(dir, `in.${ext}`);
  const outputPath = join(dir, "out.mp3");

  try {
    await writeFile(inputPath, Buffer.from(base64, "base64"));
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "44100",
      "-b:a",
      "128k",
      outputPath,
    ]);
    const out = await readFile(outputPath);
    return {
      base64: out.toString("base64"),
      mimeType: "audio/mpeg",
      filename: "audio.mp3",
    };
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
