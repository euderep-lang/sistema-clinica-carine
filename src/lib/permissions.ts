import type { Role } from "@/lib/mock-auth";

/**
 * Permissões de acesso por perfil (configuráveis pelo admin).
 *
 * Escopo: esta camada controla a NAVEGAÇÃO e a VISIBILIDADE no app (itens da
 * sidebar + bloqueio de rota). A segurança "dura" dos dados continua nas
 * policies RLS do Supabase, que já restringem por perfil. Ou seja: desligar uma
 * área aqui esconde/bloqueia o acesso pela interface; o RLS é a barreira final.
 *
 * O perfil "admin" tem acesso total e NÃO é configurável (evita travar o sistema).
 */

export const PERMISSION_SETTING_KEY = "role_permissions";

/** Perfis configuráveis (admin é sempre total). */
export const CONFIGURABLE_ROLES: Exclude<Role, "admin">[] = [
  "receptionist",
  "professional",
  "financial",
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  receptionist: "Recepção",
  professional: "Profissional",
  financial: "Financeiro",
};

export type FeatureDef = {
  key: string;
  label: string;
  description: string;
  group: string;
  /** Perfis para os quais esta área é configurável. */
  roles: Exclude<Role, "admin">[];
  /** Prefixos de rota que esta área controla (usados no guard de navegação). */
  match: string[];
};

/**
 * Catálogo de áreas configuráveis. NÃO inclui o Painel (dashboard), que é sempre
 * acessível — é o destino do redirecionamento e desligá-lo travaria o login.
 */
export const FEATURES: FeatureDef[] = [
  // Atendimento
  {
    key: "agenda",
    label: "Agenda",
    description: "Visualizar e gerenciar a agenda de consultas.",
    group: "Atendimento",
    roles: ["receptionist", "professional"],
    match: ["/reception/agenda", "/professional/agenda"],
  },
  {
    key: "patients",
    label: "Pacientes",
    description: "Cadastro e ficha de pacientes.",
    group: "Atendimento",
    roles: ["receptionist", "professional"],
    match: ["/reception/pacientes", "/professional/patients"],
  },
  {
    key: "checkin",
    label: "Check-in",
    description: "Tela de check-in de pacientes na recepção.",
    group: "Atendimento",
    roles: ["receptionist"],
    match: ["/reception/checkin"],
  },
  // Comunicação (CRM)
  {
    key: "crm",
    label: "CRM WhatsApp",
    description: "Caixa de entrada do WhatsApp e conversas.",
    group: "Comunicação",
    roles: ["receptionist", "professional"],
    match: ["/crm/inbox", "/crm"],
  },
  {
    key: "pipeline",
    label: "Funil de vendas",
    description: "Funil/pipeline de oportunidades do CRM.",
    group: "Comunicação",
    roles: ["receptionist", "professional"],
    match: ["/crm/pipeline"],
  },
  {
    key: "messages",
    label: "Mensagens",
    description: "Histórico e envio de mensagens (modelo legado).",
    group: "Comunicação",
    roles: ["receptionist"],
    match: ["/reception/mensagens"],
  },
  {
    key: "marketing",
    label: "Campanhas",
    description: "Campanhas de marketing e disparos.",
    group: "Comunicação",
    roles: ["receptionist"],
    match: ["/reception/marketing"],
  },
  // Clínico (Profissional)
  {
    key: "prontuarios",
    label: "Prontuários",
    description: "Lista e busca de prontuários clínicos.",
    group: "Clínico",
    roles: ["professional"],
    match: ["/professional/prontuarios"],
  },
  {
    key: "prescriptions",
    label: "Receituário",
    description: "Emissão e histórico de receitas.",
    group: "Clínico",
    roles: ["professional"],
    match: ["/professional/prescriptions"],
  },
  {
    key: "sessions",
    label: "Sessões",
    description: "Controle de sessões e pacotes.",
    group: "Clínico",
    roles: ["professional"],
    match: ["/professional/sessions"],
  },
  {
    key: "procedimentos",
    label: "Procedimentos",
    description: "Procedimentos/serviços do profissional.",
    group: "Clínico",
    roles: ["professional"],
    match: ["/professional/procedimentos"],
  },
  // Administrativo / Financeiro
  {
    key: "budgets",
    label: "Orçamentos",
    description: "Criação e gestão de orçamentos.",
    group: "Administrativo e Financeiro",
    roles: ["professional"],
    match: ["/professional/budgets"],
  },
  {
    key: "professional_financial",
    label: "Financeiro do profissional",
    description: "Financeiro pessoal (comissões, cobranças próprias).",
    group: "Administrativo e Financeiro",
    roles: ["professional"],
    match: ["/professional/financial"],
  },
  {
    key: "receivables",
    label: "Contas a receber",
    description: "Cobranças e recebimentos.",
    group: "Administrativo e Financeiro",
    roles: ["financial"],
    match: ["/financial/receivables"],
  },
  {
    key: "payables",
    label: "Contas a pagar",
    description: "Despesas e pagamentos.",
    group: "Administrativo e Financeiro",
    roles: ["financial"],
    match: ["/financial/payables"],
  },
  {
    key: "cashflow",
    label: "Fluxo de caixa",
    description: "Movimentações e fluxo de caixa.",
    group: "Administrativo e Financeiro",
    roles: ["financial"],
    match: ["/financial/fluxo"],
  },
  {
    key: "reports",
    label: "Relatórios financeiros",
    description: "Relatórios do módulo financeiro.",
    group: "Administrativo e Financeiro",
    roles: ["financial"],
    match: ["/financial/relatorios"],
  },
  // Recursos
  {
    key: "inventory",
    label: "Estoque",
    description: "Controle de estoque e itens.",
    group: "Recursos",
    roles: ["professional", "financial"],
    match: ["/professional/inventory", "/financial/inventory"],
  },
  {
    key: "professional_settings",
    label: "Configurações pessoais",
    description: "Configurações do próprio profissional (agenda, timbrado, certificado).",
    group: "Recursos",
    roles: ["professional"],
    match: ["/professional/settings"],
  },
];

