-- Profissionais podem cadastrar e consultar pacientes do próprio tenant.
-- Antes: apenas admin/recepção (is_ops_staff) podiam inserir/atualizar.

DROP POLICY IF EXISTS patients_insert ON public.patients;
CREATE POLICY patients_insert ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_ops_staff()
      OR public.get_my_role() = 'professional'
    )
  );

DROP POLICY IF EXISTS patients_select ON public.patients;
CREATE POLICY patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_financial_staff()
      OR public.is_ops_staff()
      OR public.get_my_role() = 'professional'
    )
  );

DROP POLICY IF EXISTS patients_update ON public.patients;
CREATE POLICY patients_update ON public.patients
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_ops_staff()
      OR public.get_my_role() = 'professional'
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_ops_staff()
      OR public.get_my_role() = 'professional'
    )
  );
