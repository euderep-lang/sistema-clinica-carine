-- Fila server-side: confirmação de agendamento e follow-ups por status (independente do CRM aberto).

CREATE TABLE IF NOT EXISTS public.wa_appointment_notify_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['booked'::text, 'status'::text])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text])),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wa_appt_notify_pending
  ON public.wa_appointment_notify_queue (created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.queue_appointment_booked_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = ANY (ARRAY['scheduled'::text, 'confirmed'::text]) THEN
    INSERT INTO public.wa_appointment_notify_queue (appointment_id, tenant_id, kind, payload)
    VALUES (NEW.id, NEW.tenant_id, 'booked', '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_appointment_booked_notify ON public.appointments;
CREATE TRIGGER trg_queue_appointment_booked_notify
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_appointment_booked_notify();

CREATE OR REPLACE FUNCTION public.queue_appointment_status_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.status = ANY (ARRAY['completed'::text, 'no_show'::text]) THEN
    INSERT INTO public.wa_appointment_notify_queue (appointment_id, tenant_id, kind, payload)
    VALUES (
      NEW.id,
      NEW.tenant_id,
      'status',
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_appointment_status_notify ON public.appointments;
CREATE TRIGGER trg_queue_appointment_status_notify
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_appointment_status_notify();
