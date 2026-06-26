-- Modalidade do atendimento: presencial ou online (telemedicina).
-- Usado para destacar na agenda e organizar consultas online.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS modality text NOT NULL DEFAULT 'presential';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_modality_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_modality_check
      CHECK (modality = ANY (ARRAY['presential'::text, 'online'::text]));
  END IF;
END $$;
