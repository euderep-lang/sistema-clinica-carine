import { supabase } from "@/integrations/supabase/client";

export async function getTenantSetting<T = unknown>(tenantId: string, key: string): Promise<T | null> {
  const { data } = await supabase
    .from("tenant_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle();
  if (!data?.value) return null;
  try { return JSON.parse(data.value) as T; } catch { return data.value as unknown as T; }
}

export async function setTenantSetting(tenantId: string, key: string, value: unknown) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  const { error } = await supabase
    .from("tenant_settings")
    .upsert({ tenant_id: tenantId, key, value: v }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}

export function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
    [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}

export function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export interface BusinessHours {
  [day: string]: { active: boolean; open: string; close: string };
}

export const DEFAULT_HOURS: BusinessHours = {
  mon: { active: true, open: "08:00", close: "18:00" },
  tue: { active: true, open: "08:00", close: "18:00" },
  wed: { active: true, open: "08:00", close: "18:00" },
  thu: { active: true, open: "08:00", close: "18:00" },
  fri: { active: true, open: "08:00", close: "18:00" },
  sat: { active: true, open: "08:00", close: "13:00" },
  sun: { active: false, open: "08:00", close: "12:00" },
};

export const DAY_LABELS: Record<string, string> = {
  mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb", sun: "Dom",
};

export const DEFAULT_SPECIALTIES = [
  "Nutrologia",
  "Dentista",
  "Psiquiatria",
  "Psicóloga",
  "Fisioterapeuta",
] as const;

/** Lista antiga gerada pela migration inicial — substituída pelos padrões atuais. */
const LEGACY_SPECIALTIES = new Set([
  "Clínica Geral",
  "Dermatologia",
  "Pediatria",
  "Ginecologia",
  "Cardiologia",
  "Ortopedia",
  "Neurologia",
  "Psiquiatria",
  "Nutrição",
  "Fisioterapia",
]);

export function isLegacySpecialtyList(list: string[]): boolean {
  return list.length === LEGACY_SPECIALTIES.size && list.every((item) => LEGACY_SPECIALTIES.has(item));
}

export function resolveSpecialties(list: string[] | null | undefined): string[] {
  if (!list || list.length === 0) return [...DEFAULT_SPECIALTIES];
  if (isLegacySpecialtyList(list)) return [...DEFAULT_SPECIALTIES];
  return list;
}

export interface ClinicAddress {
  cep?: string; logradouro?: string; numero?: string; complemento?: string;
  bairro?: string; cidade?: string; estado?: string;
  website?: string; whatsapp?: string;
}

export function formatClinicAddressLines(addr: ClinicAddress | null | undefined): {
  line1: string | null;
  line2: string | null;
} {
  if (!addr) return { line1: null, line2: null };
  const line1 = [addr.logradouro, addr.numero].filter(Boolean).join(", ") || null;
  const line2 = [addr.bairro, addr.cidade, addr.estado].filter(Boolean).join(", ") || null;
  return { line1, line2 };
}

export function formatClinicAddress(addr: ClinicAddress | null | undefined): string | null {
  const { line1, line2 } = formatClinicAddressLines(addr);
  const parts = [line1, line2, addr?.cep].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

export async function fetchViaCEP(cep: string): Promise<Partial<ClinicAddress> | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      logradouro: j.logradouro, bairro: j.bairro, cidade: j.localidade, estado: j.uf,
    };
  } catch { return null; }
}

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return null;
  const full =
    hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }) {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Texto legível sobre fundo customizado (hex). */
export function foregroundForBackground(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) < 0.45 ? "#ffffff" : "oklch(0.28 0.03 250)";
}

export function applyThemeColors(primary?: string | null, secondary?: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", foregroundForBackground(primary));
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-primary-foreground", foregroundForBackground(primary));
  }
  if (secondary) {
    root.style.setProperty("--accent", secondary);
    root.style.setProperty("--accent-foreground", foregroundForBackground(secondary));
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--secondary-foreground", foregroundForBackground(secondary));
    root.style.setProperty("--ring", secondary);
  }
}

export const FONT_OPTIONS = [
  { id: "system", label: "Padrão", stack: "system-ui, -apple-system, sans-serif" },
  { id: "inter", label: "Moderna", stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;500;600;700" },
  { id: "playfair", label: "Elegante", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
  { id: "jetbrains", label: "Técnica", stack: '"JetBrains Mono", ui-monospace, monospace', google: "JetBrains+Mono:wght@400;500;700" },
] as const;

export function loadGoogleFont(id: string) {
  if (typeof document === "undefined") return;
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (!opt || !("google" in opt) || !opt.google) return;
  const linkId = `gfont-${id}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId; link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
  document.head.appendChild(link);
}

export function applyFont(id: string) {
  if (typeof document === "undefined") return;
  loadGoogleFont(id);
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (opt) document.documentElement.style.setProperty("--font-sans", opt.stack);
}

export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export const TEMPLATE_VARS = [
  "primeiro_nome",
  "nome_paciente",
  "data_consulta",
  "hora_consulta",
  "nome_profissional",
  "nome_clinica",
  "link_confirmacao",
  "muitos_pacientes",
  "perdido",
  "insatisfeito",
  "interessado",
  "satisfeito",
] as const;

export const SAMPLE_VARS: Record<string, string> = {
  primeiro_nome: "Maria",
  nome_paciente: "Maria Silva",
  muitos_pacientes: "muitas pacientes",
  perdido: "perdida",
  insatisfeito: "insatisfeita",
  interessado: "interessada",
  satisfeito: "satisfeita",
  data_consulta: "15/07/2025",
  hora_consulta: "14:30",
  nome_profissional: "Dr. Carlos Silva",
  nome_clinica: "Sua Clínica",
  link_confirmacao: "https://app.clinicos.com/c/abc123",
};