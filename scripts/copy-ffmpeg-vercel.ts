/**
 * Pós-build Vercel: copia o binário do ffmpeg-static para dentro da função serverless.
 * O bundler embute só o index.js do pacote; o binário precisa ir junto manualmente.
 */
import { chmodSync, copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const binary = join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg");
const functionsDir = join(ROOT, ".vercel", "output", "functions");

if (!existsSync(binary)) {
  console.error("[copy-ffmpeg] binário não encontrado em node_modules/ffmpeg-static/ffmpeg");
  process.exit(1);
}

if (!existsSync(functionsDir)) {
  console.log("[copy-ffmpeg] .vercel/output/functions inexistente (build local sem preset Vercel) — nada a fazer");
  process.exit(0);
}

const funcs = readdirSync(functionsDir).filter((name) => {
  const full = join(functionsDir, name);
  return name.endsWith(".func") && statSync(full).isDirectory();
});

if (funcs.length === 0) {
  console.error("[copy-ffmpeg] nenhuma função .func encontrada no output");
  process.exit(1);
}

for (const name of funcs) {
  const dest = join(functionsDir, name, "ffmpeg");
  copyFileSync(binary, dest);
  chmodSync(dest, 0o755);
  console.log(`[copy-ffmpeg] copiado para functions/${name}/ffmpeg`);
}
