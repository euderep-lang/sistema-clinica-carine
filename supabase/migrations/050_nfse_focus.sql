-- NFS-e via Focus NFe: campos adicionais e status 'processing'

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS nfse_url text,
  ADD COLUMN IF NOT EXISTS nfse_pdf_url text,
  ADD COLUMN IF NOT EXISTS nfse_message text;

ALTER TABLE public.bills_receivable
  DROP CONSTRAINT IF EXISTS bills_receivable_nfse_status_check;

ALTER TABLE public.bills_receivable
  ADD CONSTRAINT bills_receivable_nfse_status_check CHECK (
    nfse_status IS NULL
    OR nfse_status = ANY (ARRAY['pending'::text, 'processing'::text, 'issued'::text, 'failed'::text, 'cancelled'::text])
  );

COMMENT ON COLUMN public.bills_receivable.nfse_url IS 'Link da NFS-e no portal municipal (Focus NFe).';
COMMENT ON COLUMN public.bills_receivable.nfse_pdf_url IS 'Link do PDF/DANFSE (Focus NFe).';
COMMENT ON COLUMN public.bills_receivable.nfse_message IS 'Mensagem de erro/retorno da última tentativa.';
