-- Documentos clínicos: atestado, declaração de comparecimento e solicitação de exames
-- com MODELOS PADRÃO personalizáveis e privados por profissional.
--
-- Cada profissional cria/edita seus próprios modelos; nenhum outro usuário tem
-- acesso aos modelos alheios. Os documentos gerados (PDF) são salvos no histórico
-- de mídia do paciente (patient_media_history), aparecendo junto aos demais anexos.

CREATE TABLE IF NOT EXISTS public.clinical_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('atestado', 'declaracao', 'exames')),
  name text NOT NULL,
  -- Conteúdo estruturado do modelo (campos variam por tipo):
  --   atestado:   { days, cid, cid_description, body, rest }
  --   declaracao: { period_start, period_end, body, companion }
  --   exames:     { exams: text[], clinical_indication }
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_doc_tpl_owner
  ON public.clinical_document_templates(professional_id, doc_type);

DROP TRIGGER IF EXISTS clinical_document_templates_updated_at ON public.clinical_document_templates;
CREATE TRIGGER clinical_document_templates_updated_at
  BEFORE UPDATE ON public.clinical_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clinical_document_templates ENABLE ROW LEVEL SECURITY;

-- Apenas o dono (profissional) gerencia e enxerga seus modelos.
DROP POLICY IF EXISTS clinical_doc_tpl_owner ON public.clinical_document_templates;
CREATE POLICY clinical_doc_tpl_owner ON public.clinical_document_templates
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND professional_id = auth.uid())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND professional_id = auth.uid());

-- Registro dos documentos clínicos emitidos (atestado/declaração/exames),
-- para auditoria e listagem. O PDF em si fica em patient_media_history.
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('atestado', 'declaracao', 'exames')),
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_docs_patient ON public.clinical_documents(patient_id);

ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_docs_staff ON public.clinical_documents;
CREATE POLICY clinical_docs_staff ON public.clinical_documents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND (professional_id = auth.uid() OR public.is_ops_staff()))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND (professional_id = auth.uid() OR public.is_ops_staff()));
