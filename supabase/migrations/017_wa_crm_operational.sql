-- CRM operacional: encerramento, métricas, reply, auditoria LGPD, fila não atribuída

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS close_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_after_hours_reply_at timestamptz;

ALTER TABLE public.wa_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.wa_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_unassigned
  ON public.wa_conversations (tenant_id, last_message_at DESC NULLS LAST)
  WHERE assigned_to IS NULL AND status = 'open';

CREATE INDEX IF NOT EXISTS idx_wa_messages_body_search
  ON public.wa_messages USING gin (to_tsvector('portuguese', coalesce(body, '')));

CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation_created
  ON public.wa_messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_audit_log_tenant ON public.wa_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_audit_log_conversation ON public.wa_audit_log(conversation_id);

ALTER TABLE public.wa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_audit_log_select ON public.wa_audit_log FOR SELECT TO authenticated
  USING (tenant_id = private.get_my_tenant_id());

CREATE POLICY wa_audit_log_insert ON public.wa_audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_my_tenant_id());
