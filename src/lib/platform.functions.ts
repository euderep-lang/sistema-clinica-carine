/**
 * Server functions: pré-cadastro, NPS, LGPD, exames, IA clínica.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditSafe } from "@/lib/audit.server";

async function requireProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, tenant_id, role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.tenant_id) throw new Error("Perfil não encontrado");
  return data as { id: string; tenant_id: string; role: string; full_name: string };
}

// --- Pré-cadastro ---

export const createPreRegistrationLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { appointmentId?: string; patientId?: string; expiresInDays?: number }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireProfile(context.userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays ?? 7));
    const { data: row, error } = await supabaseAdmin
      .from("patient_pre_registrations" as never)
      .insert({
        tenant_id: profile.tenant_id,
        appointment_id: data.appointmentId ?? null,
        patient_id: data.patientId ?? null,
        expires_at: expiresAt.toISOString(),
        created_by: profile.id,
      } as never)
      .select("id, token")
      .single();
    if (error) throw new Error(error.message);
    const token = (row as { token: string }).token;
    return { token, url: `/pre-cadastro/${token}` };
  });

export const getPreRegistrationByToken = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const { data, error } = await supabaseAdmin
      .from("patient_pre_registrations" as never)
      .select("id, token, full_name, email, phone, birth_date, cpf, health_notes, status, expires_at, tenants(name)")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) throw new Error("Link inválido ou expirado");
    const row = data as {
      status: string;
      expires_at: string | null;
      tenants: { name: string } | null;
    };
    if (row.status === "merged" || row.status === "expired") throw new Error("Este link não está mais disponível");
    if (row.expires_at && new Date(row.expires_at) < new Date()) throw new Error("Link expirado");
    return data;
  });

export const submitPreRegistration = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      full_name: string;
      email?: string;
      phone: string;
      birth_date?: string;
      cpf?: string;
      health_notes?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { data: reg, error: fetchErr } = await supabaseAdmin
      .from("patient_pre_registrations" as never)
      .select("id, tenant_id, patient_id, appointment_id, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (fetchErr || !reg) throw new Error("Link inválido");
    const r = reg as {
      id: string;
      tenant_id: string;
      patient_id: string | null;
      appointment_id: string | null;
      status: string;
      expires_at: string | null;
    };
    if (r.status !== "pending" && r.status !== "submitted") throw new Error("Formulário já processado");
    if (r.expires_at && new Date(r.expires_at) < new Date()) throw new Error("Link expirado");

    let patientId = r.patient_id;
    if (!patientId) {
      const { data: patient, error: pErr } = await supabaseAdmin
        .from("patients")
        .insert({
          tenant_id: r.tenant_id,
          full_name: data.full_name.trim(),
          email: data.email?.trim() || null,
          phone: data.phone.trim(),
          birth_date: data.birth_date || null,
          cpf: data.cpf?.replace(/\D/g, "") || null,
          active: true,
        })
        .select("id")
        .single();
      if (pErr) throw new Error(pErr.message);
      patientId = (patient as { id: string }).id;
    } else {
      await supabaseAdmin
        .from("patients")
        .update({
          full_name: data.full_name.trim(),
          email: data.email?.trim() || null,
          phone: data.phone.trim(),
          birth_date: data.birth_date || null,
          cpf: data.cpf?.replace(/\D/g, "") || null,
        })
        .eq("id", patientId);
    }

    if (r.appointment_id && patientId) {
      await supabaseAdmin.from("appointments").update({ patient_id: patientId }).eq("id", r.appointment_id);
    }

    await supabaseAdmin
      .from("patient_pre_registrations" as never)
      .update({
        full_name: data.full_name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone.trim(),
        birth_date: data.birth_date || null,
        cpf: data.cpf?.replace(/\D/g, "") || null,
        health_notes: data.health_notes?.trim() || null,
        patient_id: patientId,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      } as never)
      .eq("id", r.id);

    return { ok: true, patientId };
  });

// --- NPS ---

export const createNpsSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { patientId: string; appointmentId?: string; professionalId?: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireProfile(context.userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    const { data: row, error } = await supabaseAdmin
      .from("nps_surveys" as never)
      .insert({
        tenant_id: profile.tenant_id,
        patient_id: data.patientId,
        appointment_id: data.appointmentId ?? null,
        professional_id: data.professionalId ?? null,
        expires_at: expiresAt.toISOString(),
      } as never)
      .select("token")
      .single();
    if (error) throw new Error(error.message);
    return { token: (row as { token: string }).token, url: `/nps/${(row as { token: string }).token}` };
  });

export const submitNpsResponse = createServerFn({ method: "POST" })
  .validator((d: { token: string; score: number; feedback?: string }) => d)
  .handler(async ({ data }) => {
    if (data.score < 0 || data.score > 10) throw new Error("Nota inválida");
    const { data: survey, error } = await supabaseAdmin
      .from("nps_surveys" as never)
      .select("id, tenant_id, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error || !survey) throw new Error("Pesquisa não encontrada");
    const s = survey as { id: string; tenant_id: string; status: string; expires_at: string | null };
    if (s.status === "answered") throw new Error("Pesquisa já respondida");
    if (s.expires_at && new Date(s.expires_at) < new Date()) throw new Error("Pesquisa expirada");

    const { error: insErr } = await supabaseAdmin.from("nps_responses" as never).insert({
      tenant_id: s.tenant_id,
      survey_id: s.id,
      score: data.score,
      feedback: data.feedback?.trim() || null,
    } as never);
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("nps_surveys" as never)
      .update({ status: "answered" } as never)
      .eq("id", s.id);

    return { ok: true };
  });

// --- Exames ---

export const createExamRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      patientId: string;
      exams: string[];
      clinicalIndication?: string;
      appointmentId?: string;
      evolutionId?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfile(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("exam_requests" as never)
      .insert({
        tenant_id: profile.tenant_id,
        patient_id: data.patientId,
        professional_id: profile.id,
        exams: data.exams,
        clinical_indication: data.clinicalIndication ?? null,
        appointment_id: data.appointmentId ?? null,
        evolution_id: data.evolutionId ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    logAuditSafe({
      tenantId: profile.tenant_id,
      category: "clinical",
      action: "exam.request_created",
      summary: `Solicitação de exames: ${data.exams.join(", ")}`,
      entityType: "patient",
      entityId: data.patientId,
      userId: profile.id,
      source: "ui",
    });
    return { id: (row as { id: string }).id };
  });

// --- LGPD ---

export const requestPatientDataExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((patientId: string) => patientId)
  .handler(async ({ data: patientId, context }) => {
    const profile = await requireProfile(context.userId);
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!patient) throw new Error("Paciente não encontrado");

    const [{ data: evolutions }, { data: appointments }, { data: consents }] = await Promise.all([
      supabaseAdmin.from("patient_evolutions").select("*").eq("patient_id", patientId),
      supabaseAdmin.from("appointments").select("*").eq("patient_id", patientId),
      supabaseAdmin.from("patient_consents" as never).select("*").eq("patient_id", patientId),
    ]);

    await supabaseAdmin.from("patient_data_requests" as never).insert({
      tenant_id: profile.tenant_id,
      patient_id: patientId,
      request_type: "export",
      status: "completed",
      requested_by: profile.id,
      processed_by: profile.id,
      completed_at: new Date().toISOString(),
    } as never);

    return {
      exportedAt: new Date().toISOString(),
      patient,
      evolutions: evolutions ?? [],
      appointments: appointments ?? [],
      consents: consents ?? [],
    };
  });

export const recordPatientConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { patientId: string; consentType: string; granted: boolean; documentVersion?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfile(context.userId);
    const { error } = await supabaseAdmin.from("patient_consents" as never).upsert(
      {
        tenant_id: profile.tenant_id,
        patient_id: data.patientId,
        consent_type: data.consentType,
        granted: data.granted,
        document_version: data.documentVersion ?? "1.0",
        granted_at: data.granted ? new Date().toISOString() : null,
        revoked_at: data.granted ? null : new Date().toISOString(),
      } as never,
      { onConflict: "patient_id,consent_type,document_version" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- IA clínica ---

export const summarizePatientRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((patientId: string) => patientId)
  .handler(async ({ data: patientId, context }) => {
    const profile = await requireProfile(context.userId);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const { data: evolutions } = await supabaseAdmin
      .from("patient_evolutions")
      .select("created_at, subjective, objective, assessment, plan, physical_exam")
      .eq("patient_id", patientId)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const notes = (evolutions ?? [])
      .map(
        (e, i) =>
          `#${i + 1} ${(e as { created_at: string }).created_at.slice(0, 10)}\nS: ${(e as { subjective?: string }).subjective ?? ""}\nO: ${(e as { objective?: string }).objective ?? ""}\nA: ${(e as { assessment?: string }).assessment ?? ""}\nP: ${(e as { plan?: string }).plan ?? ""}`,
      )
      .join("\n\n");

    if (!apiKey) {
      const last = (evolutions ?? [])[0] as { assessment?: string; plan?: string } | undefined;
      return {
        summary: last
          ? `Última avaliação: ${last.assessment ?? "—"}. Plano: ${last.plan ?? "—"}. (${(evolutions ?? []).length} evoluções no prontuário.)`
          : "Nenhuma evolução registrada. Configure OPENAI_API_KEY para resumo completo por IA.",
        source: "local" as const,
      };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é assistente clínico. Resuma o prontuário em português (máx. 400 palavras): queixas, diagnósticos, condutas e evolução. Não invente dados.",
          },
          { role: "user", content: notes.slice(0, 12000) },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(`IA indisponível (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      summary: json.choices?.[0]?.message?.content?.trim() ?? "Resumo indisponível.",
      source: "openai" as const,
    };
  });

export const interpretExamText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { text: string; patientContext?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        interpretation:
          "Interpretação por IA requer OPENAI_API_KEY no servidor. Cole os valores do laudo e revise manualmente com o profissional responsável.",
        source: "local" as const,
      };
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Interprete exames laboratoriais em linguagem acessível para o médico. Destaque alterações, possíveis causas e sugestões de conduta. Aviso: apoio à decisão, não substitui julgamento clínico.",
          },
          {
            role: "user",
            content: `${data.patientContext ? `Contexto: ${data.patientContext}\n\n` : ""}${data.text.slice(0, 8000)}`,
          },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) throw new Error(`IA indisponível (${res.status})`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return {
      interpretation: json.choices?.[0]?.message?.content?.trim() ?? "",
      source: "openai" as const,
    };
  });

// --- Compartilhamento prontuário ---

export const shareClinicalRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      patientId: string;
      sharedWithProfessionalId: string;
      shareEvolutions?: boolean;
      shareExams?: boolean;
      expiresInDays?: number;
      note?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const profile = await requireProfile(context.userId);
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 86400000).toISOString()
      : null;
    const { error } = await supabaseAdmin.from("clinical_record_shares" as never).upsert(
      {
        tenant_id: profile.tenant_id,
        patient_id: data.patientId,
        owner_professional_id: profile.id,
        shared_with_professional_id: data.sharedWithProfessionalId,
        share_evolutions: data.shareEvolutions ?? true,
        share_exams: data.shareExams ?? true,
        expires_at: expiresAt,
        note: data.note ?? null,
        created_by: profile.id,
      } as never,
      { onConflict: "patient_id,owner_professional_id,shared_with_professional_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
