-- Profissionais podem gerenciar seus próprios orçamentos
CREATE POLICY budgets_insert_professional ON public.budgets
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

CREATE POLICY budgets_update_professional ON public.budgets
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

CREATE POLICY budgets_delete_professional ON public.budgets
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
    AND status IN ('draft', 'rejected')
  );

CREATE POLICY budget_items_insert_professional ON public.budget_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_items.budget_id
        AND b.tenant_id = public.get_my_tenant_id()
        AND b.professional_id = auth.uid()
    )
  );

CREATE POLICY budget_items_update_professional ON public.budget_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_items.budget_id
        AND b.tenant_id = public.get_my_tenant_id()
        AND b.professional_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_items.budget_id
        AND b.tenant_id = public.get_my_tenant_id()
        AND b.professional_id = auth.uid()
    )
  );

CREATE POLICY budget_items_delete_professional ON public.budget_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_items.budget_id
        AND b.tenant_id = public.get_my_tenant_id()
        AND b.professional_id = auth.uid()
    )
  );

-- Converte orçamento aprovado em cobrança + pacotes de sessão
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
  v_desc_parts text[] := ARRAY[]::text[];
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

  IF v_budget.status <> 'approved' THEN
    RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos em venda';
  END IF;

  IF v_budget.patient_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento sem paciente vinculado';
  END IF;

  IF v_budget.final_value <= 0 THEN
    RAISE EXCEPTION 'Orçamento sem valor para cobrança';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bills_receivable br WHERE br.budget_id = p_budget_id
  ) THEN
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
      CASE
        WHEN v_has_service AND v_service.session_count > 1 THEN 'session_sale'
        ELSE 'charge'
      END
    );

    IF v_has_service AND v_service.session_count > 1 THEN
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

  INSERT INTO public.bills_receivable (
    tenant_id, patient_id, professional_id, budget_id,
    description, amount, due_date, status
  ) VALUES (
    v_budget.tenant_id,
    v_budget.patient_id,
    v_budget.professional_id,
    p_budget_id,
    'Orçamento #' || v_budget.number || ': ' || array_to_string(v_desc_parts, ', '),
    v_budget.final_value,
    CURRENT_DATE,
    'pending'
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
    'patient_id', v_budget.patient_id,
    'amount', v_budget.final_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_budget_to_sale(uuid) TO authenticated;
