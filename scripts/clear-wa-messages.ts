/**
 * Apaga histórico de mensagens do sistema (não afeta o celular/Z-API).
 *
 * Remove:
 * - CRM WhatsApp: mensagens, conversas, notas, lembretes, transferências, tags por conversa, auditoria
 * - Módulo Mensagens: logs de envio (message_logs)
 *
 * Mantém: modelos de mensagem (message_templates), tags CRM (wa_tags), pacientes e demais dados.
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
      (SELECT COUNT(*)::text FROM public.message_logs) AS message_logs
  `;
  return row;
}

function printCounts(label: string, c: Counts) {
  console.log(label);
  console.log(`  CRM WhatsApp — mensagens: ${c.wa_messages}, conversas: ${c.wa_conversations}`);
  console.log(`  CRM WhatsApp — notas: ${c.wa_notes}, lembretes: ${c.wa_reminders}, transferências: ${c.wa_transfers}`);
  console.log(`  CRM WhatsApp — vínculos de tags: ${c.wa_conversation_tags}, auditoria: ${c.wa_audit_log}`);
  console.log(`  Logs de mensagens (campanhas/envios): ${c.message_logs}`);
}

async function main() {
  const sql = postgres(dbUrl!, { ssl: "require", max: 1, connect_timeout: 15 });

  const before = await readCounts(sql);
  printCounts("Antes:", before);

  await sql.begin(async (tx) => {
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
