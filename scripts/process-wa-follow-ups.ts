/**
 * Processa follow-ups automáticos pendentes (Z-API).
 * Agende no cron: */5 * * * * bun run wa:process-follow-ups
 */
import { createClient } from "@supabase/supabase-js";
import { processDueFollowUps } from "../src/lib/wa-follow-up.server";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

createClient(url, key);

const result = await processDueFollowUps(50);
console.log("[wa:process-follow-ups]", result);
