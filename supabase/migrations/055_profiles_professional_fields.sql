-- Cadastro de profissional: nome de exibição (como gostaria de ser chamado),
-- profissão (Médica, Dentista, Nutricionista, etc.) e múltiplas especialidades.
-- O conselho continua na coluna existente "crm" (apenas relabel na UI).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS specialties text[];
