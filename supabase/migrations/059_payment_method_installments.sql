-- Categorização de formas de pagamento:
--  - parcelamento (crédito/link perguntam o nº de parcelas)
--  - prazo de recebimento (em quantos dias o dinheiro cai na conta)
--  - taxa por parcela (1x X%, 2x Y%, ...)
--  - a taxa é lançada automaticamente como despesa (paga na data do crédito)

ALTER TABLE public.payment_method_configs
  ADD COLUMN IF NOT EXISTS supports_installments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_installments integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS settlement_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_fees jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Padrões sensatos para os métodos já existentes
UPDATE public.payment_method_configs
SET supports_installments = true, settlement_days = GREATEST(settlement_days, 30)
WHERE method = 'credit_card';

UPDATE public.payment_method_configs
SET settlement_days = GREATEST(settlement_days, 1)
WHERE method = 'debit_card';

-- bill_payments: nº de parcelas usado e vínculo com a despesa da taxa gerada
ALTER TABLE public.bill_payments
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fee_expense_id uuid REFERENCES public.bills_payable(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Cálculo de taxa considerando o nº de parcelas + retorno do prazo de crédito
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._payment_method_fee(
  p_tenant_id uuid,
  p_method text,
  p_amount numeric,
  p_installments integer
) RETURNS TABLE(fee_amount numeric, net_amount numeric, settlement_days integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cfg public.payment_method_configs%ROWTYPE;
  v_percent numeric := 0;
  v_fee numeric;
  v_n integer := GREATEST(1, COALESCE(p_installments, 1));
BEGIN
  SELECT * INTO v_cfg
  FROM public.payment_method_configs
  WHERE tenant_id = p_tenant_id
    AND method = p_method
    AND active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, round(p_amount, 2), 0;
    RETURN;
  END IF;

  IF v_cfg.installment_fees ? v_n::text THEN
    v_percent := COALESCE((v_cfg.installment_fees->>v_n::text)::numeric, v_cfg.fee_percent);
  ELSE
    v_percent := COALESCE(v_cfg.fee_percent, 0);
  END IF;

  v_fee := round((p_amount * v_percent / 100) + COALESCE(v_cfg.fee_fixed, 0), 2);
  IF v_fee > p_amount THEN
    v_fee := p_amount;
  END IF;

  RETURN QUERY SELECT v_fee, round(p_amount - v_fee, 2), COALESCE(v_cfg.settlement_days, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public._payment_method_fee(uuid, text, numeric, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Recebimento: agora aceita nº de parcelas e gera a despesa da taxa
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.receive_bill_payment(uuid, numeric, text, date, text, numeric);
DROP FUNCTION IF EXISTS public.receive_bill_payment(uuid, numeric, text, date, text);

CREATE OR REPLACE FUNCTION public.receive_bill_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_method text,
  p_paid_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_discount numeric DEFAULT 0,
  p_installments integer DEFAULT 1
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
  v_fee numeric := 0;
  v_net numeric;
  v_settlement_days integer := 0;
  v_settlement_date date;
  v_method_label text;
  v_fee_expense_id uuid;
  v_installments integer := GREATEST(1, COALESCE(p_installments, 1));
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

    SELECT f.fee_amount, f.net_amount, f.settlement_days
    INTO v_fee, v_net, v_settlement_days
    FROM public._payment_method_fee(v_bill.tenant_id, p_method, p_amount, v_installments) f;

    -- Lança a taxa como despesa paga na data em que o dinheiro cai
    IF v_fee > 0 THEN
      SELECT label INTO v_method_label
      FROM public.payment_method_configs
      WHERE tenant_id = v_bill.tenant_id AND method = p_method;

      v_settlement_date := COALESCE(p_paid_date, CURRENT_DATE) + COALESCE(v_settlement_days, 0);

      INSERT INTO public.bills_payable (
        tenant_id, professional_id, description, category, supplier,
        amount, due_date, paid_date, payment_method, status, notes
      ) VALUES (
        v_bill.tenant_id,
        v_bill.professional_id,
        'Taxa ' || COALESCE(v_method_label, p_method)
          || CASE WHEN v_installments > 1 THEN ' ' || v_installments || 'x' ELSE '' END,
        'Taxas de cartão',
        COALESCE(v_method_label, p_method),
        v_fee,
        v_settlement_date,
        v_settlement_date,
        p_method,
        'paid',
        'Taxa automática sobre recebimento da cobrança ' || COALESCE(v_bill.receipt_number::text, '')
      )
      RETURNING id INTO v_fee_expense_id;
    END IF;

    v_new_paid := v_bill.paid_amount + p_amount;

    INSERT INTO public.bill_payments (
      tenant_id, bill_receivable_id, patient_id, professional_id,
      amount, fee_amount, net_amount, payment_method, paid_date, notes, created_by,
      installments, fee_expense_id
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
      v_user_id,
      v_installments,
      v_fee_expense_id
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
    'net_amount', v_net,
    'installments', v_installments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_bill_payment(uuid, numeric, text, date, text, numeric, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Estorno: remove a despesa de taxa vinculada ao pagamento
-- ---------------------------------------------------------------------------
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

  -- Remove a despesa de taxa gerada por este pagamento
  IF v_payment.fee_expense_id IS NOT NULL THEN
    DELETE FROM public.bills_payable WHERE id = v_payment.fee_expense_id;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.reverse_bill_payment(uuid, text) TO authenticated;
