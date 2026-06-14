-- Venda avulsa, edição, estorno (com devolução de estoque) e recebimento pelo profissional

CREATE OR REPLACE FUNCTION public.restore_service_inventory(
  p_tenant_id uuid,
  p_service_id uuid,
  p_quantity integer,
  p_patient_id uuid,
  p_professional_id uuid,
  p_appointment_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv record;
  v_new_stock numeric;
  v_restore numeric;
BEGIN
  FOR v_inv IN
    SELECT sii.inventory_item_id, sii.quantity AS per_unit, ii.current_stock, ii.name AS item_name
    FROM public.service_inventory_items sii
    JOIN public.inventory_items ii ON ii.id = sii.inventory_item_id
    WHERE sii.service_id = p_service_id
      AND ii.tenant_id = p_tenant_id
      AND ii.active = true
  LOOP
    v_restore := v_inv.per_unit * p_quantity;

    INSERT INTO public.inventory_movements (
      tenant_id, item_id, type, quantity, reason,
      patient_id, professional_id, created_by,
      appointment_id, service_id, date
    ) VALUES (
      p_tenant_id, v_inv.inventory_item_id, 'in', v_restore,
      'Estorno de venda', p_patient_id, p_professional_id, auth.uid(),
      p_appointment_id, p_service_id, now()
    );

    UPDATE public.inventory_items
    SET current_stock = v_inv.current_stock + v_restore
    WHERE id = v_inv.inventory_item_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_standalone_sale(
  p_patient_id uuid,
  p_items jsonb,
  p_due_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
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
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_has_items boolean := false;
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

  INSERT INTO public.consultation_charges (
    tenant_id, patient_id, professional_id, price_table
  ) VALUES (
    v_tenant_id,
    p_patient_id,
    CASE WHEN v_role = 'professional' THEN v_user_id ELSE v_user_id END,
    'particular'
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

  INSERT INTO public.bills_receivable (
    tenant_id, patient_id, professional_id,
    description, amount, due_date, status, notes
  ) VALUES (
    v_tenant_id,
    p_patient_id,
    v_user_id,
    'Venda: ' || array_to_string(v_desc_parts, ', '),
    v_total,
    COALESCE(p_due_date, CURRENT_DATE),
    'pending',
    p_notes
  )
  RETURNING id INTO v_bill_id;

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
    'amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_standalone_sale(
  p_bill_id uuid,
  p_items jsonb,
  p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
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
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
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

  IF v_bill.status <> 'pending' OR v_bill.paid_amount > 0 THEN
    RAISE EXCEPTION 'Apenas vendas pendentes sem pagamento podem ser editadas';
  END IF;

  IF v_bill.budget_id IS NOT NULL THEN
    RAISE EXCEPTION 'Vendas de orçamento não podem ser editadas aqui';
  END IF;

  SELECT * INTO v_charge
  FROM public.consultation_charges
  WHERE bill_receivable_id = p_bill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta cobrança não possui itens de venda vinculados';
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
        consultation_charge_id, bill_receivable_id, status
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
        p_bill_id,
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

  UPDATE public.bills_receivable
  SET
    description = 'Venda: ' || array_to_string(v_desc_parts, ', '),
    amount = v_total,
    due_date = COALESCE(p_due_date, due_date),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_bill_id;

  RETURN jsonb_build_object('bill_id', p_bill_id, 'amount', v_total);
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

  IF v_bill.paid_amount > 0 THEN
    RAISE EXCEPTION 'Estorne o pagamento antes de cancelar a venda';
  END IF;

  SELECT * INTO v_charge
  FROM public.consultation_charges
  WHERE bill_receivable_id = p_bill_id;

  IF FOUND THEN
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
  END IF;

  UPDATE public.bills_receivable
  SET
    status = 'cancelled',
    notes = trim(COALESCE(notes, '') || E'\nEstorno: ' || COALESCE(p_reason, 'sem motivo'))
  WHERE id = p_bill_id;

  RETURN jsonb_build_object('bill_id', p_bill_id, 'cancelled', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_bill(p_bill_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bill public.bills_receivable%ROWTYPE;
  v_has_charge boolean;
BEGIN
  SELECT * INTO v_bill
  FROM public.bills_receivable
  WHERE id = p_bill_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_bill.paid_amount > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir cobrança com pagamento';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.consultation_charges WHERE bill_receivable_id = p_bill_id
  ) INTO v_has_charge;

  IF v_has_charge THEN
    RAISE EXCEPTION 'Use estornar para vendas com procedimentos (devolve estoque)';
  END IF;

  DELETE FROM public.bills_receivable WHERE id = p_bill_id;

  RETURN jsonb_build_object('deleted', true);
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
    'paid_amount', v_new_paid,
    'status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_service_inventory(uuid, uuid, integer, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_standalone_sale(uuid, jsonb, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_standalone_sale(uuid, jsonb, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_bill(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_bill_payment(uuid, numeric, text, date, text) TO authenticated;
