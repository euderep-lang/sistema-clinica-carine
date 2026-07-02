-- Toda venda de procedimento gera sessões para baixa (session_count × quantidade),
-- inclusive procedimentos com 1 sessão por unidade (ex.: 1 Tirzepatida = 1 baixa).

-- Backfill: pacotes ausentes em vendas antigas (item_type charge)
INSERT INTO public.patient_session_packages (
  tenant_id, patient_id, service_id, professional_id,
  total_sessions, used_sessions, unit_price, price_table,
  consultation_charge_id, bill_receivable_id, status, purchased_at
)
SELECT
  cc.tenant_id,
  cc.patient_id,
  agg.service_id,
  cc.professional_id,
  agg.total_sessions,
  0,
  agg.unit_price,
  COALESCE(cc.price_table, 'particular'),
  cc.id,
  COALESCE(cc.bill_receivable_id, br.id),
  'active',
  COALESCE(cc.created_at, now())
FROM (
  SELECT
    cci.charge_id,
    cci.service_id,
    SUM(GREATEST(1, COALESCE(s.session_count, 1)) * cci.quantity) AS total_sessions,
    (array_agg(cci.unit_price ORDER BY cci.id))[1] AS unit_price
  FROM public.consultation_charge_items cci
  JOIN public.services s ON s.id = cci.service_id
  WHERE cci.service_id IS NOT NULL
    AND cci.item_type IN ('charge', 'session_sale')
  GROUP BY cci.charge_id, cci.service_id
) agg
JOIN public.consultation_charges cc ON cc.id = agg.charge_id
LEFT JOIN LATERAL (
  SELECT id FROM public.bills_receivable br
  WHERE br.consultation_charge_id = cc.id OR br.id = cc.bill_receivable_id
  ORDER BY br.created_at NULLS LAST
  LIMIT 1
) br ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.patient_session_packages psp
  WHERE psp.consultation_charge_id = cc.id
    AND psp.service_id = agg.service_id
);

UPDATE public.consultation_charge_items
SET item_type = 'session_sale'
WHERE service_id IS NOT NULL
  AND item_type = 'charge';

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
      'session_sale'
    );

    IF v_qty > 0 THEN
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
      'session_sale'
    );

    IF v_qty > 0 THEN
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
      'session_sale'
    );

    IF v_qty > 0 THEN
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
  v_charge_id uuid;
  v_bill_id uuid;
  v_existing_bill_id uuid;
  v_existing_status text;
  v_desc_parts text[] := ARRAY[]::text[];
  v_desc text;
  v_has_service boolean;
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

  -- Já convertido (fatura real existente)
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
    v_desc_parts := array_append(
      v_desc_parts,
      v_item.quantity::text || 'x ' || COALESCE(NULLIF(trim(v_item.description), ''), 'Item')
    );

    v_has_service := v_item.service_id IS NOT NULL;
    IF v_has_service THEN
      SELECT * INTO v_service
      FROM public.services
      WHERE id = v_item.service_id
        AND tenant_id = v_budget.tenant_id
        AND active = true;
      v_has_service := FOUND;
    END IF;

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge_id,
      v_item.service_id,
      v_item.quantity,
      v_item.unit_price,
      v_item.total_price,
      CASE WHEN v_has_service THEN 'session_sale' ELSE 'charge' END
    );

    IF v_has_service AND v_item.quantity > 0 THEN
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_budget.tenant_id,
        v_budget.patient_id,
        v_service.id,
        v_budget.professional_id,
        v_service.session_count * v_item.quantity,
        0,
        v_item.unit_price,
        'particular',
        v_charge_id,
        'active'
      );
    END IF;

    IF v_has_service THEN
      PERFORM public.deduct_service_inventory(
        v_budget.tenant_id,
        v_service.id,
        v_item.quantity,
        v_budget.patient_id,
        v_budget.professional_id,
        NULL
      );
    END IF;
  END LOOP;

  v_desc := 'Orçamento #' || v_budget.number || ': ' || array_to_string(v_desc_parts, ', ');

  IF v_existing_bill_id IS NOT NULL THEN
    -- Converte a fatura-orçamento existente no lugar (mantém o id)
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

  IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
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

  IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
    SELECT * INTO v_service FROM public.services WHERE id = v_item.service_id;
    IF FOUND THEN
      IF v_pkg.id IS NOT NULL THEN
        UPDATE public.patient_session_packages
          SET total_sessions = GREATEST(1, v_service.session_count) * v_new_qty,
              unit_price = v_new_unit_price
          WHERE id = v_pkg.id;
      ELSE
        INSERT INTO public.patient_session_packages (
          tenant_id, patient_id, service_id, professional_id,
          total_sessions, used_sessions, unit_price, price_table,
          consultation_charge_id, bill_receivable_id, status
        ) VALUES (
          v_bill.tenant_id, v_bill.patient_id, v_service.id, v_professional_id,
          GREATEST(1, v_service.session_count) * v_new_qty, 0, v_new_unit_price,
          COALESCE(v_charge.price_table, 'particular'),
          v_charge.id, v_bill.id, 'active'
        );
      END IF;
      UPDATE public.consultation_charge_items SET item_type = 'session_sale' WHERE id = p_item_id;
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

CREATE OR REPLACE FUNCTION public.remove_sale_item(
  p_item_id uuid
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
  v_pkg public.patient_session_packages%ROWTYPE;
  v_professional_id uuid;
  v_new_amount numeric;
  v_new_status text;
  v_remaining integer;
BEGIN
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

  v_professional_id := COALESCE(v_bill.professional_id, v_user_id);
  v_new_amount := GREATEST(0, v_bill.amount - v_item.total_price);

  IF v_new_amount < v_bill.paid_amount THEN
    RAISE EXCEPTION 'O valor ficaria menor que o total já pago. Estorne pagamentos antes.';
  END IF;

  IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
    SELECT * INTO v_pkg FROM public.patient_session_packages
     WHERE consultation_charge_id = v_charge.id AND service_id = v_item.service_id
     ORDER BY purchased_at LIMIT 1;
    IF FOUND AND v_pkg.used_sessions > 0 THEN
      RAISE EXCEPTION 'Não é possível remover: sessões já utilizadas';
    END IF;
  END IF;

  IF v_item.service_id IS NOT NULL AND v_item.item_type IN ('charge', 'session_sale') THEN
    PERFORM public.restore_service_inventory(
      v_bill.tenant_id, v_item.service_id, v_item.quantity,
      v_bill.patient_id, v_professional_id, v_charge.appointment_id
    );
  END IF;

  IF v_pkg.id IS NOT NULL THEN
    DELETE FROM public.patient_session_packages WHERE id = v_pkg.id;
  END IF;

  DELETE FROM public.consultation_charge_items WHERE id = p_item_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.consultation_charge_items WHERE charge_id = v_charge.id;

  v_new_status := CASE
    WHEN v_bill.paid_amount >= v_new_amount AND v_new_amount > 0 THEN 'paid'
    WHEN v_new_amount <= 0 AND v_bill.paid_amount > 0 THEN 'paid'
    WHEN v_bill.paid_amount > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.bills_receivable
    SET amount = v_new_amount,
        status = v_new_status,
        paid_date = CASE WHEN v_new_status = 'paid' THEN paid_date ELSE NULL END
    WHERE id = v_bill.id;

  RETURN jsonb_build_object(
    'bill_id', v_bill.id,
    'amount', v_new_amount,
    'status', v_new_status,
    'remaining_items', v_remaining,
    'removed', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_sale_item(uuid) TO authenticated;
