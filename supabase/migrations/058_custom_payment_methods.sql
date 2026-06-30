-- Permite formas de pagamento personalizadas (além das fixas).
-- Os CHECKs antigos limitavam method a uma lista fechada; removemos para
-- aceitar slugs customizados criados pelo próprio tenant.

ALTER TABLE public.payment_method_configs
  DROP CONSTRAINT IF EXISTS payment_method_configs_method_check;

ALTER TABLE public.bill_payments
  DROP CONSTRAINT IF EXISTS bill_payments_payment_method_check;

ALTER TABLE public.bills_receivable
  DROP CONSTRAINT IF EXISTS bills_receivable_payment_method_check;

-- Garante formato de slug saudável (minúsculas, números, underscore).
ALTER TABLE public.payment_method_configs
  ADD CONSTRAINT payment_method_configs_method_format
  CHECK (method ~ '^[a-z0-9_]+$');

-- Marca formas personalizadas para permitir exclusão na UI (as padrão não).
ALTER TABLE public.payment_method_configs
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
