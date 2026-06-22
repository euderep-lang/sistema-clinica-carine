-- Funde conversas duplicadas criadas por @lid / phone inválido da Z-API (ex.: mensagem fromMe pelo app).

CREATE OR REPLACE FUNCTION public.wa_normalize_br_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
  ddd text;
  local text;
  embedded text;
BEGIN
  IF coalesce(p, '') ~* '@lid' THEN RETURN ''; END IF;

  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  IF d = '' THEN RETURN d; END IF;
  IF d LIKE '0%' THEN d := substring(d from 2); END IF;
  IF d NOT LIKE '55%' THEN d := '55' || d; END IF;

  IF length(d) > 13 THEN
    embedded := substring(d from '55[1-9][0-9]9[0-9]{8}');
    IF embedded IS NOT NULL AND length(embedded) = 13 THEN
      RETURN embedded;
    END IF;
    RETURN '';
  END IF;

  IF length(d) = 13 AND d ~ '^55[1-9][0-9]9[0-9]{8}$' THEN RETURN d; END IF;

  IF length(d) = 12 THEN
    ddd := substring(d from 3 for 2);
    local := substring(d from 5);
    IF length(local) = 8 AND local ~ '^[6789]' THEN
      d := '55' || ddd || '9' || local;
    END IF;
  END IF;

  IF d ~ '^55[1-9][0-9]9[0-9]{8}$' THEN RETURN d; END IF;
  RETURN '';
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_conversations_set_phone_tail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.channel, 'whatsapp') = 'whatsapp' THEN
    NEW.contact_phone := public.wa_normalize_br_phone(NEW.contact_phone);
    IF NEW.contact_phone IS NULL OR NEW.contact_phone = '' THEN
      NEW.phone_tail := NULL;
    ELSE
      NEW.phone_tail := public.wa_phone_tail11(NEW.contact_phone);
    END IF;
  ELSE
    NEW.phone_tail := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Conversa LID (nome numérico) cuja mensagem tem chatName → funde na conversa com esse nome.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT dup.id AS dupe_id, keep.id AS keeper_id
    FROM public.wa_conversations dup
    JOIN public.wa_messages m ON m.conversation_id = dup.id
    JOIN public.wa_conversations keep
      ON keep.tenant_id = dup.tenant_id
      AND keep.channel = 'whatsapp'
      AND dup.channel = 'whatsapp'
      AND keep.id <> dup.id
      AND keep.contact_name IS NOT NULL
      AND keep.contact_name !~ '^[0-9]+$'
      AND lower(trim(keep.contact_name)) = lower(trim(m.raw_payload->>'chatName'))
    WHERE dup.contact_name ~ '^[0-9]+$'
      AND coalesce(m.raw_payload->>'chatName', '') <> ''
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

-- Mesmo contact_wa_id em duas conversas → funde na com paciente ou nome legível.
DO $$
DECLARE
  rec RECORD;
  keeper_id uuid;
  dupe_id uuid;
BEGIN
  FOR rec IN
    SELECT tenant_id, contact_wa_id AS wa_id
    FROM public.wa_conversations
    WHERE channel = 'whatsapp'
      AND contact_wa_id IS NOT NULL
      AND contact_wa_id <> ''
    GROUP BY tenant_id, contact_wa_id
    HAVING count(*) > 1
  LOOP
    SELECT c.id INTO keeper_id
    FROM public.wa_conversations c
    WHERE c.tenant_id = rec.tenant_id
      AND c.contact_wa_id = rec.wa_id
      AND c.channel = 'whatsapp'
    ORDER BY (c.patient_id IS NOT NULL) DESC, (c.contact_name ~ '^[0-9]+$') ASC, c.last_message_at DESC NULLS LAST, c.created_at ASC
    LIMIT 1;

    FOR dupe_id IN
      SELECT c.id
      FROM public.wa_conversations c
      WHERE c.tenant_id = rec.tenant_id
        AND c.contact_wa_id = rec.wa_id
        AND c.channel = 'whatsapp'
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
  END LOOP;
END $$;
