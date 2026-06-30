-- Módulo "Plano Alimentar": chat com IA + geração de PDF A4.
-- Tabela permanente de planos gerados (meal_plans) + rascunhos de chat
-- temporários (meal_plan_chats, expiram em 72h) + bucket de storage.

-- ---------------------------------------------------------------------------
-- Storage: bucket para planos sem paciente vinculado (cópia permanente).
-- Planos vinculados a paciente continuam indo para "patient-documents" para
-- aparecerem no histórico do prontuário.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meal-plans', 'meal-plans', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS meal_plans_storage ON storage.objects;
CREATE POLICY meal_plans_storage ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'meal-plans'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  )
  WITH CHECK (
    bucket_id = 'meal-plans'
    AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
  );

-- ---------------------------------------------------------------------------
-- meal_plans: registro permanente de cada plano alimentar gerado em PDF.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  peso_kg numeric(6, 2),
  objetivo text,
  cid text,
  plan_text text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'meal-plans',
  storage_path text NOT NULL,
  media_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plans_tenant_idx ON public.meal_plans (tenant_id);
CREATE INDEX IF NOT EXISTS meal_plans_professional_idx ON public.meal_plans (professional_id);
CREATE INDEX IF NOT EXISTS meal_plans_patient_idx ON public.meal_plans (patient_id);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_plans_owner ON public.meal_plans;
CREATE POLICY meal_plans_owner ON public.meal_plans
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (professional_id = auth.uid() OR public.is_ops_staff())
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- meal_plan_chats: rascunho temporário do chat (com a BIO) — apagado em 72h.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plan_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Novo plano',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_plan boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_chats_owner_idx
  ON public.meal_plan_chats (professional_id, expires_at);

ALTER TABLE public.meal_plan_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_plan_chats_owner ON public.meal_plan_chats;
CREATE POLICY meal_plan_chats_owner ON public.meal_plan_chats
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

DROP TRIGGER IF EXISTS meal_plan_chats_set_updated_at ON public.meal_plan_chats;
CREATE TRIGGER meal_plan_chats_set_updated_at
  BEFORE UPDATE ON public.meal_plan_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Limpeza de rascunhos expirados (chamada oportunística pelo app/cron).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_meal_plan_chats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.meal_plan_chats WHERE expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_meal_plan_chats() TO authenticated;
