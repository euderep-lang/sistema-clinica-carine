export const WA_CONTACT_PHOTO_CACHE_MS = 24 * 60 * 60 * 1000;

export function isContactPhotoCacheFresh(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < WA_CONTACT_PHOTO_CACHE_MS;
}

/** URL de foto vinda da Z-API (ignora placeholders vazios da documentação). */
export function isValidContactPhotoUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) return false;
  if (u === "http://" || u === "https://") return false;
  return true;
}
