const WA_CONTACT_PHOTO_CACHE_MS = 24 * 60 * 60 * 1e3;
function isContactPhotoCacheFresh(fetchedAt) {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < WA_CONTACT_PHOTO_CACHE_MS;
}
export {
  isContactPhotoCacheFresh as i
};
