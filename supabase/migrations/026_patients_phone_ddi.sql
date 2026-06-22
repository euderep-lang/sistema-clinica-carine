-- DDI do telefone do paciente (padrão Brasil)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS phone_ddi text NOT NULL DEFAULT '55',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone_ddi text NOT NULL DEFAULT '55';

COMMENT ON COLUMN public.patients.phone_ddi IS 'Código internacional do telefone (sem +), ex.: 55';
COMMENT ON COLUMN public.patients.emergency_contact_phone_ddi IS 'Código internacional do contato de emergência (sem +)';
