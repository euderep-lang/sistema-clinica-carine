/** Campos mínimos para atender um paciente com ficha completa no prontuário. */
export type PatientRegistrationFields = {
  full_name?: string | null;
  cpf?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  phone_ddi?: string | null;
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
};

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isPatientRegistrationIncomplete(
  p: PatientRegistrationFields | null | undefined,
): boolean {
  if (!p) return true;
  if (!p.full_name?.trim()) return true;
  if (digits(p.cpf).length !== 11) return true;
  if (!p.gender?.trim()) return true;
  if (!p.birth_date?.trim()) return true;
  if (digits(p.phone).length < 8) return true;
  const zip = digits(p.address_zip);
  if (zip.length !== 8 || /^0{8}$/.test(zip)) return true;
  if (!p.address_street?.trim()) return true;
  if (!p.address_number?.trim()) return true;
  if (!p.address_neighborhood?.trim()) return true;
  if (!p.address_city?.trim()) return true;
  if (!p.address_state?.trim() || p.address_state.trim().length < 2) return true;
  return false;
}
