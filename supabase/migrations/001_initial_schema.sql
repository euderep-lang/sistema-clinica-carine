-- Exportado de jglzghujpxbakqqmmple
-- Data: 2026-06-14T18:42:26.705Z
-- Gerado por: bun run scripts/export-schema.ts
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: assign_patient_record_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_patient_record_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.record_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.tenant_id::text));

  SELECT COALESCE(MAX(record_number), 0) + 1
  INTO NEW.record_number
  FROM public.patients
  WHERE tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;


--
-- Name: deduct_service_inventory(uuid, uuid, integer, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_service_inventory(p_tenant_id uuid, p_service_id uuid, p_quantity integer, p_patient_id uuid, p_professional_id uuid, p_appointment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_inv record;
  v_new_stock numeric;
  v_deduct numeric;
BEGIN
  FOR v_inv IN
    SELECT sii.inventory_item_id, sii.quantity AS per_unit, ii.current_stock, ii.name AS item_name
    FROM public.service_inventory_items sii
    JOIN public.inventory_items ii ON ii.id = sii.inventory_item_id
    WHERE sii.service_id = p_service_id
      AND ii.tenant_id = p_tenant_id
      AND ii.active = true
  LOOP
    v_deduct := v_inv.per_unit * p_quantity;
    v_new_stock := v_inv.current_stock - v_deduct;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente para %', v_inv.item_name;
    END IF;

    INSERT INTO public.inventory_movements (
      tenant_id, item_id, type, quantity, reason,
      patient_id, professional_id, created_by,
      appointment_id, service_id, date
    ) VALUES (
      p_tenant_id, v_inv.inventory_item_id, 'out', v_deduct,
      'Uso em procedimento', p_patient_id, p_professional_id, p_professional_id,
      p_appointment_id, p_service_id, now()
    );

    UPDATE public.inventory_items
    SET current_stock = v_new_stock
    WHERE id = v_inv.inventory_item_id;
  END LOOP;
END;
$$;


--
-- Name: finish_consultation(uuid, uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_consultation(p_patient_id uuid, p_room_id uuid DEFAULT NULL::uuid, p_price_table text DEFAULT 'particular'::text, p_new_items jsonb DEFAULT '[]'::jsonb, p_session_items jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_professional_id uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_appointment_id uuid;
  v_charge_id uuid;
  v_bill_id uuid;
  v_total numeric := 0;
  v_desc_parts text[] := ARRAY[]::text[];
  v_item jsonb;
  v_service record;
  v_package record;
  v_qty integer;
  v_line_total numeric;
  v_sessions_to_add integer;
  v_package_id uuid;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.profiles
  WHERE id = v_professional_id;

  IF v_tenant_id IS NULL OR v_role IS DISTINCT FROM 'professional' THEN
    RAISE EXCEPTION 'Apenas profissionais podem finalizar consultas';
  END IF;

  IF NOT public.professional_has_patient(p_patient_id) THEN
    RAISE EXCEPTION 'Paciente não vinculado a este profissional';
  END IF;

  SELECT id INTO v_appointment_id
  FROM public.appointments
  WHERE patient_id = p_patient_id
    AND professional_id = v_professional_id
    AND status = 'in_progress'
  ORDER BY start_time DESC
  LIMIT 1;

  INSERT INTO public.consultation_charges (
    tenant_id, appointment_id, patient_id, professional_id, room_id, price_table
  ) VALUES (
    v_tenant_id, v_appointment_id, p_patient_id, v_professional_id, p_room_id, p_price_table
  )
  RETURNING id INTO v_charge_id;

  -- Novos procedimentos (cobrança + pacote de sessões se aplicável)
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_new_items, '[]'::jsonb))
  LOOP
    v_qty := GREATEST(0, (v_item->>'quantity')::integer);
    IF v_qty = 0 THEN CONTINUE; END IF;

    SELECT * INTO v_service
    FROM public.services
    WHERE id = (v_item->>'service_id')::uuid
      AND tenant_id = v_tenant_id
      AND active = true
      AND (professional_id = v_professional_id OR professional_id IS NULL);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Procedimento inválido';
    END IF;

    v_line_total := v_service.default_price * v_qty;
    v_total := v_total + v_line_total;
    v_desc_parts := array_append(v_desc_parts, v_qty::text || 'x ' || v_service.name);

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type
    ) VALUES (
      v_charge_id, v_service.id, v_qty, v_service.default_price, v_line_total,
      CASE WHEN v_service.session_count > 1 THEN 'session_sale' ELSE 'charge' END
    );

    IF v_service.session_count > 1 THEN
      v_sessions_to_add := v_service.session_count * v_qty;
      INSERT INTO public.patient_session_packages (
        tenant_id, patient_id, service_id, professional_id,
        total_sessions, used_sessions, unit_price, price_table,
        consultation_charge_id, status
      ) VALUES (
        v_tenant_id, p_patient_id, v_service.id, v_professional_id,
        v_sessions_to_add, 0, v_service.default_price, p_price_table,
        v_charge_id, 'active'
      );
    END IF;

    PERFORM public.deduct_service_inventory(
      v_tenant_id, v_service.id, v_qty, p_patient_id, v_professional_id, v_appointment_id
    );
  END LOOP;

  -- Uso de sessões já vendidas
  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_session_items, '[]'::jsonb))
  LOOP
    v_qty := GREATEST(0, (v_item->>'quantity')::integer);
    IF v_qty = 0 THEN CONTINUE; END IF;

    SELECT psp.*, s.name AS service_name
    INTO v_package
    FROM public.patient_session_packages psp
    JOIN public.services s ON s.id = psp.service_id
    WHERE psp.id = (v_item->>'package_id')::uuid
      AND psp.patient_id = p_patient_id
      AND psp.tenant_id = v_tenant_id
      AND psp.status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pacote de sessões inválido';
    END IF;

    IF v_package.used_sessions + v_qty > v_package.total_sessions THEN
      RAISE EXCEPTION 'Sessões insuficientes em %', v_package.service_name;
    END IF;

    UPDATE public.patient_session_packages
    SET
      used_sessions = used_sessions + v_qty,
      status = CASE
        WHEN used_sessions + v_qty >= total_sessions THEN 'completed'
        ELSE 'active'
      END
    WHERE id = v_package.id;

    INSERT INTO public.session_usages (
      package_id, appointment_id, consultation_charge_id, quantity, professional_id
    ) VALUES (
      v_package.id, v_appointment_id, v_charge_id, v_qty, v_professional_id
    );

    INSERT INTO public.consultation_charge_items (
      charge_id, service_id, quantity, unit_price, total_price, item_type, session_package_id
    ) VALUES (
      v_charge_id, v_package.service_id, v_qty, 0, 0, 'session_use', v_package.id
    );

    PERFORM public.deduct_service_inventory(
      v_tenant_id, v_package.service_id, v_qty, p_patient_id, v_professional_id, v_appointment_id
    );
  END LOOP;

  IF v_total > 0 THEN
    INSERT INTO public.bills_receivable (
      tenant_id, patient_id, professional_id, appointment_id,
      description, amount, due_date, status
    ) VALUES (
      v_tenant_id, p_patient_id, v_professional_id, v_appointment_id,
      'Consulta: ' || array_to_string(v_desc_parts, ', '),
      v_total, current_date, 'pending'
    )
    RETURNING id INTO v_bill_id;

    UPDATE public.consultation_charges
    SET bill_receivable_id = v_bill_id
    WHERE id = v_charge_id;

    UPDATE public.patient_session_packages
    SET bill_receivable_id = v_bill_id
    WHERE consultation_charge_id = v_charge_id
      AND bill_receivable_id IS NULL;
  END IF;

  IF v_appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET status = 'completed'
    WHERE id = v_appointment_id;
  END IF;

  RETURN jsonb_build_object(
    'charge_id', v_charge_id,
    'bill_id', v_bill_id,
    'total', v_total,
    'appointment_id', v_appointment_id
  );
