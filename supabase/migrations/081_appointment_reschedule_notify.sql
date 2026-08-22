-- Reagendar in-place (mudou data/hora) também enfileira a confirmação WhatsApp.
CREATE OR REPLACE FUNCTION public.queue_appointment_rescheduled_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = ANY (ARRAY['scheduled'::text, 'confirmed'::text])
    AND (
      OLD.date IS DISTINCT FROM NEW.date
      OR OLD.start_time IS DISTINCT FROM NEW.start_time
    ) THEN
    INSERT INTO public.wa_appointment_notify_queue (appointment_id, tenant_id, kind, payload)
    VALUES (NEW.id, NEW.tenant_id, 'booked', jsonb_build_object('reason', 'rescheduled'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_appointment_rescheduled_notify ON public.appointments;
CREATE TRIGGER trg_queue_appointment_rescheduled_notify
  AFTER UPDATE OF date, start_time ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_appointment_rescheduled_notify();
