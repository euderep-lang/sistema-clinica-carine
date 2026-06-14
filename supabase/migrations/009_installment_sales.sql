-- Venda parcelada: múltiplas cobranças vinculadas à mesma venda (consultation_charge)

DROP FUNCTION IF EXISTS public.create_standalone_sale(uuid, jsonb, date, text);
DROP FUNCTION IF EXISTS public.update_standalone_sale(uuid, jsonb, date, text);

ALTER TABLE public.bills_receivable
  ADD COLUMN IF NOT EXISTS consultation_charge_id uuid REFERENCES public.consultation_charges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS installment_count integer;

CREATE INDEX IF NOT EXISTS idx_br_consultation_charge
  ON public.bills_receivable (consultation_charge_id)
  WHERE consultation_charge_id IS NOT NULL;

-- Vincula cobranças existentes ao charge (dados legados)
UPDATE public.bills_receivable br
SET consultation_charge_id = cc.id
FROM public.consultation_charges cc
WHERE cc.bill_receivable_id = br.id
  AND br.consultation_charge_id IS NULL;

CREATE OR REPLACE FUNCTION public._resolve_charge_for_bill(p_bill_id uuid)
RETURNS public.consultation_charges
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bill public.bills_receivable%ROWTYPE;
  v_charge public.consultation_charges%ROWTYPE;
BEGIN
  SELECT * INTO v_bill FROM public.bills_receivable WHERE id = p_bill_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_bill.consultation_charge_id IS NOT NULL THEN
    SELECT * INTO v_charge FROM public.consultation_charges WHERE id = v_bill.consultation_charge_id;
    IF FOUND THEN RETURN v_charge; END IF;
  END IF;

  SELECT * INTO v_charge FROM public.consultation_charges WHERE bill_receivable_id = p_bill_id;
  RETURN v_charge;
END;
$$;

CREATE OR REPLACE FUNCTION public._split_installment_amounts(
  p_total numeric,
  p_count integer
) RETURNS numeric[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cents integer;
  v_base integer;
  v_extra integer;
  v_result numeric[];
  v_i integer;
BEGIN
  IF p_count <= 1 THEN
    RETURN ARRAY[p_total];
  END IF;

  v_cents := round(p_total * 100)::integer;
  v_base := v_cents / p_count;
  v_extra := v_cents % p_count;
  v_result := ARRAY[]::numeric[];

  FOR v_i IN 1..p_count LOOP
    v_result := array_append(
      v_result,
      (v_base + CASE WHEN v_i <= v_extra THEN 1 ELSE 0 END)::numeric / 100
    );
  END LOOP;

  RETURN v_result;
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
    v_due := COALESCE(p_due_date, CURRENT_DATE) + ((v_i - 1) * v_interval || ' months')::interval;

    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, consultation_charge_id,
      description, amount, due_date, status, notes,
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
    'installment_count', v_installments
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
  v_desc_base := 'Venda: ' || array_to_string(v_desc_parts, ', ');
  v_amounts := public._split_installment_amounts(v_total, v_installments);

  DELETE FROM public.bills_receivable
  WHERE consultation_charge_id = v_charge.id
     OR id = v_charge.bill_receivable_id;

  FOR v_i IN 1..v_installments LOOP
    v_due := COALESCE(p_due_date, v_bill.due_date) + ((v_i - 1) * v_interval || ' months')::interval;

    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, consultation_charge_id,
      description, amount, due_date, status, notes,
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
      'pending',
      COALESCE(p_notes, v_bill.notes),
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
    'amount', v_total,
    'installment_count', v_installments
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_sale(
  p_bill_id uuid,
  p_reason text DEFAULT NULL
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
  v_cancelled integer := 0;
BEGIN
  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = p_bill_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para estornar esta venda';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cobrança já estornada';
  END IF;

  v_charge := public._resolve_charge_for_bill(p_bill_id);

  IF v_charge.id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.bills_receivable
      WHERE consultation_charge_id = v_charge.id
        AND paid_amount > 0
    ) THEN
      RAISE EXCEPTION 'Estorne os pagamentos de todas as parcelas antes de cancelar a venda';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.patient_session_packages
      WHERE consultation_charge_id = v_charge.id
        AND used_sessions > 0
    ) THEN
      RAISE EXCEPTION 'Não é possível estornar: pacote de sessões já utilizado';
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

    UPDATE public.patient_session_packages
    SET status = 'cancelled'
    WHERE consultation_charge_id = v_charge.id;

    UPDATE public.bills_receivable
    SET
      status = 'cancelled',
      notes = trim(COALESCE(notes, '') || E'\nEstorno: ' || COALESCE(p_reason, 'sem motivo'))
    WHERE consultation_charge_id = v_charge.id
      AND status <> 'cancelled';

    GET DIAGNOSTICS v_cancelled = ROW_COUNT;
  ELSE
    IF v_bill.paid_amount > 0 THEN
      RAISE EXCEPTION 'Estorne o pagamento antes de cancelar a venda';
    END IF;

    UPDATE public.bills_receivable
    SET
      status = 'cancelled',
      notes = trim(COALESCE(notes, '') || E'\nEstorno: ' || COALESCE(p_reason, 'sem motivo'))
    WHERE id = p_bill_id;

    v_cancelled := 1;
  END IF;

  RETURN jsonb_build_object('bill_id', p_bill_id, 'cancelled', true, 'bills_cancelled', v_cancelled);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_standalone_sale(uuid, jsonb, date, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_standalone_sale(uuid, jsonb, date, text, integer, integer) TO authenticated;
