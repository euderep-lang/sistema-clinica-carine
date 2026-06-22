-- Origem do agendamento (CRM vs agenda da clínica) + vínculo com conversa WA

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS wa_conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_source_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_source_check
  CHECK (
    source IS NULL
    OR source = ANY (ARRAY['crm'::text, 'reception'::text, 'professional'::text, 'import'::text])
  );

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_source_created
  ON public.appointments(tenant_id, source, created_at DESC)
  WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_wa_conversation
  ON public.appointments(wa_conversation_id)
  WHERE wa_conversation_id IS NOT NULL;