END;
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$ SELECT private.get_my_role() $$;


--
-- Name: get_my_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$ SELECT private.get_my_tenant_id() $$;


--
-- Name: is_financial_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_financial_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$ SELECT private.get_my_role() IN ('admin', 'receptionist', 'financial') $$;


--
-- Name: is_ops_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ops_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'private'
    AS $$ SELECT private.get_my_role() IN ('admin', 'receptionist') $$;


--
-- Name: patient_has_financial_pending(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.patient_has_financial_pending(p_patient_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bills_receivable br
    WHERE br.patient_id = p_patient_id
      AND br.tenant_id = public.get_my_tenant_id()
      AND br.status IN ('pending', 'partial', 'overdue')
      AND (br.amount - br.paid_amount) > 0
  )
$$;


--
-- Name: professional_has_patient(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.professional_has_patient(p_patient_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = p_patient_id AND a.professional_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.medical_records mr
    WHERE mr.patient_id = p_patient_id AND mr.professional_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.prescriptions pr
    WHERE pr.patient_id = p_patient_id AND pr.professional_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.patient_evolutions pe
    WHERE pe.patient_id = p_patient_id AND pe.professional_id = auth.uid()
  )
$$;


--
-- Name: register_session_checkoff(uuid, date, time without time zone, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_session_checkoff(p_package_id uuid, p_session_date date, p_session_time time without time zone, p_professional_id uuid, p_product_batch text DEFAULT NULL::text, p_application_route text DEFAULT 'IM'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_package record;
  v_used_at timestamptz;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_tenant_id IS NULL OR v_role IS DISTINCT FROM 'professional' THEN
    RAISE EXCEPTION 'Apenas profissionais podem registrar baixa de sessão';
  END IF;

  IF p_session_date IS NULL OR p_session_time IS NULL THEN
    RAISE EXCEPTION 'Informe data e horário';
  END IF;

  IF p_professional_id IS NULL THEN
    RAISE EXCEPTION 'Informe o profissional';
  END IF;

  IF p_application_route IS NULL OR p_application_route NOT IN ('IM', 'EV', 'Oral') THEN
    RAISE EXCEPTION 'Informe a via de aplicação (IM, EV ou Oral)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_professional_id
      AND tenant_id = v_tenant_id
      AND role = 'professional'
  ) THEN
    RAISE EXCEPTION 'Profissional inválido';
  END IF;

  SELECT psp.*
  INTO v_package
  FROM public.patient_session_packages psp
  WHERE psp.id = p_package_id
    AND psp.tenant_id = v_tenant_id
    AND psp.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote de sessões não encontrado ou já concluído';
  END IF;

  IF v_package.used_sessions + 1 > v_package.total_sessions THEN
    RAISE EXCEPTION 'Não há sessões restantes neste pacote';
  END IF;

  v_used_at := (p_session_date::text || ' ' || p_session_time::text)::timestamptz;

  UPDATE public.patient_session_packages
  SET
    used_sessions = used_sessions + 1,
    status = CASE
      WHEN used_sessions + 1 >= total_sessions THEN 'completed'
      ELSE 'active'
    END
  WHERE id = v_package.id;

  INSERT INTO public.session_usages (
    package_id,
    quantity,
    professional_id,
    used_at,
    session_date,
    session_time,
    product_batch,
    application_route
  ) VALUES (
    v_package.id,
    1,
    p_professional_id,
    v_used_at,
    p_session_date,
    p_session_time,
    NULLIF(trim(p_product_batch), ''),
    p_application_route
  );

  PERFORM public.deduct_service_inventory(
    v_tenant_id,
    v_package.service_id,
    1,
    v_package.patient_id,
    p_professional_id,
    NULL
  );

  RETURN jsonb_build_object(
    'package_id', v_package.id,
    'used_sessions', v_package.used_sessions + 1,
    'total_sessions', v_package.total_sessions,
    'status', CASE
      WHEN v_package.used_sessions + 1 >= v_package.total_sessions THEN 'completed'
      ELSE 'active'
    END
  );
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    patient_id uuid,
    professional_id uuid,
    room_id uuid,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    specialty text,
    status text DEFAULT 'scheduled'::text,
    type text DEFAULT 'consultation'::text,
    notes text,
    cancel_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text, 'rescheduled'::text]))),
    CONSTRAINT appointments_type_check CHECK ((type = ANY (ARRAY['consultation'::text, 'return'::text, 'procedure'::text, 'exam'::text])))
);


