-- Módulo "Orçamento com IA": rascunhos de chat temporários (72h).
-- O orçamento final continua sendo gravado em budgets/budget_items +
-- bills_receivable (status 'budget') pelo fluxo financeiro existente.

CREATE TABLE IF NOT EXISTS public.budget_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Novo orçamento',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_budget boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_chats_owner_idx
  ON public.budget_chats (professional_id, expires_at);

ALTER TABLE public.budget_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS budget_chats_owner ON public.budget_chats;
CREATE POLICY budget_chats_owner ON public.budget_chats
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

DROP TRIGGER IF EXISTS budget_chats_set_updated_at ON public.budget_chats;
CREATE TRIGGER budget_chats_set_updated_at
  BEFORE UPDATE ON public.budget_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.purge_expired_budget_chats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.budget_chats WHERE expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_budget_chats() TO authenticated;
