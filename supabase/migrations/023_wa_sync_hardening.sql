-- Endurece sincronização CRM: um celular = uma conversa, mensagens sem duplicata.

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS phone_tail text;

UPDATE public.wa_conversations
SET
  contact_phone = public.wa_normalize_br_phone(contact_phone),
  phone_tail = public.wa_phone_tail11(public.wa_normalize_br_phone(contact_phone))
WHERE contact_phone IS NOT NULL;

-- Funde conversas duplicadas do mesmo celular (mesma lógica das migrations 020/021).
DO $$
DECLARE
  rec RECORD;
  keeper_id uuid;
  dupe_id uuid;
BEGIN
  FOR rec IN
    SELECT tenant_id, phone_tail AS tail
    FROM public.wa_conversations
    WHERE phone_tail IS NOT NULL AND phone_tail <> ''
    GROUP BY tenant_id, phone_tail
    HAVING count(*) > 1
  LOOP
    SELECT c.id INTO keeper_id
    FROM public.wa_conversations c
    WHERE c.tenant_id = rec.tenant_id
      AND c.phone_tail = rec.tail
    ORDER BY (c.patient_id IS NOT NULL) DESC, (c.contact_name ~ '^[0-9]+$') ASC, c.last_message_at DESC NULLS LAST, c.created_at ASC
    LIMIT 1;

    FOR dupe_id IN
      SELECT c.id
      FROM public.wa_conversations c
      WHERE c.tenant_id = rec.tenant_id
        AND c.phone_tail = rec.tail
        AND c.id <> keeper_id
    LOOP
      UPDATE public.wa_messages SET conversation_id = keeper_id WHERE conversation_id = dupe_id;
      UPDATE public.wa_notes SET conversation_id = keeper_id WHERE conversation_id = dupe_id;
      UPDATE public.wa_reminders SET conversation_id = keeper_id WHERE conversation_id = dupe_id;
      UPDATE public.wa_transfers SET conversation_id = keeper_id WHERE conversation_id = dupe_id;
      UPDATE public.wa_conversation_tags SET conversation_id = keeper_id WHERE conversation_id = dupe_id
        AND NOT EXISTS (
          SELECT 1 FROM public.wa_conversation_tags t
          WHERE t.conversation_id = keeper_id AND t.tag_id = wa_conversation_tags.tag_id
        );
      DELETE FROM public.wa_conversation_tags WHERE conversation_id = dupe_id;

      UPDATE public.wa_conversations k
      SET unread_count = k.unread_count + COALESCE((SELECT unread_count FROM public.wa_conversations WHERE id = dupe_id), 0)
      WHERE k.id = keeper_id;

      DELETE FROM public.wa_conversations WHERE id = dupe_id;
    END LOOP;

    UPDATE public.wa_conversations
    SET
      contact_phone = public.wa_normalize_br_phone(contact_phone),
      phone_tail = public.wa_phone_tail11(public.wa_normalize_br_phone(contact_phone))
    WHERE id = keeper_id;
  END LOOP;
END $$;

ALTER TABLE public.wa_conversations DROP CONSTRAINT IF EXISTS wa_conversations_tenant_id_contact_phone_key;

CREATE UNIQUE INDEX IF NOT EXISTS wa_conversations_tenant_phone_tail_uidx
  ON public.wa_conversations (tenant_id, phone_tail)
  WHERE phone_tail IS NOT NULL AND phone_tail <> '';

CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_wa_message_id_uidx
  ON public.wa_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL AND wa_message_id <> '';

CREATE OR REPLACE FUNCTION public.wa_conversations_set_phone_tail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.contact_phone := public.wa_normalize_br_phone(NEW.contact_phone);
  NEW.phone_tail := public.wa_phone_tail11(NEW.contact_phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wa_conversations_phone_tail_trg ON public.wa_conversations;
CREATE TRIGGER wa_conversations_phone_tail_trg
  BEFORE INSERT OR UPDATE OF contact_phone ON public.wa_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.wa_conversations_set_phone_tail();