--
-- Name: bills_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills_payable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    description text NOT NULL,
    category text,
    supplier text,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    payment_method text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bills_payable_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: bills_receivable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills_receivable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid,
    professional_id uuid,
    appointment_id uuid,
    budget_id uuid,
    description text NOT NULL,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    payment_method text,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    receipt_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bills_receivable_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'pix'::text, 'credit_card'::text, 'debit_card'::text, 'health_insurance'::text, 'bank_transfer'::text, 'other'::text]))),
    CONSTRAINT bills_receivable_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: bills_receivable_receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bills_receivable_receipt_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bills_receivable_receipt_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bills_receivable_receipt_number_seq OWNED BY public.bills_receivable.receipt_number;


--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    service_id uuid,
    "position" integer DEFAULT 0 NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    total_price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid,
    professional_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    discount_value numeric(10,2) DEFAULT 0 NOT NULL,
    final_value numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    valid_until date,
    number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budgets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: budgets_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budgets_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: budgets_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budgets_number_seq OWNED BY public.budgets.number;


--
-- Name: commission_closings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_closings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    appointments_completed integer DEFAULT 0 NOT NULL,
    production_total numeric(12,2) DEFAULT 0 NOT NULL,
    received_total numeric(12,2) DEFAULT 0 NOT NULL,
    pending_total numeric(12,2) DEFAULT 0 NOT NULL,
    base_commission_pct numeric(5,2) DEFAULT 0 NOT NULL,
    adjusted_commission_pct numeric(5,2),
    commission_amount numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    closed_by uuid,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT commission_closings_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT commission_closings_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


--
-- Name: consultation_charge_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_charge_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    service_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    total_price numeric(10,2) DEFAULT 0 NOT NULL,
    item_type text NOT NULL,
    session_package_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consultation_charge_items_item_type_check CHECK ((item_type = ANY (ARRAY['charge'::text, 'session_sale'::text, 'session_use'::text]))),
    CONSTRAINT consultation_charge_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: consultation_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    appointment_id uuid,
    patient_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    room_id uuid,
    price_table text DEFAULT 'particular'::text NOT NULL,
    bill_receivable_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evolution_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evolution_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    evolution_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size_kb numeric(10,2) DEFAULT 0 NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6b7280'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    brand text,
    unit text DEFAULT 'un'::text NOT NULL,
    current_stock numeric(10,2) DEFAULT 0 NOT NULL,
    min_stock numeric(10,2) DEFAULT 0 NOT NULL,
    max_stock numeric(10,2),
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    sell_price numeric(10,2) DEFAULT 0 NOT NULL,
    sku text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    item_id uuid NOT NULL,
    professional_id uuid,
    type text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_cost numeric(10,2),
    reason text,
    notes text,
    patient_id uuid,
    date timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    appointment_id uuid,
    service_id uuid,
    CONSTRAINT inventory_movements_type_check CHECK ((type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'waste'::text])))
);


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid,
    appointment_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    chief_complaint text,
    history text,
    physical_exam text,
    diagnosis text,
    icd10_code text,
    icd10_description text,
    conduct text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: message_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    patient_id uuid,
    template_id uuid,
    channel text NOT NULL,
    content text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_by uuid,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    campaign_id text,
    CONSTRAINT message_logs_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'sms'::text, 'email'::text]))),
    CONSTRAINT message_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'failed'::text, 'pending'::text])))
);


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    channel text NOT NULL,
    trigger text NOT NULL,
    content text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_templates_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'sms'::text, 'email'::text]))),
    CONSTRAINT message_templates_trigger_check CHECK ((trigger = ANY (ARRAY['appointment_confirmation'::text, 'appointment_reminder'::text, 'post_appointment'::text, 'birthday'::text, 'custom'::text])))
);


