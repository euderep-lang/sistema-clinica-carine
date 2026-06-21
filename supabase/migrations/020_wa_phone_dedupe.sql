-- Unifica conversas duplicadas do mesmo celular (formatos diferentes de telefone).

CREATE OR REPLACE FUNCTION public.wa_phone_tail11(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 11);
$$;

CREATE OR REPLACE FUNCTION public.wa_normalize_br_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
  ddd text;
  local text;
BEGIN
  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  IF d = '' THEN RETURN d; END IF;
  IF d LIKE '0%' THEN d := substring(d from 2); END IF;
  IF d NOT LIKE '55%' THEN d := '55' || d; END IF;
  IF length(d) = 12 THEN
    ddd := substring(d from 3 for 2);
    local := substring(d from 5);
    IF length(local) = 8 AND local NOT LIKE '9%' THEN
      d := '55' || ddd || '9' || local;
    END IF;
  END IF;
  RETURN d;
END;
$$;

DO $$
DECLARE
  rec RECORD;
  keeper_id uuid;
  dupe_id uuid;
BEGIN
  FOR rec IN
    SELECT tenant_id, public.wa_phone_tail11(contact_phone) AS tail
    FROM public.wa_conversations
    GROUP BY tenant_id, public.wa_phone_tail11(contact_phone)
    HAVING count(*) > 1
  LOOP
    SELECT c.id INTO keeper_id
    FROM public.wa_conversations c
    WHERE c.tenant_id = rec.tenant_id
      AND public.wa_phone_tail11(c.contact_phone) = rec.tail
    ORDER BY (c.patient_id IS NOT NULL) DESC, c.last_message_at DESC NULLS LAST, c.created_at ASC
    LIMIT 1;

    FOR dupe_id IN
      SELECT c.id
      FROM public.wa_conversations c
      WHERE c.tenant_id = rec.tenant_id
        AND public.wa_phone_tail11(c.contact_phone) = rec.tail
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
      DELETE FROM public.wa_conversations WHERE id = dupe_id;
    END LOOP;

    UPDATE public.wa_conversations
    SET contact_phone = public.wa_normalize_br_phone(contact_phone)
    WHERE id = keeper_id;
  END LOOP;
END $$;

UPDATE public.wa_conversations
SET contact_phone = public.wa_normalize_br_phone(contact_phone)
WHERE contact_phone IS NOT NULL;

UPDATE public.wa_conversations c
SET contact_name = p.full_name
FROM public.patients p
WHERE c.patient_id = p.id
  AND p.full_name IS NOT NULL
  AND (c.contact_name IS NULL OR c.contact_name IS DISTINCT FROM p.full_name);
