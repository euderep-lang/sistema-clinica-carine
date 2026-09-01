-- NFS-e via Emissor Nacional (Focus POST /v2/nfsen, payload DPS).
-- Notas antigas continuam consultáveis em /v2/nfse (modo municipal).

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS nfse_modo text;

ALTER TABLE public.bills_receivable
  DROP CONSTRAINT IF EXISTS bills_receivable_nfse_modo_check;

ALTER TABLE public.bills_receivable
  ADD CONSTRAINT bills_receivable_nfse_modo_check CHECK (
    nfse_modo IS NULL
    OR nfse_modo = ANY (ARRAY['nacional'::text, 'municipal'::text])
  );

UPDATE public.bills_receivable
SET nfse_modo = 'municipal'
WHERE nfse_focus_ref IS NOT NULL
  AND nfse_modo IS NULL;

COMMENT ON COLUMN public.bills_receivable.nfse_modo IS
  'nacional = Emissor Nacional (/v2/nfsen); municipal = layout ABRASF antigo (/v2/nfse).';

CREATE TABLE IF NOT EXISTS public.nfse_dps_seq (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  last_number bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.nfse_dps_seq ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.proximo_numero_dps_nfse(p_tenant_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  INSERT INTO public.nfse_dps_seq (tenant_id, last_number)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET last_number = public.nfse_dps_seq.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.proximo_numero_dps_nfse(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.proximo_numero_dps_nfse(uuid) TO service_role;