--
-- Name: patient_evolutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_evolutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid,
    medical_record_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    evolution_text text NOT NULL,
    bp_systolic integer,
    bp_diastolic integer,
    heart_rate integer,
    temperature numeric(4,1),
    weight numeric(5,2),
    height numeric(5,2),
    spo2 integer,
    blood_glucose integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_media_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_media_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size_kb numeric(10,2) DEFAULT 0 NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_session_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_session_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    service_id uuid NOT NULL,
    professional_id uuid,
    total_sessions integer NOT NULL,
    used_sessions integer DEFAULT 0 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    price_table text DEFAULT 'particular'::text NOT NULL,
    bill_receivable_id uuid,
    consultation_charge_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_session_packages_check CHECK ((used_sessions <= total_sessions)),
    CONSTRAINT patient_session_packages_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT patient_session_packages_total_sessions_check CHECK ((total_sessions > 0)),
    CONSTRAINT patient_session_packages_used_sessions_check CHECK ((used_sessions >= 0))
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    full_name text NOT NULL,
    cpf text,
    birth_date date,
    gender text,
    phone text,
    email text,
    health_insurance text,
    health_insurance_number text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    rg text,
    blood_type text,
    allergies text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zip text,
    emergency_contact_name text,
    emergency_contact_phone text,
    notes text,
    how_did_you_find_us text,
    record_number integer
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    "position" integer NOT NULL,
    medication text NOT NULL,
    concentration text,
    pharmaceutical_form text,
    quantity text,
    dosage text,
    route text,
    frequency text,
    duration text,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    appointment_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_at timestamp with time zone,
    signature_cn text,
    CONSTRAINT prescriptions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finalized'::text]))),
    CONSTRAINT prescriptions_type_check CHECK ((type = ANY (ARRAY['simples'::text, 'controlada'::text, 'especial'::text, 'especial_2vias'::text])))
);


--
-- Name: professional_digital_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professional_digital_certificates (
    professional_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    provider text DEFAULT 'safeid'::text NOT NULL,
    certificate_cn text,
    certificate_cpf text,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    pfx_encrypted text,
    password_encrypted text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    signing_mode text DEFAULT 'a1_file'::text NOT NULL,
    cloud_cpf text,
    certificate_slot_alias text,
    cloud_provider text,
    cloud_slot_label text,
    safeid_access_token_encrypted text,
    safeid_token_expires_at timestamp with time zone,
    CONSTRAINT professional_digital_certificates_mode_data_check CHECK ((((signing_mode = 'a1_file'::text) AND (pfx_encrypted IS NOT NULL) AND (password_encrypted IS NOT NULL)) OR ((signing_mode = 'safeid_cloud'::text) AND (cloud_cpf IS NOT NULL) AND (certificate_slot_alias IS NOT NULL)))),
    CONSTRAINT professional_digital_certificates_signing_mode_check CHECK ((signing_mode = ANY (ARRAY['a1_file'::text, 'safeid_cloud'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    tenant_id uuid,
    full_name text NOT NULL,
    cpf text,
    crm text,
    specialty text,
    role text NOT NULL,
    avatar_url text,
    phone text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    commission_pct numeric(5,2) DEFAULT 0,
    appointment_types text[] DEFAULT ARRAY['consultation'::text, 'return'::text, 'procedure'::text, 'exam'::text],
    letterhead_path text,
    letterhead_margin_top_mm numeric(6,2) DEFAULT 45 NOT NULL,
    letterhead_margin_right_mm numeric(6,2) DEFAULT 20 NOT NULL,
    letterhead_margin_bottom_mm numeric(6,2) DEFAULT 25 NOT NULL,
    letterhead_margin_left_mm numeric(6,2) DEFAULT 20 NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'receptionist'::text, 'professional'::text, 'financial'::text])))
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name text NOT NULL,
    description text,
    color text DEFAULT '#0ea5e9'::text,
    active boolean DEFAULT true
);


--
-- Name: service_inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_inventory_items_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    default_price numeric(10,2) DEFAULT 0 NOT NULL,
    duration_minutes integer DEFAULT 30,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    professional_id uuid,
    session_count integer DEFAULT 1 NOT NULL,
    CONSTRAINT services_session_count_check CHECK ((session_count >= 1))
);


--
-- Name: COLUMN services.session_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.services.session_count IS 'Número de sessões por unidade vendida. Ex.: 10 = protocolo com 10 sessões.';


--
-- Name: session_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_id uuid NOT NULL,
    appointment_id uuid,
    consultation_charge_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    professional_id uuid,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    session_date date,
    session_time time without time zone,
    product_batch text,
    application_route text,
    CONSTRAINT session_usages_application_route_check CHECK (((application_route IS NULL) OR (application_route = ANY (ARRAY['IM'::text, 'EV'::text, 'Oral'::text])))),
    CONSTRAINT session_usages_quantity_check CHECK ((quantity > 0))
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    key text NOT NULL,
    value text
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#1a2b4a'::text,
    secondary_color text DEFAULT '#0ea5e9'::text,
    address text,
    phone text,
    cnpj text,
    email text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    trade_name text
);


--
-- Name: bills_receivable receipt_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable ALTER COLUMN receipt_number SET DEFAULT nextval('public.bills_receivable_receipt_number_seq'::regclass);


--
-- Name: budgets number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets ALTER COLUMN number SET DEFAULT nextval('public.budgets_number_seq'::regclass);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: bills_payable bills_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_payable
    ADD CONSTRAINT bills_payable_pkey PRIMARY KEY (id);


--
-- Name: bills_receivable bills_receivable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_pkey PRIMARY KEY (id);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: commission_closings commission_closings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_closings
    ADD CONSTRAINT commission_closings_pkey PRIMARY KEY (id);


