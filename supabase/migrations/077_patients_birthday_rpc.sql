-- Pacientes ativos com aniversário no mês/dia (ignora o ano).
CREATE OR REPLACE FUNCTION public.patients_with_birthday_on(p_month integer, p_day integer)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  full_name text,
  phone text,
  phone_ddi text,
  gender text,
  birth_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.tenant_id,
    p.full_name,
    p.phone,
    p.phone_ddi,
    p.gender,
    p.birth_date
  FROM public.patients p
  WHERE p.active = true
    AND p.birth_date IS NOT NULL
    AND p.phone IS NOT NULL
    AND length(btrim(p.phone)) > 0
    AND EXTRACT(MONTH FROM p.birth_date)::integer = p_month
    AND EXTRACT(DAY FROM p.birth_date)::integer = p_day;
$$;

REVOKE ALL ON FUNCTION public.patients_with_birthday_on(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patients_with_birthday_on(integer, integer) TO service_role;
