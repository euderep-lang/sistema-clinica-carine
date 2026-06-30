# Runbook — ClinicOS

Procedimentos operacionais para produção.

## 1. Variáveis de ambiente (checklist)

### Obrigatórias (produção)

- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `WHATSAPP_PROVIDER=zapi`
- [ ] `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- [ ] `CRON_SECRET` (string aleatória ≥ 32 chars)
- [ ] `CERTIFICATE_ENCRYPTION_KEY` (se certificado A1)
- [ ] `PUBLIC_APP_URL` (ex.: `https://sistema-clinicos.vercel.app`)

### Opcionais

- [ ] `OPENAI_API_KEY` — IA no servidor (sem ela, o app funciona; recursos de IA ficam desativados ou usam fallback):
  - **CRM WhatsApp:** reformulação manual (botão ✨ no composer) e automática em follow-ups, mensagens agendadas e respostas fora do horário
  - **Prontuário:** resumo de evoluções e interpretação de exames
  - **Orçamento com IA** (`/professional/orcamento`) e **plano alimentar com IA** (`/professional/plano-alimentar`)
  - **Funil CRM:** sugestão de etapa por IA (API disponível; UI removida do inbox)
- [ ] `VITE_SENTRY_DSN` — erros no browser
- [ ] `SAFEID_*` — receituário SafeID

## 2. Backup Supabase

### Automático (Plano Pro+)

Dashboard → Project Settings → Database → Backups

### Manual (pg_dump)

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%Y%m%d).dump
```

Restaurar (cuidado — sobrescreve dados):

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-YYYYMMDD.dump
```

**Antes de migrations em produção:** snapshot ou dump.

## 3. Cron — follow-ups WhatsApp

- **Vercel:** `vercel.json` → `/api/cron/wa-follow-ups` a cada 5 min
- **Auth:** header `Authorization: Bearer $CRON_SECRET`
- **Logs:** Vercel → Functions → filtrar `[cron wa-follow-ups]`

Fallback manual:

```bash
bun run wa:process-follow-ups
```

## 4. Webhooks WhatsApp

1. Z-API painel → Webhook → URL produção
2. Testar: `curl https://<dominio>/api/whatsapp/webhook-status`
3. Eventos: mensagem recebida, status entrega

Fluxo confirmação D-1:

1. Agendamento dispara sequência `appointment_booked`
2. Cron envia `appointment_reminder_24h` (D-1)
3. Paciente responde "eu vou" → status `confirmed` + `appointment_confirmations`
4. Recepção vê em **Check-in**

## 5. Migrations

```bash
# staging primeiro
bun run db:migrate

# regenerar types
bun run db:types

# commit migration + types juntos
```

Rollback: restaurar backup; não há down migrations automáticas.

## 6. LGPD

- Consentimento: cadastro paciente / admin
- Exportação: ficha paciente → "Exportar dados (LGPD)"
- Exclusão: solicitar via admin → anonimizar/inativar conforme política interna

## 7. Incidentes

| Severidade | Exemplo | Ação |
|------------|---------|------|
| P1 | Sistema fora, WA parado | Verificar Vercel status, Supabase, Z-API |
| P2 | Cron falhando | Logs + `CRON_SECRET` |
| P3 | Relatório incorreto | Verificar RLS + types |

Contatos: definir responsável técnico + DPO clínica.

## 8. Deploy checklist

- [ ] Migrations aplicadas
- [ ] Env vars Production atualizadas
- [ ] Webhook Z-API apontando para URL nova
- [ ] Cron ativo
- [ ] Smoke test: login, agenda, CRM inbox, financeiro

## 9. Scripts operacionais (CLI)

Scripts em `scripts/` **não rodam no deploy** — são ferramentas locais ou one-off para migração de dados. **Sempre use `--dry-run` primeiro** quando disponível, e confirme `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `TENANT_ID` apontando para o ambiente correto.

Documentação completa: [docs/SCRIPTS.md](./SCRIPTS.md).

| Comando npm | Script | Uso típico |
|-------------|--------|------------|
| `db:migrate` | `migrate-supabase.ts` | Aplicar migrations SQL |
| `db:types` | `gen-supabase-types.ts` | Regenerar types após migration |
| `db:import-patients` | `import-patients-xlsx.ts` | Importar pacientes de planilha |
| `db:import-prontuarios` | `import-prontuarios-pdf.ts` | Importar prontuários PDF |
| `db:import-anexos` | `import-anexos-zip.ts` | Importar anexos de ZIP |
| `db:import-financeiro` | `import-financeiro-pdf.ts` | Importar financeiro PDF |
| `wa:sync-chats` | `sync-zapi-chats.ts` | Sincronizar chats Z-API |
| `wa:process-follow-ups` | `process-wa-follow-ups.ts` | Disparar follow-ups manualmente |

Scripts sem alias npm (rodar com `bun run scripts/<arquivo>.ts`):

- `import-relatorio-completo.ts` — importação MEDX completa (`--dry-run` / `--apply`)
- `reconciliar-financeiro.ts` — reconciliar faturas com relatório MEDX
- `anexos-faltantes.ts` — listar anexos do ZIP ainda não importados
- `update-evolucoes-horario.ts` — atualizar horários de evoluções a partir de PDF
