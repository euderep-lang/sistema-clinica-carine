-- Profissional passa a enxergar TODAS as conversas do tenant (igual admin e recepção).
-- A diferença de perfil fica só nas NOTIFICAÇÕES (tratada no front): profissional
-- só é notificado quando uma conversa é transferida para ele.

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
      AND public.get_my_role() IN ('admin', 'receptionist', 'professional')
  );
$$;
