# ClinicOS — Deploy & Operação

Sistema de gestão clínica (TanStack Start + Supabase + Vercel + Z-API).

## Pré-requisitos

- [Bun](https://bun.sh) 1.x
- Conta [Supabase](https://supabase.com) (Postgres + Auth + Storage)
- Conta [Vercel](https://vercel.com) (hosting + cron)
- Instância [Z-API](https://www.z-api.io) (WhatsApp CRM)

## Setup local

```bash
cp .env.example .env
# Preencha SUPABASE_*, VITE_SUPABASE_*, DATABASE_URL, MASTER_*

bun install
bun run db:migrate    # aplica migrations em supabase/migrations/
bun run db:seed       # tenant + usuário master (opcional)
bun run dev           # http://localhost:8080
```

## Deploy Vercel

1. Conecte o repositório à Vercel.
2. **Install:** `bun install --frozen-lockfile` (ver `vercel.json`)
3. **Build:** `bun run build`
4. Configure variáveis em **Production** (ver `.env.example`):
   - `VITE_SUPABASE_*` — client
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server (webhooks, cron, IA)
   - `WHATSAPP_PROVIDER`, `ZAPI_*`
   - `CRON_SECRET` — protege `/api/cron/wa-follow-ups`
   - `CERTIFICATE_ENCRYPTION_KEY`, `SAFEID_*` (se usar receituário digital)
   - `OPENAI_API_KEY` (opcional — resumo de prontuário / interpretação de exames)
   - `VITE_SENTRY_DSN` (opcional — monitoramento client)
   - `PUBLIC_APP_URL` — URL pública (links NPS / pré-cadastro)

### Cron jobs

| Path | Schedule | Função |
|------|----------|--------|
| `/api/cron/wa-follow-ups` | `*/5 * * * *` | Lembretes D-1, confirmação, pós-consulta, NPS |

Local: `bun run wa:process-follow-ups`

### Webhooks

| Endpoint | Uso |
|----------|-----|
| `POST /api/whatsapp/webhook` | Z-API / Meta inbound |
| `GET /api/whatsapp/webhook-status` | Diagnóstico |

Configure na Z-API: `https://<seu-dominio>/api/whatsapp/webhook`

## Banco de dados

```bash
bun run db:migrate          # migrations incrementais
bun run db:export           # export schema remoto → SQL
bun run db:types            # regenera src/integrations/supabase/types.ts
```

### Backup Supabase

- Dashboard → Database → Backups (Pro plan) ou `pg_dump` via `DATABASE_URL`
- Recomendado: backup diário + antes de migrations em produção

## Funcionalidades implementadas

- Confirmação automática de consulta (WA + resposta "eu vou")
- Lembrete D-1 formalizado (`appointment_confirmations` + cron)
- Pré-cadastro: `/pre-cadastro/:token`
- NPS pós-atendimento: `/nps/:token` + relatório
- Exames/laudos, compartilhamento de prontuário, LGPD
- Recuperação de senha: `/forgot-password`, `/reset-password`
- Menu: Check-in, Contas a Pagar, Fluxo de Caixa

## Testes

```bash
bun run test
```

## Troubleshooting

| Problema | Ação |
|----------|------|
| Cron 401 | Verifique `CRON_SECRET` na Vercel |
| WA não envia | `/api/whatsapp/webhook-status` + Z-API token |
| Types desatualizados | `bun run db:types` após migration |
| Build Vercel | Use Bun (não npm) conforme `vercel.json` |

Documentação operacional detalhada: [docs/RUNBOOK.md](./docs/RUNBOOK.md)
