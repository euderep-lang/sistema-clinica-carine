import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AiProfessionalProfile {
  id: string;
  tenantId: string;
  fullName: string;
  displayName: string;
  profession: string | null;
  council: string | null;
  specialties: string[];
  aiBudgetInstructions: string | null;
  aiMealPlanInstructions: string | null;
}

function fmtMoney(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function loadAiProfessional(userId: string): Promise<AiProfessionalProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, tenant_id, full_name, display_name, profession, crm, specialties, ai_budget_instructions, ai_meal_plan_instructions",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.tenant_id) return null;
  const row = data as {
    id: string;
    tenant_id: string;
    full_name: string;
    display_name: string | null;
    profession: string | null;
    crm: string | null;
    specialties: string[] | null;
    ai_budget_instructions: string | null;
    ai_meal_plan_instructions: string | null;
  };
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fullName: row.full_name,
    displayName: row.display_name?.trim() || row.full_name,
    profession: row.profession,
    council: row.crm,
    specialties: row.specialties ?? [],
    aiBudgetInstructions: row.ai_budget_instructions,
    aiMealPlanInstructions: row.ai_meal_plan_instructions,
  };
}

async function buildPatientContext(
  tenantId: string,
  professionalId: string,
  patientId: string,
): Promise<string> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select(
      "id, full_name, birth_date, gender, allergies, notes, health_insurance, cpf, phone, record_number",
    )
    .eq("id", patientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!patient) return "";

  const lines: string[] = [
    "PACIENTE EM ATENDIMENTO:",
    `- Nome: ${patient.full_name}`,
  ];
  if (patient.birth_date) lines.push(`- Nascimento: ${patient.birth_date}`);
  if (patient.gender) lines.push(`- Sexo: ${patient.gender}`);
  if (patient.allergies) lines.push(`- Alergias: ${patient.allergies}`);
  if (patient.health_insurance) lines.push(`- Convênio: ${patient.health_insurance}`);
  if (patient.notes) lines.push(`- Observações: ${truncate(patient.notes, 500)}`);
  if (patient.record_number) lines.push(`- Prontuário nº ${patient.record_number}`);

  const [{ data: evos }, { data: budgets }, { data: plans }] = await Promise.all([
    supabaseAdmin
      .from("patient_evolutions")
      .select("date, evolution_text")
      .eq("patient_id", patientId)
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("budgets")
      .select("number, final_value, status, notes, date")
      .eq("patient_id", patientId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("meal_plans" as never)
      .select("patient_name, objetivo, peso_kg, created_at")
      .eq("patient_id", patientId)
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (evos?.length) {
    lines.push("", "Últimas evoluções clínicas:");
    for (const e of evos) {
      lines.push(
        `- ${e.date}: ${truncate(String(e.evolution_text ?? "").replace(/<[^>]+>/g, " "), 280)}`,
      );
    }
  }
  if (budgets?.length) {
    lines.push("", "Orçamentos anteriores:");
    for (const b of budgets) {
      lines.push(
        `- #${b.number} ${b.notes ? truncate(b.notes, 60) : ""} | R$ ${fmtMoney(Number(b.final_value ?? 0))} | ${b.status}`,
      );
    }
  }
  if (plans?.length) {
    lines.push("", "Planos terapêuticos anteriores:");
    for (const p of plans) {
      lines.push(
        `- ${p.patient_name} | ${p.objetivo ?? "—"} | ${p.peso_kg ? `${p.peso_kg} kg` : "—"}`,
      );
    }
  }

  return lines.join("\n");
}

/** Snapshot do sistema para a IA (catálogo, pacientes, formas de pagamento, etc.). */
export async function buildAiSystemContext(
  prof: AiProfessionalProfile,
  opts?: { patientId?: string | null },
): Promise<string> {
  const tenantId = prof.tenantId;
  const professionalId = prof.id;

  const [
    { data: tenant },
    { data: svcs },
    { data: inv },
    { data: payments },
    { data: patients },
    { data: budgetsRecent },
    { data: plansRecent },
  ] = await Promise.all([
    supabaseAdmin.from("tenants").select("name, phone, email, address").eq("id", tenantId).maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("name, category, default_price, cost_price, session_count, description")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .or(`professional_id.eq.${professionalId},professional_id.is.null`)
      .order("name")
      .limit(400),
    supabaseAdmin
      .from("inventory_items")
      .select("name, description, sell_price, cost_price, unit, category")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name")
      .limit(400),
    supabaseAdmin
      .from("payment_method_configs")
      .select("method, label, active, supports_installments, max_installments")
      .eq("tenant_id", tenantId)
      .eq("active", true),
    supabaseAdmin
      .from("patients")
      .select("full_name, allergies, health_insurance, active")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("full_name")
      .limit(200),
    supabaseAdmin
      .from("budgets")
      .select("number, final_value, status, notes, date")
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabaseAdmin
      .from("meal_plans" as never)
      .select("patient_name, objetivo, peso_kg, created_at")
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const sections: string[] = [];

  sections.push(
    "PROFISSIONAL:",
    `- Nome: ${prof.displayName}`,
    prof.profession ? `- Profissão: ${prof.profession}` : "",
    prof.council ? `- Conselho: ${prof.council}` : "",
    prof.specialties.length ? `- Especialidades: ${prof.specialties.join(", ")}` : "",
    tenant?.name ? `- Clínica: ${tenant.name}` : "",
    tenant?.phone ? `- Telefone clínica: ${tenant.phone}` : "",
  );

  sections.push("", "PROCEDIMENTOS E SERVIÇOS (preços de venda):");
  if (svcs?.length) {
    for (const s of svcs) {
      const price = fmtMoney(Number(s.default_price ?? 0));
      const cost = fmtMoney(Number(s.cost_price ?? 0));
      const cat = s.category ? ` [${s.category}]` : "";
      const sess = Number(s.session_count ?? 1) > 1 ? ` | ${s.session_count} sessões` : "";
      const desc = s.description ? ` — ${truncate(s.description, 80)}` : "";
      sections.push(`- ${s.name}${cat} | venda R$ ${price} | custo R$ ${cost}${sess}${desc}`);
    }
  } else {
    sections.push("(nenhum procedimento cadastrado)");
  }

  sections.push("", "ESTOQUE / INSUMOS / MEDICAMENTOS (preços de venda):");
  if (inv?.length) {
    for (const i of inv) {
      const price = fmtMoney(Number(i.sell_price ?? 0));
      const apres = i.description || i.unit || i.category || "";
      sections.push(`- ${i.name}${apres ? ` | ${apres}` : ""} | venda R$ ${price}`);
    }
  } else {
    sections.push("(nenhum item de estoque cadastrado)");
  }

  sections.push("", "FORMAS DE PAGAMENTO ATIVAS:");
  if (payments?.length) {
    for (const p of payments) {
      const inst = p.supports_installments ? ` até ${p.max_installments ?? 12}x` : "";
      sections.push(`- ${p.label ?? p.method}${inst}`);
    }
  } else {
    sections.push("(padrão: pix, dinheiro, cartão)");
  }

  sections.push("", `PACIENTES ATIVOS (${patients?.length ?? 0} no cadastro):`);
  if (patients?.length) {
    for (const p of patients.slice(0, 80)) {
      const extra = [p.allergies && `alergias: ${truncate(p.allergies, 60)}`, p.health_insurance && `convênio: ${p.health_insurance}`]
        .filter(Boolean)
        .join(" | ");
      sections.push(`- ${p.full_name}${extra ? ` (${extra})` : ""}`);
    }
    if (patients.length > 80) sections.push(`… e mais ${patients.length - 80} pacientes`);
  }

  if (budgetsRecent?.length) {
    sections.push("", "ORÇAMENTOS RECENTES DO PROFISSIONAL:");
    for (const b of budgetsRecent) {
      sections.push(
        `- #${b.number} ${b.notes ? truncate(b.notes, 60) : ""} | R$ ${fmtMoney(Number(b.final_value ?? 0))} | ${b.status}`,
      );
    }
  }

  if (plansRecent?.length) {
    sections.push("", "PLANOS TERAPÊUTICOS RECENTES:");
    for (const p of plansRecent) {
      sections.push(`- ${p.patient_name} | ${p.objetivo ?? "—"} | ${p.created_at?.slice(0, 10) ?? ""}`);
    }
  }

  if (opts?.patientId) {
    const patientCtx = await buildPatientContext(tenantId, professionalId, opts.patientId);
    if (patientCtx) sections.push("", patientCtx);
  }

  return sections.filter(Boolean).join("\n");
}