--
-- Name: commission_closings commission_closings_tenant_id_professional_id_period_year_p_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_closings
    ADD CONSTRAINT commission_closings_tenant_id_professional_id_period_year_p_key UNIQUE (tenant_id, professional_id, period_year, period_month);


--
-- Name: consultation_charge_items consultation_charge_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charge_items
    ADD CONSTRAINT consultation_charge_items_pkey PRIMARY KEY (id);


--
-- Name: consultation_charges consultation_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_pkey PRIMARY KEY (id);


--
-- Name: evolution_attachments evolution_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_attachments
    ADD CONSTRAINT evolution_attachments_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: message_logs message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: patient_evolutions patient_evolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_evolutions
    ADD CONSTRAINT patient_evolutions_pkey PRIMARY KEY (id);


--
-- Name: patient_media_history patient_media_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_media_history
    ADD CONSTRAINT patient_media_history_pkey PRIMARY KEY (id);


--
-- Name: patient_session_packages patient_session_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: professional_digital_certificates professional_digital_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_digital_certificates
    ADD CONSTRAINT professional_digital_certificates_pkey PRIMARY KEY (professional_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: service_inventory_items service_inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_inventory_items
    ADD CONSTRAINT service_inventory_items_pkey PRIMARY KEY (id);


--
-- Name: service_inventory_items service_inventory_items_service_id_inventory_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_inventory_items
    ADD CONSTRAINT service_inventory_items_service_id_inventory_item_id_key UNIQUE (service_id, inventory_item_id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: session_usages session_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_usages
    ADD CONSTRAINT session_usages_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_tenant_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_key_key UNIQUE (tenant_id, key);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: appointments_prof_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_prof_date_idx ON public.appointments USING btree (professional_id, date);


--
-- Name: appointments_room_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_room_date_idx ON public.appointments USING btree (room_id, date);


--
-- Name: appointments_tenant_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_tenant_date_idx ON public.appointments USING btree (tenant_id, date);


--
-- Name: commission_closings_tenant_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX commission_closings_tenant_period_idx ON public.commission_closings USING btree (tenant_id, period_year, period_month);


--
-- Name: evolution_attachments_evolution_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX evolution_attachments_evolution_idx ON public.evolution_attachments USING btree (evolution_id);


--
-- Name: idx_bp_tenant_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bp_tenant_due ON public.bills_payable USING btree (tenant_id, due_date);


--
-- Name: idx_br_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_br_patient ON public.bills_receivable USING btree (patient_id);


--
-- Name: idx_br_tenant_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_br_tenant_due ON public.bills_receivable USING btree (tenant_id, due_date);


--
-- Name: idx_budget_items; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_items ON public.budget_items USING btree (budget_id, "position");


--
-- Name: idx_budgets_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_tenant_date ON public.budgets USING btree (tenant_id, date DESC);


--
-- Name: idx_consultation_charges_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultation_charges_patient ON public.consultation_charges USING btree (patient_id, created_at DESC);


--
-- Name: idx_inv_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_items_category ON public.inventory_items USING btree (category_id);


--
-- Name: idx_inv_items_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_items_tenant ON public.inventory_items USING btree (tenant_id);


--
-- Name: idx_inv_mov_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_date ON public.inventory_movements USING btree (date DESC);


--
-- Name: idx_inv_mov_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_item ON public.inventory_movements USING btree (item_id);


--
-- Name: idx_inv_mov_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_tenant ON public.inventory_movements USING btree (tenant_id);


--
-- Name: idx_message_templates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_templates_tenant ON public.message_templates USING btree (tenant_id);


--
-- Name: idx_prescription_items_rx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_items_rx ON public.prescription_items USING btree (prescription_id, "position");


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id, date DESC);


--
-- Name: idx_prescriptions_professional; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_professional ON public.prescriptions USING btree (professional_id, date DESC);


--
-- Name: idx_service_inventory_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_inventory_service ON public.service_inventory_items USING btree (service_id);


--
-- Name: idx_services_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_tenant ON public.services USING btree (tenant_id, active);


--
-- Name: idx_session_packages_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_packages_patient ON public.patient_session_packages USING btree (patient_id, status);


--
-- Name: idx_session_packages_professional; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_packages_professional ON public.patient_session_packages USING btree (professional_id, status);


--
-- Name: message_logs_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_logs_patient_idx ON public.message_logs USING btree (patient_id);


--
-- Name: message_logs_sent_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_logs_sent_at_idx ON public.message_logs USING btree (sent_at DESC);


--
-- Name: message_logs_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX message_logs_tenant_idx ON public.message_logs USING btree (tenant_id);


--
-- Name: patient_media_history_patient_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_media_history_patient_idx ON public.patient_media_history USING btree (patient_id, created_at DESC);


--
-- Name: patients_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patients_tenant_idx ON public.patients USING btree (tenant_id);


--
-- Name: patients_tenant_record_number_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX patients_tenant_record_number_uidx ON public.patients USING btree (tenant_id, record_number) WHERE (record_number IS NOT NULL);


--
-- Name: profiles_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX profiles_tenant_idx ON public.profiles USING btree (tenant_id);


--
-- Name: rooms_tenant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rooms_tenant_idx ON public.rooms USING btree (tenant_id);


--
-- Name: services_professional_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_professional_idx ON public.services USING btree (professional_id);


--
-- Name: bills_payable bills_payable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bills_payable_updated_at BEFORE UPDATE ON public.bills_payable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bills_receivable bills_receivable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bills_receivable_updated_at BEFORE UPDATE ON public.bills_receivable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: budgets budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: commission_closings commission_closings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER commission_closings_updated_at BEFORE UPDATE ON public.commission_closings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: medical_records medical_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: message_templates message_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER message_templates_updated_at BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: patient_evolutions patient_evolutions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patient_evolutions_updated_at BEFORE UPDATE ON public.patient_evolutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prescriptions prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: services services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: patients trg_assign_patient_record_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assign_patient_record_number BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.assign_patient_record_number();


--
-- Name: inventory_categories trg_inv_cats_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_cats_updated BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_items trg_inv_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_items_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bills_payable bills_payable_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_payable
    ADD CONSTRAINT bills_payable_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: bills_receivable bills_receivable_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: bills_receivable bills_receivable_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;


--
-- Name: bills_receivable bills_receivable_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: bills_receivable bills_receivable_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bills_receivable bills_receivable_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_receivable
    ADD CONSTRAINT bills_receivable_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: commission_closings commission_closings_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_closings
    ADD CONSTRAINT commission_closings_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: commission_closings commission_closings_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_closings
    ADD CONSTRAINT commission_closings_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: commission_closings commission_closings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_closings
    ADD CONSTRAINT commission_closings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: consultation_charge_items consultation_charge_items_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charge_items
    ADD CONSTRAINT consultation_charge_items_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES public.consultation_charges(id) ON DELETE CASCADE;


--
-- Name: consultation_charge_items consultation_charge_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charge_items
    ADD CONSTRAINT consultation_charge_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: consultation_charge_items consultation_charge_items_session_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charge_items
    ADD CONSTRAINT consultation_charge_items_session_package_id_fkey FOREIGN KEY (session_package_id) REFERENCES public.patient_session_packages(id) ON DELETE SET NULL;


--
-- Name: consultation_charges consultation_charges_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: consultation_charges consultation_charges_bill_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_bill_receivable_id_fkey FOREIGN KEY (bill_receivable_id) REFERENCES public.bills_receivable(id) ON DELETE SET NULL;


--
-- Name: consultation_charges consultation_charges_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultation_charges consultation_charges_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: consultation_charges consultation_charges_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;


--
-- Name: consultation_charges consultation_charges_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_charges
    ADD CONSTRAINT consultation_charges_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: evolution_attachments evolution_attachments_evolution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_attachments
    ADD CONSTRAINT evolution_attachments_evolution_id_fkey FOREIGN KEY (evolution_id) REFERENCES public.patient_evolutions(id) ON DELETE CASCADE;


--
-- Name: evolution_attachments evolution_attachments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_attachments
    ADD CONSTRAINT evolution_attachments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: evolution_attachments evolution_attachments_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_attachments
    ADD CONSTRAINT evolution_attachments_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: evolution_attachments evolution_attachments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_attachments
    ADD CONSTRAINT evolution_attachments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_categories inventory_categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: inventory_movements inventory_movements_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: inventory_movements inventory_movements_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id);


