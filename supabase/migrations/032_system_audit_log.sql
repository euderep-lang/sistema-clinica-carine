-- Auditoria central do sistema (financeiro, WhatsApp, usuários, pacientes, agenda)

CREATE TABLE IF NOT EXISTS public.system_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  category text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  summary text NOT NULL,
  details jsonb,
  source text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_audit_tenant_created
  ON public.system_audit_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_category
  ON public.system_audit_log (tenant_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_action
  ON public.system_audit_log (tenant_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_actor
  ON public.system_audit_log (tenant_id, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_patient
  ON public.system_audit_log (tenant_id, patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_audit_conversation
  ON public.system_audit_log (tenant_id, conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_audit_log_select ON public.system_audit_log;
CREATE POLICY system_audit_log_select ON public.system_audit_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_role() = 'admin'
      OR public.is_financial_staff()
    )
  );

CREATE OR REPLACE FUNCTION public.write_system_audit(
  p_tenant_id uuid,
  p_actor_id uuid,
  p_category text,
  p_action text,
  p_summary text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_patient_id uuid DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_source text DEFAULT 'system'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_name text;
  v_actor_role text;
  v_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_category IS NULL OR p_action IS NULL OR p_summary IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_actor_id IS NOT NULL THEN
    SELECT full_name, role INTO v_actor_name, v_actor_role
    FROM public.profiles
    WHERE id = p_actor_id;
  END IF;

  INSERT INTO public.system_audit_log (
    tenant_id, actor_id, actor_name, actor_role,
    category, action, entity_type, entity_id,
    patient_id, conversation_id, summary, details, source
  ) VALUES (
    p_tenant_id, p_actor_id, v_actor_name, v_actor_role,
    p_category, p_action, p_entity_type, p_entity_id,
    p_patient_id, p_conversation_id, p_summary, p_details, COALESCE(p_source, 'system')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.write_system_audit(uuid, uuid, text, text, text, text, uuid, uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_system_audit(uuid, uuid, text, text, text, text, uuid, uuid, uuid, jsonb, text) TO service_role;

-- Pagamentos recebidos
CREATE OR REPLACE FUNCTION public.audit_bill_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.write_system_audit(
    NEW.tenant_id,
    COALESCE(NEW.created_by, auth.uid()),
    'financial',
    'financial.payment_received',
    format('Pagamento de R$ %s registrado', to_char(NEW.amount, 'FM999999990.00')),
    'bill_payment',
    NEW.id,
    NEW.patient_id,
    NULL,
    jsonb_build_object(
      'bill_id', NEW.bill_receivable_id,
      'amount', NEW.amount,
      'net_amount', NEW.net_amount,
      'fee_amount', NEW.fee_amount,
      'payment_method', NEW.payment_method,
      'paid_date', NEW.paid_date
    ),
    'rpc'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bill_payment_insert ON public.bill_payments;
CREATE TRIGGER trg_audit_bill_payment_insert
  AFTER INSERT ON public.bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bill_payment_insert();

-- Estorno de pagamento
CREATE OR REPLACE FUNCTION public.audit_bill_payment_reverse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'reversed' THEN
    PERFORM public.write_system_audit(
      NEW.tenant_id,
      COALESCE(NEW.reversed_by, auth.uid()),
      'financial',
      'financial.payment_reversed',
      format('Pagamento de R$ %s estornado', to_char(NEW.amount, 'FM999999990.00')),
      'bill_payment',
      NEW.id,
      NEW.patient_id,
      NULL,
      jsonb_build_object(
        'bill_id', NEW.bill_receivable_id,
        'amount', NEW.amount,
        'reason', NEW.reversal_reason
      ),
      'rpc'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bill_payment_reverse ON public.bill_payments;
CREATE TRIGGER trg_audit_bill_payment_reverse
  AFTER UPDATE ON public.bill_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bill_payment_reverse();

-- Descontos
CREATE OR REPLACE FUNCTION public.audit_bill_discount_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.write_system_audit(
    NEW.tenant_id,
    COALESCE(NEW.created_by, auth.uid()),
    'financial',
    'financial.discount_applied',
    format('Desconto de R$ %s aplicado', to_char(NEW.amount, 'FM999999990.00')),
    'bill_discount',
    NEW.id,
    NEW.patient_id,
    NULL,
    jsonb_build_object(
      'bill_id', NEW.bill_receivable_id,
      'amount', NEW.amount,
      'applied_date', NEW.applied_date,
      'notes', NEW.notes
    ),
    'rpc'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bill_discount_insert ON public.bill_discounts;
CREATE TRIGGER trg_audit_bill_discount_insert
  AFTER INSERT ON public.bill_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bill_discount_insert();

-- Cobrança cancelada / estornada
CREATE OR REPLACE FUNCTION public.audit_bill_receivable_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
    PERFORM public.write_system_audit(
      NEW.tenant_id,
      auth.uid(),
      'financial',
      'financial.bill_cancelled',
      format('Cobrança cancelada: %s', left(NEW.description, 120)),
      'bill',
      NEW.id,
      NEW.patient_id,
      NULL,
      jsonb_build_object(
        'amount', NEW.amount,
        'paid_amount', NEW.paid_amount,
        'previous_status', OLD.status
      ),
      'rpc'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_bill_receivable_status ON public.bills_receivable;
CREATE TRIGGER trg_audit_bill_receivable_status
  AFTER UPDATE OF status ON public.bills_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_bill_receivable_status();

-- Pacientes
CREATE OR REPLACE FUNCTION public.audit_patients_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := format('Paciente cadastrado: %s', NEW.full_name);
    PERFORM public.write_system_audit(
      NEW.tenant_id, auth.uid(), 'patient', 'patient.created', v_summary,
      'patient', NEW.id, NEW.id, NULL,
      jsonb_build_object('full_name', NEW.full_name), 'ui'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_summary := format('Paciente atualizado: %s', NEW.full_name);
    PERFORM public.write_system_audit(
      NEW.tenant_id, auth.uid(), 'patient', 'patient.updated', v_summary,
      'patient', NEW.id, NEW.id, NULL,
      jsonb_build_object(
        'full_name', NEW.full_name,
        'phone_changed', OLD.phone IS DISTINCT FROM NEW.phone,
        'email_changed', OLD.email IS DISTINCT FROM NEW.email
      ),
      'ui'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_patients_changes ON public.patients;
CREATE TRIGGER trg_audit_patients_changes
  AFTER INSERT OR UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_patients_changes();

-- Agenda
CREATE OR REPLACE FUNCTION public.audit_appointments_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary text;
  v_patient_id uuid;
  v_tenant_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := format('Agendamento criado em %s', NEW.date);
    PERFORM public.write_system_audit(
      NEW.tenant_id, auth.uid(), 'appointment', 'appointment.created', v_summary,
      'appointment', NEW.id, NEW.patient_id, NULL,
      jsonb_build_object(
        'date', NEW.date,
        'time', NEW.time,
        'status', NEW.status,
        'professional_id', NEW.professional_id
      ),
      'ui'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_summary := format('Agendamento %s → %s (%s)', OLD.status, NEW.status, NEW.date);
      PERFORM public.write_system_audit(
        NEW.tenant_id, auth.uid(), 'appointment', 'appointment.status_changed', v_summary,
        'appointment', NEW.id, NEW.patient_id, NULL,
        jsonb_build_object(
          'from_status', OLD.status,
          'to_status', NEW.status,
          'date', NEW.date,
          'professional_id', NEW.professional_id
        ),
        'ui'
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_summary := format('Agendamento excluído (%s)', OLD.date);
    PERFORM public.write_system_audit(
      OLD.tenant_id, auth.uid(), 'appointment', 'appointment.deleted', v_summary,
      'appointment', OLD.id, OLD.patient_id, NULL,
      jsonb_build_object('date', OLD.date, 'status', OLD.status),
      'ui'
    );
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_appointments_changes ON public.appointments;
CREATE TRIGGER trg_audit_appointments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_appointments_changes();

COMMENT ON TABLE public.system_audit_log IS 'Trilha de auditoria central: financeiro, WhatsApp, usuários, pacientes e agenda.';
