-- Privacidade clínica e financeira
-- Paciente: todos do tenant
-- Evolução/prontuário/mídia da consulta: só o profissional autor
-- Financeiro do paciente: admin + recepção

-- ---------------------------------------------------------------------------
-- Pacientes — leitura para qualquer usuário autenticado do tenant
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS patients_select ON public.patients;
CREATE POLICY patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

-- ---------------------------------------------------------------------------
-- Clínico — somente quem registrou (professional_id = auth.uid())
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS evolutions_select ON public.patient_evolutions;
CREATE POLICY evolutions_select ON public.patient_evolutions
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

DROP POLICY IF EXISTS evolution_attachments_select ON public.evolution_attachments;
CREATE POLICY evolution_attachments_select ON public.evolution_attachments
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

DROP POLICY IF EXISTS patient_media_history_select ON public.patient_media_history;
CREATE POLICY patient_media_history_select ON public.patient_media_history
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND professional_id = auth.uid()
  );

-- medical_records e prescriptions já eram "own only" — mantidos

-- ---------------------------------------------------------------------------
-- Financeiro do paciente — admin + recepção (is_ops_staff)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS bills_receivable_select ON public.bills_receivable;
CREATE POLICY bills_receivable_select ON public.bills_receivable
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_ops_staff()
  );

DROP POLICY IF EXISTS bills_receivable_write_staff ON public.bills_receivable;
CREATE POLICY bills_receivable_write_staff ON public.bills_receivable
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_ops_staff()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.is_ops_staff()
  );

DROP POLICY IF EXISTS consultation_charges_select ON public.consultation_charges;
CREATE POLICY consultation_charges_select ON public.consultation_charges
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_ops_staff()
  );

DROP POLICY IF EXISTS consultation_charge_items_select ON public.consultation_charge_items;
CREATE POLICY consultation_charge_items_select ON public.consultation_charge_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.consultation_charges c
      WHERE c.id = consultation_charge_items.charge_id
        AND c.tenant_id = public.get_my_tenant_id()
        AND public.is_ops_staff()
    )
  );

DROP POLICY IF EXISTS session_packages_select ON public.patient_session_packages;
CREATE POLICY session_packages_select ON public.patient_session_packages
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_ops_staff()
  );

DROP POLICY IF EXISTS session_usages_select ON public.session_usages;
CREATE POLICY session_usages_select ON public.session_usages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_session_packages p
      WHERE p.id = session_usages.package_id
        AND p.tenant_id = public.get_my_tenant_id()
        AND public.is_ops_staff()
    )
  );
