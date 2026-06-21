export const WA_CONTACT_PHOTO_CACHE_MS = 24 * 60 * 60 * 1000;

export function isContactPhotoCacheFresh(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < WA_CONTACT_PHOTO_CACHE_MS;
}
