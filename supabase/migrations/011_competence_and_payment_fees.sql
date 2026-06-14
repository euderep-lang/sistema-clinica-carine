-- Competência antecipada em vendas parceladas + configuração de taxas por forma de pagamento

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS competence_date date;

-- Competência = data do lançamento (1ª parcela) em vendas parceladas
UPDATE public.bills_receivable br
SET competence_date = sub.first_due
FROM (
  SELECT consultation_charge_id, MIN(due_date) AS first_due
  FROM public.bills_receivable
  WHERE consultation_charge_id IS NOT NULL
    AND COALESCE(installment_count, 0) > 1
  GROUP BY consultation_charge_id
) sub
WHERE br.consultation_charge_id = sub.consultation_charge_id
  AND COALESCE(br.installment_count, 0) > 1;

UPDATE public.bills_receivable
SET competence_date = due_date
WHERE competence_date IS NULL;

ALTER TABLE public.bills_receivable
  ALTER COLUMN competence_date SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_br_competence
  ON public.bills_receivable (tenant_id, competence_date);

-- Configuração de formas de pagamento e taxas
CREATE TABLE IF NOT EXISTS public.payment_method_configs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  method text NOT NULL,
  label text NOT NULL,
  fee_percent numeric(5,2) DEFAULT 0 NOT NULL CHECK (fee_percent >= 0 AND fee_percent <= 100),
  fee_fixed numeric(10,2) DEFAULT 0 NOT NULL CHECK (fee_fixed >= 0),
  active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT payment_method_configs_method_check CHECK (
    method = ANY (ARRAY[
      'cash'::text, 'pix'::text, 'credit_card'::text, 'debit_card'::text,
      'health_insurance'::text, 'bank_transfer'::text, 'other'::text
    ])
  ),
  CONSTRAINT payment_method_configs_tenant_method_key UNIQUE (tenant_id, method)
);

CREATE INDEX IF NOT EXISTS payment_method_configs_tenant_idx
  ON public.payment_method_configs (tenant_id, sort_order);

ALTER TABLE public.payment_method_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_method_configs_select ON public.payment_method_configs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY payment_method_configs_write ON public.payment_method_configs
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR public.is_financial_staff())
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (public.get_my_role() = 'admin' OR public.is_financial_staff())
  );

CREATE TRIGGER payment_method_configs_updated_at
  BEFORE UPDATE ON public.payment_method_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed padrão por tenant
INSERT INTO public.payment_method_configs (tenant_id, method, label, fee_percent, fee_fixed, sort_order)
SELECT
  t.id,
  v.method,
  v.label,
  v.fee_percent,
  0,
  v.sort_order
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('cash', 'Dinheiro', 0::numeric, 1),
    ('pix', 'Pix', 0::numeric, 2),
    ('credit_card', 'Crédito', 2.5::numeric, 3),
    ('debit_card', 'Débito', 1.5::numeric, 4),
    ('health_insurance', 'Convênio', 0::numeric, 5),
    ('bank_transfer', 'Transferência', 0::numeric, 6),
    ('other', 'Outro', 0::numeric, 7)
) AS v(method, label, fee_percent, sort_order)
ON CONFLICT (tenant_id, method) DO NOTHING;

ALTER TABLE public.bill_payments
  ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS net_amount numeric(10,2);

UPDATE public.bill_payments
SET net_amount = amount - COALESCE(fee_amount, 0)
WHERE net_amount IS NULL;

ALTER TABLE public.bill_payments
  ALTER COLUMN net_amount SET NOT NULL;

