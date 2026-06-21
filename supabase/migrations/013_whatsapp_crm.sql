-- WhatsApp CRM (Meta Cloud API) — conversas, mensagens, tags, notas, lembretes e transferências

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
$$;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

CREATE TABLE public.wa_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_wa_tags_tenant ON public.wa_tags(tenant_id);

-- ---------------------------------------------------------------------------
-- Conversas
-- ---------------------------------------------------------------------------

CREATE TABLE public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  contact_phone text NOT NULL,
  contact_name text,
  contact_wa_id text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contact_phone)
);

CREATE INDEX idx_wa_conversations_tenant_last ON public.wa_conversations(tenant_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_wa_conversations_assigned ON public.wa_conversations(tenant_id, assigned_to);

CREATE TABLE public.wa_conversation_tags (
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.wa_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Mensagens
-- ---------------------------------------------------------------------------

CREATE TABLE public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  wa_message_id text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text',
  body text,
  media_id text,
  media_mime text,
  media_filename text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message text,
  sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb
);

CREATE INDEX idx_wa_messages_conversation ON public.wa_messages(conversation_id, created_at);
CREATE INDEX idx_wa_messages_wa_id ON public.wa_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Notas, lembretes, transferências
-- ---------------------------------------------------------------------------

CREATE TABLE public.wa_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_notes_conversation ON public.wa_notes(conversation_id, created_at DESC);

CREATE TABLE public.wa_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  note text,
  completed boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_reminders_assigned ON public.wa_reminders(assigned_to, remind_at) WHERE NOT completed;

CREATE TABLE public.wa_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_transfers_conversation ON public.wa_transfers(conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Acesso por conversa (após criar tabelas)
-- ---------------------------------------------------------------------------

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
        public.get_my_role() IN ('admin', 'professional')
        OR c.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.wa_transfers t
          WHERE t.conversation_id = c.id
            AND (t.from_user_id = auth.uid() OR t.to_user_id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.wa_messages m
          WHERE m.conversation_id = c.id AND m.sent_by = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.wa_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_transfers ENABLE ROW LEVEL SECURITY;

-- Tags: todos do tenant com acesso ao CRM
CREATE POLICY wa_tags_select ON public.wa_tags FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_tags_write ON public.wa_tags FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

-- Conversas
CREATE POLICY wa_conversations_select ON public.wa_conversations FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(id)
  );

CREATE POLICY wa_conversations_update ON public.wa_conversations FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(id)
  )
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY wa_conversations_insert ON public.wa_conversations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  );

-- Tags de conversa
CREATE POLICY wa_conversation_tags_all ON public.wa_conversation_tags FOR ALL TO authenticated
  USING (public.can_access_wa_conversation(conversation_id))
  WITH CHECK (public.can_access_wa_conversation(conversation_id));

-- Mensagens
CREATE POLICY wa_messages_select ON public.wa_messages FOR SELECT TO authenticated
  USING (public.can_access_wa_conversation(conversation_id));

CREATE POLICY wa_messages_insert ON public.wa_messages FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(conversation_id)
  );

-- Notas
CREATE POLICY wa_notes_select ON public.wa_notes FOR SELECT TO authenticated
  USING (public.can_access_wa_conversation(conversation_id));

CREATE POLICY wa_notes_insert ON public.wa_notes FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(conversation_id)
    AND author_id = auth.uid()
  );

-- Lembretes
CREATE POLICY wa_reminders_select ON public.wa_reminders FOR SELECT TO authenticated
  USING (
    public.can_access_wa_conversation(conversation_id)
    AND (public.get_my_role() IN ('admin', 'professional') OR assigned_to = auth.uid())
  );

CREATE POLICY wa_reminders_write ON public.wa_reminders FOR ALL TO authenticated
  USING (public.can_access_wa_conversation(conversation_id))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.can_access_wa_conversation(conversation_id));

-- Transferências
CREATE POLICY wa_transfers_select ON public.wa_transfers FOR SELECT TO authenticated
  USING (public.can_access_wa_conversation(conversation_id));

CREATE POLICY wa_transfers_insert ON public.wa_transfers FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.can_access_wa_conversation(conversation_id)
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;
