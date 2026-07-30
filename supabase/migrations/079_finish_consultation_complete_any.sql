-- Ao finalizar consulta: vincula qualquer agendamento ativo do paciente (não só in_progress)
-- e marca como completed (dispara fila de mensagens automáticas).

DROP FUNCTION IF EXISTS public.finish_consultation(uuid, uuid, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.finish_consultation(
  p_patient_id uuid,
  p_room_id uuid DEFAULT NULL::uuid,
  p_price_table text DEFAULT 'particular'::text,
  p_new_items jsonb DEFAULT '[]'::jsonb,
  p_session_items jsonb DEFAULT '[]'::jsonb,
  p_appointment_id uuid DEFAULT NULL::uuid
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
  v_charge public.consultation_charges%ROWTYPE;
  v_charge_id uuid;
  v_bill public.bills_receivable%ROWTYPE;
  v_bill_id uuid;
  v_bill_new_amount numeric;
  v_bill_status text;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_item jsonb;
  v_inv jsonb;
  v_service record;
  v_package record;
  v_package_id uuid;
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

  -- 1) Agendamento explícito (vindo do prontuário/agenda)
  IF p_appointment_id IS NOT NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE id = p_appointment_id
      AND patient_id = p_patient_id
      AND tenant_id = v_tenant_id
      AND status NOT IN ('cancelled', 'no_show', 'rescheduled')
      AND (professional_id = v_professional_id OR professional_id IS NULL);
  END IF;

  -- 2) Em andamento deste profissional
  IF v_appointment_id IS NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE patient_id = p_patient_id
      AND professional_id = v_professional_id
      AND status = 'in_progress'
    ORDER BY date DESC, start_time DESC
    LIMIT 1;
  END IF;

  -- 3) Em andamento sem profissional
  IF v_appointment_id IS NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE patient_id = p_patient_id
      AND professional_id IS NULL
      AND status = 'in_progress'
    ORDER BY date DESC, start_time DESC
    LIMIT 1;
  END IF;

  -- 4) Consulta de hoje agendada/confirmada (mesmo sem ter clicado em "Iniciar")
  IF v_appointment_id IS NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE patient_id = p_patient_id
      AND professional_id = v_professional_id
      AND date = (timezone('America/Sao_Paulo', now()))::date
      AND status IN ('scheduled', 'confirmed')
    ORDER BY
      CASE status WHEN 'confirmed' THEN 0 ELSE 1 END,
      start_time DESC
    LIMIT 1;
  END IF;

  IF v_appointment_id IS NULL THEN
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE patient_id = p_patient_id
      AND professional_id IS NULL
      AND date = (timezone('America/Sao_Paulo', now()))::date
      AND status IN ('scheduled', 'confirmed')
    ORDER BY start_time DESC
    LIMIT 1;
  END IF;

  IF v_appointment_id IS NOT NULL THEN
    SELECT * INTO v_charge
    FROM public.consultation_charges
    WHERE appointment_id = v_appointment_id
      AND tenant_id = v_tenant_id
    ORDER BY created_at
    LIMIT 1;
    IF FOUND THEN
      v_charge_id := v_charge.id;
    END IF;
  END IF;

  IF v_charge_id IS NULL THEN
    INSERT INTO public.consultation_charges (
      tenant_id, appointment_id, patient_id, professional_id, room_id, price_table
    ) VALUES (
      v_tenant_id, v_appointment_id, p_patient_id, v_professional_id, p_room_id, p_price_table
    )
    RETURNING id INTO v_charge_id;
  END IF;

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
      'session_sale'
    );

    v_package_id := NULL;
    IF v_qty > 0 THEN
      v_sessions_to_add := v_service.session_count * v_qty;
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_tenant_id, p_patient_id, v_service.id, v_professional_id,
        v_sessions_to_add, 0, v_unit_price, p_price_table,
        v_charge_id, 'active'
      )
      RETURNING id INTO v_package_id;

      IF v_package_id IS NOT NULL AND jsonb_array_length(COALESCE(v_item->'inventory_items', '[]'::jsonb)) > 0 THEN
        FOR v_inv IN SELECT value FROM jsonb_array_elements(v_item->'inventory_items')
        LOOP
          INSERT INTO public.session_package_inventory_items (
            package_id, inventory_item_id, quantity
          ) VALUES (
            v_package_id,
            (v_inv->>'inventory_item_id')::uuid,
            GREATEST((v_inv->>'quantity')::numeric, 0.01)
          )
          ON CONFLICT (package_id, inventory_item_id) DO UPDATE
          SET quantity = EXCLUDED.quantity;
        END LOOP;
      END IF;
    END IF;
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

    PERFORM public.deduct_package_inventory(
      v_tenant_id, v_package.id, v_package.service_id, v_qty,
      p_patient_id, v_professional_id, v_appointment_id
    );
  END LOOP;

  IF v_total > 0 THEN
    SELECT * INTO v_bill
    FROM public.bills_receivable
    WHERE (consultation_charge_id = v_charge_id OR id = v_charge.bill_receivable_id)
      AND tenant_id = v_tenant_id
      AND status <> 'cancelled'
    ORDER BY created_at
    LIMIT 1;

    IF FOUND THEN
      v_bill_id := v_bill.id;
      v_bill_new_amount := v_bill.amount + v_total;
      v_bill_status := CASE
        WHEN v_bill.paid_amount >= v_bill_new_amount THEN 'paid'
        WHEN v_bill.paid_amount > 0 THEN 'partial'
        ELSE 'pending'
      END;
      UPDATE public.bills_receivable
      SET
        amount = v_bill_new_amount,
        status = v_bill_status,
        paid_date = CASE WHEN v_bill_status = 'paid' THEN paid_date ELSE NULL END,
        description = CASE
          WHEN COALESCE(description, '') = '' THEN 'Consulta: ' || array_to_string(v_desc_parts, ', ')
          ELSE description || ' · + ' || array_to_string(v_desc_parts, ', ')
        END
      WHERE id = v_bill_id;
    ELSE
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
    END IF;

    UPDATE public.patient_session_packages
    SET bill_receivable_id = v_bill_id
    WHERE consultation_charge_id = v_charge_id
      AND bill_receivable_id IS NULL;
  END IF;

  -- Sempre conclui o agendamento → trigger enfileira mensagens automáticas.
  IF v_appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET
      status = 'completed',
      professional_id = COALESCE(professional_id, v_professional_id)
    WHERE id = v_appointment_id
      AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN jsonb_build_object(
    'charge_id', v_charge_id,
    'bill_id', v_bill_id,
    'total', v_total,
    'appointment_id', v_appointment_id
  );
END;
$$;
