/**
 * Zera o inbox CRM (não apaga WhatsApp no celular/Z-API).
 *
 * Remove:
 * - Mensagens, conversas, notas, lembretes, transferências, tags por conversa, auditoria
 * - Follow-ups, tarefas CRM, deals, eventos de métricas
 * - Logs de envio (message_logs)
 *
 * Mantém: tags CRM (wa_tags), respostas rápidas, pipelines, pacientes e demais dados.
 * Novos contatos entram só via webhook ou envio manual — evite "Sincronizar chats".
 *
 * Uso:
 *   bun run wa:clear-messages
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbUrl =
  DATABASE_URL ??
  (dbPassword
    ? `postgresql://postgres.${process.env.SUPABASE_PROJECT_ID ?? "jglzghujpxbakqqmmple"}:${encodeURIComponent(dbPassword)}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
    : undefined);

if (!dbUrl) {
  console.error("Defina DATABASE_URL ou SUPABASE_DB_PASSWORD no .env");
  process.exit(1);
}

type Counts = {
  wa_messages: string;
  wa_conversations: string;
  wa_notes: string;
  wa_reminders: string;
  wa_transfers: string;
  wa_conversation_tags: string;
  wa_audit_log: string;
  wa_follow_up_schedules: string;
  wa_follow_up_runs: string;
  wa_crm_events: string;
  wa_tasks: string;
  wa_deals: string;
  message_logs: string;
};

async function readCounts(sql: ReturnType<typeof postgres>): Promise<Counts> {
  const [row] = await sql<Counts[]>`
    SELECT
      (SELECT COUNT(*)::text FROM public.wa_messages) AS wa_messages,
      (SELECT COUNT(*)::text FROM public.wa_conversations) AS wa_conversations,
      (SELECT COUNT(*)::text FROM public.wa_notes) AS wa_notes,
      (SELECT COUNT(*)::text FROM public.wa_reminders) AS wa_reminders,
      (SELECT COUNT(*)::text FROM public.wa_transfers) AS wa_transfers,
      (SELECT COUNT(*)::text FROM public.wa_conversation_tags) AS wa_conversation_tags,
      (SELECT COUNT(*)::text FROM public.wa_audit_log) AS wa_audit_log,
      (SELECT COUNT(*)::text FROM public.wa_follow_up_schedules) AS wa_follow_up_schedules,
      (SELECT COUNT(*)::text FROM public.wa_follow_up_runs) AS wa_follow_up_runs,
      (SELECT COUNT(*)::text FROM public.wa_crm_events) AS wa_crm_events,
      (SELECT COUNT(*)::text FROM public.wa_tasks) AS wa_tasks,
      (SELECT COUNT(*)::text FROM public.wa_deals) AS wa_deals,
      (SELECT COUNT(*)::text FROM public.message_logs) AS message_logs
  `;
  return row;
}

function printCounts(label: string, c: Counts) {
  console.log(label);
  console.log(`  Conversas: ${c.wa_conversations} | Mensagens: ${c.wa_messages}`);
  console.log(`  Notas: ${c.wa_notes} | Lembretes: ${c.wa_reminders} | Transferências: ${c.wa_transfers}`);
  console.log(`  Tags/conversa: ${c.wa_conversation_tags} | Auditoria: ${c.wa_audit_log}`);
  console.log(`  Follow-ups: ${c.wa_follow_up_runs} runs, ${c.wa_follow_up_schedules} passos`);
  console.log(`  Tarefas: ${c.wa_tasks} | Deals: ${c.wa_deals} | Eventos CRM: ${c.wa_crm_events}`);
  console.log(`  Logs de envio: ${c.message_logs}`);
}

async function main() {
  const sql = postgres(dbUrl!, { ssl: "require", max: 1, connect_timeout: 15 });

  const before = await readCounts(sql);
  printCounts("Antes:", before);

  await sql.begin(async (tx) => {
    await tx`DELETE FROM public.wa_follow_up_schedules`;
    await tx`DELETE FROM public.wa_follow_up_runs`;
    await tx`DELETE FROM public.wa_crm_events`;
    await tx`DELETE FROM public.wa_reminders`;
    await tx`DELETE FROM public.wa_tasks`;
    await tx`DELETE FROM public.wa_deals`;
    await tx`DELETE FROM public.wa_messages`;
    await tx`DELETE FROM public.wa_audit_log`;
    await tx`DELETE FROM public.wa_conversations`;
    await tx`DELETE FROM public.message_logs`;
  });

  const after = await readCounts(sql);
  await sql.end();

  printCounts("Depois:", after);
  console.log("Histórico de mensagens apagado. Novas conversas começarão do zero no CRM.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
