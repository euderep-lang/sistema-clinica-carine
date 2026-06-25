-- Mensagens agendadas (envio programado pelo CRM).
-- Processadas pelo cron /api/cron/wa-follow-ups, então funcionam mesmo com o app fechado.

CREATE TABLE IF NOT EXISTS public.wa_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  body text NOT NULL,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'canceled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at timestamptz,
  wa_message_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_scheduled_due
  ON public.wa_scheduled_messages(status, send_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_scheduled_conversation
  ON public.wa_scheduled_messages(conversation_id, send_at);

ALTER TABLE public.wa_scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Equipe do CRM gerencia agendamentos do próprio tenant.
-- O envio em si é feito pelo service role (cron), que ignora RLS.
DROP POLICY IF EXISTS wa_scheduled_select ON public.wa_scheduled_messages;
CREATE POLICY wa_scheduled_select ON public.wa_scheduled_messages FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  );

DROP POLICY IF EXISTS wa_scheduled_insert ON public.wa_scheduled_messages;
CREATE POLICY wa_scheduled_insert ON public.wa_scheduled_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  );

DROP POLICY IF EXISTS wa_scheduled_update ON public.wa_scheduled_messages;
CREATE POLICY wa_scheduled_update ON public.wa_scheduled_messages FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  )
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS wa_scheduled_delete ON public.wa_scheduled_messages;
CREATE POLICY wa_scheduled_delete ON public.wa_scheduled_messages FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  );