--
-- Name: inventory_movements inventory_movements_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: medical_records medical_records_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_records medical_records_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: medical_records medical_records_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: message_logs message_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id) ON DELETE SET NULL;


--
-- Name: message_logs message_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: message_templates message_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patient_evolutions patient_evolutions_medical_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_evolutions
    ADD CONSTRAINT patient_evolutions_medical_record_id_fkey FOREIGN KEY (medical_record_id) REFERENCES public.medical_records(id) ON DELETE SET NULL;


--
-- Name: patient_evolutions patient_evolutions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_evolutions
    ADD CONSTRAINT patient_evolutions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_evolutions patient_evolutions_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_evolutions
    ADD CONSTRAINT patient_evolutions_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: patient_evolutions patient_evolutions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_evolutions
    ADD CONSTRAINT patient_evolutions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patient_media_history patient_media_history_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_media_history
    ADD CONSTRAINT patient_media_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_media_history patient_media_history_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_media_history
    ADD CONSTRAINT patient_media_history_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: patient_media_history patient_media_history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_media_history
    ADD CONSTRAINT patient_media_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patient_session_packages patient_session_packages_bill_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_bill_receivable_id_fkey FOREIGN KEY (bill_receivable_id) REFERENCES public.bills_receivable(id) ON DELETE SET NULL;


--
-- Name: patient_session_packages patient_session_packages_consultation_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_consultation_charge_id_fkey FOREIGN KEY (consultation_charge_id) REFERENCES public.consultation_charges(id) ON DELETE SET NULL;


--
-- Name: patient_session_packages patient_session_packages_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_session_packages patient_session_packages_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: patient_session_packages patient_session_packages_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: patient_session_packages patient_session_packages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_session_packages
    ADD CONSTRAINT patient_session_packages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patients patients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: professional_digital_certificates professional_digital_certificates_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_digital_certificates
    ADD CONSTRAINT professional_digital_certificates_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: professional_digital_certificates professional_digital_certificates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_digital_certificates
    ADD CONSTRAINT professional_digital_certificates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: rooms rooms_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: service_inventory_items service_inventory_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_inventory_items
    ADD CONSTRAINT service_inventory_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: service_inventory_items service_inventory_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_inventory_items
    ADD CONSTRAINT service_inventory_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: services services_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: session_usages session_usages_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_usages
    ADD CONSTRAINT session_usages_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: session_usages session_usages_consultation_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_usages
    ADD CONSTRAINT session_usages_consultation_charge_id_fkey FOREIGN KEY (consultation_charge_id) REFERENCES public.consultation_charges(id) ON DELETE SET NULL;


