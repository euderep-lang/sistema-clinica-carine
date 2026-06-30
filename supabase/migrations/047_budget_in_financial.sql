-- Orçamentos no Financeiro
-- Um orçamento passa a gerar uma fatura no financeiro com status 'budget'
-- (exibida como "Orçamento"). A conversão em venda transforma essa mesma
-- fatura em uma cobrança real (status 'pending'), gerando itens, pacotes de
-- sessão e baixa de estoque.

-- 1) Permitir o status 'budget' em bills_receivable
ALTER TABLE public.bills_receivable
  DROP CONSTRAINT IF EXISTS bills_receivable_status_check;
ALTER TABLE public.bills_receivable
  ADD CONSTRAINT bills_receivable_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'budget'::text]));

-- 2) Cria/atualiza a fatura-orçamento (status 'budget') a partir do orçamento
CREATE OR REPLACE FUNCTION public.upsert_budget_bill(p_budget_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_budget public.budgets%ROWTYPE;
  v_desc text;
  v_bill_id uuid;
  v_bill_status text;
  v_due date;
BEGIN
  SELECT * INTO v_budget
  FROM public.budgets
  WHERE id = p_budget_id
    AND tenant_id = public.get_my_tenant_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;

  IF NOT (public.is_ops_staff() OR v_budget.professional_id = v_user_id) THEN
    RAISE EXCEPTION 'Sem permissão para este orçamento';
  END IF;

  -- Sem paciente ou sem valor: não há o que faturar
  IF v_budget.patient_id IS NULL OR v_budget.final_value <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT 'Orçamento #' || v_budget.number || ': ' ||
         COALESCE(
           string_agg(
             bi.quantity::text || 'x ' || COALESCE(NULLIF(trim(bi.description), ''), 'Item'),
             ', ' ORDER BY bi.position
           ),
           'sem itens'
         )
    INTO v_desc
  FROM public.budget_items bi
  WHERE bi.budget_id = p_budget_id;

  v_due := COALESCE(v_budget.valid_until, v_budget.date, CURRENT_DATE);

  SELECT id, status INTO v_bill_id, v_bill_status
  FROM public.bills_receivable
  WHERE budget_id = p_budget_id
  LIMIT 1;

  IF v_bill_id IS NOT NULL THEN
    -- Já existe fatura. Só atualiza enquanto ainda for orçamento (não convertida).
    IF v_bill_status = 'budget' THEN
      UPDATE public.bills_receivable
      SET description = v_desc,
          amount = v_budget.final_value,
          due_date = v_due,
          competence_date = v_budget.date,
          patient_id = v_budget.patient_id
      WHERE id = v_bill_id;
    END IF;
    RETURN v_bill_id;
  END IF;

  INSERT INTO public.bills_receivable (
    tenant_id, patient_id, professional_id, budget_id,
    description, amount, paid_amount, due_date, competence_date, status
  ) VALUES (
    v_budget.tenant_id,
    v_budget.patient_id,
    v_budget.professional_id,
    p_budget_id,
    v_desc,
    v_budget.final_value,
    0,
    v_due,
    v_budget.date,
    'budget'
  )
  RETURNING id INTO v_bill_id;

  RETURN v_bill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_budget_bill(uuid) TO authenticated;

-- 3) Converte orçamento em venda — converte a fatura-orçamento existente no
--    lugar (mantendo o mesmo id) ou cria uma nova, se ainda não existir.
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

GRANT EXECUTE ON FUNCTION public.convert_budget_to_sale(uuid) TO authenticated;
