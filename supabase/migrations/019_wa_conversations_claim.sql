-- Permite que equipe do CRM assuma/atualize conversas na fila (sem responsável).

CREATE OR REPLACE FUNCTION public.can_access_wa_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wa_conversations c
    WHERE c.id = p_conversation_id
      AND c.tenant_id = public.get_my_tenant_id()
      AND (
        public.get_my_role() IN ('admin', 'receptionist')
        OR (
          public.get_my_role() = 'professional'
          AND (c.assigned_to = auth.uid() OR c.assigned_to IS NULL)
        )
      )
  );
$$;

DROP POLICY IF EXISTS wa_conversations_update ON public.wa_conversations;
CREATE POLICY wa_conversations_update ON public.wa_conversations FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(id)
  )
  WITH CHECK (tenant_id = public.get_my_tenant_id());
