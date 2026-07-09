/** Diagnóstico: configuração business_hours + últimos disparos da auto-resposta fora do horário. */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");

const supabase = createClient(url, key);

const { data: settings } = await supabase
  .from("tenant_settings")
  .select("tenant_id, key, value")
  .in("key", ["business_hours", "after_hours_message"]);

console.log("=== tenant_settings ===");
for (const s of settings ?? []) {
  console.log(s.key, "→", JSON.stringify(s.value).slice(0, 400));
}

const { data: audits } = await supabase
  .from("system_audit_log")
  .select("created_at, action, details")
  .eq("action", "whatsapp.after_hours_reply")
  .order("created_at", { ascending: false })
  .limit(10);

console.log("\n=== últimos disparos (UTC | horário de Brasília) ===");
for (const a of audits ?? []) {
  const d = new Date(a.created_at);
  const brt = d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`${a.created_at} | ${brt} | ${JSON.stringify(a.details).slice(0, 120)}`);
}
