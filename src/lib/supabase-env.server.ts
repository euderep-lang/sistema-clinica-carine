/** Variáveis Supabase para código server-side (webhook, server functions). */
export function getSupabaseServerEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  return { url, serviceRoleKey, publishableKey };
}

export function getSupabaseServerEnvStatus() {
  const { url, serviceRoleKey, publishableKey } = getSupabaseServerEnv();
  return {
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    hasPublishableKey: Boolean(publishableKey),
    ready: Boolean(url && serviceRoleKey),
    authReady: Boolean(url && publishableKey),
  };
}
