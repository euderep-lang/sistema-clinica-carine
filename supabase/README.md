# Migração do banco — ClinicOS

O schema **não veio no export do Lovable**; ele ficava só no Supabase gerenciado. Este diretório versiona o DDL exportado do projeto Supabase próprio (`jglzghujpxbakqqmmple`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `migrations/001_initial_schema.sql` | Tabelas, funções, RLS, triggers, índices |
| `migrations/002_storage_and_seed.sql` | Buckets de storage + tenant inicial |
| `apply-all.sql` | Índice para aplicar manualmente no SQL Editor |

## Fluxo recomendado (projeto novo / outro ambiente)

### 1. Variáveis no `.env`

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_PASSWORD=...          # ou DATABASE_URL completa
MASTER_EMAIL=carine@dracarinecassol.com.br
MASTER_PASSWORD=...               # senha do admin master
MASTER_NAME="Dra. Carine Cassol"
```

Opcional — copiar dados do Lovable:

```bash
OLD_SUPABASE_URL=https://gcuitpaytezzgvismxqg.supabase.co
OLD_SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Setup automático

```bash
bun run db:setup
```

Isso executa, em ordem:

1. **Schema** — aplica `supabase/migrations/*.sql`
2. **Dados** — copia do Supabase antigo (se `OLD_SUPABASE_SERVICE_ROLE_KEY` estiver definida)
3. **Seed** — cria/atualiza o usuário master admin

### Opções

```bash
bun run db:setup --schema-only     # só DDL
bun run db:setup --seed-only       # só usuário master
bun run db:setup --with-data       # força cópia de dados
```

### 3. Passo a passo manual

```bash
# Aplicar schema
bun run db:schema

# Copiar dados do Lovable (opcional)
bun run db:migrate data

# Criar usuário admin
bun run db:seed
```

**Sem CLI:** cole `migrations/001_initial_schema.sql` e depois `002_storage_and_seed.sql` no [SQL Editor](https://supabase.com/dashboard/project/jglzghujpxbakqqmmple/sql/new) e rode `bun run db:seed`.

## Atualizar migrations a partir do Supabase

Se o schema mudar no painel, re-exporte:

```bash
bun run db:export
```

Requer `SUPABASE_DB_PASSWORD` ou `DATABASE_URL` + `pg_dump` instalado.

## Comandos npm

| Comando | Ação |
|---|---|
| `bun run db:export` | Exporta schema do Supabase → `supabase/migrations/` |
| `bun run db:schema` | Aplica migrations no banco remoto |
| `bun run db:migrate` | CLI completa (`schema` \| `data` \| `seed` \| `all`) |
| `bun run db:seed` | Garante usuário master |
| `bun run db:setup` | Orquestra schema + data + seed |

## Situação atual deste projeto

O Supabase **jglzghujpxbakqqmmple** já tem o schema aplicado (29 tabelas). As migrations aqui servem para:

- versionar o DDL no Git
- recriar o banco em outro ambiente
- onboarding de novos desenvolvedores

Se o banco já estiver populado, pule o schema e rode apenas:

```bash
bun run db:seed
```
