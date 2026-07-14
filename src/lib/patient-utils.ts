export function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

export const DEFAULT_PHONE_DDI = "55";

export const PHONE_DDI_OPTIONS = [
  { value: "55", label: "+55 Brasil" },
  { value: "1", label: "+1 EUA / Canadá" },
  { value: "351", label: "+351 Portugal" },
  { value: "54", label: "+54 Argentina" },
  { value: "598", label: "+598 Uruguai" },
  { value: "595", label: "+595 Paraguai" },
  { value: "56", label: "+56 Chile" },
  { value: "34", label: "+34 Espanha" },
  { value: "39", label: "+39 Itália" },
  { value: "44", label: "+44 Reino Unido" },
] as const;

type PhoneMaskConfig = {
  maxDigits: number;
  placeholder: string;
  format: (digits: string) => string;
};

function digitsOnly(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}

function joinGroups(digits: string, sizes: number[], sep = " ") {
  const parts: string[] = [];
  let i = 0;
  for (const size of sizes) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(sep);
}

function maskUsCa(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const PHONE_MASK_BY_DDI: Record<string, PhoneMaskConfig> = {
  "55": {
    maxDigits: 11,
    placeholder: "(00) 00000-0000",
    format: (d) => maskPhone(d),
  },
  "1": {
    maxDigits: 10,
    placeholder: "(000) 000-0000",
    format: maskUsCa,
  },
  "351": {
    maxDigits: 9,
    placeholder: "000 000 000",
    format: (d) => joinGroups(d, [3, 3, 3]),
  },
  "54": {
    maxDigits: 10,
    placeholder: "00 0000-0000",
    format: (d) => {
      if (d.length <= 2) return d;
      if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
    },
  },
  "598": {
    maxDigits: 8,
    placeholder: "00 000 000",
    format: (d) => joinGroups(d, [2, 3, 3]),
  },
  "595": {
    maxDigits: 9,
    placeholder: "000 000 000",
    format: (d) => joinGroups(d, [3, 3, 3]),
  },
  "56": {
    maxDigits: 9,
    placeholder: "0 0000 0000",
    format: (d) => joinGroups(d, [1, 4, 4]),
  },
  "34": {
    maxDigits: 9,
    placeholder: "000 000 000",
    format: (d) => joinGroups(d, [3, 3, 3]),
  },
  "39": {
    maxDigits: 10,
    placeholder: "000 000 0000",
    format: (d) => joinGroups(d, [3, 3, 4]),
  },
  "44": {
    maxDigits: 10,
    placeholder: "0000 000 000",
    format: (d) => joinGroups(d, [4, 3, 3]),
  },
};

const FALLBACK_PHONE_MASK: PhoneMaskConfig = {
  maxDigits: 15,
  placeholder: "000000000",
  format: (d) => d,
};

export function phoneMaskConfig(ddi?: string | null): PhoneMaskConfig {
  const code = sanitizeDdi(ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
  return PHONE_MASK_BY_DDI[code] ?? FALLBACK_PHONE_MASK;
}

/** Máscara de telefone conforme o DDI selecionado. */
export function maskPhoneByDdi(value: string, ddi?: string | null) {
  const config = phoneMaskConfig(ddi);
  return config.format(digitsOnly(value, config.maxDigits));
}

export function phonePlaceholderByDdi(ddi?: string | null) {
  return phoneMaskConfig(ddi).placeholder;
}

export function sanitizeDdi(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function formatPhoneWithDdi(phone: string | null | undefined, ddi?: string | null) {
  if (!phone) return null;
  const code = sanitizeDdi(ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
  return `+${code} ${maskPhoneByDdi(phone, code)}`;
}

export function buildPatientInternationalPhone(
  phone: string | null | undefined,
  ddi?: string | null,
): string | null {
  if (!phone?.trim()) return null;
  const code = sanitizeDdi(ddi || DEFAULT_PHONE_DDI) || DEFAULT_PHONE_DDI;
  const local = phone.replace(/\D/g, "");
  if (!local) return null;
  return `${code}${local}`;
}

export function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function isValidCPF(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

/** Nome curto para cabeçalhos: primeiros dois nomes (ex.: "Euder Flavio"). */
export function shortDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return parts.slice(0, 2).join(" ");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function formatPatientAddress(p: {
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
} | null | undefined) {
  if (!p) return "";
  const line1 = [p.address_street, p.address_number, p.address_complement].filter(Boolean).join(", ");
  const line2 = [p.address_neighborhood, p.address_city, p.address_state].filter(Boolean).join(" - ");
  const cep = p.address_zip ? `CEP ${maskCEP(p.address_zip)}` : "";
  return [line1, line2, cep].filter(Boolean).join(", ");
}

export function ageFromBirthDate(birth?: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export async function fetchCEP(cep: string) {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      address_street: j.logradouro ?? "",
      address_neighborhood: j.bairro ?? "",
      address_city: j.localidade ?? "",
      address_state: j.uf ?? "",
      address_complement: j.complemento ?? "",
    };
  } catch {
    return null;
  }
}