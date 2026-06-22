-- Preço de custo dos procedimentos/protocolos (catálogo MEDX)

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.services.cost_price IS 'Custo do insumo/protocolo (referência para margem).';
