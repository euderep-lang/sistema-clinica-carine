-- Recepção e admin: todas as conversas. Profissional: só o que está atribuído a ele.

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
          AND c.assigned_to = auth.uid()
        )
      )
  );
$$;
