-- Profissionais podem criar agendamentos na própria agenda.

CREATE POLICY appointments_insert_professional ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_role() = 'professional'
    AND professional_id = auth.uid()
  );
