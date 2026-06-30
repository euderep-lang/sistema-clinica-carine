-- Estorno PARCIAL de pacotes de sessões: cancela apenas as sessões ainda não
-- realizadas (restantes), mantendo as já utilizadas como cobradas e ajustando
-- o valor da cobrança proporcionalmente.
--
-- Cenário: pacote de 8 sessões por R$ 3.900 com 2 realizadas. Ao estornar as
-- restantes, a cobrança passa a valer 2/8 (R$ 975) e as 6 sessões restantes são
-- canceladas (pacote marcado como "completed").
--
-- Observações:
--   - Não permite estorno parcial se já houver pagamentos na cobrança (exigiria
--     reembolso/crédito) — estorne os pagamentos antes.
--   - Suporta cobrança com um único título ativo (não parcelada).
--   - Não devolve insumos ao estoque (a baixa de insumo é por unidade vendida).

CREATE OR REPLACE FUNCTION public.reverse_remaining_sessions(
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
  v_active_bills integer := 0;
  v_pkg_count integer := 0;
  v_per_session numeric;
  v_kept numeric;
  v_new_total numeric := 0;
  v_removed numeric := 0;
  v_sessions_cancelled integer := 0;
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

  IF v_charge.id IS NULL THEN
    RAISE EXCEPTION 'Esta cobrança não possui pacote de sessões para estorno parcial';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bills_receivable
    WHERE consultation_charge_id = v_charge.id
      AND paid_amount > 0
  ) THEN
    RAISE EXCEPTION 'Estorne os pagamentos antes de estornar as sessões restantes';
  END IF;

  SELECT count(*) INTO v_active_bills
  FROM public.bills_receivable
  WHERE consultation_charge_id = v_charge.id
    AND status <> 'cancelled';

  IF v_active_bills > 1 THEN
    RAISE EXCEPTION 'Venda parcelada: ajuste as parcelas manualmente';
  END IF;

  SELECT count(*) INTO v_pkg_count
  FROM public.patient_session_packages
  WHERE consultation_charge_id = v_charge.id
    AND status = 'active'
    AND used_sessions < total_sessions;

  IF v_pkg_count = 0 THEN
    RAISE EXCEPTION 'Não há sessões restantes para estornar';
  END IF;

  FOR v_item IN
    SELECT * FROM public.consultation_charge_items
    WHERE charge_id = v_charge.id
  LOOP
    IF v_item.item_type = 'session_sale' THEN
      SELECT * INTO v_pkg
      FROM public.patient_session_packages
      WHERE consultation_charge_id = v_charge.id
        AND service_id = v_item.service_id
        AND status = 'active'
      ORDER BY created_at
      LIMIT 1;

      IF FOUND AND v_pkg.used_sessions < v_pkg.total_sessions THEN
        v_per_session := CASE
          WHEN v_pkg.total_sessions > 0 THEN v_item.total_price / v_pkg.total_sessions
          ELSE 0
        END;
        v_kept := round(v_per_session * v_pkg.used_sessions, 2);
        v_removed := v_removed + (v_item.total_price - v_kept);
        v_sessions_cancelled := v_sessions_cancelled + (v_pkg.total_sessions - v_pkg.used_sessions);

        UPDATE public.consultation_charge_items
        SET total_price = v_kept,
            unit_price = CASE WHEN quantity > 0 THEN round(v_kept / quantity, 2) ELSE v_kept END
        WHERE id = v_item.id;

        UPDATE public.patient_session_packages
        SET total_sessions = v_pkg.used_sessions,
            status = CASE WHEN v_pkg.used_sessions > 0 THEN 'completed' ELSE 'cancelled' END
        WHERE id = v_pkg.id;

        v_new_total := v_new_total + v_kept;
      ELSE
        v_new_total := v_new_total + v_item.total_price;
      END IF;
    ELSE
      v_new_total := v_new_total + v_item.total_price;
    END IF;
  END LOOP;

  IF v_new_total <= 0 THEN
    UPDATE public.bills_receivable
    SET status = 'cancelled',
        notes = trim(COALESCE(notes, '') || E'\nEstorno de sessões restantes: ' || COALESCE(p_reason, 'sem motivo'))
    WHERE consultation_charge_id = v_charge.id
      AND status <> 'cancelled';
  ELSE
    UPDATE public.bills_receivable
    SET amount = v_new_total,
        notes = trim(COALESCE(notes, '') || E'\nEstorno de ' || v_sessions_cancelled
          || ' sessão(ões) restante(s): ' || COALESCE(p_reason, 'sem motivo'))
    WHERE consultation_charge_id = v_charge.id
      AND status <> 'cancelled';
  END IF;

  RETURN jsonb_build_object(
    'bill_id', p_bill_id,
    'new_amount', v_new_total,
    'removed_amount', v_removed,
    'sessions_cancelled', v_sessions_cancelled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_remaining_sessions(uuid, text) TO authenticated;
