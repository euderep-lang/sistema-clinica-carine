-- Lembretes e tarefas CRM sem conversa WhatsApp (ex.: follow-up pós-consulta).

ALTER TABLE public.wa_tasks
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_tasks_patient ON public.wa_tasks(patient_id)
  WHERE patient_id IS NOT NULL;

ALTER TABLE public.wa_reminders
  ALTER COLUMN conversation_id DROP NOT NULL;

ALTER TABLE public.wa_reminders
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_reminders_assigned_no_conv
  ON public.wa_reminders(assigned_to, remind_at)
  WHERE NOT completed AND conversation_id IS NULL;

DROP POLICY IF EXISTS wa_reminders_select ON public.wa_reminders;
CREATE POLICY wa_reminders_select ON public.wa_reminders FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() IN ('admin', 'professional')
      OR assigned_to = auth.uid()
    )
    AND (
      conversation_id IS NULL
      OR public.can_access_wa_conversation(conversation_id)
    )
  );

DROP POLICY IF EXISTS wa_reminders_write ON public.wa_reminders;
CREATE POLICY wa_reminders_write ON public.wa_reminders FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      conversation_id IS NULL
      OR public.can_access_wa_conversation(conversation_id)
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (
      conversation_id IS NULL
      OR public.can_access_wa_conversation(conversation_id)
    )
  );
