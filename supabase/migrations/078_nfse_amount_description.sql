-- Guarda valor e discriminação enviados no popup de emissão da NFS-e
-- (podem diferir do amount/description da cobrança).

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS nfse_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS nfse_description text;

COMMENT ON COLUMN public.bills_receivable.nfse_amount IS 'Valor informado no popup ao emitir a NFS-e (valor_servicos na Focus).';
COMMENT ON COLUMN public.bills_receivable.nfse_description IS 'Discriminação informada no popup ao emitir a NFS-e.';
