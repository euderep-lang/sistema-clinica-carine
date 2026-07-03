-- Itens de orçamento podem ter service_id nulo (texto livre / IA).
-- Na conversão, resolve ou cria o procedimento antes de lançar na venda.

CREATE OR REPLACE FUNCTION public.convert_budget_to_sale(p_budget_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_budget public.budgets%ROWTYPE;
  v_item public.budget_items%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_service_id uuid;
  v_charge_id uuid;
  v_bill_id uuid;
  v_existing_bill_id uuid;
  v_existing_status text;
  v_desc_parts text[] := ARRAY[]::text[];
  v_desc text;
  v_item_name text;
BEGIN
  SELECT * INTO v_budget
  FROM public.budgets
  WHERE id = p_budget_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;

  IF NOT (public.is_ops_staff() OR v_budget.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para converter este orçamento';
  END IF;

  IF v_budget.patient_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento sem paciente vinculado';
  END IF;

  IF v_budget.final_value <= 0 THEN
    RAISE EXCEPTION 'Orçamento sem valor para cobrança';
  END IF;

  SELECT id, status INTO v_existing_bill_id, v_existing_status
  FROM public.bills_receivable
  WHERE budget_id = p_budget_id
  LIMIT 1;

  IF v_existing_bill_id IS NOT NULL AND v_existing_status <> 'budget' THEN
    RAISE EXCEPTION 'Este orçamento já foi convertido em venda';
  END IF;

  INSERT INTO public.consultation_charges (
    tenant_id, patient_id, professional_id, price_table
  ) VALUES (
    v_budget.tenant_id, v_budget.patient_id, v_budget.professional_id, 'particular'
  )
  RETURNING id INTO v_charge_id;

  FOR v_item IN
    SELECT * FROM public.budget_items
    WHERE budget_id = p_budget_id
    ORDER BY position
  LOOP
    v_item_name := COALESCE(NULLIF(trim(v_item.description), ''), 'Item');
    v_desc_parts := array_append(v_desc_parts, v_item.quantity::text || 'x ' || v_item_name);

    v_service_id := v_item.service_id;
    v_service := NULL;

    IF v_service_id IS NOT NULL THEN
      SELECT * INTO v_service
      FROM public.services
      WHERE id = v_service_id
        AND tenant_id = v_budget.tenant_id
        AND active = true;
    END IF;

    IF v_service.id IS NULL THEN
      SELECT * INTO v_service
      FROM public.services
      WHERE tenant_id = v_budget.tenant_id
        AND active = true
        AND lower(trim(name)) = lower(v_item_name)
        AND (professional_id = v_budget.professional_id OR professional_id IS NULL)
      ORDER BY (professional_id = v_budget.professional_id) DESC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_service.id IS NULL THEN
      INSERT INTO public.services (
        tenant_id, professional_id, name, default_price, session_count, active
      ) VALUES (
        v_budget.tenant_id,
        v_budget.professional_id,
        v_item_name,
        v_item.unit_price,
        1,
        true
      )
      RETURNING * INTO v_service;
    END IF;

    v_service_id := v_service.id;

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge_id,
      v_service_id,
      v_item.quantity,
      v_item.unit_price,
      v_item.total_price,
      'session_sale'
    );

    IF v_item.quantity > 0 THEN
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_budget.tenant_id,
        v_budget.patient_id,
        v_service_id,
        v_budget.professional_id,
        GREATEST(1, v_service.session_count) * v_item.quantity,
        0,
        v_item.unit_price,
        'particular',
        v_charge_id,
        'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_budget.tenant_id,
      v_service_id,
      v_item.quantity,
      v_budget.patient_id,
      v_budget.professional_id,
      NULL
    );
  END LOOP;

  v_desc := 'Orçamento #' || v_budget.number || ': ' || array_to_string(v_desc_parts, ', ');

  IF v_existing_bill_id IS NOT NULL THEN
    UPDATE public.bills_receivable
    SET status = 'pending',
        description = v_desc,
        amount = v_budget.final_value,
        due_date = CURRENT_DATE,
        competence_date = COALESCE(competence_date, CURRENT_DATE)
    WHERE id = v_existing_bill_id;
    v_bill_id := v_existing_bill_id;
  ELSE
    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, budget_id,
      description, amount, due_date, status
    ) VALUES (
      v_budget.tenant_id,
      v_budget.patient_id,
      v_budget.professional_id,
      p_budget_id,
      v_desc,
      v_budget.final_value,
      CURRENT_DATE,
      'pending'
    )
    RETURNING id INTO v_bill_id;
  END IF;

  UPDATE public.consultation_charges
  SET bill_receivable_id = v_bill_id
  WHERE id = v_charge_id;

  UPDATE public.patient_session_packages
  SET bill_receivable_id = v_bill_id
  WHERE consultation_charge_id = v_charge_id
    AND bill_receivable_id IS NULL;

  RETURN jsonb_build_object(
    'bill_id', v_bill_id,
    'charge_id', v_charge_id,
    'patient_id', v_budget.patient_id,
    'amount', v_budget.final_value
  );
END;
$$;
