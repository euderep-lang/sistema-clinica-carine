-- Abertura / fechamento de caixa com sangria e suprimento

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_amount numeric(12,2) NOT NULL DEFAULT 0,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_at timestamptz,
  counted_amount numeric(12,2),
  expected_amount numeric(12,2),
  difference numeric(12,2),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant_status
  ON public.cash_sessions(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('supply', 'withdrawal')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements(session_id);

DROP TRIGGER IF EXISTS cash_sessions_updated_at ON public.cash_sessions;
CREATE TRIGGER cash_sessions_updated_at
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_sessions_staff ON public.cash_sessions;
CREATE POLICY cash_sessions_staff ON public.cash_sessions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff());

DROP POLICY IF EXISTS cash_movements_staff ON public.cash_movements;
CREATE POLICY cash_movements_staff ON public.cash_movements
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff());
