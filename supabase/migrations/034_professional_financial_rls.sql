-- Cada profissional vê o financeiro vinculado a ele (cobranças, caixa, comissão).
-- Admin e equipe financeira continuam vendo o financeiro completo da clínica.
-- A migration 027 restringiu leitura a is_ops_staff() e removeu o acesso do profissional.

-- ---------------------------------------------------------------------------
-- Cobranças (contas a receber)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS bills_receivable_select ON public.bills_receivable;
CREATE POLICY bills_receivable_select ON public.bills_receivable
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_financial_staff()
      OR (
        public.get_my_role() = 'professional'
        AND (
          professional_id = auth.uid()
          OR (
            professional_id IS NULL
            AND public.professional_has_patient(patient_id)
          )
        )
      )
    )
  );

-- Escrita permanece com recepção/admin; equipe financeira também pode registrar.
DROP POLICY IF EXISTS bills_receivable_write_staff ON public.bills_receivable;
CREATE POLICY bills_receivable_write_staff ON public.bills_receivable
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.is_financial_staff()
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.is_financial_staff()
  );

-- ---------------------------------------------------------------------------
-- Itens de cobrança de consulta (detalhe da venda)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS consultation_charges_select ON public.consultation_charges;
CREATE POLICY consultation_charges_select ON public.consultation_charges
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_financial_staff()
      OR (
        public.get_my_role() = 'professional'
        AND professional_id = auth.uid()
      )
    )
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
        AND (
          public.is_financial_staff()
          OR (
            public.get_my_role() = 'professional'
            AND c.professional_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Pacotes de sessão
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS session_packages_select ON public.patient_session_packages;
CREATE POLICY session_packages_select ON public.patient_session_packages
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.is_financial_staff()
      OR (
        public.get_my_role() = 'professional'
        AND (
          professional_id = auth.uid()
          OR public.professional_has_patient(patient_id)
        )
      )
    )
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
        AND (
          public.is_financial_staff()
          OR (
            public.get_my_role() = 'professional'
            AND (
              p.professional_id = auth.uid()
              OR public.professional_has_patient(p.patient_id)
            )
          )
        )
    )
  );
