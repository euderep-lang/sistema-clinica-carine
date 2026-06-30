-- Adicionar itens (nova venda) a uma fatura existente, igual ao MedX:
-- na conta do paciente é possível incluir mais procedimentos/produtos,
-- aumentando o total e recalculando o saldo/status.

CREATE OR REPLACE FUNCTION public.add_sale_items(
  p_bill_id uuid,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bill public.bills_receivable%ROWTYPE;
  v_charge public.consultation_charges%ROWTYPE;
  v_charge_id uuid;
  v_appointment_id uuid;
  v_professional_id uuid;
  v_price_table text;
  v_item jsonb;
  v_service public.services%ROWTYPE;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_new_amount numeric;
  v_new_status text;
BEGIN
  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = p_bill_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta cobrança';
  END IF;

  IF v_bill.status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível adicionar itens a uma cobrança cancelada';
  END IF;

  IF v_bill.budget_id IS NOT NULL THEN
    RAISE EXCEPTION 'Vendas de orçamento não podem ser editadas aqui';
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um item';
  END IF;

  v_professional_id := COALESCE(v_bill.professional_id, v_user_id);

  -- Localiza a cobrança vinculada (consultation_charge) ou cria uma nova.
  SELECT * INTO v_charge
  FROM public.consultation_charges
  WHERE bill_receivable_id = p_bill_id
  LIMIT 1;

  IF NOT FOUND AND v_bill.consultation_charge_id IS NOT NULL THEN
    SELECT * INTO v_charge
    FROM public.consultation_charges
    WHERE id = v_bill.consultation_charge_id
    LIMIT 1;
  END IF;

  IF FOUND THEN
    v_charge_id := v_charge.id;
    v_appointment_id := v_charge.appointment_id;
    v_price_table := COALESCE(v_charge.price_table, 'particular');
  ELSE
    v_appointment_id := NULL;
    v_price_table := 'particular';
    INSERT INTO public.consultation_charges (
      tenant_id, patient_id, professional_id, price_table, bill_receivable_id
    ) VALUES (
      v_bill.tenant_id, v_bill.patient_id, v_professional_id, v_price_table, p_bill_id
    )
    RETURNING id INTO v_charge_id;

    UPDATE public.bills_receivable
    SET consultation_charge_id = v_charge_id
    WHERE id = p_bill_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(1, (v_item->>'quantity')::integer);

    SELECT * INTO v_service
    FROM public.services
    WHERE id = (v_item->>'service_id')::uuid
      AND tenant_id = v_bill.tenant_id
      AND active = true
      AND (professional_id = v_professional_id OR professional_id IS NULL OR public.is_ops_staff());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Procedimento inválido';
    END IF;

    v_unit_price := COALESCE(NULLIF((v_item->>'unit_price')::numeric, 0), v_service.default_price);
    v_line_total := v_unit_price * v_qty;
    v_total := v_total + v_line_total;
    v_desc_parts := array_append(v_desc_parts, v_qty::text || 'x ' || v_service.name);

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
        consultation_charge_id, bill_receivable_id, status
      ) VALUES (
        v_bill.tenant_id,
        v_bill.patient_id,
        v_service.id,
        v_professional_id,
        v_service.session_count * v_qty,
        0,
        v_unit_price,
        v_price_table,
        v_charge_id,
        p_bill_id,
        'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_bill.tenant_id,
      v_service.id,
      v_qty,
      v_bill.patient_id,
      v_professional_id,
      v_appointment_id
    );
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Valor dos itens inválido';
  END IF;

  v_new_amount := v_bill.amount + v_total;
  v_new_status := CASE
    WHEN v_bill.paid_amount >= v_new_amount THEN 'paid'
    WHEN v_bill.paid_amount > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.bills_receivable
  SET
    amount = v_new_amount,
    status = v_new_status,
    paid_date = CASE WHEN v_new_status = 'paid' THEN paid_date ELSE NULL END,
    description = CASE
      WHEN COALESCE(description, '') = '' THEN 'Venda: ' || array_to_string(v_desc_parts, ', ')
      ELSE description || ' · + ' || array_to_string(v_desc_parts, ', ')
    END
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'added_total', v_total,
    'amount', v_new_amount,
    'status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_sale_items(uuid, jsonb) TO authenticated;
