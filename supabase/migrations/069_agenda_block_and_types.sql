-- ---------------------------------------------------------------------------
-- Agenda: habilitar bloqueio de horário + novo tipo "Medicação"
-- ---------------------------------------------------------------------------
-- O bloqueio de horário insere appointments com status='blocked' e type='block',
-- mas os CHECK originais não permitiam esses valores — por isso "bloquear
-- horário" falhava. Aqui ampliamos os dois CHECKs.

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check CHECK (
    status = ANY (ARRAY[
      'scheduled'::text, 'confirmed'::text, 'in_progress'::text,
      'completed'::text, 'cancelled'::text, 'no_show'::text,
      'rescheduled'::text, 'blocked'::text
    ])
  );

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_type_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_type_check CHECK (
    type = ANY (ARRAY[
      'consultation'::text, 'return'::text, 'procedure'::text,
      'exam'::text, 'medication'::text, 'block'::text
    ])
  );
