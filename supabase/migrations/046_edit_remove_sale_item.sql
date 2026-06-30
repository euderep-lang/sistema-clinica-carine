-- Editar quantidade e remover itens individuais de uma fatura (conta do paciente),
-- ajustando total, estoque, pacotes de sessões e status — igual ao MedX.

CREATE OR REPLACE FUNCTION public.update_sale_item(
  p_item_id uuid,
  p_quantity integer
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
  IF v_new_qty = v_old_qty THEN
    RETURN jsonb_build_object('bill_id', v_bill.id, 'amount', v_bill.amount, 'unchanged', true);
  END IF;

  v_professional_id := COALESCE(v_bill.professional_id, v_user_id);
  v_new_total := v_item.unit_price * v_new_qty;
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
    ELSE
      PERFORM public.restore_service_inventory(
        v_bill.tenant_id, v_item.service_id, v_old_qty - v_new_qty,
        v_bill.patient_id, v_professional_id, v_charge.appointment_id
      );
    END IF;
  END IF;

  UPDATE public.consultation_charge_items
    SET quantity = v_new_qty, total_price = v_new_total
    WHERE id = p_item_id;

  IF v_item.item_type = 'session_sale' AND v_item.service_id IS NOT NULL AND v_pkg.id IS NOT NULL THEN
    SELECT * INTO v_service FROM public.services WHERE id = v_item.service_id;
    IF FOUND THEN
      UPDATE public.patient_session_packages
        SET total_sessions = v_service.session_count * v_new_qty
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

  IF v_item.item_type = 'session_sale' AND v_item.service_id IS NOT NULL THEN
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

GRANT EXECUTE ON FUNCTION public.update_sale_item(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sale_item(uuid) TO authenticated;