--
-- Name: session_usages session_usages_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_usages
    ADD CONSTRAINT session_usages_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.patient_session_packages(id) ON DELETE CASCADE;


--
-- Name: session_usages session_usages_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_usages
    ADD CONSTRAINT session_usages_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tenant_settings tenant_settings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments appointments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_delete ON public.appointments FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: appointments appointments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: appointments appointments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_select ON public.appointments FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (professional_id = auth.uid()))));


--
-- Name: appointments appointments_update_ops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_update_ops ON public.appointments FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff())) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: appointments appointments_update_professional; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appointments_update_professional ON public.appointments FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid()))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid())));


--
-- Name: bills_payable; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bills_payable ENABLE ROW LEVEL SECURITY;

--
-- Name: bills_payable bills_payable_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bills_payable_staff ON public.bills_payable TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_financial_staff())) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_financial_staff()));


--
-- Name: bills_receivable; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bills_receivable ENABLE ROW LEVEL SECURITY;

--
-- Name: bills_receivable bills_receivable_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bills_receivable_select ON public.bills_receivable FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR ((public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid())))));


--
-- Name: bills_receivable bills_receivable_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bills_receivable_write_staff ON public.bills_receivable TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_financial_staff())) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_financial_staff()));


--
-- Name: budget_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_items budget_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_items_select ON public.budget_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.budgets b
  WHERE ((b.id = budget_items.budget_id) AND (b.tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (b.professional_id = auth.uid()))))));


--
-- Name: budget_items budget_items_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_items_write_staff ON public.budget_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.budgets b
  WHERE ((b.id = budget_items.budget_id) AND (b.tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.budgets b
  WHERE ((b.id = budget_items.budget_id) AND (b.tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()))));


--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets budgets_delete_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_delete_staff ON public.budgets FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: budgets budgets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_select ON public.budgets FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (professional_id = auth.uid()))));


--
-- Name: budgets budgets_update_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_update_staff ON public.budgets FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff())) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: budgets budgets_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_write_staff ON public.budgets FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: commission_closings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_closings ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_closings commission_closings_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY commission_closings_admin_write ON public.commission_closings TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'admin'::text))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'admin'::text)));


--
-- Name: commission_closings commission_closings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY commission_closings_select ON public.commission_closings FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND ((public.get_my_role() = 'admin'::text) OR public.is_financial_staff() OR ((professional_id = auth.uid()) AND (status = 'closed'::text)))));


--
-- Name: consultation_charge_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_charge_items ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_charge_items consultation_charge_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultation_charge_items_select ON public.consultation_charge_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultation_charges c
  WHERE ((c.id = consultation_charge_items.charge_id) AND (c.tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR (c.professional_id = auth.uid()))))));


--
-- Name: consultation_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_charges ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_charges consultation_charges_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultation_charges_select ON public.consultation_charges FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR (professional_id = auth.uid()))));


--
-- Name: evolution_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evolution_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: evolution_attachments evolution_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolution_attachments_delete ON public.evolution_attachments FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: evolution_attachments evolution_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolution_attachments_insert ON public.evolution_attachments FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: evolution_attachments evolution_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolution_attachments_select ON public.evolution_attachments FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (professional_id = auth.uid()) OR ((public.get_my_role() = 'professional'::text) AND public.professional_has_patient(patient_id)))));


--
-- Name: patient_evolutions evolutions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolutions_delete_own ON public.patient_evolutions FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: patient_evolutions evolutions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolutions_insert_own ON public.patient_evolutions FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: patient_evolutions evolutions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolutions_select ON public.patient_evolutions FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (professional_id = auth.uid()) OR ((public.get_my_role() = 'professional'::text) AND public.professional_has_patient(patient_id)))));


--
-- Name: patient_evolutions evolutions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evolutions_update_own ON public.patient_evolutions FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid()))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: inventory_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

--
-- Name: medical_records medical_records_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medical_records_delete_own ON public.medical_records FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: medical_records medical_records_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medical_records_insert_own ON public.medical_records FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: medical_records medical_records_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medical_records_select_own ON public.medical_records FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: medical_records medical_records_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medical_records_update_own ON public.medical_records FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid()))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: message_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: message_logs message_logs_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_logs_all ON public.message_logs USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: message_templates message_templates_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY message_templates_all ON public.message_templates TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: patient_evolutions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_evolutions ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_media_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_media_history ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_media_history patient_media_history_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_media_history_delete ON public.patient_media_history FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: patient_media_history patient_media_history_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_media_history_insert ON public.patient_media_history FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: patient_media_history patient_media_history_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_media_history_select ON public.patient_media_history FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR (professional_id = auth.uid()) OR ((public.get_my_role() = 'professional'::text) AND public.professional_has_patient(patient_id)))));


--
-- Name: patient_session_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_session_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: patients patients_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_delete ON public.patients FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'admin'::text)));


--
-- Name: patients patients_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_insert ON public.patients FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: patients patients_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_select ON public.patients FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR ((public.get_my_role() = 'professional'::text) AND public.professional_has_patient(id)))));


--
-- Name: patients patients_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_update ON public.patients FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff())) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND public.is_ops_staff()));


--
-- Name: prescription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions prescriptions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_delete_own ON public.prescriptions FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: prescriptions prescriptions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_insert_own ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: prescriptions prescriptions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_select_own ON public.prescriptions FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: prescriptions prescriptions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_update_own ON public.prescriptions FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid()))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (professional_id = auth.uid())));


