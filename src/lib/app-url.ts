/** URL pública do app (links NPS, pré-cadastro). Nunca usa VERCEL_URL — preview quebra links no WhatsApp. */
export function getPublicAppUrl(): string {
  const configured = process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return "https://sistema-clinicos.vercel.app";
}
