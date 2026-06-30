# Scripts operacionais — ClinicOS

Ferramentas CLI em `scripts/` para migração de dados, importação legada e manutenção. **Não fazem parte do app web** e não são executadas no deploy da Vercel.

## Regras de segurança

1. **Confirme o ambiente** — `.env` local ou variáveis exportadas devem apontar para o tenant/banco desejado (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TENANT_ID`).
2. **Dry-run primeiro** — scripts de importação/reconciliação suportam `--dry-run` para simular sem gravar.
3. **Backup antes de `--apply`** — veja [RUNBOOK.md](./RUNBOOK.md) §2.
4. **Produção** — evite rodar imports em produção sem revisão; prefira staging ou janela de manutenção.

## Variáveis comuns

| Variável | Uso |
|----------|-----|
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso admin (bypass RLS) |
| `TENANT_ID` | UUID do tenant (default de dev no código) |
| `SUPABASE_DB_PASSWORD` / `DATABASE_URL` | Scripts que usam `postgres` direto |
| `IMPORT_PROFESSIONAL_ID` | Profissional padrão em imports |

---

## Banco e schema

### `apply-schema.ts` — `npm run db:schema`
Aplica schema SQL local ao banco.

### `migrate-supabase.ts` — `npm run db:migrate`
Executa migrations em `supabase/migrations/`.

### `gen-supabase-types.ts` — `npm run db:types`
Regenera `src/integrations/supabase/types.ts`.

### `setup-database.ts` — `npm run db:setup`
Setup inicial do banco (dev).

### `export-schema.ts` — `npm run db:export`
Exporta schema atual.

### `supabase-db-push.ts` — `npm run db:push`
Push de schema via Supabase CLI.

---

## Importação de dados legados (MEDX / migração)

### `import-relatorio-completo.ts`
Importa o **RELATÓRIO COMPLETO — MEDX** (PDF: cadastro + evoluções + financeiro). Adiciona apenas o que ainda não existe.

```bash
bun run scripts/import-relatorio-completo.ts relatorio.pdf --dry-run
bun run scripts/import-relatorio-completo.ts relatorio.pdf --apply
bun run scripts/import-relatorio-completo.ts relatorio.pdf --apply --skip-pdf-evolutions
bun run scripts/import-relatorio-completo.ts relatorio.pdf --apply --create-patients
```

### `reconciliar-financeiro.ts`
Ajusta faturas existentes no ClinicOS para bater com o relatório MEDX (valores, descontos, pagamentos). **Não altera itens da venda.**

```bash
bun run scripts/reconciliar-financeiro.ts relatorio.pdf --dry-run
bun run scripts/reconciliar-financeiro.ts relatorio.pdf --apply
```

### `import-patients-xlsx.ts` — `npm run db:import-patients`
Importa pacientes de planilha Excel.

### `import-prontuarios-pdf.ts` — `npm run db:import-prontuarios`
Importa prontuários a partir de PDF.

### `import-anexos-zip.ts` — `npm run db:import-anexos`
Importa anexos de evolução a partir de ZIP (`prontuarios_anexos/<Paciente>/...`).

### `anexos-faltantes.ts`
Compara lista de arquivos do ZIP com `evolution_attachments` no banco e reporta o que falta.

```bash
unzip -Z1 arquivo.zip > lista.txt
bun run scripts/anexos-faltantes.ts lista.txt
```

### `import-financeiro-pdf.ts` — `npm run db:import-financeiro`
Importa dados financeiros de PDF legado.

### `import-catalogo-pdf.ts` — `npm run db:import-catalogo`
Importa catálogo de serviços/produtos de PDF.

### `update-evolucoes-horario.ts`
Atualiza horários de evoluções a partir de export PDF com data/hora.

```bash
bun run scripts/update-evolucoes-horario.ts prontuarios.pdf              # dry-run
bun run scripts/update-evolucoes-horario.ts prontuarios.pdf --apply
bun run scripts/update-evolucoes-horario.ts prontuarios.pdf --apply --add-new=clinical
```

---

## WhatsApp / Z-API

### `setup-zapi-webhook.ts` — `npm run zapi:webhook`
Configura URL do webhook na Z-API.

### `sync-zapi-chats.ts` — `npm run wa:sync-chats`
Sincroniza conversas da Z-API para o CRM.

### `assign-wa-to-reception.ts` — `npm run wa:assign-reception`
Atribui conversas WhatsApp à recepção.

### `process-wa-follow-ups.ts` — `npm run wa:process-follow-ups`
Processa fila de follow-ups manualmente (fallback ao cron).

### `clear-wa-messages.ts` — `npm run wa:clear-messages`
**Destrutivo** — limpa mensagens WhatsApp (uso em dev/reset).

---

## Utilitários

### `build-cid10-json.ts` — `npm run build:cid10`
Gera JSON de CID-10 para autocomplete.
