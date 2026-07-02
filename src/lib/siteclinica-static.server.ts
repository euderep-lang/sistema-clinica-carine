import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

const SITE_PREFIX = "/siteclinica";
const SITE_ROOT = join(process.cwd(), "public/siteclinica");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export async function serveSiteClinicaStatic(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== SITE_PREFIX && !pathname.startsWith(`${SITE_PREFIX}/`)) {
    return null;
  }

  let rel = pathname === SITE_PREFIX ? "/index.html" : pathname.slice(SITE_PREFIX.length);
  if (rel.endsWith("/")) rel += "index.html";

  const filePath = normalize(join(SITE_ROOT, rel));
  if (!filePath.startsWith(SITE_ROOT)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    const ext = filePath.slice(filePath.lastIndexOf("."));
    return new Response(body, {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": ext === ".html" ? "public, max-age=0, must-revalidate" : "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
