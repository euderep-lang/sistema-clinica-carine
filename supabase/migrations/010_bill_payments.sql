-- Histórico de pagamentos com estorno individual

CREATE TABLE public.bill_payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bill_receivable_id uuid NOT NULL REFERENCES public.bills_receivable(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  paid_date date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
  reversed_at timestamp with time zone,
  reversed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reversal_reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT bill_payments_payment_method_check CHECK (
    payment_method = ANY (ARRAY[
      'cash'::text, 'pix'::text, 'credit_card'::text, 'debit_card'::text,
      'health_insurance'::text, 'bank_transfer'::text, 'other'::text
    ])
  )
);

CREATE INDEX bill_payments_bill_idx ON public.bill_payments (bill_receivable_id, created_at DESC);
CREATE INDEX bill_payments_tenant_date_idx ON public.bill_payments (tenant_id, paid_date DESC);

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY bill_payments_select ON public.bill_payments
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_financial_staff()
      OR professional_id = auth.uid()
      OR (
        public.get_my_role() = 'professional'
        AND public.professional_has_patient(patient_id)
      )
    )
  );

-- Backfill: pagamentos já registrados diretamente na cobrança
INSERT INTO public.bill_payments (
  tenant_id, bill_receivable_id, patient_id, professional_id,
  amount, payment_method, paid_date, notes, status, created_by
)
SELECT
  br.tenant_id,
  br.id,
  br.patient_id,
  br.professional_id,
  br.paid_amount,
  COALESCE(br.payment_method, 'other'),
  COALESCE(br.paid_date, br.updated_at::date, CURRENT_DATE),
  br.notes,
  'active',
  br.professional_id
FROM public.bills_receivable br
WHERE br.paid_amount > 0
  AND br.status IN ('paid', 'partial')
  AND NOT EXISTS (
    SELECT 1 FROM public.bill_payments bp WHERE bp.bill_receivable_id = br.id
  );

CREATE OR REPLACE FUNCTION public.receive_bill_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bill public.bills_receivable%ROWTYPE;
  v_outstanding numeric;
  v_new_paid numeric;
  v_new_status text;
  v_payment_id uuid;
BEGIN
  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = p_bill_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para receber esta cobrança';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cobrança cancelada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  v_outstanding := v_bill.amount - v_bill.paid_amount;
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'Valor maior que o saldo em aberto';
  END IF;

  v_new_paid := v_bill.paid_amount + p_amount;
  v_new_status := CASE WHEN v_new_paid >= v_bill.amount THEN 'paid' ELSE 'partial' END;

  INSERT INTO public.bill_payments (
    tenant_id, bill_receivable_id, patient_id, professional_id,
    amount, payment_method, paid_date, notes, created_by
  ) VALUES (
    v_bill.tenant_id,
    p_bill_id,
    v_bill.patient_id,
    v_bill.professional_id,
    p_amount,
    p_method,
    COALESCE(p_paid_date, CURRENT_DATE),
    p_notes,
    v_user_id
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.bills_receivable
  SET
    paid_amount = v_new_paid,
    status = v_new_status,
    paid_date = CASE WHEN v_new_status = 'paid' THEN COALESCE(p_paid_date, CURRENT_DATE) ELSE paid_date END,
    payment_method = p_method,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'payment_id', v_payment_id,
    'paid_amount', v_new_paid,
    'status', v_new_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_bill_payment(
  p_payment_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.bill_payments%ROWTYPE;
  v_bill public.bills_receivable%ROWTYPE;
  v_new_paid numeric;
  v_new_status text;
  v_last_paid_date date;
BEGIN
  SELECT * INTO v_payment
  FROM public.bill_payments
  WHERE id = p_payment_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF v_payment.status = 'reversed' THEN
    RAISE EXCEPTION 'Pagamento já estornado';
  END IF;

  IF NOT (public.is_ops_staff() OR v_payment.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para estornar este pagamento';
  END IF;

  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = v_payment.bill_receivable_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança vinculada não encontrada';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cobrança cancelada — não é possível estornar pagamento';
  END IF;

  UPDATE public.bill_payments
  SET
    status = 'reversed',
    reversed_at = now(),
    reversed_by = v_user_id,
    reversal_reason = COALESCE(p_reason, 'Estorno de pagamento')
  WHERE id = p_payment_id;

  v_new_paid := GREATEST(0, v_bill.paid_amount - v_payment.amount);

  SELECT MAX(bp.paid_date) INTO v_last_paid_date
  FROM public.bill_payments bp
  WHERE bp.bill_receivable_id = v_bill.id
    AND bp.status = 'active';

  IF v_new_paid <= 0 THEN
    v_new_status := 'pending';
    v_last_paid_date := NULL;
  ELSIF v_new_paid >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE public.bills_receivable
  SET
    paid_amount = v_new_paid,
    status = v_new_status,
    paid_date = v_last_paid_date,
    payment_method = CASE
      WHEN v_new_paid <= 0 THEN NULL
      ELSE (
        SELECT bp.payment_method
        FROM public.bill_payments bp
        WHERE bp.bill_receivable_id = v_bill.id
          AND bp.status = 'active'
        ORDER BY bp.paid_date DESC, bp.created_at DESC
        LIMIT 1
      )
    END
  WHERE id = v_bill.id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'bill_id', v_bill.id,
    'paid_amount', v_new_paid,
    'status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_bill_payment(uuid, numeric, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_bill_payment(uuid, text) TO authenticated;
