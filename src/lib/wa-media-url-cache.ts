/** Cache em memória de URLs de mídia WhatsApp (evita refetch por bubble). */
const cache = new Map<string, string>();

export function getCachedWaMediaUrl(mediaId: string, mimeType?: string | null): string | undefined {
  return cache.get(`${mediaId}\0${mimeType ?? ""}`);
}

export function setCachedWaMediaUrl(mediaId: string, mimeType: string | null | undefined, url: string): void {
  cache.set(`${mediaId}\0${mimeType ?? ""}`, url);
}
