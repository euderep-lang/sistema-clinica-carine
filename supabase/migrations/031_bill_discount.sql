-- Descontos em cobranças (reduzem o valor da fatura, não entram como recebimento)

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.bills_receivable.discount_value IS 'Soma dos descontos concedidos nesta cobrança.';

CREATE TABLE IF NOT EXISTS public.bill_discounts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bill_receivable_id uuid NOT NULL REFERENCES public.bills_receivable(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  notes text,
  applied_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS bill_discounts_bill_idx
  ON public.bill_discounts (bill_receivable_id, applied_date DESC, created_at DESC);

ALTER TABLE public.bill_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bill_discounts_select ON public.bill_discounts;
CREATE POLICY bill_discounts_select ON public.bill_discounts
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

CREATE OR REPLACE FUNCTION public.receive_bill_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_discount numeric DEFAULT 0
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
  v_discount_id uuid;
  v_fee numeric;
  v_net numeric;
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

  IF p_amount < 0 OR COALESCE(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  IF p_amount <= 0 AND COALESCE(p_discount, 0) <= 0 THEN
    RAISE EXCEPTION 'Informe o valor recebido ou o desconto';
  END IF;

  v_outstanding := v_bill.amount - v_bill.paid_amount;

  IF COALESCE(p_discount, 0) > 0 THEN
    IF p_discount > v_outstanding THEN
      RAISE EXCEPTION 'Desconto maior que o saldo em aberto';
    END IF;

    INSERT INTO public.bill_discounts (
      tenant_id, bill_receivable_id, patient_id, professional_id,
      amount, notes, applied_date, created_by
    ) VALUES (
      v_bill.tenant_id,
      p_bill_id,
      v_bill.patient_id,
      v_bill.professional_id,
      p_discount,
      p_notes,
      COALESCE(p_paid_date, CURRENT_DATE),
      v_user_id
    )
    RETURNING id INTO v_discount_id;

    UPDATE public.bills_receivable
    SET
      amount = amount - p_discount,
      discount_value = discount_value + p_discount
    WHERE id = p_bill_id
    RETURNING * INTO v_bill;

    v_outstanding := v_bill.amount - v_bill.paid_amount;
  END IF;

  IF p_amount > 0 THEN
    IF p_amount > v_outstanding THEN
      RAISE EXCEPTION 'Valor maior que o saldo em aberto';
    END IF;

    SELECT f.fee_amount, f.net_amount
    INTO v_fee, v_net
    FROM public._payment_method_fee(v_bill.tenant_id, p_method, p_amount) f;

    v_new_paid := v_bill.paid_amount + p_amount;

    INSERT INTO public.bill_payments (
      tenant_id, bill_receivable_id, patient_id, professional_id,
      amount, fee_amount, net_amount, payment_method, paid_date, notes, created_by
    ) VALUES (
      v_bill.tenant_id,
      p_bill_id,
      v_bill.patient_id,
      v_bill.professional_id,
      p_amount,
      v_fee,
      v_net,
      p_method,
      COALESCE(p_paid_date, CURRENT_DATE),
      p_notes,
      v_user_id
    )
    RETURNING id INTO v_payment_id;

    UPDATE public.bills_receivable
    SET
      paid_amount = v_new_paid,
      paid_date = CASE WHEN v_new_paid >= v_bill.amount THEN COALESCE(p_paid_date, CURRENT_DATE) ELSE paid_date END,
      payment_method = p_method,
      notes = COALESCE(p_notes, notes)
    WHERE id = p_bill_id
    RETURNING * INTO v_bill;
  END IF;

  IF v_bill.paid_amount >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSIF v_bill.paid_amount > 0 THEN
    v_new_status := 'partial';
  ELSIF v_bill.due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE public.bills_receivable
  SET status = v_new_status
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'payment_id', v_payment_id,
    'discount_id', v_discount_id,
    'paid_amount', v_bill.paid_amount,
    'amount', v_bill.amount,
    'discount_value', v_bill.discount_value,
    'status', v_new_status,
    'fee_amount', v_fee,
    'net_amount', v_net
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_bill_payment(uuid, numeric, text, date, text, numeric) TO authenticated;
