import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { BusinessHours } from "@/lib/settings-helpers";
import { mergeFollowUpSequences, WA_FOLLOW_UP_TEMPLATES_KEY, type FollowUpStepDef } from "@/lib/wa-follow-up-templates";

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

export async function getFollowUpSequencesServer(tenantId: string): Promise<Record<string, FollowUpStepDef[]>> {
  const overrides = await getTenantSettingServer<Record<string, Record<string, string>>>(
    tenantId,
    WA_FOLLOW_UP_TEMPLATES_KEY,
  );
  return mergeFollowUpSequences(overrides);
}
