-- Recria pacotes de sessão a partir de cobranças de consulta que não geraram patient_session_packages
-- (dados migrados ou finalização fora do fluxo finish_consultation).

DO $$
DECLARE
  v_bill RECORD;
  v_service_id uuid;
  v_sessions integer;
  v_service_name text;
  v_match text[];
BEGIN
  FOR v_bill IN
    SELECT *
    FROM bills_receivable
    WHERE description ~* '^Consulta:\s*\d+x\s+'
      AND patient_id IS NOT NULL
      AND professional_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM patient_session_packages p
        WHERE p.bill_receivable_id = bills_receivable.id
      )
  LOOP
    v_service_name := trim(regexp_replace(v_bill.description, '^Consulta:\s*\d+x\s*', '', 'i'));
    IF v_service_name = '' THEN
      CONTINUE;
    END IF;

    v_match := regexp_match(v_service_name, '(\d+)\s*(Doses|Sessões|sessões|doses)', 'i');
    IF v_match IS NULL THEN
      CONTINUE;
    END IF;

    v_sessions := v_match[1]::integer;
    IF v_sessions IS NULL OR v_sessions <= 1 THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_service_id
    FROM services
    WHERE tenant_id = v_bill.tenant_id
      AND name = v_service_name
      AND (professional_id = v_bill.professional_id OR professional_id IS NULL)
    LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO services (
        tenant_id, professional_id, name, default_price, session_count, active
      ) VALUES (
        v_bill.tenant_id,
        v_bill.professional_id,
        v_service_name,
        v_bill.amount,
        v_sessions,
        true
      )
      RETURNING id INTO v_service_id;
    END IF;

    INSERT INTO patient_session_packages (
      tenant_id,
      patient_id,
      service_id,
      professional_id,
      total_sessions,
      used_sessions,
      unit_price,
      price_table,
      bill_receivable_id,
      status,
      purchased_at
    ) VALUES (
      v_bill.tenant_id,
      v_bill.patient_id,
      v_service_id,
      v_bill.professional_id,
      v_sessions,
      0,
      v_bill.amount,
      'particular',
      v_bill.id,
      'active',
      COALESCE(v_bill.created_at, now())
    );
  END LOOP;
END $$;
