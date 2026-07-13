/**
 * Corrige agendamentos duplicados após remarcações antigas:
 * mantém apenas a consulta ativa mais recente (scheduled/confirmed)
 * e marca as demais como rescheduled (somem da grade e liberam o horário).
 *
 * Uso: bun run scripts/fix-rescheduled-appointments.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
}

const supabase = createClient(url, key);

type Row = {
  id: string;
  patient_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  status: string;
  created_at: string;
  type: string | null;
};

const STALE_STATUSES = new Set(["scheduled", "confirmed", "cancelled", "rescheduled"]);
const ACTIVE_STATUSES = new Set(["scheduled", "confirmed"]);

function groupKey(row: Row) {
  return `${row.patient_id}|${row.professional_id}`;
}

async function main() {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, professional_id, date, start_time, status, created_at, type")
    .not("patient_id", "is", null)
    .not("professional_id", "is", null)
    .in("status", ["scheduled", "confirmed", "cancelled", "rescheduled"]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (r) => r.type !== "block" && r.status !== "blocked",
  ) as Row[];

  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const toReschedule: string[] = [];

  for (const list of groups.values()) {
    if (list.length < 2) continue;

    const actives = list.filter((r) => ACTIVE_STATUSES.has(r.status));
    if (actives.length === 0) continue;

    const keeper = [...actives].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    for (const row of list) {
      if (row.id === keeper.id) continue;
      if (!STALE_STATUSES.has(row.status)) continue;
      toReschedule.push(row.id);
    }
  }

  const unique = [...new Set(toReschedule)];
  if (unique.length === 0) {
    console.log("Nenhum agendamento duplicado para corrigir.");
    return;
  }

  console.log(`Marcando ${unique.length} agendamento(s) antigo(s) como remarcado...`);

  for (const id of unique) {
    const { error: updErr } = await supabase
      .from("appointments")
      .update({ status: "rescheduled" })
      .eq("id", id);
    if (updErr) throw new Error(`${id}: ${updErr.message}`);
  }

  console.log("Concluído.");
}

void main();