export type RolePermissions = Record<string, boolean>;
export type PermissionMatrix = Partial<Record<Role, RolePermissions>>;

/** Áreas configuráveis de um perfil (ordem do catálogo). */
export function featuresForRole(role: Role): FeatureDef[] {
  if (role === "admin") return [];
  return FEATURES.filter((f) => f.roles.includes(role as Exclude<Role, "admin">));
}

/** Áreas agrupadas para exibição. */
export function featureGroupsForRole(role: Role): { group: string; features: FeatureDef[] }[] {
  const list = featuresForRole(role);
  const order: string[] = [];
  const map = new Map<string, FeatureDef[]>();
  for (const f of list) {
    if (!map.has(f.group)) {
      map.set(f.group, []);
      order.push(f.group);
    }
    map.get(f.group)!.push(f);
  }
  return order.map((group) => ({ group, features: map.get(group)! }));
}

/** Encontra a área que controla um caminho (match de prefixo mais longo). */
export function featureForPath(pathname: string): FeatureDef | null {
  let best: FeatureDef | null = null;
  let bestLen = -1;
  for (const f of FEATURES) {
    for (const prefix of f.match) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (prefix.length > bestLen) {
          best = f;
          bestLen = prefix.length;
        }
      }
    }
  }
  return best;
}

/**
 * Indica se o perfil pode acessar uma área. Admin sempre pode.
 * Default: liberado (só bloqueia quando o admin marca explicitamente como false).
 */
export function canAccessFeature(
  role: Role,
  permissions: PermissionMatrix | null | undefined,
  featureKey: string,
): boolean {
  if (role === "admin") return true;
  const value = permissions?.[role]?.[featureKey];
  return value !== false;
}

/** Verifica acesso a um caminho considerando as permissões (apenas a camada de feature). */
export function isPathAllowedByPermissions(
  role: Role,
  pathname: string,
  permissions: PermissionMatrix | null | undefined,
): boolean {
  if (role === "admin") return true;
  const feature = featureForPath(pathname);
  if (!feature) return true;
  if (!feature.roles.includes(role as Exclude<Role, "admin">)) return true;
  return canAccessFeature(role, permissions, feature.key);
}
