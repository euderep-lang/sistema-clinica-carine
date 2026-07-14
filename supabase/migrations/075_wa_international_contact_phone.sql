-- Permite telefones internacionais no CRM WhatsApp.
-- O trigger antigo forçava wa_normalize_br_phone e apagava números com DDI ≠ BR (ex.: +1).

CREATE OR REPLACE FUNCTION public.wa_normalize_contact_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
  br text;
BEGIN
  IF coalesce(p, '') ~* '@lid' THEN
    RETURN '';
  END IF;

  d := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  IF d = '' THEN
    RETURN '';
  END IF;
  IF d LIKE '0%' THEN
    d := substring(d from 2);
  END IF;

  -- Preferência: celular BR E.164 válido
  br := public.wa_normalize_br_phone(d);
  IF br IS NOT NULL AND br <> '' AND br ~ '^55[1-9][0-9]9[0-9]{8}$' THEN
    RETURN br;
  END IF;

  -- Internacional (não começa com 55): mantém dígitos 10–15
  IF d !~ '^55' AND d ~ '^[1-9][0-9]{9,14}$' THEN
    RETURN d;
  END IF;

  -- BR inválido / incompleto: vazio (evita gravar lixo)
  RETURN '';
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_conversations_set_phone_tail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.channel, 'whatsapp') = 'whatsapp' THEN
    NEW.contact_phone := public.wa_normalize_contact_phone(NEW.contact_phone);
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

-- Repara conversas abertas de paciente com telefone internacional já cadastrado.
UPDATE public.wa_conversations c
SET
  contact_phone = public.wa_normalize_contact_phone(
    COALESCE(NULLIF(p.phone_ddi, ''), '55') || regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
  ),
  updated_at = now()
FROM public.patients p
WHERE c.patient_id = p.id
  AND COALESCE(c.channel, 'whatsapp') = 'whatsapp'
  AND (c.contact_phone IS NULL OR c.contact_phone = '')
  AND p.phone IS NOT NULL
  AND p.phone <> ''
  AND COALESCE(NULLIF(p.phone_ddi, ''), '55') <> '55';
