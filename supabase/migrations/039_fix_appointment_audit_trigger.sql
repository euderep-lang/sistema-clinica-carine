-- Corrige trigger de auditoria: appointments usa start_time/end_time, não time.

CREATE OR REPLACE FUNCTION public.audit_appointments_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_summary text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_summary := format('Agendamento criado em %s', NEW.date);
    PERFORM public.write_system_audit(
      NEW.tenant_id, auth.uid(), 'appointment', 'appointment.created', v_summary,
      'appointment', NEW.id, NEW.patient_id, NULL,
      jsonb_build_object(
        'date', NEW.date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
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
