-- Insumos por venda/pacote de sessões (não altera o cadastro padrão do procedimento).
-- Baixa de estoque ocorre na utilização da sessão, não na venda.

CREATE TABLE IF NOT EXISTS public.session_package_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.patient_session_packages(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_package_inventory_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT session_package_inventory_items_unique UNIQUE (package_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_spii_package
  ON public.session_package_inventory_items (package_id);

ALTER TABLE public.session_package_inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spii_tenant ON public.session_package_inventory_items;
CREATE POLICY spii_tenant ON public.session_package_inventory_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_session_packages psp
      WHERE psp.id = session_package_inventory_items.package_id
        AND psp.tenant_id = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patient_session_packages psp
      WHERE psp.id = session_package_inventory_items.package_id
        AND psp.tenant_id = public.get_my_tenant_id()
    )
  );

CREATE OR REPLACE FUNCTION public.deduct_package_inventory(
  p_tenant_id uuid,
  p_package_id uuid,
  p_service_id uuid,
  p_quantity integer,
  p_patient_id uuid,
  p_professional_id uuid,
  p_appointment_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv record;
  v_new_stock numeric;
  v_deduct numeric;
  v_use_package_items boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.session_package_inventory_items WHERE package_id = p_package_id
  ) INTO v_use_package_items;

  IF v_use_package_items THEN
    FOR v_inv IN
      SELECT spii.inventory_item_id, spii.quantity AS per_unit, ii.current_stock, ii.name AS item_name
      FROM public.session_package_inventory_items spii
      JOIN public.inventory_items ii ON ii.id = spii.inventory_item_id
      WHERE spii.package_id = p_package_id
        AND ii.tenant_id = p_tenant_id
        AND ii.active = true
    LOOP
      v_deduct := v_inv.per_unit * p_quantity;
      v_new_stock := v_inv.current_stock - v_deduct;
      IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para %', v_inv.item_name;
      END IF;

      INSERT INTO public.inventory_movements (
        tenant_id, item_id, type, quantity, reason,
        patient_id, professional_id, created_by,
        appointment_id, service_id, date
      ) VALUES (
        p_tenant_id, v_inv.inventory_item_id, 'out', v_deduct,
        'Uso em procedimento', p_patient_id, p_professional_id, p_professional_id,
        p_appointment_id, p_service_id, now()
      );

      UPDATE public.inventory_items
      SET current_stock = v_new_stock
      WHERE id = v_inv.inventory_item_id;
    END LOOP;
  ELSE
    PERFORM public.deduct_service_inventory(
      p_tenant_id, p_service_id, p_quantity, p_patient_id, p_professional_id, p_appointment_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_package_inventory(uuid, uuid, uuid, integer, uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_session_checkoff(
  p_package_id uuid,
  p_session_date date,
  p_session_time time without time zone,
  p_professional_id uuid,
  p_product_batch text DEFAULT NULL::text,
  p_application_route text DEFAULT 'IM'::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_package record;
  v_used_at timestamptz;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_tenant_id IS NULL OR v_role IS DISTINCT FROM 'professional' THEN
    RAISE EXCEPTION 'Apenas profissionais podem registrar baixa de sessão';
  END IF;

  IF p_session_date IS NULL OR p_session_time IS NULL THEN
    RAISE EXCEPTION 'Informe data e horário';
  END IF;

  IF p_professional_id IS NULL THEN
    RAISE EXCEPTION 'Informe o profissional';
  END IF;

  IF p_application_route IS NULL OR p_application_route NOT IN ('IM', 'EV', 'Oral') THEN
    RAISE EXCEPTION 'Informe a via de aplicação (IM, EV ou Oral)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_professional_id
      AND tenant_id = v_tenant_id
      AND role = 'professional'
  ) THEN
    RAISE EXCEPTION 'Profissional inválido';
  END IF;

  SELECT psp.*
  INTO v_package
  FROM public.patient_session_packages psp
  WHERE psp.id = p_package_id
    AND psp.tenant_id = v_tenant_id
    AND psp.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote de sessões não encontrado ou já concluído';
  END IF;

  IF v_package.used_sessions + 1 > v_package.total_sessions THEN
    RAISE EXCEPTION 'Não há sessões restantes neste pacote';
  END IF;

  v_used_at := (p_session_date::text || ' ' || p_session_time::text)::timestamptz;

  UPDATE public.patient_session_packages
  SET
    used_sessions = used_sessions + 1,
    status = CASE
      WHEN used_sessions + 1 >= total_sessions THEN 'completed'
      ELSE 'active'
    END
  WHERE id = v_package.id;

  INSERT INTO public.session_usages (
    package_id,
    quantity,
    professional_id,
    used_at,
    session_date,
    session_time,
    product_batch,
    application_route
  ) VALUES (
    v_package.id,
    1,
    p_professional_id,
    v_used_at,
    p_session_date,
    p_session_time,
    NULLIF(trim(p_product_batch), ''),
    p_application_route
  );

  PERFORM public.deduct_package_inventory(
    v_tenant_id,
    v_package.id,
    v_package.service_id,
    1,
    v_package.patient_id,
    p_professional_id,
    NULL
  );

  RETURN jsonb_build_object(
    'package_id', v_package.id,
    'used_sessions', v_package.used_sessions + 1,
    'total_sessions', v_package.total_sessions,
    'status', CASE
      WHEN v_package.used_sessions + 1 >= v_package.total_sessions THEN 'completed'
      ELSE 'active'
    END
  );
END;
$$;

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
