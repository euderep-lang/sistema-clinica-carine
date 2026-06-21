-- Follow-up automático + métricas CRM

-- ---------------------------------------------------------------------------
-- Campos operacionais em conversas
-- ---------------------------------------------------------------------------

ALTER TABLE public.wa_conversations
  ADD COLUMN IF NOT EXISTS objection_type text,
  ADD COLUMN IF NOT EXISTS price_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_first_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_patient_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS loss_reason_detail text;

CREATE INDEX IF NOT EXISTS idx_wa_conversations_price_sent
  ON public.wa_conversations(tenant_id, price_sent_at DESC NULLS LAST)
  WHERE price_sent_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Sequências de follow-up (agrupa passos relacionados)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_follow_up_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);

CREATE INDEX IF NOT EXISTS idx_wa_follow_up_runs_tenant_status
  ON public.wa_follow_up_runs(tenant_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_follow_up_runs_conversation
  ON public.wa_follow_up_runs(conversation_id)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Passos agendados (auto ou manual)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_follow_up_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.wa_follow_up_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  sequence_order integer NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'manual')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped', 'failed')),
  message_template text NOT NULL,
  rendered_message text,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at timestamptz,
  error_message text,
  wa_message_id uuid REFERENCES public.wa_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_follow_up_schedules_due
  ON public.wa_follow_up_schedules(tenant_id, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wa_follow_up_schedules_run
  ON public.wa_follow_up_schedules(run_id, sequence_order);

-- ---------------------------------------------------------------------------
-- Eventos para métricas CRM
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wa_crm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_crm_events_tenant_type_date
  ON public.wa_crm_events(tenant_id, event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.wa_follow_up_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_follow_up_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_crm_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_follow_up_runs_all ON public.wa_follow_up_runs FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_follow_up_schedules_all ON public.wa_follow_up_schedules FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_crm_events_select ON public.wa_crm_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() IN ('admin', 'professional', 'receptionist'));

CREATE POLICY wa_crm_events_insert ON public.wa_crm_events FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY wa_crm_events_admin ON public.wa_crm_events FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin')
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.get_my_role() = 'admin');
