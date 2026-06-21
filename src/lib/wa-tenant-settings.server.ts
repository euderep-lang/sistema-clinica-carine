import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { BusinessHours } from "@/lib/settings-helpers";

export async function getTenantSettingServer<T = unknown>(tenantId: string, key: string): Promise<T | null> {
  const { data } = await supabaseAdmin
    .from("tenant_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value) as T;
  } catch {
    return data.value as unknown as T;
  }
}

export async function getBusinessHoursServer(tenantId: string): Promise<BusinessHours | null> {
  return getTenantSettingServer<BusinessHours>(tenantId, "business_hours");
}

export async function getAfterHoursMessageServer(tenantId: string): Promise<string | null> {
  return getTenantSettingServer<string>(tenantId, "wa_after_hours_message");
}
