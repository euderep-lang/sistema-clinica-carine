-- Vincula cobranças ao profissional responsável e corrige registros órfãos.

-- 1) Cobrança herda profissional do agendamento quando não informado
CREATE OR REPLACE FUNCTION public.bills_receivable_set_professional()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.professional_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT a.professional_id INTO NEW.professional_id
    FROM public.appointments a
    WHERE a.id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bills_receivable_set_professional ON public.bills_receivable;
CREATE TRIGGER trg_bills_receivable_set_professional
  BEFORE INSERT OR UPDATE ON public.bills_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.bills_receivable_set_professional();

-- 2) Finalizar consulta: aceita agendamento sem profissional e grava o vínculo
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
  v_line_total numeric;
  v_sessions_to_add integer;
  v_package_id uuid;
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

    v_line_total := v_service.default_price * v_qty;
    v_total := v_total + v_line_total;
    v_desc_parts := array_append(v_desc_parts, v_qty::text || 'x ' || v_service.name);

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge_id, v_service.id, v_qty, v_service.default_price, v_line_total,
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
        v_sessions_to_add, 0, v_service.default_price, p_price_table,
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

-- 3) Profissional vê cobranças órfãs dos seus pacientes
DROP POLICY IF EXISTS bills_receivable_select ON public.bills_receivable;
CREATE POLICY bills_receivable_select ON public.bills_receivable
  FOR SELECT TO authenticated
  USING (
    (tenant_id = public.get_my_tenant_id())
    AND (
      public.is_financial_staff()
      OR (
        public.get_my_role() = 'professional'
        AND (
          professional_id = auth.uid()
          OR (
            professional_id IS NULL
            AND public.professional_has_patient(patient_id)
          )
        )
      )
    )
  );

-- 4) Backfill de vínculos existentes
UPDATE public.appointments a
SET professional_id = cc.professional_id
FROM public.consultation_charges cc
WHERE cc.appointment_id = a.id
  AND a.professional_id IS NULL
  AND cc.professional_id IS NOT NULL;

UPDATE public.bills_receivable br
SET professional_id = a.professional_id
FROM public.appointments a
WHERE br.appointment_id = a.id
  AND br.professional_id IS NULL
  AND a.professional_id IS NOT NULL;

UPDATE public.bills_receivable br
SET professional_id = cc.professional_id
FROM public.consultation_charges cc
WHERE cc.bill_receivable_id = br.id
  AND br.professional_id IS NULL
  AND cc.professional_id IS NOT NULL;

-- Clínica com um único profissional: atribui registros órfãos a ele
DO $$
DECLARE
  v_prof_id uuid;
  v_tenant_id uuid;
  v_count int;
BEGIN
  FOR v_tenant_id IN
    SELECT id FROM public.tenants
  LOOP
    SELECT count(*) INTO v_count
    FROM public.profiles
    WHERE tenant_id = v_tenant_id
      AND role = 'professional'
      AND active IS NOT DISTINCT FROM true;

    IF v_count = 1 THEN
      SELECT id INTO v_prof_id
      FROM public.profiles
      WHERE tenant_id = v_tenant_id
        AND role = 'professional'
        AND active IS NOT DISTINCT FROM true
      LIMIT 1;

      UPDATE public.bills_receivable
      SET professional_id = v_prof_id
      WHERE tenant_id = v_tenant_id AND professional_id IS NULL;

      UPDATE public.appointments
      SET professional_id = v_prof_id
      WHERE tenant_id = v_tenant_id AND professional_id IS NULL;

      UPDATE public.medical_records
      SET professional_id = v_prof_id
      WHERE tenant_id = v_tenant_id AND professional_id IS NULL;

      UPDATE public.patient_evolutions
      SET professional_id = v_prof_id
      WHERE tenant_id = v_tenant_id AND professional_id IS NULL;
    END IF;
  END LOOP;
END $$;
