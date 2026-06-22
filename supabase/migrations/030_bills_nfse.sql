-- NFS-e (Focus NFe) — número e status por cobrança

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS nfse_number text,
  ADD COLUMN IF NOT EXISTS nfse_status text,
  ADD COLUMN IF NOT EXISTS nfse_issued_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS nfse_focus_ref text;

ALTER TABLE public.bills_receivable
  DROP CONSTRAINT IF EXISTS bills_receivable_nfse_status_check;

ALTER TABLE public.bills_receivable
  ADD CONSTRAINT bills_receivable_nfse_status_check CHECK (
    nfse_status IS NULL
    OR nfse_status = ANY (ARRAY['pending'::text, 'issued'::text, 'failed'::text, 'cancelled'::text])
  );

COMMENT ON COLUMN public.bills_receivable.nfse_number IS 'Número da NFS-e emitida (preenchido pela API Focus NFe).';
COMMENT ON COLUMN public.bills_receivable.nfse_status IS 'pending | issued | failed | cancelled';
COMMENT ON COLUMN public.bills_receivable.nfse_focus_ref IS 'Referência/id retornado pela Focus NFe.';
