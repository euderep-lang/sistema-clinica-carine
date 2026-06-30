-- Categorias para os modelos de documentos clínicos (principalmente os de
-- texto livre / "exames"): Exames, Fórmulas, Orientações Médicas e Outros.

ALTER TABLE public.clinical_document_templates
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'exames'
  CHECK (category IN ('exames', 'formulas', 'orientacoes', 'outros'));

-- Backfill: modelos que não são de "exames" passam para "Outros" por padrão.
UPDATE public.clinical_document_templates
  SET category = 'outros'
  WHERE doc_type <> 'exames';

CREATE INDEX IF NOT EXISTS idx_clinical_doc_tpl_category
  ON public.clinical_document_templates(professional_id, doc_type, category);
