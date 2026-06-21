/**
 * Importa chats ativos da Z-API para o CRM (unifica duplicatas).
 *
 * Uso: bun run wa:sync-chats
 */
import { syncZApiChatsToCrm, resolveTenantId } from "../src/lib/whatsapp-crm-storage.server";
import { getZApiChats, getZApiConfig } from "../src/lib/whatsapp-zapi.server";

async function main() {
  const config = getZApiConfig();
  if (!config) {
    console.error("Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env");
    process.exit(1);
  }

  const tenantId = await resolveTenantId();
  if (!tenantId) {
    console.error("Nenhum tenant encontrado");
    process.exit(1);
  }

  const all: Awaited<ReturnType<typeof getZApiChats>> = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await getZApiChats(config, page, 100);
    if (!batch.length) break;
    all.push(...batch);
    console.log(`Página ${page}: ${batch.length} chats`);
    if (batch.length < 100) break;
  }

  const synced = await syncZApiChatsToCrm(tenantId, all);
  console.log(`\n✓ ${synced} conversa(s) sincronizada(s) de ${all.length} chats na Z-API`);
  console.log("Mensagens antigas só entram via webhook — rode também: bun run zapi:webhook");
}

main().catch((e) => {
  console.error("Falhou:", (e as Error).message);
  process.exit(1);
});
