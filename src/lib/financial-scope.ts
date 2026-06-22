export type FinancialScope = "professional" | "clinic";

export interface FinancialTabScopeProps {
  scope: FinancialScope;
  professionalFilter: string;
  onProfessionalFilterChange: (value: string) => void;
}

export const RECEIVABLE_BILL_SELECT =
  "id, description, amount, discount_value, paid_amount, due_date, paid_date, competence_date, payment_method, status, notes, budget_id, patient_id, professional_id, installment_number, installment_count, consultation_charge_id, nfse_number, nfse_status, nfse_issued_at, patients(full_name), profiles:professional_id(full_name)";

export function applyReceivableProfessionalFilter<
  T extends { eq: (col: string, val: string) => T },
>(query: T, opts: {
  scope: FinancialScope;
  profileId: string;
  professionalFilter?: string;
}): T {
  // Profissional: RLS restringe a cobranças próprias + órfãs dos seus pacientes.
  if (opts.scope === "professional") return query;
  if (opts.professionalFilter && opts.professionalFilter !== "all") {
    return query.eq("professional_id", opts.professionalFilter);
  }
  return query;
}

export function applyPaymentProfessionalFilter<
  T extends { eq: (col: string, val: string) => T },
>(query: T, opts: {
  scope: FinancialScope;
  profileId: string;
  professionalFilter?: string;
}): T {
  // Profissional: RLS restringe pagamentos do seu consultório.
  if (opts.scope === "professional") return query;
  if (opts.professionalFilter && opts.professionalFilter !== "all") {
    return query.eq("professional_id", opts.professionalFilter);
  }
  return query;
}

export function applyExpenseProfessionalFilter<
  T extends { eq: (col: string, val: string) => T },
>(query: T, opts: {
  scope: FinancialScope;
  profileId: string;
  professionalFilter?: string;
}): T {
  if (opts.scope === "professional") {
    return query.eq("professional_id", opts.profileId);
  }
  if (opts.professionalFilter && opts.professionalFilter !== "all") {
    return query.eq("professional_id", opts.professionalFilter);
  }
  return query;
}
