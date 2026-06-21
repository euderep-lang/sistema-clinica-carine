-- CRM Kommo-style: multicanal, quick replies, tags com automação, tarefas, funil, broadcast

-- ---------------------------------------------------------------------------
-- Multicanal (WhatsApp + Instagram + Messenger)
-- ---------------------------------------------------------------------------

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'instagram', 'messenger')),
  ADD COLUMN IF NOT EXISTS external_user_id text,
  ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid,
  ADD COLUMN IF NOT EXISTS deal_id uuid;

DROP INDEX IF EXISTS wa_conversations_tenant_phone_tail_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS wa_conversations_tenant_channel_phone_tail_uidx
  ON public.wa_conversations (tenant_id, channel, phone_tail)
  WHERE phone_tail IS NOT NULL AND phone_tail <> '' AND channel = 'whatsapp';

CREATE UNIQUE INDEX IF NOT EXISTS wa_conversations_tenant_channel_external_uidx
  ON public.wa_conversations (tenant_id, channel, external_user_id)
  WHERE external_user_id IS NOT NULL AND channel IN ('instagram', 'messenger');

CREATE INDEX IF NOT EXISTS idx_wa_conversations_channel
  ON public.wa_conversations (tenant_id, channel, last_message_at DESC NULLS LAST);

-- Normaliza phone_tail só para WhatsApp
CREATE OR REPLACE FUNCTION public.wa_conversations_set_phone_tail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.channel, 'whatsapp') = 'whatsapp' THEN
    NEW.contact_phone := public.wa_normalize_br_phone(NEW.contact_phone);
    NEW.phone_tail := public.wa_phone_tail11(NEW.contact_phone);
  ELSE
    NEW.phone_tail := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tags enriquecidas + regras de automação
-- ---------------------------------------------------------------------------

ALTER TABLE public.wa_tags
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.wa_tag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.wa_tags(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('keyword', 'first_message', 'channel', 'pipeline_stage')),
  trigger_value text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_tag_rules_tenant ON public.wa_tag_rules(tenant_id) WHERE active;

ALTER TABLE public.wa_tag_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_tag_rules_all ON public.wa_tag_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

-- ---------------------------------------------------------------------------
-- Respostas rápidas CRM (independente de message_templates marketing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  shortcut text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_wa_quick_replies_tenant ON public.wa_quick_replies(tenant_id, sort_order);

ALTER TABLE public.wa_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_quick_replies_all ON public.wa_quick_replies FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

-- ---------------------------------------------------------------------------
-- Tarefas integradas (Kommo-style) + lembretes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  task_type text NOT NULL DEFAULT 'follow_up' CHECK (task_type IN ('call', 'follow_up', 'meeting', 'whatsapp', 'other')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_tasks_assigned_due ON public.wa_tasks(assigned_to, due_at) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_wa_tasks_conversation ON public.wa_tasks(conversation_id);

ALTER TABLE public.wa_reminders
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.wa_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.wa_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_tasks_select ON public.wa_tasks FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() IN ('admin', 'professional')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY wa_tasks_write ON public.wa_tasks FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ---------------------------------------------------------------------------
-- Funil de vendas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.wa_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.wa_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  sort_order integer NOT NULL DEFAULT 0,
  win_probability integer NOT NULL DEFAULT 0 CHECK (win_probability >= 0 AND win_probability <= 100)
);

CREATE INDEX IF NOT EXISTS idx_wa_pipeline_stages_pipeline ON public.wa_pipeline_stages(pipeline_id, sort_order);

CREATE TABLE IF NOT EXISTS public.wa_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.wa_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.wa_pipeline_stages(id) ON DELETE RESTRICT,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  title text NOT NULL,
  value_cents bigint NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_deals_stage ON public.wa_deals(stage_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_deals_conversation ON public.wa_deals(conversation_id);

ALTER TABLE public.wa_conversations
  DROP CONSTRAINT IF EXISTS wa_conversations_pipeline_stage_id_fkey,
  DROP CONSTRAINT IF EXISTS wa_conversations_deal_id_fkey;

ALTER TABLE public.wa_conversations
  ADD CONSTRAINT wa_conversations_pipeline_stage_id_fkey
    FOREIGN KEY (pipeline_stage_id) REFERENCES public.wa_pipeline_stages(id) ON DELETE SET NULL,
  ADD CONSTRAINT wa_conversations_deal_id_fkey
    FOREIGN KEY (deal_id) REFERENCES public.wa_deals(id) ON DELETE SET NULL;

ALTER TABLE public.wa_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_pipelines_all ON public.wa_pipelines FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_pipeline_stages_all ON public.wa_pipeline_stages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wa_pipelines p
      WHERE p.id = pipeline_id AND p.tenant_id = public.get_my_tenant_id()
    )
    AND public.get_my_role() IN ('admin', 'professional', 'receptionist')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wa_pipelines p
      WHERE p.id = pipeline_id AND p.tenant_id = public.get_my_tenant_id()
    )
  );

CREATE POLICY wa_deals_all ON public.wa_deals FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

-- ---------------------------------------------------------------------------
-- Broadcast (templates Meta)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'pt_BR',
  template_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.wa_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.wa_broadcasts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_recipients_broadcast ON public.wa_broadcast_recipients(broadcast_id);

ALTER TABLE public.wa_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_broadcasts_all ON public.wa_broadcasts FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_broadcast_recipients_all ON public.wa_broadcast_recipients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wa_broadcasts b
      WHERE b.id = broadcast_id AND b.tenant_id = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wa_broadcasts b
      WHERE b.id = broadcast_id AND b.tenant_id = public.get_my_tenant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Busca global em mensagens (FTS + fallback ilike)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_wa_messages_global(
  p_query text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  body text,
  message_type text,
  direction text,
  created_at timestamptz,
  contact_name text,
  contact_phone text,
  channel text,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_q text;
BEGIN
  v_tenant := public.get_my_tenant_id();
  v_q := trim(coalesce(p_query, ''));
  IF v_q = '' OR length(v_q) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id AS message_id,
    m.conversation_id,
    m.body,
    m.message_type,
    m.direction,
    m.created_at,
    c.contact_name,
    c.contact_phone,
    c.channel,
    ts_rank(to_tsvector('portuguese', coalesce(m.body, '')), plainto_tsquery('portuguese', v_q)) AS rank
  FROM public.wa_messages m
  JOIN public.wa_conversations c ON c.id = m.conversation_id
  WHERE m.tenant_id = v_tenant
    AND public.can_access_wa_conversation(m.conversation_id)
    AND (
      to_tsvector('portuguese', coalesce(m.body, '')) @@ plainto_tsquery('portuguese', v_q)
      OR m.body ILIKE '%' || v_q || '%'
      OR coalesce(m.media_filename, '') ILIKE '%' || v_q || '%'
    )
  ORDER BY rank DESC NULLS LAST, m.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 50), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_wa_messages_global(text, integer) TO authenticated;

-- Índice em filename para busca
CREATE INDEX IF NOT EXISTS idx_wa_messages_filename_search
  ON public.wa_messages USING gin (to_tsvector('portuguese', coalesce(media_filename, '')));
