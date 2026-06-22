-- Platform features: pré-cadastro, exames, NPS, LGPD, compartilhamento clínico, confirmações

-- ---------------------------------------------------------------------------
-- Pré-cadastro de paciente (link público antes da consulta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_pre_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  birth_date date,
  cpf text,
  address jsonb,
  health_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'merged', 'expired')),
  expires_at timestamptz,
  submitted_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_reg_tenant ON public.patient_pre_registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pre_reg_token ON public.patient_pre_registrations(token);

-- ---------------------------------------------------------------------------
-- Solicitação de exames + laudos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  evolution_id uuid REFERENCES public.patient_evolutions(id) ON DELETE SET NULL,
  exams text[] NOT NULL DEFAULT '{}',
  clinical_indication text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'partial', 'completed', 'cancelled')),
  requested_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exam_request_id uuid REFERENCES public.exam_requests(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_path text,
  file_name text,
  mime_type text,
  ai_summary text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_req_patient ON public.exam_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_patient ON public.exam_results(patient_id);

-- ---------------------------------------------------------------------------
-- Compartilhamento de prontuário entre profissionais
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_record_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  owner_professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_evolutions boolean NOT NULL DEFAULT true,
  share_prescriptions boolean NOT NULL DEFAULT false,
  share_exams boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (patient_id, owner_professional_id, shared_with_professional_id)
);

-- ---------------------------------------------------------------------------
-- NPS pós-atendimento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nps_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'answered', 'expired')),
  sent_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.nps_surveys(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback text,
  answered_at timestamptz DEFAULT now(),
  UNIQUE (survey_id)
);

CREATE INDEX IF NOT EXISTS idx_nps_survey_token ON public.nps_surveys(token);
CREATE INDEX IF NOT EXISTS idx_nps_responses_tenant ON public.nps_responses(tenant_id, answered_at DESC);

-- ---------------------------------------------------------------------------
-- LGPD — consentimento, exportação e exclusão
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('data_processing', 'marketing', 'whatsapp', 'telemedicine')),
  granted boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  document_version text NOT NULL DEFAULT '1.0',
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (patient_id, consent_type, document_version)
);

CREATE TABLE IF NOT EXISTS public.patient_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  export_file_path text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Log de confirmação automática de consulta (WA/CRM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email', 'manual')),
  confirmation_type text NOT NULL DEFAULT 'd1_reminder' CHECK (confirmation_type IN ('booking', 'd1_reminder', 'same_day', 'manual')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'confirmed', 'declined', 'no_response')),
  message_preview text,
  patient_reply text,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_confirm_appt ON public.appointment_confirmations(appointment_id);

-- Triggers updated_at
CREATE TRIGGER patient_pre_registrations_updated_at BEFORE UPDATE ON public.patient_pre_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER exam_requests_updated_at BEFORE UPDATE ON public.exam_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.patient_pre_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_record_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_confirmations ENABLE ROW LEVEL SECURITY;

-- Staff policies
CREATE POLICY pre_reg_staff ON public.patient_pre_registrations FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff());

CREATE POLICY exam_requests_staff ON public.exam_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND (professional_id = auth.uid() OR public.is_ops_staff()))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND (professional_id = auth.uid() OR public.is_ops_staff()));

CREATE POLICY exam_results_staff ON public.exam_results FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND (professional_id = auth.uid() OR professional_id IS NULL OR public.is_ops_staff()))
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY clinical_shares_owner ON public.clinical_record_shares FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND (owner_professional_id = auth.uid() OR public.get_my_role() = 'admin'))
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND owner_professional_id = auth.uid());

CREATE POLICY clinical_shares_recipient ON public.clinical_record_shares FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND shared_with_professional_id = auth.uid());

CREATE POLICY nps_surveys_staff ON public.nps_surveys FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff());

CREATE POLICY nps_responses_staff ON public.nps_responses FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY nps_responses_insert_anon ON public.nps_responses FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY patient_consents_staff ON public.patient_consents FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY data_requests_staff ON public.patient_data_requests FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_ops_staff());

CREATE POLICY appt_confirm_staff ON public.appointment_confirmations FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Evoluções: permitir leitura se compartilhado
DROP POLICY IF EXISTS evolutions_select ON public.patient_evolutions;
CREATE POLICY evolutions_select ON public.patient_evolutions
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      professional_id = auth.uid()
      OR public.get_my_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.clinical_record_shares s
        WHERE s.patient_id = patient_evolutions.patient_id
          AND s.shared_with_professional_id = auth.uid()
          AND s.share_evolutions = true
          AND (s.expires_at IS NULL OR s.expires_at > now())
      )
    )
  );

-- Storage bucket for exam results
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exam-results', 'exam-results', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY exam_results_storage ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'exam-results' AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text)
  WITH CHECK (bucket_id = 'exam-results' AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text);
