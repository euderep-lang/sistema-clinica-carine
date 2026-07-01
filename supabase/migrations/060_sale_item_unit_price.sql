-- Permite editar preço unitário de itens já lançados na fatura
-- e aceitar unit_price ao finalizar consulta.

DROP FUNCTION IF EXISTS public.update_sale_item(uuid, integer);

CREATE OR REPLACE FUNCTION public.update_sale_item(
  p_item_id uuid,
  p_quantity integer,
  p_unit_price numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item public.consultation_charge_items%ROWTYPE;
  v_charge public.consultation_charges%ROWTYPE;
  v_bill public.bills_receivable%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_pkg public.patient_session_packages%ROWTYPE;
  v_professional_id uuid;
  v_old_qty integer;
  v_new_qty integer;
  v_new_unit_price numeric;
  v_new_total numeric;
  v_delta numeric;
  v_new_amount numeric;
  v_new_status text;
BEGIN
  v_new_qty := GREATEST(1, p_quantity);

  SELECT * INTO v_item FROM public.consultation_charge_items WHERE id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;

  SELECT * INTO v_charge FROM public.consultation_charges WHERE id = v_item.charge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobrança não encontrada'; END IF;

  SELECT * INTO v_bill FROM public.bills_receivable
   WHERE (id = v_charge.bill_receivable_id OR consultation_charge_id = v_charge.id)
     AND tenant_id = public.get_my_tenant_id()
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fatura não encontrada'; END IF;

  IF NOT (public.is_ops_staff() OR v_bill.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta cobrança';
  END IF;
  IF v_bill.status = 'cancelled' THEN RAISE EXCEPTION 'Cobrança cancelada'; END IF;
  IF v_bill.budget_id IS NOT NULL THEN
    RAISE EXCEPTION 'Vendas de orçamento não podem ser editadas aqui';
  END IF;

  v_old_qty := v_item.quantity;
  v_new_unit_price := COALESCE(NULLIF(p_unit_price, 0), v_item.unit_price);

  IF v_new_qty = v_old_qty AND v_new_unit_price = v_item.unit_price THEN
    RETURN jsonb_build_object('bill_id', v_bill.id, 'amount', v_bill.amount, 'unchanged', true);
  END IF;

  v_professional_id := COALESCE(v_bill.professional_id, v_user_id);
  v_new_total := v_new_unit_price * v_new_qty;
  v_delta := v_new_total - v_item.total_price;
  v_new_amount := v_bill.amount + v_delta;

  IF v_new_amount < v_bill.paid_amount THEN
    RAISE EXCEPTION 'O valor ficaria menor que o total já pago. Estorne pagamentos antes.';
  END IF;

  IF v_item.item_type = 'session_sale' AND v_item.service_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM public.patient_session_packages
     WHERE consultation_charge_id = v_charge.id AND service_id = v_item.service_id
     ORDER BY purchased_at LIMIT 1;
    IF FOUND AND v_pkg.used_sessions > 0 THEN
      RAISE EXCEPTION 'Não é possível editar: sessões já utilizadas';
    END IF;
  END IF;

  IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
    IF v_new_qty > v_old_qty THEN
      PERFORM public.deduct_service_inventory(
        v_bill.tenant_id, v_item.service_id, v_new_qty - v_old_qty,
        v_bill.patient_id, v_professional_id, v_charge.appointment_id
      );
    ELSIF v_new_qty < v_old_qty THEN
      PERFORM public.restore_service_inventory(
        v_bill.tenant_id, v_item.service_id, v_old_qty - v_new_qty,
        v_bill.patient_id, v_professional_id, v_charge.appointment_id
      );
    END IF;
  END IF;

  UPDATE public.consultation_charge_items
    SET quantity = v_new_qty,
        unit_price = v_new_unit_price,
        total_price = v_new_total
    WHERE id = p_item_id;

  IF v_item.item_type = 'session_sale' AND v_item.service_id IS NOT NULL AND v_pkg.id IS NOT NULL THEN
    SELECT * INTO v_service FROM public.services WHERE id = v_item.service_id;
    IF FOUND THEN
      UPDATE public.patient_session_packages
        SET total_sessions = v_service.session_count * v_new_qty,
            unit_price = v_new_unit_price
        WHERE id = v_pkg.id;
    END IF;
  END IF;

  v_new_status := CASE
    WHEN v_bill.paid_amount >= v_new_amount THEN 'paid'
    WHEN v_bill.paid_amount > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.bills_receivable
    SET amount = v_new_amount,
        status = v_new_status,
        paid_date = CASE WHEN v_new_status = 'paid' THEN paid_date ELSE NULL END
    WHERE id = v_bill.id;

  RETURN jsonb_build_object('bill_id', v_bill.id, 'amount', v_new_amount, 'status', v_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_sale_item(uuid, integer, numeric) TO authenticated;

-- finish_consultation: respeitar unit_price enviado pelo cliente (demais lógica inalterada)
CREATE OR REPLACE FUNCTION public.finish_consultation(
  p_patient_id uuid,
  p_room_id uuid DEFAULT NULL::uuid,
  p_price_table text DEFAULT 'particular'::text,
  p_new_items jsonb DEFAULT '[]'::jsonb,
  p_session_items jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_professional_id uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_appointment_id uuid;
  v_charge_id uuid;
  v_bill_id uuid;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_item jsonb;
  v_service record;
  v_package record;
  v_qty integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_sessions_to_add integer;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.profiles
  WHERE id = v_professional_id;

  IF v_tenant_id IS NULL OR v_role IS DISTINCT FROM 'professional' THEN
    RAISE EXCEPTION 'Apenas profissionais podem finalizar consultas';
  END IF;

  IF NOT public.professional_has_patient(p_patient_id) THEN
    RAISE EXCEPTION 'Paciente não vinculado a este profissional';
  END IF;

  SELECT id INTO v_appointment_id
  FROM public.appointments
  WHERE patient_id = p_patient_id
    AND professional_id = v_professional_id
    AND status = 'in_progress'
  ORDER BY start_time DESC
  LIMIT 1;

  IF v_appointment_id IS NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE patient_id = p_patient_id
      AND professional_id IS NULL
      AND status = 'in_progress'
    ORDER BY start_time DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.consultation_charges (
    tenant_id, appointment_id, patient_id, professional_id, room_id, price_table
  ) VALUES (
    v_tenant_id, v_appointment_id, p_patient_id, v_professional_id, p_room_id, p_price_table
  )
  RETURNING id INTO v_charge_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_new_items, '[]'::jsonb))
  LOOP
    v_qty := GREATEST(0, (v_item->>'quantity')::integer);
    IF v_qty = 0 THEN CONTINUE; END IF;

    SELECT * INTO v_service
    FROM public.services
    WHERE id = (v_item->>'service_id')::uuid
      AND tenant_id = v_tenant_id
      AND active = true
      AND (professional_id = v_professional_id OR professional_id IS NULL);

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
      v_charge_id, v_service.id, v_qty, v_unit_price, v_line_total,
      CASE WHEN v_service.session_count > 1 THEN 'session_sale' ELSE 'charge' END
    );

    IF v_service.session_count > 1 THEN
      v_sessions_to_add := v_service.session_count * v_qty;
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_tenant_id, p_patient_id, v_service.id, v_professional_id,
        v_sessions_to_add, 0, v_unit_price, p_price_table,
        v_charge_id, 'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_tenant_id, v_service.id, v_qty, p_patient_id, v_professional_id, v_appointment_id
    );
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_session_items, '[]'::jsonb))
  LOOP
    v_qty := GREATEST(0, (v_item->>'quantity')::integer);
    IF v_qty = 0 THEN CONTINUE; END IF;

    SELECT psp.*, s.name AS service_name
    INTO v_package
    FROM public.patient_session_packages psp
    JOIN public.services s ON s.id = psp.service_id
    WHERE psp.id = (v_item->>'package_id')::uuid
      AND psp.patient_id = p_patient_id
      AND psp.tenant_id = v_tenant_id
      AND psp.status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pacote de sessões inválido';
    END IF;

    IF v_package.used_sessions + v_qty > v_package.total_sessions THEN
      RAISE EXCEPTION 'Sessões insuficientes em %', v_package.service_name;
    END IF;

    UPDATE public.patient_session_packages
    SET
      used_sessions = used_sessions + v_qty,
      status = CASE
        WHEN used_sessions + v_qty >= total_sessions THEN 'completed'
        ELSE 'active'
      END
    WHERE id = v_package.id;

    INSERT INTO public.session_usages (
      package_id, appointment_id, consultation_charge_id, quantity, professional_id
    ) VALUES (
      v_package.id, v_appointment_id, v_charge_id, v_qty, v_professional_id
    );

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type, session_package_id
    ) VALUES (
      v_charge_id, v_package.service_id, v_qty, 0, 0, 'session_use', v_package.id
    );

    PERFORM public.deduct_service_inventory(
      v_tenant_id, v_package.service_id, v_qty, p_patient_id, v_professional_id, v_appointment_id
    );
  END LOOP;

  IF v_total > 0 THEN
    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, appointment_id,
      description, amount, due_date, status
    ) VALUES (
      v_tenant_id, p_patient_id, v_professional_id, v_appointment_id,
      'Consulta: ' || array_to_string(v_desc_parts, ', '),
      v_total, current_date, 'pending'
    )
    RETURNING id INTO v_bill_id;

    UPDATE public.consultation_charges
    SET bill_receivable_id = v_bill_id
    WHERE id = v_charge_id;

    UPDATE public.patient_session_packages
    SET bill_receivable_id = v_bill_id
    WHERE consultation_charge_id = v_charge_id
      AND bill_receivable_id IS NULL;
  END IF;

  IF v_appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET
      status = 'completed',
      professional_id = COALESCE(professional_id, v_professional_id)
    WHERE id = v_appointment_id;
  END IF;

  RETURN jsonb_build_object(
    'charge_id', v_charge_id,
    'bill_id', v_bill_id,
    'total', v_total,
    'appointment_id', v_appointment_id
  );
END;
$$;