--
-- Name: professional_digital_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.professional_digital_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_delete ON public.profiles FOR DELETE TO authenticated USING (((tenant_id = private.get_my_tenant_id()) AND (private.get_my_role() = 'admin'::text)));


--
-- Name: profiles profiles_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (((tenant_id = private.get_my_tenant_id()) AND (private.get_my_role() = 'admin'::text)));


--
-- Name: profiles profiles_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated USING (((tenant_id = private.get_my_tenant_id()) AND (private.get_my_role() = 'admin'::text))) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: profiles profiles_professional_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_professional_self_update ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) AND (role = 'professional'::text))) WITH CHECK (((id = auth.uid()) AND (role = 'professional'::text)));


--
-- Name: profiles profiles_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_tenant ON public.profiles FOR SELECT TO authenticated USING ((tenant_id = private.get_my_tenant_id()));


--
-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: rooms rooms_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_delete ON public.rooms FOR DELETE TO authenticated USING ((tenant_id = private.get_my_tenant_id()));


--
-- Name: rooms rooms_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: rooms rooms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated USING ((tenant_id = private.get_my_tenant_id()));


--
-- Name: rooms rooms_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: prescription_items rx_items_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_items_delete_own ON public.prescription_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.prescriptions p
  WHERE ((p.id = prescription_items.prescription_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (p.professional_id = auth.uid())))));


--
-- Name: prescription_items rx_items_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_items_insert_own ON public.prescription_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.prescriptions p
  WHERE ((p.id = prescription_items.prescription_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (p.professional_id = auth.uid())))));


--
-- Name: prescription_items rx_items_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_items_select_own ON public.prescription_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.prescriptions p
  WHERE ((p.id = prescription_items.prescription_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (p.professional_id = auth.uid())))));


--
-- Name: prescription_items rx_items_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_items_update_own ON public.prescription_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.prescriptions p
  WHERE ((p.id = prescription_items.prescription_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (p.professional_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.prescriptions p
  WHERE ((p.id = prescription_items.prescription_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (p.professional_id = auth.uid())))));


--
-- Name: service_inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: service_inventory_items service_inventory_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_inventory_select ON public.service_inventory_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.services s
  WHERE ((s.id = service_inventory_items.service_id) AND (s.tenant_id = public.get_my_tenant_id())))));


--
-- Name: service_inventory_items service_inventory_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_inventory_write ON public.service_inventory_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.services s
  WHERE ((s.id = service_inventory_items.service_id) AND (s.tenant_id = public.get_my_tenant_id()) AND ((public.get_my_role() = 'admin'::text) OR ((public.get_my_role() = 'professional'::text) AND (s.professional_id = auth.uid()))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.services s
  WHERE ((s.id = service_inventory_items.service_id) AND (s.tenant_id = public.get_my_tenant_id()) AND ((public.get_my_role() = 'admin'::text) OR ((public.get_my_role() = 'professional'::text) AND (s.professional_id = auth.uid())))))));


--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: services services_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_admin_write ON public.services TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'admin'::text))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'admin'::text)));


--
-- Name: services services_professional_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_professional_delete ON public.services FOR DELETE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid())));


--
-- Name: services services_professional_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_professional_update ON public.services FOR UPDATE TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid()))) WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid())));


--
-- Name: services services_professional_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_professional_write ON public.services FOR INSERT TO authenticated WITH CHECK (((tenant_id = public.get_my_tenant_id()) AND (public.get_my_role() = 'professional'::text) AND (professional_id = auth.uid())));


--
-- Name: services services_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_select ON public.services FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_ops_staff() OR public.is_financial_staff() OR (professional_id IS NULL) OR (professional_id = auth.uid()))));


--
-- Name: services services_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_select_tenant ON public.services FOR SELECT TO authenticated USING ((tenant_id = public.get_my_tenant_id()));


--
-- Name: patient_session_packages session_packages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_packages_select ON public.patient_session_packages FOR SELECT TO authenticated USING (((tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR public.is_ops_staff() OR (professional_id = auth.uid()) OR public.professional_has_patient(patient_id))));


--
-- Name: session_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: session_usages session_usages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_usages_select ON public.session_usages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.patient_session_packages p
  WHERE ((p.id = session_usages.package_id) AND (p.tenant_id = public.get_my_tenant_id()) AND (public.is_financial_staff() OR public.is_ops_staff() OR (p.professional_id = auth.uid()) OR public.professional_has_patient(p.patient_id))))));


--
-- Name: inventory_categories tenant_isolation_inv_cats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_inv_cats ON public.inventory_categories TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: inventory_items tenant_isolation_inv_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_inv_items ON public.inventory_items TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: inventory_movements tenant_isolation_inv_mov; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation_inv_mov ON public.inventory_movements TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: tenant_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_settings tenant_settings_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_settings_all ON public.tenant_settings TO authenticated USING ((tenant_id = private.get_my_tenant_id())) WITH CHECK ((tenant_id = private.get_my_tenant_id()));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_admin_update ON public.tenants FOR UPDATE TO authenticated USING (((id = private.get_my_tenant_id()) AND (private.get_my_role() = 'admin'::text))) WITH CHECK ((id = private.get_my_tenant_id()));


--
-- Name: tenants tenants_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_select_own ON public.tenants FOR SELECT TO authenticated USING ((id = private.get_my_tenant_id()));


--
-- PostgreSQL database dump complete
--



