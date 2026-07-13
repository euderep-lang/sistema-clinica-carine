-- Estorno de venda: estorna pagamentos, devolve insumos usados nas sessões e cancela pacotes.

CREATE OR REPLACE FUNCTION public.restore_package_inventory(
  p_tenant_id uuid,
  p_package_id uuid,
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
  v_use_package_items boolean;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN;
  END IF;

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
  ELSE
    PERFORM public.restore_service_inventory(
      p_tenant_id, p_service_id, p_quantity, p_patient_id, p_professional_id, p_appointment_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_package_inventory(uuid, uuid, uuid, integer, uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._reverse_active_bill_payments(
  p_bill_ids uuid[],
  p_reason text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment record;
  v_count integer := 0;
BEGIN
  IF p_bill_ids IS NULL OR array_length(p_bill_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_payment IN
    SELECT id
    FROM public.bill_payments
    WHERE bill_receivable_id = ANY (p_bill_ids)
      AND status = 'active'
      AND tenant_id = public.get_my_tenant_id()
    ORDER BY paid_date DESC, created_at DESC
  LOOP
    PERFORM public.reverse_bill_payment(v_payment.id, COALESCE(p_reason, 'Estorno automático antes do cancelamento'));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public._reverse_active_bill_payments(uuid[], text) TO authenticated;

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
  v_pkg public.patient_session_packages%ROWTYPE;
  v_bill_ids uuid[];
  v_cancelled integer := 0;
  v_payments_reversed integer := 0;
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
    SELECT COALESCE(array_agg(DISTINCT b.id), ARRAY[]::uuid[])
    INTO v_bill_ids
    FROM public.bills_receivable b
    WHERE b.tenant_id = v_bill.tenant_id
      AND (
        b.consultation_charge_id = v_charge.id
        OR b.id = v_charge.bill_receivable_id
        OR b.id = p_bill_id
      )
      AND b.status <> 'cancelled';

    v_payments_reversed := public._reverse_active_bill_payments(
      v_bill_ids,
      COALESCE(p_reason, 'Estorno de venda')
    );

    FOR v_pkg IN
      SELECT *
      FROM public.patient_session_packages
      WHERE consultation_charge_id = v_charge.id
         OR bill_receivable_id = ANY (v_bill_ids)
      ORDER BY purchased_at
    LOOP
      IF v_pkg.used_sessions > 0 THEN
        PERFORM public.restore_package_inventory(
          v_bill.tenant_id,
          v_pkg.id,
          v_pkg.service_id,
          v_pkg.used_sessions,
          v_bill.patient_id,
          COALESCE(v_bill.professional_id, v_user_id),
          v_charge.appointment_id
        );
      END IF;

      DELETE FROM public.session_usages
      WHERE package_id = v_pkg.id;

      UPDATE public.patient_session_packages
      SET status = 'cancelled'
      WHERE id = v_pkg.id;
    END LOOP;

    -- Vendas avulsas antigas davam baixa no estoque no momento da venda.
    IF v_charge.appointment_id IS NULL THEN
      FOR v_item IN
        SELECT * FROM public.consultation_charge_items
        WHERE charge_id = v_charge.id
          AND service_id IS NOT NULL
          AND item_type IN ('charge', 'session_sale')
      LOOP
        PERFORM public.restore_service_inventory(
          v_bill.tenant_id,
          v_item.service_id,
          v_item.quantity,
          v_bill.patient_id,
          COALESCE(v_bill.professional_id, v_user_id),
          v_charge.appointment_id
        );
      END LOOP;
    END IF;

    UPDATE public.bills_receivable
    SET
      status = 'cancelled',
      notes = trim(COALESCE(notes, '') || E'\nEstorno: ' || COALESCE(p_reason, 'sem motivo'))
    WHERE id = ANY (v_bill_ids);

    GET DIAGNOSTICS v_cancelled = ROW_COUNT;
  ELSE
    v_bill_ids := ARRAY[p_bill_id];
    v_payments_reversed := public._reverse_active_bill_payments(
      v_bill_ids,
      COALESCE(p_reason, 'Estorno de venda')
    );

    UPDATE public.bills_receivable
    SET
      status = 'cancelled',
      notes = trim(COALESCE(notes, '') || E'\nEstorno: ' || COALESCE(p_reason, 'sem motivo'))
    WHERE id = p_bill_id;

    v_cancelled := 1;
  END IF;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'cancelled', true,
    'bills_cancelled', v_cancelled,
    'payments_reversed', v_payments_reversed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_sale(uuid, text) TO authenticated;
