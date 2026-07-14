-- Libera horários antigos após remarcações manuais: em cada par paciente+profissional
-- com mais de um agendamento pendente, mantém só o scheduled/confirmed mais recente.

WITH candidates AS (
  SELECT
    id,
    patient_id,
    professional_id,
    status,
    created_at
  FROM public.appointments
  WHERE patient_id IS NOT NULL
    AND professional_id IS NOT NULL
    AND COALESCE(type, 'consultation') <> 'block'
    AND status IN ('scheduled', 'confirmed', 'cancelled', 'rescheduled')
),
keepers AS (
  SELECT DISTINCT ON (patient_id, professional_id)
    id AS keep_id,
    patient_id,
    professional_id
  FROM candidates
  WHERE status IN ('scheduled', 'confirmed')
  ORDER BY patient_id, professional_id, created_at DESC
),
duplicate_groups AS (
  SELECT patient_id, professional_id
  FROM candidates
  GROUP BY patient_id, professional_id
  HAVING COUNT(*) > 1
)
UPDATE public.appointments a
SET
  status = 'rescheduled'
FROM duplicate_groups d
JOIN keepers k
  ON k.patient_id = d.patient_id
 AND k.professional_id = d.professional_id
WHERE a.patient_id = d.patient_id
  AND a.professional_id = d.professional_id
  AND a.id <> k.keep_id
  AND a.status IN ('scheduled', 'confirmed', 'cancelled', 'rescheduled')
  AND COALESCE(a.type, 'consultation') <> 'block';
