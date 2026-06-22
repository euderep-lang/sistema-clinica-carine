-- Funde conversas LID duplicadas quando o histórico de mensagens compartilha o mesmo chatLid.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT
      dup.id AS dupe_id,
      keep.id AS keeper_id
    FROM public.wa_conversations dup
    JOIN public.wa_messages m_dup ON m_dup.conversation_id = dup.id
    JOIN public.wa_messages m_keep ON m_keep.tenant_id = dup.tenant_id
      AND (
        m_keep.raw_payload->>'chatLid' = m_dup.raw_payload->>'chatLid'
        OR m_keep.raw_payload->>'phone' = m_dup.raw_payload->>'phone'
        OR m_keep.raw_payload->>'chatLid' = m_dup.raw_payload->>'phone'
        OR m_keep.raw_payload->>'phone' = m_dup.raw_payload->>'chatLid'
      )
    JOIN public.wa_conversations keep ON keep.id = m_keep.conversation_id
      AND keep.tenant_id = dup.tenant_id
      AND keep.channel = 'whatsapp'
      AND dup.channel = 'whatsapp'
      AND keep.id <> dup.id
      AND keep.contact_name IS NOT NULL
      AND keep.contact_name !~ '^[0-9]+$'
    WHERE (
      dup.contact_name ~ '^[0-9]+$'
      OR public.wa_normalize_br_phone(dup.contact_phone) = ''
    )
    AND coalesce(m_dup.raw_payload->>'chatLid', m_dup.raw_payload->>'phone', '') <> ''
  LOOP
    UPDATE public.wa_messages SET conversation_id = rec.keeper_id WHERE conversation_id = rec.dupe_id;
    UPDATE public.wa_notes SET conversation_id = rec.keeper_id WHERE conversation_id = rec.dupe_id;
    UPDATE public.wa_reminders SET conversation_id = rec.keeper_id WHERE conversation_id = rec.dupe_id;
    UPDATE public.wa_transfers SET conversation_id = rec.keeper_id WHERE conversation_id = rec.dupe_id;
    UPDATE public.wa_conversation_tags SET conversation_id = rec.keeper_id WHERE conversation_id = rec.dupe_id
      AND NOT EXISTS (
        SELECT 1 FROM public.wa_conversation_tags t
        WHERE t.conversation_id = rec.keeper_id AND t.tag_id = wa_conversation_tags.tag_id
      );
    DELETE FROM public.wa_conversation_tags WHERE conversation_id = rec.dupe_id;

    UPDATE public.wa_conversations k
    SET unread_count = k.unread_count + COALESCE((SELECT unread_count FROM public.wa_conversations WHERE id = rec.dupe_id), 0)
    WHERE k.id = rec.keeper_id;

    DELETE FROM public.wa_conversations WHERE id = rec.dupe_id;
  END LOOP;
END $$;
