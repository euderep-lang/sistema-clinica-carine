/** Teste local: WebM Opus (Chrome mobile) e M4A (iOS) → OGG Opus via wa-audio-convert.server. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { convertAudioBase64ToWhatsAppOgg } from "../src/lib/wa-audio-convert.server";

if (!ffmpegPath) throw new Error("ffmpeg-static sem binário para esta plataforma");
console.log("ffmpeg binário:", ffmpegPath);

const cases: Array<{ label: string; ext: string; mime: string; args: string[] }> = [
  {
    label: "Chrome mobile (WebM Opus)",
    ext: "webm",
    mime: "audio/webm;codecs=opus",
    args: ["-c:a", "libopus", "-b:a", "64k"],
  },
  {
    label: "iOS Safari (M4A/AAC)",
    ext: "m4a",
    mime: "audio/mp4",
    args: ["-c:a", "aac", "-b:a", "64k"],
  },
];

for (const c of cases) {
  const input = join(tmpdir(), `test-voice.${c.ext}`);
  execFileSync(ffmpegPath, [
    "-y",
    "-f", "lavfi",
    "-i", "sine=frequency=440:duration=3",
    "-ac", "1",
    ...c.args,
    input,
  ]);

  const base64 = readFileSync(input).toString("base64");
  const result = await convertAudioBase64ToWhatsAppOgg(base64, c.mime);

  if (!result) {
    console.error(`FALHOU: ${c.label} — conversão retornou null`);
    process.exit(1);
  }

  const outBytes = Buffer.from(result.base64, "base64");
  const outPath = join(tmpdir(), `test-voice-out-${c.ext}.ogg`);
  writeFileSync(outPath, outBytes);

  const probe = execFileSync(ffmpegPath, ["-i", outPath, "-f", "null", "-"], {
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();

  console.log(`OK: ${c.label} → ${result.mimeType} (${outBytes.length} bytes)`);
  if (probe) console.log(probe.slice(0, 200));
}

console.log("Todas as conversões passaram.");
