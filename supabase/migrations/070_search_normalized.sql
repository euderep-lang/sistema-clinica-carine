-- ---------------------------------------------------------------------------
-- Busca de pacientes sem diferenciar acento / caixa
-- ---------------------------------------------------------------------------
-- Coluna gerada com o nome normalizado (minúsculas + sem acentos). Usamos
-- translate() (IMMUTABLE) em vez de unaccent (STABLE) para permitir coluna
-- gerada. A normalização espelha `normalizeSearch()` no front (src/lib/search.ts):
-- a busca envia o termo já sem acentos e comparamos com esta coluna.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS search_name text
  GENERATED ALWAYS AS (
    translate(
      lower(coalesce(full_name, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    )
  ) STORED;

-- Índice trigram para acelerar buscas com ILIKE '%termo%'.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_patients_search_name_trgm
  ON public.patients USING gin (search_name gin_trgm_ops);
