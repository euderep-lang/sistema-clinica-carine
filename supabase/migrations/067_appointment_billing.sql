-- Faturamento da consulta no momento do agendamento.
--   * create_consultation_bill: cria a cobrança da consulta (item 'charge', NÃO gera
--     sessão para baixa) vinculada ao agendamento, com opção de já lançar o pagamento.
--   * finish_consultation: ao finalizar, se o agendamento já tiver uma cobrança
--     (criada no agendamento), soma os procedimentos na MESMA fatura em vez de
--     criar uma nova — evitando cobrança duplicada.

CREATE OR REPLACE FUNCTION public.create_consultation_bill(
  p_appointment_id uuid,
  p_pay_now boolean DEFAULT false,
  p_amount numeric DEFAULT NULL,
  p_method text DEFAULT NULL,
  p_paid_date date DEFAULT CURRENT_DATE,
  p_fee_bearer text DEFAULT 'company',
  p_installments integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.get_my_tenant_id();
  v_appt public.appointments%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_service_id uuid;
  v_charge_id uuid;
  v_bill_id uuid;
  v_amount numeric;
  v_desc text;
  v_modality_label text;
  v_pay_result jsonb := NULL;
BEGIN
  SELECT * INTO v_appt
  FROM public.appointments
  WHERE id = p_appointment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado';
  END IF;

  IF NOT (public.is_ops_staff() OR v_appt.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para faturar este agendamento';
  END IF;

  IF v_appt.professional_id IS NULL THEN
    RAISE EXCEPTION 'Agendamento sem profissional — não é possível lançar a consulta';
  END IF;

  -- Idempotência: se o agendamento já tem cobrança, não cria de novo.
  SELECT id INTO v_charge_id
  FROM public.consultation_charges
  WHERE appointment_id = p_appointment_id
    AND tenant_id = v_tenant_id
  ORDER BY created_at
  LIMIT 1;

  IF v_charge_id IS NOT NULL THEN
    SELECT id INTO v_bill_id
    FROM public.bills_receivable
    WHERE (consultation_charge_id = v_charge_id OR appointment_id = p_appointment_id)
      AND tenant_id = v_tenant_id
    ORDER BY created_at
    LIMIT 1;

    RETURN jsonb_build_object(
      'bill_id', v_bill_id,
      'charge_id', v_charge_id,
      'already_exists', true
    );
  END IF;

  -- Resolve o procedimento da consulta conforme a modalidade.
  IF COALESCE(v_appt.modality, 'presential') = 'online' THEN
    SELECT online_consultation_service_id INTO v_service_id
    FROM public.profiles WHERE id = v_appt.professional_id;
    v_modality_label := 'Consulta online';
  ELSE
    SELECT consultation_service_id INTO v_service_id
    FROM public.profiles WHERE id = v_appt.professional_id;
    v_modality_label := 'Consulta presencial';
  END IF;

  IF v_service_id IS NULL THEN
    RAISE EXCEPTION 'Profissional sem consulta padrão configurada para esta modalidade';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = v_service_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Procedimento de consulta inválido';
  END IF;

  v_amount := v_service.default_price;

  INSERT INTO public.consultation_charges (
    tenant_id, appointment_id, patient_id, professional_id, room_id, price_table
  ) VALUES (
    v_tenant_id, p_appointment_id, v_appt.patient_id, v_appt.professional_id,
    v_appt.room_id, 'particular'
  )
  RETURNING id INTO v_charge_id;

  -- Consulta é 'charge' (não gera sessão para baixa).
  INSERT INTO public.consultation_charge_items (
    charge_id, service_id, quantity, unit_price, total_price, item_type
  ) VALUES (
    v_charge_id, v_service.id, 1, v_amount, v_amount, 'charge'
  );

  v_desc := v_modality_label || ' — '
    || to_char(v_appt.date, 'DD/MM')
    || CASE WHEN v_appt.start_time IS NOT NULL
         THEN ' ' || to_char(v_appt.start_time, 'HH24:MI')
         ELSE '' END;

  INSERT INTO public.bills_receivable (
    tenant_id, patient_id, professional_id, appointment_id, consultation_charge_id,
    description, amount, due_date, competence_date, status
  ) VALUES (
    v_tenant_id, v_appt.patient_id, v_appt.professional_id, p_appointment_id, v_charge_id,
    v_desc, v_amount, COALESCE(v_appt.date, CURRENT_DATE), COALESCE(v_appt.date, CURRENT_DATE),
    'pending'
  )
  RETURNING id INTO v_bill_id;

  UPDATE public.consultation_charges
  SET bill_receivable_id = v_bill_id
  WHERE id = v_charge_id;

  IF COALESCE(p_pay_now, false) AND COALESCE(p_amount, 0) > 0 THEN
    v_pay_result := public.receive_bill_payment(
      v_bill_id,
      LEAST(p_amount, v_amount),
      COALESCE(p_method, 'cash'),
      COALESCE(p_paid_date, CURRENT_DATE),
      'Pagamento lançado no agendamento',
      0,
      GREATEST(1, COALESCE(p_installments, 1)),
      COALESCE(p_fee_bearer, 'company')
    );
  END IF;

  RETURN jsonb_build_object(
    'bill_id', v_bill_id,
    'charge_id', v_charge_id,
    'amount', v_amount,
    'payment', v_pay_result,
    'already_exists', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_consultation_bill(uuid, boolean, numeric, text, date, text, integer) TO authenticated;


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
  v_charge public.consultation_charges%ROWTYPE;
  v_charge_id uuid;
  v_bill public.bills_receivable%ROWTYPE;
  v_bill_id uuid;
  v_bill_new_amount numeric;
  v_bill_status text;
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

  -- Reaproveita a cobrança criada no agendamento (se houver), para somar na mesma fatura.
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
    -- Fatura já existente vinculada à cobrança (criada no agendamento)?
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
