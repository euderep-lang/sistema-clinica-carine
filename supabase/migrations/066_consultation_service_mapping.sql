-- Mapeia qual procedimento (services) representa a "consulta" de cada profissional,
-- por modalidade (presencial/online). Usado para lançar a fatura da consulta
-- automaticamente ao agendar.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consultation_service_id uuid
    REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS online_consultation_service_id uuid
    REFERENCES public.services(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.consultation_service_id IS
  'Procedimento usado como consulta presencial padrão deste profissional.';
COMMENT ON COLUMN public.profiles.online_consultation_service_id IS
  'Procedimento usado como consulta online padrão deste profissional.';
