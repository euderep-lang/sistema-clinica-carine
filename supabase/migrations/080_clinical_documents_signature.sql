-- Metadados de assinatura digital ICP-Brasil nos documentos clínicos (pedidos).
ALTER TABLE public.clinical_documents
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_cn text;
