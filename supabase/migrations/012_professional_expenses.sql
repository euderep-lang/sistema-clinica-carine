-- Categorias de despesa configuráveis + despesas do profissional

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT expense_categories_tenant_name_key UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS expense_categories_tenant_idx
  ON public.expense_categories (tenant_id, sort_order);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_categories_select ON public.expense_categories
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY expense_categories_write ON public.expense_categories
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR public.is_financial_staff())
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR public.is_financial_staff())
  );

CREATE TRIGGER expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.expense_categories (tenant_id, name, sort_order)
SELECT t.id, v.name, v.sort_order
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('Aluguel', 1),
    ('Salários', 2),
    ('Materiais', 3),
    ('Equipamentos', 4),
    ('Divulgação', 5),
    ('Serviços', 6),
    ('Impostos', 7),
    ('Outros', 8)
) AS v(name, sort_order)
ON CONFLICT (tenant_id, name) DO NOTHING;

ALTER TABLE public.bills_payable
  ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bp_professional
  ON public.bills_payable (professional_id, due_date DESC)
  WHERE professional_id IS NOT NULL;

CREATE POLICY bills_payable_professional ON public.bills_payable
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );
