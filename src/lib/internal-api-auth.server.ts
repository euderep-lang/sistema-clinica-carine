/** Valida Authorization: Bearer <CRON_SECRET> (Vercel Cron e diagnósticos internos). */
export function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function verifyInternalApiAuth(request: Request): boolean {
  return verifyCronAuth(request);
}
