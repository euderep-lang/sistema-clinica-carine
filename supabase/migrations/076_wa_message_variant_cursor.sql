-- Cursor de rotação das 5 variações de follow-up por paciente (ou conversa).

CREATE TABLE IF NOT EXISTS public.wa_message_variant_cursor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  last_index integer NOT NULL DEFAULT -1
    CHECK (last_index >= -1 AND last_index <= 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wa_message_variant_cursor_subject_chk CHECK (
    (patient_id IS NOT NULL AND conversation_id IS NULL)
    OR (patient_id IS NULL AND conversation_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_variant_cursor_patient
  ON public.wa_message_variant_cursor (tenant_id, step_key, patient_id)
  WHERE patient_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_variant_cursor_conversation
  ON public.wa_message_variant_cursor (tenant_id, step_key, conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_variant_cursor_tenant_step
  ON public.wa_message_variant_cursor (tenant_id, step_key);

ALTER TABLE public.wa_message_variant_cursor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_message_variant_cursor_all ON public.wa_message_variant_cursor;
CREATE POLICY wa_message_variant_cursor_all ON public.wa_message_variant_cursor
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  );
