/** Variáveis Supabase para código server-side (webhook, server functions). */
export function getSupabaseServerEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, serviceRoleKey };
}

export function getSupabaseServerEnvStatus() {
  const { url, serviceRoleKey } = getSupabaseServerEnv();
  return {
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    ready: Boolean(url && serviceRoleKey),
  };
}