CREATE OR REPLACE FUNCTION public._payment_method_fee(
  p_tenant_id uuid,
  p_method text,
  p_amount numeric
) RETURNS TABLE(fee_amount numeric, net_amount numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fee_percent numeric := 0;
  v_fee_fixed numeric := 0;
  v_fee numeric;
BEGIN
  SELECT c.fee_percent, c.fee_fixed
  INTO v_fee_percent, v_fee_fixed
  FROM public.payment_method_configs c
  WHERE c.tenant_id = p_tenant_id
    AND c.method = p_method
    AND c.active = true;

  v_fee := round((p_amount * COALESCE(v_fee_percent, 0) / 100) + COALESCE(v_fee_fixed, 0), 2);
  IF v_fee > p_amount THEN
    v_fee := p_amount;
  END IF;

  RETURN QUERY SELECT v_fee, round(p_amount - v_fee, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_standalone_sale(
  p_patient_id uuid,
  p_items jsonb,
  p_due_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_installment_count integer DEFAULT 1,
  p_installment_interval_months integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_item jsonb;
  v_service public.services%ROWTYPE;
  v_charge_id uuid;
  v_bill_id uuid;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_desc_base text;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_has_items boolean := false;
  v_installments integer;
  v_interval integer;
  v_amounts numeric[];
  v_i integer;
  v_due date;
  v_competence date;
  v_bill_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem tenant';
  END IF;

  IF NOT (public.is_ops_staff() OR (v_role = 'professional' AND public.professional_has_patient(p_patient_id))) THEN
    RAISE EXCEPTION 'Sem permissão para vender a este paciente';
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um procedimento';
  END IF;

  v_installments := GREATEST(1, LEAST(COALESCE(p_installment_count, 1), 48));
  v_interval := GREATEST(1, LEAST(COALESCE(p_installment_interval_months, 1), 12));
  v_competence := COALESCE(p_due_date, CURRENT_DATE);

  INSERT INTO public.consultation_charges (
    tenant_id, patient_id, professional_id, price_table
  ) VALUES (
    v_tenant_id, p_patient_id, v_user_id, 'particular'
  )
  RETURNING id INTO v_charge_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, (v_item->>'quantity')::integer);

    SELECT * INTO v_service
    FROM public.services
    WHERE id = (v_item->>'service_id')::uuid
      AND tenant_id = v_tenant_id
      AND active = true
      AND (professional_id = v_user_id OR professional_id IS NULL OR public.is_ops_staff());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Procedimento inválido';
    END IF;

    v_unit_price := COALESCE(NULLIF((v_item->>'unit_price')::numeric, 0), v_service.default_price);
    v_line_total := v_unit_price * v_qty;
    v_total := v_total + v_line_total;
    v_desc_parts := array_append(v_desc_parts, v_qty::text || 'x ' || v_service.name);
    v_has_items := true;

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge_id,
      v_service.id,
      v_qty,
      v_unit_price,
      v_line_total,
      CASE WHEN v_service.session_count > 1 THEN 'session_sale' ELSE 'charge' END
    );

    IF v_service.session_count > 1 THEN
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_tenant_id,
        p_patient_id,
        v_service.id,
        v_user_id,
        v_service.session_count * v_qty,
        0,
        v_unit_price,
        'particular',
        v_charge_id,
        'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_tenant_id,
      v_service.id,
      v_qty,
      p_patient_id,
      v_user_id,
      NULL
    );
  END LOOP;

  IF NOT v_has_items OR v_total <= 0 THEN
    RAISE EXCEPTION 'Valor da venda inválido';
  END IF;

  v_desc_base := 'Venda: ' || array_to_string(v_desc_parts, ', ');
  v_amounts := public._split_installment_amounts(v_total, v_installments);

  FOR v_i IN 1..v_installments LOOP
    v_due := v_competence + ((v_i - 1) * v_interval || ' months')::interval;

    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, consultation_charge_id,
      description, amount, due_date, competence_date, status, notes,
      installment_number, installment_count
    ) VALUES (
      v_tenant_id,
      p_patient_id,
      v_user_id,
      v_charge_id,
      CASE
        WHEN v_installments > 1 THEN v_desc_base || ' — Parcela ' || v_i || '/' || v_installments
        ELSE v_desc_base
      END,
      v_amounts[v_i],
      v_due::date,
      v_competence,
      'pending',
      p_notes,
      CASE WHEN v_installments > 1 THEN v_i ELSE NULL END,
      CASE WHEN v_installments > 1 THEN v_installments ELSE NULL END
    )
    RETURNING id INTO v_bill_id;

    v_bill_ids := array_append(v_bill_ids, v_bill_id);

    IF v_i = 1 THEN
      UPDATE public.consultation_charges
      SET bill_receivable_id = v_bill_id
      WHERE id = v_charge_id;
    END IF;
  END LOOP;

  UPDATE public.patient_session_packages
  SET bill_receivable_id = v_bill_ids[1]
  WHERE consultation_charge_id = v_charge_id
    AND bill_receivable_id IS NULL;

  RETURN jsonb_build_object(
    'bill_id', v_bill_ids[1],
    'bill_ids', to_jsonb(v_bill_ids),
    'charge_id', v_charge_id,
    'amount', v_total,
    'installment_count', v_installments,
    'competence_date', v_competence
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_standalone_sale(
  p_bill_id uuid,
  p_items jsonb,
  p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_installment_count integer DEFAULT NULL,
  p_installment_interval_months integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bill public.bills_receivable%ROWTYPE;
  v_charge public.consultation_charges%ROWTYPE;
  v_item public.consultation_charge_items%ROWTYPE;
  v_new_item jsonb;
  v_service public.services%ROWTYPE;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_desc_base text;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_installments integer;
  v_interval integer;
  v_amounts numeric[];
  v_i integer;
  v_due date;
  v_competence date;
  v_first_bill_id uuid;
  v_new_bill_id uuid;
BEGIN
  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = p_bill_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta venda';
  END IF;

  IF v_bill.budget_id IS NOT NULL THEN
    RAISE EXCEPTION 'Vendas de orçamento não podem ser editadas aqui';
  END IF;

  v_charge := public._resolve_charge_for_bill(p_bill_id);
  IF v_charge.id IS NULL THEN
    RAISE EXCEPTION 'Esta cobrança não possui itens de venda vinculados';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bills_receivable
    WHERE consultation_charge_id = v_charge.id
      AND paid_amount > 0
  ) OR EXISTS (
    SELECT 1 FROM public.bills_receivable
    WHERE id = v_charge.bill_receivable_id
      AND paid_amount > 0
      AND consultation_charge_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Não é possível editar: há parcelas com pagamento registrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bills_receivable
    WHERE consultation_charge_id = v_charge.id
      AND status <> 'pending'
  ) THEN
    RAISE EXCEPTION 'Apenas vendas com todas as parcelas pendentes podem ser editadas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.patient_session_packages
    WHERE consultation_charge_id = v_charge.id
      AND used_sessions > 0
  ) THEN
    RAISE EXCEPTION 'Não é possível editar: sessões já utilizadas';
  END IF;

  FOR v_item IN
    SELECT * FROM public.consultation_charge_items
    WHERE charge_id = v_charge.id
  LOOP
    IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
      PERFORM public.restore_service_inventory(
        v_bill.tenant_id,
        v_item.service_id,
        v_item.quantity,
        v_bill.patient_id,
        v_bill.professional_id,
        v_charge.appointment_id
      );
    END IF;
  END LOOP;

  DELETE FROM public.patient_session_packages
  WHERE consultation_charge_id = v_charge.id;

  DELETE FROM public.consultation_charge_items
  WHERE charge_id = v_charge.id;

  FOR v_new_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, (v_new_item->>'quantity')::integer);

    SELECT * INTO v_service
    FROM public.services
    WHERE id = (v_new_item->>'service_id')::uuid
      AND tenant_id = v_bill.tenant_id
      AND active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Procedimento inválido';
    END IF;

    v_unit_price := COALESCE(NULLIF((v_new_item->>'unit_price')::numeric, 0), v_service.default_price);
    v_line_total := v_unit_price * v_qty;
    v_total := v_total + v_line_total;
    v_desc_parts := array_append(v_desc_parts, v_qty::text || 'x ' || v_service.name);

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge.id,
      v_service.id,
      v_qty,
      v_unit_price,
      v_line_total,
      CASE WHEN v_service.session_count > 1 THEN 'session_sale' ELSE 'charge' END
    );

    IF v_service.session_count > 1 THEN
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_bill.tenant_id,
        v_bill.patient_id,
        v_service.id,
        v_bill.professional_id,
        v_service.session_count * v_qty,
        0,
        v_unit_price,
        'particular',
        v_charge.id,
        'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_bill.tenant_id,
      v_service.id,
      v_qty,
      v_bill.patient_id,
      v_bill.professional_id,
      v_charge.appointment_id
    );
  END LOOP;

  v_installments := GREATEST(1, LEAST(
    COALESCE(p_installment_count, v_bill.installment_count, 1),
    48
  ));
  v_interval := GREATEST(1, LEAST(COALESCE(p_installment_interval_months, 1), 12));
  v_competence := COALESCE(p_due_date, v_bill.competence_date, v_bill.due_date);
  v_desc_base := 'Venda: ' || array_to_string(v_desc_parts, ', ');
  v_amounts := public._split_installment_amounts(v_total, v_installments);

  DELETE FROM public.bills_receivable
  WHERE consultation_charge_id = v_charge.id
     OR id = v_charge.bill_receivable_id;

  FOR v_i IN 1..v_installments LOOP
    v_due := v_competence + ((v_i - 1) * v_interval || ' months')::interval;

    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, consultation_charge_id,
      description, amount, due_date, competence_date, status, notes,
      installment_number, installment_count
    ) VALUES (
      v_bill.tenant_id,
      v_bill.patient_id,
      v_bill.professional_id,
      v_charge.id,
      CASE
        WHEN v_installments > 1 THEN v_desc_base || ' — Parcela ' || v_i || '/' || v_installments
        ELSE v_desc_base
      END,
      v_amounts[v_i],
      v_due::date,
      v_competence,
      'pending',
      p_notes,
      CASE WHEN v_installments > 1 THEN v_i ELSE NULL END,
      CASE WHEN v_installments > 1 THEN v_installments ELSE NULL END
    )
    RETURNING id INTO v_new_bill_id;

    IF v_i = 1 THEN
      v_first_bill_id := v_new_bill_id;
      UPDATE public.consultation_charges
      SET bill_receivable_id = v_new_bill_id
      WHERE id = v_charge.id;
    END IF;
  END LOOP;

  UPDATE public.patient_session_packages
  SET bill_receivable_id = v_first_bill_id
  WHERE consultation_charge_id = v_charge.id;

  RETURN jsonb_build_object(
    'bill_id', v_first_bill_id,
    'charge_id', v_charge.id,
    'amount', v_total,
    'installment_count', v_installments,
    'competence_date', v_competence
  );
END;
$$;

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

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  v_outstanding := v_bill.amount - v_bill.paid_amount;
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'Valor maior que o saldo em aberto';
  END IF;

  SELECT f.fee_amount, f.net_amount
  INTO v_fee, v_net
  FROM public._payment_method_fee(v_bill.tenant_id, p_method, p_amount) f;

  v_new_paid := v_bill.paid_amount + p_amount;
  v_new_status := CASE WHEN v_new_paid >= v_bill.amount THEN 'paid' ELSE 'partial' END;

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
    status = v_new_status,
    paid_date = CASE WHEN v_new_status = 'paid' THEN COALESCE(p_paid_date, CURRENT_DATE) ELSE paid_date END,
    payment_method = p_method,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'payment_id', v_payment_id,
    'paid_amount', v_new_paid,
    'status', v_new_status,
    'fee_amount', v_fee,
    'net_amount', v_net
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._payment_method_fee(uuid, text, numeric) TO authenticated;
