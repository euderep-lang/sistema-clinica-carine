/**
 * Atribui conversas abertas ao recepcionista padrão da clínica.
 *
 * Uso: bun run wa:assign-reception
 *      bun run wa:assign-reception -- --all   (todas abertas, inclusive já atribuídas)
 */
import { assignOpenConversationsToReception } from "../src/lib/wa-crm-assign.server";
import { resolveTenantId } from "../src/lib/whatsapp-crm-storage.server";

async function main() {
  const allOpen = process.argv.includes("--all");
  const tenantId = await resolveTenantId();
  if (!tenantId) {
    console.error("Nenhum tenant encontrado");
    process.exit(1);
  }

  const result = await assignOpenConversationsToReception(tenantId, { onlyUnassigned: !allOpen });
  if (!result.receptionistId) {
    console.error("Nenhum usuário com perfil recepcionista encontrado.");
    process.exit(1);
  }

  console.log(`✓ ${result.updated} conversa(s) aberta(s) atribuída(s) à recepção (${result.receptionistId})`);
}

main().catch((e) => {
  console.error("Falhou:", (e as Error).message);
  process.exit(1);
});
