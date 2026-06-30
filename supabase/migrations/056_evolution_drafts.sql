-- Rascunho de evolução (prontuário em aberto): salvo automaticamente enquanto
-- o profissional preenche. Ao salvar a evolução, o rascunho é removido (migra
-- para o histórico em patient_evolutions). Um rascunho por profissional+paciente.

CREATE TABLE IF NOT EXISTS public.evolution_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'form',
  form jsonb NOT NULL DEFAULT '{}'::jsonb,
  free_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evolution_drafts_owner_patient_uniq UNIQUE (professional_id, patient_id)
);

CREATE INDEX IF NOT EXISTS evolution_drafts_owner_idx
  ON public.evolution_drafts (professional_id, updated_at DESC);

ALTER TABLE public.evolution_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evolution_drafts_owner ON public.evolution_drafts;
CREATE POLICY evolution_drafts_owner ON public.evolution_drafts
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

DROP TRIGGER IF EXISTS evolution_drafts_set_updated_at ON public.evolution_drafts;
CREATE TRIGGER evolution_drafts_set_updated_at
  BEFORE UPDATE ON public.evolution_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
