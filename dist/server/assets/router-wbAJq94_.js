import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, useRouter, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, useLocation, useRouterState, useNavigate, redirect, createRouter } from "@tanstack/react-router";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect, createContext, useContext, useRef, useMemo } from "react";
import { s as supabase } from "./client-CUE-_UGz.js";
import { Toaster as Toaster$1, toast } from "sonner";
import { X, PanelLeft, ChevronRight, Check, Circle, LayoutDashboard, TrendingUp, TrendingDown, LineChart, Package, BarChart3, Calendar, Users, FileText, CalendarCheck, Receipt, ClipboardList, Wallet, Settings, ClipboardCheck, CreditCard, MessageSquare, Megaphone, Activity, ChevronLeft, Search, User, Stethoscope, Bell, CheckCircle2, Cake, AlertCircle, Clock, LogOut, ChevronDown, ChevronUp, Printer, Download, HandCoins, Plus } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { i as initials$1, a as avatarColor, m as maskCPF, b as maskPhone$1 } from "./patient-utils-YNqCHR6o.js";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Command as Command$1 } from "cmdk";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { jsPDF } from "jspdf";
import { r as resolvePdfPadding, p as pdfContentX, a as pdfContentW, b as paintLetterhead } from "./letterhead-pdf-8X66Bk4t.js";
const appCss = "/assets/styles-1ULc5Q3e.css";
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
async function getTenantSetting(tenantId, key) {
  const { data } = await supabase.from("tenant_settings").select("value").eq("tenant_id", tenantId).eq("key", key).maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value);
  } catch {
    return data.value;
  }
}
async function setTenantSetting(tenantId, key, value) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  const { error } = await supabase.from("tenant_settings").upsert({ tenant_id: tenantId, key, value: v }, { onConflict: "tenant_id,key" });
  if (error) throw error;
}
function maskCNPJ(v) {
  return v.replace(/\D/g, "").slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""));
  return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}
function maskCEP(v) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}
const DEFAULT_HOURS = {
  mon: { active: true, open: "08:00", close: "18:00" },
  tue: { active: true, open: "08:00", close: "18:00" },
  wed: { active: true, open: "08:00", close: "18:00" },
  thu: { active: true, open: "08:00", close: "18:00" },
  fri: { active: true, open: "08:00", close: "18:00" },
  sat: { active: true, open: "08:00", close: "13:00" },
  sun: { active: false, open: "08:00", close: "12:00" }
};
const DAY_LABELS = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom"
};
const DEFAULT_SPECIALTIES = [
  "Nutrologia",
  "Dentista",
  "Psiquiatria",
  "Psicóloga",
  "Fisioterapeuta"
];
const LEGACY_SPECIALTIES = /* @__PURE__ */ new Set([
  "Clínica Geral",
  "Dermatologia",
  "Pediatria",
  "Ginecologia",
  "Cardiologia",
  "Ortopedia",
  "Neurologia",
  "Psiquiatria",
  "Nutrição",
  "Fisioterapia"
]);
function isLegacySpecialtyList(list) {
  return list.length === LEGACY_SPECIALTIES.size && list.every((item) => LEGACY_SPECIALTIES.has(item));
}
function resolveSpecialties(list) {
  if (!list || list.length === 0) return [...DEFAULT_SPECIALTIES];
  if (isLegacySpecialtyList(list)) return [...DEFAULT_SPECIALTIES];
  return list;
}
function formatClinicAddressLines(addr) {
  if (!addr) return { line1: null, line2: null };
  const line1 = [addr.logradouro, addr.numero].filter(Boolean).join(", ") || null;
  const line2 = [addr.bairro, addr.cidade, addr.estado].filter(Boolean).join(", ") || null;
  return { line1, line2 };
}
function formatClinicAddress(addr) {
  const { line1, line2 } = formatClinicAddressLines(addr);
  const parts = [line1, line2, addr?.cep].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}
async function fetchViaCEP(cep) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return {
      logradouro: j.logradouro,
      bairro: j.bairro,
      cidade: j.localidade,
      estado: j.uf
    };
  } catch {
    return null;
  }
}
function parseHexColor(input) {
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return null;
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}
function relativeLuminance(rgb) {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function foregroundForBackground(color) {
  const rgb = parseHexColor(color);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) < 0.45 ? "#ffffff" : "oklch(0.28 0.03 250)";
}
function applyThemeColors(primary, secondary) {
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
const FONT_OPTIONS = [
  { id: "system", label: "Padrão", stack: "system-ui, -apple-system, sans-serif" },
  { id: "inter", label: "Moderna", stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@400;500;600;700" },
  { id: "playfair", label: "Elegante", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:wght@400;600;700" },
  { id: "jetbrains", label: "Técnica", stack: '"JetBrains Mono", ui-monospace, monospace', google: "JetBrains+Mono:wght@400;500;700" }
];
function loadGoogleFont(id) {
  if (typeof document === "undefined") return;
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (!opt || !("google" in opt) || !opt.google) return;
  const linkId = `gfont-${id}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
  document.head.appendChild(link);
}
function applyFont(id) {
  if (typeof document === "undefined") return;
  loadGoogleFont(id);
  const opt = FONT_OPTIONS.find((f) => f.id === id);
  if (opt) document.documentElement.style.setProperty("--font-sans", opt.stack);
}
function renderTemplate(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}
const TEMPLATE_VARS = [
  "nome_paciente",
  "data_consulta",
  "hora_consulta",
  "nome_profissional",
  "nome_clinica",
  "link_confirmacao"
];
const SAMPLE_VARS = {
  nome_paciente: "Maria Silva",
  data_consulta: "15/07/2025",
  hora_consulta: "14:30",
  nome_profissional: "Dr. Carlos Silva",
  nome_clinica: "Sua Clínica",
  link_confirmacao: "https://app.clinicos.com/c/abc123"
};
const AuthContext = createContext(null);
function dashboardPathFor(role) {
  return `/${role === "receptionist" ? "reception" : role}/dashboard`;
}
async function loadProfileAndTenant(userId, email) {
  const { data: profileRow, error } = await supabase.from("profiles").select("id, tenant_id, full_name, role, crm, specialty, cpf, avatar_url, phone, active").eq("id", userId).maybeSingle();
  if (error || !profileRow || !profileRow.tenant_id) return null;
  if (profileRow.active === false) return null;
  const { data: tenantRow } = await supabase.from("tenants").select("id, name, slug, primary_color, secondary_color, logo_url").eq("id", profileRow.tenant_id).maybeSingle();
  if (!tenantRow) return null;
  return {
    profile: {
      id: profileRow.id,
      email,
      full_name: profileRow.full_name,
      role: profileRow.role,
      tenant_id: profileRow.tenant_id,
      crm: profileRow.crm,
      specialty: profileRow.specialty,
      cpf: profileRow.cpf,
      avatar_url: profileRow.avatar_url,
      phone: profileRow.phone
    },
    tenant: {
      id: tenantRow.id,
      name: tenantRow.name,
      slug: tenantRow.slug,
      primary_color: tenantRow.primary_color ?? "#1a2b4a",
      secondary_color: tenantRow.secondary_color ?? "#0ea5e9",
      logo_url: tenantRow.logo_url
    }
  };
}
function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const hydrate = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setProfile(null);
      setTenant(null);
      return;
    }
    const res = await loadProfileAndTenant(session.user.id, session.user.email ?? "");
    if (res) {
      setProfile(res.profile);
      setTenant(res.tenant);
      applyThemeColors(res.tenant.primary_color, res.tenant.secondary_color);
      getTenantSetting(res.tenant.id, "font_preference").then((f) => f && applyFont(f));
    } else {
      setProfile(null);
      setTenant(null);
    }
  };
  useEffect(() => {
    let mounted = true;
    let lastUserId = null;
    (async () => {
      await hydrate();
      const { data } = await supabase.auth.getSession();
      lastUserId = data.session?.user.id ?? null;
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        lastUserId = null;
        setProfile(null);
        setTenant(null);
        return;
      }
      const uid = session?.user.id ?? null;
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && uid && uid !== lastUserId) {
        lastUserId = uid;
        setTimeout(() => {
          hydrate();
        }, 0);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error || !data.user) {
      throw new Error(
        error?.message?.includes("Invalid login") || error?.message?.includes("invalid") ? "E-mail ou senha inválidos." : error?.message ?? "Falha ao entrar."
      );
    }
    const res = await loadProfileAndTenant(data.user.id, data.user.email ?? email);
    if (!res) {
      await supabase.auth.signOut();
      throw new Error("Conta inativa ou sem perfil associado. Contate o administrador.");
    }
    setProfile(res.profile);
    setTenant(res.tenant);
    return res.profile;
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTenant(null);
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value: { profile, tenant, loading, signIn, signOut, refresh: hydrate }, children });
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-dvh items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("p", { className: "font-display text-7xl font-semibold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-4 font-display text-xl font-semibold text-foreground", children: "Página não encontrada" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "O endereço pode estar incorreto ou a página foi movida." }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90",
        children: "Voltar ao início"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-dvh items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "font-display text-xl font-semibold text-foreground", children: "Não foi possível carregar esta página" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Ocorreu um erro inesperado. Tente novamente ou volte ao início." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90",
          children: "Tentar novamente"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent",
          children: "Voltar ao início"
        }
      )
    ] })
  ] }) });
}
const Route$K = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClinicOS — Gestão Clínica" },
      { name: "description", content: "Sistema de gestão para clínicas médicas e odontológicas." },
      { property: "og:title", content: "ClinicOS — Gestão Clínica" },
      { property: "og:description", content: "Agenda, prontuário, financeiro e estoque em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap"
      },
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "pt-BR", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$K.useRouteContext();
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxs(AuthProvider, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-right" })
  ] }) });
}
const $$splitComponentImporter$I = () => import("./login-C6lxfQQV.js");
const Route$J = createFileRoute("/login")({
  head: () => ({
    meta: [{
      title: "Entrar — ClinicOS"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$I, "component")
});
const $$splitComponentImporter$H = () => import("./route-C3RIsV3d.js");
const Route$I = createFileRoute("/_authenticated")({
  component: lazyRouteComponent($$splitComponentImporter$H, "component")
});
const $$splitComponentImporter$G = () => import("./index-DnWzlwwz.js");
const Route$H = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "ClinicOS — Gestão de Clínicas"
    }, {
      name: "description",
      content: "Plataforma multi-tenant para gestão de clínicas médicas."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$G, "component")
});
const $$splitComponentImporter$F = () => import("./professional.safeid.callback-DsMrktVb.js");
const Route$G = createFileRoute("/professional/safeid/callback")({
  validateSearch: (s) => ({
    code: typeof s.code === "string" ? s.code : void 0,
    state: typeof s.state === "string" ? s.state : void 0,
    error: typeof s.error === "string" ? s.error : void 0
  }),
  component: lazyRouteComponent($$splitComponentImporter$F, "component")
});
const $$splitComponentImporter$E = () => import("./reception.payments-BiaAS75c.js");
const Route$F = createFileRoute("/_authenticated/reception/payments")({
  component: lazyRouteComponent($$splitComponentImporter$E, "component")
});
const $$splitComponentImporter$D = () => import("./reception.pacientes-BFsOu0JM.js");
const Route$E = createFileRoute("/_authenticated/reception/pacientes")({
  component: lazyRouteComponent($$splitComponentImporter$D, "component")
});
const $$splitComponentImporter$C = () => import("./reception.mensagens-DeniYnt2.js");
const Route$D = createFileRoute("/_authenticated/reception/mensagens")({
  component: lazyRouteComponent($$splitComponentImporter$C, "component")
});
const $$splitComponentImporter$B = () => import("./reception.marketing-BgSon_sD.js");
const Route$C = createFileRoute("/_authenticated/reception/marketing")({
  component: lazyRouteComponent($$splitComponentImporter$B, "component")
});
const $$splitComponentImporter$A = () => import("./reception.dashboard-CvMahtA-.js");
const Route$B = createFileRoute("/_authenticated/reception/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$A, "component")
});
const $$splitComponentImporter$z = () => import("./reception.agenda-BpDeMC8O.js");
const Route$A = createFileRoute("/_authenticated/reception/agenda")({
  component: lazyRouteComponent($$splitComponentImporter$z, "component")
});
const $$splitComponentImporter$y = () => import("./professional.settings-BXGWAoH8.js");
const Route$z = createFileRoute("/_authenticated/professional/settings")({
  component: lazyRouteComponent($$splitComponentImporter$y, "component")
});
const $$splitComponentImporter$x = () => import("./professional.sessions-BJ90Rjhe.js");
const Route$y = createFileRoute("/_authenticated/professional/sessions")({
  component: lazyRouteComponent($$splitComponentImporter$x, "component")
});
const $$splitComponentImporter$w = () => import("./professional.prontuarios-BAleXsBM.js");
const Route$x = createFileRoute("/_authenticated/professional/prontuarios")({
  component: lazyRouteComponent($$splitComponentImporter$w, "component")
});
const $$splitComponentImporter$v = () => import("./professional.procedimentos-DIZZjcQF.js");
const Route$w = createFileRoute("/_authenticated/professional/procedimentos")({
  component: lazyRouteComponent($$splitComponentImporter$v, "component")
});
const $$splitComponentImporter$u = () => import("./professional.prescriptions-BFsOu0JM.js");
const Route$v = createFileRoute("/_authenticated/professional/prescriptions")({
  component: lazyRouteComponent($$splitComponentImporter$u, "component")
});
const $$splitComponentImporter$t = () => import("./professional.patients-BFsOu0JM.js");
const Route$u = createFileRoute("/_authenticated/professional/patients")({
  component: lazyRouteComponent($$splitComponentImporter$t, "component")
});
const $$splitComponentImporter$s = () => import("./professional.inventory-Bum0ZpIY.js");
const Route$t = createFileRoute("/_authenticated/professional/inventory")({
  component: lazyRouteComponent($$splitComponentImporter$s, "component")
});
const $$splitComponentImporter$r = () => import("./professional.financial-B7E19ByZ.js");
const Route$s = createFileRoute("/_authenticated/professional/financial")({
  component: lazyRouteComponent($$splitComponentImporter$r, "component")
});
const $$splitComponentImporter$q = () => import("./professional.dashboard-r_BP_wsZ.js");
const Route$r = createFileRoute("/_authenticated/professional/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$q, "component")
});
const $$splitComponentImporter$p = () => import("./professional.budgets-DOc6KYE6.js");
const Route$q = createFileRoute("/_authenticated/professional/budgets")({
  component: lazyRouteComponent($$splitComponentImporter$p, "component")
});
const $$splitComponentImporter$o = () => import("./professional.agenda-C3KaKAvQ.js");
const Route$p = createFileRoute("/_authenticated/professional/agenda")({
  component: lazyRouteComponent($$splitComponentImporter$o, "component")
});
const $$splitComponentImporter$n = () => import("./financial.relatorios-BC9BZIOl.js");
const Route$o = createFileRoute("/_authenticated/financial/relatorios")({
  component: lazyRouteComponent($$splitComponentImporter$n, "component")
});
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function randomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(void 0);
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "input",
      {
        type,
        className: cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Input.displayName = "Input";
const Separator = React.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
  SeparatorPrimitive.Root,
  {
    ref,
    decorative,
    orientation,
    className: cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    ),
    ...props
  }
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
const Sheet = SheetPrimitive.Root;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(SheetPrimitive.Content, { ref, className: cn(sheetVariants({ side }), className), ...props, children: [
    /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
      /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Fechar" })
    ] }),
    children
  ] })
] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
SheetHeader.displayName = "SheetHeader";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn("animate-pulse rounded-md bg-primary/10", className), ...props });
}
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  TooltipPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
function readSidebarOpen() {
  if (typeof document === "undefined") return true;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SIDEBAR_COOKIE_NAME}=(true|false)`));
  if (match) return match[1] === "true";
  return true;
}
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3.6rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SidebarContext = React.createContext(null);
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar deve ser usado dentro de SidebarProvider.");
  }
  return context;
}
const SidebarProvider = React.forwardRef(
  ({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
  }, ref) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(() => readSidebarOpen() ?? defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );
    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
    }, [isMobile, setOpen, setOpenMobile]);
    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);
    const state = open ? "expanded" : "collapsed";
    const contextValue = React.useMemo(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );
    return /* @__PURE__ */ jsx(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style
        },
        className: cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
          className
        ),
        ref,
        ...props,
        children
      }
    ) }) });
  }
);
SidebarProvider.displayName = "SidebarProvider";
const Sidebar = React.forwardRef(
  ({
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children,
    ...props
  }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    if (collapsible === "none") {
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            className
          ),
          ref,
          ...props,
          children
        }
      );
    }
    if (isMobile) {
      return /* @__PURE__ */ jsx(Sheet, { open: openMobile, onOpenChange: setOpenMobile, ...props, children: /* @__PURE__ */ jsxs(
        SheetContent,
        {
          "data-sidebar": "sidebar",
          "data-mobile": "true",
          className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
          style: {
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE
          },
          side,
          children: [
            /* @__PURE__ */ jsxs(SheetHeader, { className: "sr-only", children: [
              /* @__PURE__ */ jsx(SheetTitle, { children: "Barra lateral" }),
              /* @__PURE__ */ jsx(SheetDescription, { children: "Exibe a barra lateral em dispositivos móveis." })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex h-full w-full flex-col", children })
          ]
        }
      ) });
    }
    return /* @__PURE__ */ jsxs(
      "div",
      {
        ref,
        className: "group peer hidden text-sidebar-foreground md:block",
        "data-state": state,
        "data-collapsible": state === "collapsed" ? collapsible : "",
        "data-variant": variant,
        "data-side": side,
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
                "group-data-[collapsible=offcanvas]:w-0",
                "group-data-[side=right]:rotate-180",
                variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
              )
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
                side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                // Adjust the padding for floating and inset variants.
                variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
                className
              ),
              ...props,
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  "data-sidebar": "sidebar",
                  className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
                  children
                }
              )
            }
          )
        ]
      }
    );
  }
);
Sidebar.displayName = "Sidebar";
const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsxs(
    Button,
    {
      ref,
      "data-sidebar": "trigger",
      variant: "ghost",
      size: "icon",
      className: cn("h-7 w-7", className),
      onClick: (event) => {
        onClick?.(event);
        toggleSidebar();
      },
      ...props,
      children: [
        /* @__PURE__ */ jsx(PanelLeft, {}),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Alternar barra lateral" })
      ]
    }
  );
});
SidebarTrigger.displayName = "SidebarTrigger";
const SidebarRail = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    return /* @__PURE__ */ jsx(
      "button",
      {
        ref,
        "data-sidebar": "rail",
        "aria-label": "Alternar barra lateral",
        tabIndex: -1,
        onClick: toggleSidebar,
        title: "Alternar barra lateral",
        className: cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          className
        ),
        ...props
      }
    );
  }
);
SidebarRail.displayName = "SidebarRail";
const SidebarInset = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "main",
      {
        ref,
        className: cn(
          "relative flex w-full flex-1 flex-col bg-background",
          "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
          className
        ),
        ...props
      }
    );
  }
);
SidebarInset.displayName = "SidebarInset";
const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    Input,
    {
      ref,
      "data-sidebar": "input",
      className: cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      ),
      ...props
    }
  );
});
SidebarInput.displayName = "SidebarInput";
const SidebarHeader = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "header",
        className: cn("flex flex-col gap-2 p-2", className),
        ...props
      }
    );
  }
);
SidebarHeader.displayName = "SidebarHeader";
const SidebarFooter = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "footer",
        className: cn("flex flex-col gap-2 p-2", className),
        ...props
      }
    );
  }
);
SidebarFooter.displayName = "SidebarFooter";
const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    Separator,
    {
      ref,
      "data-sidebar": "separator",
      className: cn("mx-2 w-auto bg-sidebar-border", className),
      ...props
    }
  );
});
SidebarSeparator.displayName = "SidebarSeparator";
const SidebarContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "content",
        className: cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          className
        ),
        ...props
      }
    );
  }
);
SidebarContent.displayName = "SidebarContent";
const SidebarGroup = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "group",
        className: cn("relative flex w-full min-w-0 flex-col p-2", className),
        ...props
      }
    );
  }
);
SidebarGroup.displayName = "SidebarGroup";
const SidebarGroupLabel = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "group-label",
      className: cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      ),
      ...props
    }
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";
const SidebarGroupAction = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "group-action",
      className: cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
});
SidebarGroupAction.displayName = "SidebarGroupAction";
const SidebarGroupContent = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      "data-sidebar": "group-content",
      className: cn("w-full text-sm", className),
      ...props
    }
  )
);
SidebarGroupContent.displayName = "SidebarGroupContent";
const SidebarMenu = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "ul",
    {
      ref,
      "data-sidebar": "menu",
      className: cn("flex w-full min-w-0 flex-col gap-1", className),
      ...props
    }
  )
);
SidebarMenu.displayName = "SidebarMenu";
const SidebarMenuItem = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "li",
    {
      ref,
      "data-sidebar": "menu-item",
      className: cn("group/menu-item relative", className),
      ...props
    }
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";
const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring cursor-pointer transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:[&_span]:hidden [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const SidebarMenuButton = React.forwardRef(
  ({
    asChild = false,
    isActive = false,
    variant = "default",
    size = "default",
    tooltip,
    className,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();
    const button = /* @__PURE__ */ jsx(
      Comp,
      {
        ref,
        "data-sidebar": "menu-button",
        "data-size": size,
        "data-active": isActive,
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
        ...props
      }
    );
    if (!tooltip) {
      return button;
    }
    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip
      };
    }
    return /* @__PURE__ */ jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: button }),
      /* @__PURE__ */ jsx(
        TooltipContent,
        {
          side: "right",
          align: "center",
          hidden: state !== "collapsed" || isMobile,
          ...tooltip
        }
      )
    ] });
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";
const SidebarMenuAction = React.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-action",
      className: cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      ),
      ...props
    }
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";
const SidebarMenuBadge = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      "data-sidebar": "menu-badge",
      className: cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  )
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";
const SidebarMenuSkeleton = React.forwardRef(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref,
      "data-sidebar": "menu-skeleton",
      className: cn("flex h-8 items-center gap-2 rounded-md px-2", className),
      ...props,
      children: [
        showIcon && /* @__PURE__ */ jsx(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }),
        /* @__PURE__ */ jsx(
          Skeleton,
          {
            className: "h-4 max-w-(--skeleton-width) flex-1",
            "data-sidebar": "menu-skeleton-text",
            style: {
              "--skeleton-width": width
            }
          }
        )
      ]
    }
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
const SidebarMenuSub = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "ul",
    {
      ref,
      "data-sidebar": "menu-sub",
      className: cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  )
);
SidebarMenuSub.displayName = "SidebarMenuSub";
const SidebarMenuSubItem = React.forwardRef(
  ({ ...props }, ref) => /* @__PURE__ */ jsx("li", { ref, ...props })
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
const SidebarMenuSubButton = React.forwardRef(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
const Avatar = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Root,
  {
    ref,
    className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className),
    ...props
  }
));
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Image,
  {
    ref,
    className: cn("aspect-square h-full w-full", className),
    ...props
  }
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Fallback,
  {
    ref,
    className: cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    ),
    ...props
  }
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.SubTrigger,
  {
    ref,
    className: cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto" })
    ]
  }
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.SubContent,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.CheckboxItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.RadioItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Circle, { className: "h-2 w-2 fill-current" }) }) }),
      children
    ]
  }
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
    ...props
  }
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const MAX_CACHED_PAGES = 12;
const pageCache = /* @__PURE__ */ new Map();
const pageOrder = [];
function pageKey(pathname, search) {
  return search ? `${pathname}?${search}` : pathname;
}
function touchCache(key, node) {
  pageCache.set(key, node);
  const existing = pageOrder.indexOf(key);
  if (existing >= 0) pageOrder.splice(existing, 1);
  pageOrder.push(key);
  while (pageOrder.length > MAX_CACHED_PAGES) {
    const evict = pageOrder.shift();
    if (evict) pageCache.delete(evict);
  }
}
function clearKeepAliveCache() {
  pageCache.clear();
  pageOrder.length = 0;
}
function KeepAliveOutlet() {
  const { pathname, searchStr } = useLocation();
  const key = pageKey(pathname, searchStr);
  const outlet = /* @__PURE__ */ jsx(Outlet, {});
  touchCache(key, outlet);
  return /* @__PURE__ */ jsx(Fragment, { children: pageOrder.map((cacheKey) => /* @__PURE__ */ jsx(
    "div",
    {
      className: cacheKey === key ? "contents" : "hidden",
      "aria-hidden": cacheKey !== key,
      children: pageCache.get(cacheKey)
    },
    cacheKey
  )) });
}
const NAV = {
  admin: [
    {
      label: "Operação",
      items: [
        { title: "Painel", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Agenda", url: "/reception/agenda", icon: Calendar },
        { title: "Pacientes", url: "/reception/pacientes", icon: Users }
      ]
    },
    {
      label: "Gestão",
      items: [
        { title: "Financeiro", url: "/financial/dashboard", icon: Wallet },
        { title: "Serviços", url: "/admin/services", icon: Receipt },
        { title: "Estoque", url: "/financial/inventory", icon: Package },
        { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
        { title: "Configurações", url: "/admin/settings", icon: Settings }
      ]
    }
  ],
  receptionist: [
    {
      label: "Atendimento",
      items: [
        { title: "Painel", url: "/reception/dashboard", icon: LayoutDashboard },
        { title: "Agenda", url: "/reception/agenda", icon: Calendar },
        { title: "Pacientes", url: "/reception/pacientes", icon: Users },
        { title: "Check-in", url: "/reception/checkin", icon: ClipboardCheck },
        { title: "Pagamentos", url: "/reception/payments", icon: CreditCard }
      ]
    },
    {
      label: "Comunicação",
      items: [
        { title: "Mensagens", url: "/reception/mensagens", icon: MessageSquare },
        { title: "Campanhas", url: "/reception/marketing", icon: Megaphone }
      ]
    }
  ],
  professional: [
    {
      label: "Consultório",
      items: [
        { title: "Painel", url: "/professional/dashboard", icon: LayoutDashboard },
        { title: "Minha Agenda", url: "/professional/agenda", icon: Calendar },
        { title: "Pacientes", url: "/professional/patients", icon: Users },
        { title: "Prontuários", url: "/professional/prontuarios", icon: FileText },
        { title: "Receituário", url: "/professional/prescriptions", icon: FileText },
        { title: "Sessões", url: "/professional/sessions", icon: CalendarCheck }
      ]
    },
    {
      label: "Administrativo",
      items: [
        { title: "Orçamentos", url: "/professional/budgets", icon: Receipt },
        { title: "Procedimentos", url: "/professional/procedimentos", icon: ClipboardList },
        { title: "Financeiro", url: "/professional/financial", icon: Wallet },
        { title: "Estoque", url: "/professional/inventory", icon: Package },
        { title: "Configurações", url: "/professional/settings", icon: Settings }
      ]
    }
  ],
  financial: [
    {
      label: "Financeiro",
      items: [
        { title: "Painel", url: "/financial/dashboard", icon: LayoutDashboard },
        { title: "Contas a Receber", url: "/financial/receivables", icon: TrendingUp },
        { title: "Contas a Pagar", url: "/financial/payables", icon: TrendingDown },
        { title: "Fluxo de Caixa", url: "/financial/fluxo", icon: LineChart },
        { title: "Estoque", url: "/financial/inventory", icon: Package },
        { title: "Relatórios", url: "/financial/relatorios", icon: BarChart3 }
      ]
    }
  ]
};
function SidebarNavLink({
  item,
  active
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  return /* @__PURE__ */ jsx(SidebarMenuItem, { className: "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center", children: /* @__PURE__ */ jsx(
    SidebarMenuButton,
    {
      asChild: true,
      isActive: active,
      tooltip: item.title,
      className: "h-9 gap-3 rounded-md px-2.5 font-medium transition-colors duration-200 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-none group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:!size-[2.7rem] group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!gap-0 group-data-[collapsible=icon]:!overflow-visible group-data-[collapsible=icon]:!p-0",
      children: /* @__PURE__ */ jsxs(
        Link,
        {
          to: item.url,
          title: item.title,
          "aria-label": item.title,
          className: cn(
            "flex h-full w-full cursor-pointer items-center gap-3 outline-none",
            "group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
          ),
          onClick: () => {
            if (isMobile) setOpenMobile(false);
          },
          children: [
            /* @__PURE__ */ jsx(Icon, { className: "size-4 shrink-0 opacity-80 group-data-[collapsible=icon]:size-[1.2rem]" }),
            /* @__PURE__ */ jsx("span", { className: "group-data-[collapsible=icon]:hidden", children: item.title })
          ]
        }
      )
    }
  ) });
}
function SidebarCollapseButton() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  return /* @__PURE__ */ jsxs(
    Button,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      onClick: toggleSidebar,
      className: "h-9 w-full justify-start gap-2 px-2.5 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
      title: collapsed ? "Expandir menu" : "Recolher menu",
      children: [
        collapsed ? /* @__PURE__ */ jsx(ChevronRight, { className: "size-[1.2rem] shrink-0" }) : /* @__PURE__ */ jsx(ChevronLeft, { className: "size-[1.2rem] shrink-0" }),
        /* @__PURE__ */ jsx("span", { className: "text-sm group-data-[collapsible=icon]:hidden", children: isMobile ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu" })
      ]
    }
  );
}
function ClinicSidebar() {
  const { profile, tenant } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!profile) return null;
  const groups = NAV[profile.role];
  return /* @__PURE__ */ jsxs(Sidebar, { collapsible: "icon", className: "border-r border-sidebar-border", children: [
    /* @__PURE__ */ jsx(SidebarHeader, { className: "border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2", children: /* @__PURE__ */ jsxs(
      Link,
      {
        to: groups[0]?.items[0]?.url ?? "/",
        title: "Ir para o painel",
        "aria-label": "Ir para o painel",
        className: "flex w-full cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 transition-colors duration-200 hover:bg-sidebar-accent group-data-[collapsible=icon]:size-[2.7rem] group-data-[collapsible=icon]:justify-center",
        children: [
          /* @__PURE__ */ jsx("div", { className: "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:size-[2.7rem]", children: /* @__PURE__ */ jsx(
            Activity,
            {
              className: "size-[1.125rem] group-data-[collapsible=icon]:size-[1.35rem]",
              strokeWidth: 2.25
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 flex-col group-data-[collapsible=icon]:hidden", children: [
            /* @__PURE__ */ jsx("span", { className: "font-display text-[0.9375rem] font-semibold leading-none text-sidebar-foreground", children: "ClinicOS" }),
            /* @__PURE__ */ jsx("span", { className: "mt-1 truncate text-xs text-muted-foreground", children: tenant?.name })
          ] })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(SidebarContent, { className: "gap-0 px-2 py-3 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:items-center", children: groups.map((group) => /* @__PURE__ */ jsxs(SidebarGroup, { className: "py-1 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center", children: [
      /* @__PURE__ */ jsx(SidebarGroupLabel, { className: "px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80", children: group.label }),
      /* @__PURE__ */ jsx(SidebarGroupContent, { className: "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center", children: /* @__PURE__ */ jsx(SidebarMenu, { className: "group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1", children: group.items.map((item) => {
        const active = pathname === item.url || pathname.startsWith(item.url + "/");
        return /* @__PURE__ */ jsx(SidebarNavLink, { item, active }, item.url);
      }) }) })
    ] }, group.label)) }),
    /* @__PURE__ */ jsxs(SidebarFooter, { className: "space-y-2 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5", children: [
      /* @__PURE__ */ jsx(SidebarCollapseButton, {}),
      /* @__PURE__ */ jsx("p", { className: "px-0.5 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden", children: "Sistema de gestão clínica" })
    ] }),
    /* @__PURE__ */ jsx(SidebarRail, {})
  ] });
}
const Dialog = SheetPrimitive.Root;
const DialogPortal = SheetPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = SheetPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Fechar" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = SheetPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = SheetPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = SheetPrimitive.Description.displayName;
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}
const APPOINTMENT_TYPE_OPTIONS = [
  { value: "consultation", label: "Consulta" },
  { value: "return", label: "Retorno" },
  { value: "procedure", label: "Procedimento" },
  { value: "exam", label: "Exame" }
];
const DEFAULT_APPOINTMENT_TYPES = APPOINTMENT_TYPE_OPTIONS.map((t) => t.value);
const APPOINTMENT_TYPE_LABEL = Object.fromEntries(
  APPOINTMENT_TYPE_OPTIONS.map((t) => [t.value, t.label])
);
const APPOINTMENT_STATUS_LABEL = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
  in_progress: "Em atendimento",
  rescheduled: "Remarcado"
};
const PROFESSIONAL_AGENDA_STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendando" },
  { value: "confirmed", label: "Confirmado" },
  { value: "rescheduled", label: "Remarcado" },
  { value: "cancelled", label: "Cancelado" }
];
const PROFESSIONAL_AGENDA_STATUS_VALUES = new Set(
  PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((o) => o.value)
);
const PROFESSIONAL_AGENDA_STATUS_TRIGGER = {
  scheduled: "border-slate-200 bg-slate-100 text-slate-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rescheduled: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  in_progress: "border-blue-200 bg-blue-50 text-blue-800",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-900",
  no_show: "border-orange-200 bg-orange-50 text-orange-800"
};
const PROFESSIONAL_AGENDA_STATUS_ITEM = {
  scheduled: "border-slate-200 bg-slate-50 text-slate-700 data-[highlighted]:bg-slate-200 data-[highlighted]:text-slate-900 focus:bg-slate-200 focus:text-slate-900",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800 data-[highlighted]:bg-emerald-100 data-[highlighted]:text-emerald-900 focus:bg-emerald-100 focus:text-emerald-900",
  rescheduled: "border-amber-200 bg-amber-50 text-amber-800 data-[highlighted]:bg-amber-100 data-[highlighted]:text-amber-900 focus:bg-amber-100 focus:text-amber-900",
  cancelled: "border-red-200 bg-red-50 text-red-800 data-[highlighted]:bg-red-100 data-[highlighted]:text-red-900 focus:bg-red-100 focus:text-red-900"
};
function appointmentStatusLabel(status) {
  if (!status) return "—";
  return APPOINTMENT_STATUS_LABEL[status] ?? status;
}
function resolveAppointmentTypes(types) {
  const valid = new Set(DEFAULT_APPOINTMENT_TYPES);
  const filtered = (types ?? DEFAULT_APPOINTMENT_TYPES).filter(
    (t) => valid.has(t)
  );
  return filtered.length > 0 ? filtered : [...DEFAULT_APPOINTMENT_TYPES];
}
function isOpsStaff(role) {
  return role === "admin" || role === "receptionist";
}
function isFinancialStaff(role) {
  return isOpsStaff(role) || role === "financial";
}
const RECENT_KEY = "clinicos:recent_patients";
const RECENT_SEARCH_KEY = "clinicos:recent_searches";
function getRecents() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecentPatient(p) {
  const cur = getRecents().filter((r) => r.id !== p.id);
  const next = [p, ...cur].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
function getRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecentSearch(term) {
  const t = term.trim();
  if (!t) return;
  const cur = getRecentSearches().filter((r) => r !== t);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify([t, ...cur].slice(0, 10)));
}
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [recents, setRecents] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const inputRef = useRef(null);
  const ops = profile ? isOpsStaff(profile.role) : false;
  const isPro = profile?.role === "professional";
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) {
      setRecents(getRecents());
      setRecentSearches(getRecentSearches());
      setQ("");
      setItems([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  useEffect(() => {
    if (!q.trim() || !profile) {
      setItems([]);
      return;
    }
    const term = q.trim();
    const t = setTimeout(async () => {
      const cpfDigits = term.replace(/\D/g, "");
      const orParts = [`full_name.ilike.%${term}%`];
      if (cpfDigits.length >= 3) orParts.push(`cpf.ilike.%${cpfDigits}%`);
      let apptsQuery = supabase.from("appointments").select("id, date, start_time, status, patients!inner(full_name), profiles!appointments_professional_id_fkey(full_name)").ilike("patients.full_name", `%${term}%`).order("date", { ascending: false }).limit(5);
      if (isPro) apptsQuery = apptsQuery.eq("professional_id", profile.id);
      const [{ data: pData }, { data: aData }, { data: profData }] = await Promise.all([
        supabase.from("patients").select("id, full_name, cpf, phone").or(orParts.join(",")).eq("active", true).limit(5),
        apptsQuery,
        ops ? supabase.from("profiles").select("id, full_name, specialty").ilike("full_name", `%${term}%`).eq("role", "professional").limit(5) : Promise.resolve({ data: [] })
      ]);
      const merged = [
        ...(pData ?? []).map((d) => ({ kind: "patient", data: d })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(aData ?? []).map((d) => ({ kind: "appointment", data: { id: d.id, date: d.date, start_time: d.start_time, status: d.status, patient_name: d.patients?.full_name ?? "—", professional_name: d.profiles?.full_name ?? "—" } })),
        ...(profData ?? []).map((d) => ({ kind: "professional", data: d }))
      ];
      setItems(merged);
      setActive(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q, profile, ops, isPro]);
  const list = useMemo(
    () => q.trim() ? items : recents.map((d) => ({ kind: "patient", data: d })),
    [q, items, recents]
  );
  const go = (item) => {
    pushRecentSearch(q);
    setOpen(false);
    if (item.kind === "patient") {
      pushRecentPatient(item.data);
      if (isPro) {
        navigate({ to: "/professional/patients/$id/record", params: { id: item.data.id } });
      } else {
        navigate({ to: "/reception/pacientes/$id", params: { id: item.data.id } });
      }
    } else if (item.kind === "appointment") {
      navigate({ to: isPro ? "/professional/dashboard" : "/reception/agenda" });
    } else {
      navigate({ to: "/admin/settings" });
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-xl p-0 gap-0 overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b px-3 py-2", children: [
      /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsx(
        Input,
        {
          ref: inputRef,
          value: q,
          onChange: (e) => setQ(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, list.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && list[active]) {
              e.preventDefault();
              go(list[active]);
            }
          },
          placeholder: "Buscar pacientes, agendamentos, profissionais...",
          className: "border-0 focus-visible:ring-0 shadow-none"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "max-h-96 overflow-y-auto p-2", children: [
      !q.trim() && recentSearches.length > 0 && /* @__PURE__ */ jsxs("div", { className: "px-2 pb-2", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase mb-1", children: "Buscas recentes" }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: recentSearches.map((r) => /* @__PURE__ */ jsx("button", { onClick: () => setQ(r), className: "text-xs px-2 py-1 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground", children: r }, r)) })
      ] }),
      list.length === 0 && /* @__PURE__ */ jsx("div", { className: "px-3 py-6 text-center text-sm text-muted-foreground", children: q.trim() ? "Nada encontrado" : "Digite para buscar pacientes, agendamentos ou profissionais" }),
      ["patient", "appointment", "professional"].map((kind) => {
        const subset = list.filter((l) => l.kind === kind);
        if (subset.length === 0) return null;
        const label = kind === "patient" ? "Pacientes" : kind === "appointment" ? "Agendamentos" : "Profissionais";
        return /* @__PURE__ */ jsxs("div", { className: "mb-2", children: [
          /* @__PURE__ */ jsx("div", { className: "px-2 py-1 text-xs font-semibold text-muted-foreground uppercase", children: label }),
          subset.map((it) => {
            const i = list.indexOf(it);
            if (it.kind === "patient") {
              const p = it.data;
              return /* @__PURE__ */ jsxs("button", { onMouseEnter: () => setActive(i), onClick: () => go(it), className: `w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`, children: [
                /* @__PURE__ */ jsx("div", { className: `h-9 w-9 rounded-full grid place-items-center text-white text-xs font-semibold ${avatarColor(p.full_name)}`, children: initials$1(p.full_name) || /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: p.full_name }),
                  /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground truncate", children: [
                    p.cpf ? maskCPF(p.cpf) : "—",
                    " · ",
                    p.phone ? maskPhone$1(p.phone) : "Sem telefone"
                  ] })
                ] })
              ] }, `p-${p.id}`);
            } else if (it.kind === "appointment") {
              const a = it.data;
              return /* @__PURE__ */ jsxs("button", { onMouseEnter: () => setActive(i), onClick: () => go(it), className: `w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`, children: [
                /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-full grid place-items-center bg-blue-100 text-blue-700", children: /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxs("div", { className: "text-sm font-medium truncate", children: [
                    new Date(a.date).toLocaleDateString("pt-BR"),
                    " ",
                    a.start_time.slice(0, 5),
                    " — ",
                    a.patient_name
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground truncate flex gap-2 items-center", children: [
                    a.professional_name,
                    " ",
                    /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-[10px]", children: appointmentStatusLabel(a.status) })
                  ] })
                ] })
              ] }, `a-${a.id}`);
            } else {
              const p = it.data;
              return /* @__PURE__ */ jsxs("button", { onMouseEnter: () => setActive(i), onClick: () => go(it), className: `w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`, children: [
                /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-full grid place-items-center bg-emerald-100 text-emerald-700", children: /* @__PURE__ */ jsx(Stethoscope, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: p.full_name }),
                  /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: p.specialty ?? "Profissional" })
                ] })
              ] }, `pr-${p.id}`);
            }
          })
        ] }, kind);
      })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "border-t px-3 py-2 text-xs text-muted-foreground flex justify-between", children: [
      /* @__PURE__ */ jsx("span", { children: "↑↓ navegar · ↵ abrir · Esc fechar" }),
      /* @__PURE__ */ jsx("span", { children: "⌘K" })
    ] })
  ] }) });
}
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  PopoverPrimitive.Content,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (n) => BRL.format(Number(n ?? 0));
const parseBRLInput = (s) => {
  const clean = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};
const fmtDate = (s) => {
  if (!s) return "—";
  const d = /* @__PURE__ */ new Date(s + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
};
const isOverdue = (due, status) => (status === "pending" || status === "partial") && /* @__PURE__ */ new Date(due + "T00:00:00") < new Date((/* @__PURE__ */ new Date()).toDateString());
const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "pix", label: "Pix", icon: "📱" },
  { value: "credit_card", label: "Crédito", icon: "💳" },
  { value: "debit_card", label: "Débito", icon: "💳" },
  { value: "health_insurance", label: "Convênio", icon: "🏥" },
  { value: "bank_transfer", label: "Transferência", icon: "🏦" },
  { value: "other", label: "Outro", icon: "•" }
];
const PAYMENT_LABEL = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));
const BILL_STATUS_LABEL = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencida",
  cancelled: "Cancelada"
};
const BILL_STATUS_CLASS = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700"
};
const BUDGET_STATUS_LABEL = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado"
};
const BUDGET_STATUS_CLASS = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700"
};
const READ_KEY = "notif:read";
function getRead() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function setRead(v) {
  localStorage.setItem(READ_KEY, JSON.stringify(v));
}
let cachedNotifs = null;
let cachedAt = 0;
const ICONS = {
  appointment: { icon: Clock, color: "text-amber-500 bg-amber-100" },
  bill: { icon: AlertCircle, color: "text-red-500 bg-red-100" },
  stock: { icon: Package, color: "text-orange-500 bg-orange-100" },
  birthday: { icon: Cake, color: "text-pink-500 bg-pink-100" }
};
function NotificationsBell() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [read, setReadState] = useState({});
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  async function load() {
    if (!profile) return;
    setReadState(getRead());
    const now = /* @__PURE__ */ new Date();
    const today = now.toISOString().slice(0, 10);
    const hhmm = now.toTimeString().slice(0, 5);
    const list = [];
    const ops = isOpsStaff(profile.role);
    const financial = isFinancialStaff(profile.role);
    const isPro = profile.role === "professional";
    let lateApptsQuery = supabase.from("appointments").select("id, start_time, status, patients(full_name), profiles!appointments_professional_id_fkey(full_name)").eq("date", today).in("status", ["scheduled", "confirmed"]).lt("start_time", hhmm).limit(20);
    if (isPro) lateApptsQuery = lateApptsQuery.eq("professional_id", profile.id);
    let overdueBillsQuery = financial ? supabase.from("bills_receivable").select("id, amount, due_date, patients(full_name)").eq("status", "pending").lt("due_date", today).limit(20) : null;
    if (overdueBillsQuery && isPro) overdueBillsQuery = overdueBillsQuery.eq("professional_id", profile.id);
    const [lateApptsRes, overdueBillsRes, lowStockRes, ptsRes] = await Promise.all([
      ops || isPro ? lateApptsQuery : Promise.resolve({ data: [] }),
      overdueBillsQuery ?? Promise.resolve({ data: [] }),
      financial ? supabase.from("inventory_items").select("id, name, current_stock, min_stock, unit").limit(50) : Promise.resolve({ data: [] }),
      ops ? supabase.from("patients").select("id, full_name, birth_date").not("birth_date", "is", null).limit(500) : Promise.resolve({ data: [] })
    ]);
    (lateApptsRes.data ?? []).forEach((a) => {
      list.push({
        key: `appt:${a.id}`,
        type: "appointment",
        title: `Consulta de ${a.patients?.full_name ?? "—"} com ${a.profiles?.full_name ?? "—"} era às ${a.start_time.slice(0, 5)} e ainda não foi iniciada`,
        href: isPro ? "/professional/dashboard" : "/reception/agenda"
      });
    });
    (overdueBillsRes.data ?? []).forEach((b) => {
      list.push({ key: `bill:${b.id}`, type: "bill", title: `Cobrança de ${fmt(b.amount)} para ${b.patients?.full_name ?? "—"} venceu em ${new Date(b.due_date).toLocaleDateString("pt-BR")}`, href: "/financial/receivables" });
    });
    (lowStockRes.data ?? []).filter((i) => i.current_stock <= i.min_stock).slice(0, 20).forEach((i) => {
      list.push({ key: `stock:${i.id}`, type: "stock", title: `${i.name} com estoque baixo: ${i.current_stock} ${i.unit} (mínimo: ${i.min_stock})`, href: "/financial/inventory" });
    });
    (ptsRes.data ?? []).forEach((p) => {
      const d = new Date(p.birth_date);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
        list.push({ key: `bday:${p.id}:${today}`, type: "birthday", title: `Hoje é aniversário de ${p.full_name}`, href: "/reception/marketing" });
      }
    });
    setNotifs(list);
    cachedNotifs = list;
    cachedAt = Date.now();
  }
  useEffect(() => {
    setReadState(getRead());
    if (cachedNotifs && Date.now() - cachedAt < 6e4) {
      setNotifs(cachedNotifs);
    } else {
      const w = window;
      const handle = w.requestIdleCallback ? w.requestIdleCallback(() => load(), { timeout: 2e3 }) : window.setTimeout(load, 300);
      const t2 = setInterval(load, 5 * 6e4);
      return () => {
        clearInterval(t2);
        if (w.cancelIdleCallback) w.cancelIdleCallback(handle);
        else clearTimeout(handle);
      };
    }
    const t = setInterval(load, 5 * 6e4);
    return () => clearInterval(t);
  }, []);
  const unread = notifs.filter((n) => !read[n.key]).length;
  function go(n) {
    const next = { ...read, [n.key]: true };
    setRead(next);
    setReadState(next);
    setOpen(false);
    navigate({ to: n.href });
  }
  function markAll() {
    const next = { ...read };
    notifs.forEach((n) => {
      next[n.key] = true;
    });
    setRead(next);
    setReadState(next);
  }
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: (v) => {
    setOpen(v);
    if (v) load();
  }, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", className: "relative", children: [
      /* @__PURE__ */ jsx(Bell, { className: "size-5" }),
      unread > 0 && /* @__PURE__ */ jsx("span", { className: "absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center", children: unread > 9 ? "9+" : unread })
    ] }) }),
    /* @__PURE__ */ jsxs(PopoverContent, { align: "end", className: "w-[320px] p-0 max-h-[420px] overflow-hidden flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-3 border-b flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold text-sm", children: "Notificações" }),
        notifs.length > 0 && unread > 0 && /* @__PURE__ */ jsx("button", { className: "text-xs text-primary hover:underline", onClick: markAll, children: "Marcar tudo como lido" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: notifs.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-10 flex flex-col items-center gap-2 text-muted-foreground text-sm", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "size-8 text-green-500" }),
        "Tudo em dia!"
      ] }) : notifs.map((n) => {
        const { icon: Icon, color } = ICONS[n.type];
        const isRead = !!read[n.key];
        return /* @__PURE__ */ jsxs("button", { onClick: () => go(n), className: `w-full text-left px-3 py-2 hover:bg-muted flex gap-2 border-b last:border-0 ${isRead ? "opacity-60" : "bg-primary/5"}`, children: [
          /* @__PURE__ */ jsx("div", { className: `size-8 rounded-full flex items-center justify-center shrink-0 ${color}`, children: /* @__PURE__ */ jsx(Icon, { className: "size-4" }) }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 text-xs", children: n.title })
        ] }, n.key);
      }) })
    ] })
  ] });
}
const ROLE_LABEL = {
  admin: "Administrador",
  receptionist: "Recepção",
  professional: "Profissional",
  financial: "Financeiro"
};
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}
function DashboardShell({
  title,
  children,
  fullWidth
}) {
  const { profile, tenant, signOut } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    clearKeepAliveCache();
    await signOut();
    navigate({ to: "/login", replace: true });
  };
  return /* @__PURE__ */ jsxs(SidebarProvider, { children: [
    /* @__PURE__ */ jsx(ClinicSidebar, {}),
    /* @__PURE__ */ jsxs(SidebarInset, { className: "min-h-dvh bg-background", children: [
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "#main-content",
          className: "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground",
          children: "Ir para o conteúdo"
        }
      ),
      /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-20 flex h-[3.25rem] items-center gap-3 border-b border-border bg-card px-4 lg:px-6", children: [
        /* @__PURE__ */ jsx(
          SidebarTrigger,
          {
            className: "size-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground",
            title: "Recolher ou expandir menu (⌘B)"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "hidden h-5 w-px bg-border sm:block", "aria-hidden": true }),
        /* @__PURE__ */ jsx("nav", { "aria-label": "Contexto da página", className: "hidden min-w-0 sm:block", children: /* @__PURE__ */ jsxs("ol", { className: "flex items-center gap-1.5 text-sm", children: [
          /* @__PURE__ */ jsx("li", { className: "truncate text-muted-foreground", children: tenant?.name }),
          /* @__PURE__ */ jsx("li", { className: "text-muted-foreground/60", "aria-hidden": true, children: "/" }),
          /* @__PURE__ */ jsx("li", { className: "truncate font-medium text-foreground", children: title })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-1.5 sm:gap-2", children: [
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              className: "hidden h-9 gap-2 text-muted-foreground md:inline-flex",
              onClick: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })),
              children: [
                /* @__PURE__ */ jsx(Search, { className: "size-4" }),
                /* @__PURE__ */ jsx("span", { children: "Buscar" }),
                /* @__PURE__ */ jsx("kbd", { className: "pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline", children: "⌘K" })
              ]
            }
          ),
          /* @__PURE__ */ jsx(NotificationsBell, {}),
          profile && /* @__PURE__ */ jsx("span", { className: "hidden rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground lg:inline", children: ROLE_LABEL[profile.role] }),
          /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsxs(
              DropdownMenuTrigger,
              {
                className: "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "aria-label": "Menu da conta",
                children: [
                  /* @__PURE__ */ jsx(Avatar, { className: "size-8", children: /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-primary/10 text-xs font-semibold text-primary", children: profile ? initials(profile.full_name) : /* @__PURE__ */ jsx(User, { className: "size-4" }) }) }),
                  /* @__PURE__ */ jsx("span", { className: "hidden max-w-[10rem] truncate text-sm font-medium text-foreground md:inline", children: profile?.full_name })
                ]
              }
            ),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [
              /* @__PURE__ */ jsx(DropdownMenuLabel, { children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsx("span", { className: "font-medium", children: profile?.full_name }),
                /* @__PURE__ */ jsx("span", { className: "text-xs font-normal text-muted-foreground", children: profile?.email })
              ] }) }),
              /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsxs(
                DropdownMenuItem,
                {
                  onClick: handleLogout,
                  className: "cursor-pointer text-destructive focus:text-destructive",
                  children: [
                    /* @__PURE__ */ jsx(LogOut, { className: "mr-2 size-4" }),
                    "Sair"
                  ]
                }
              )
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "main",
        {
          id: "main-content",
          className: cn(
            "app-canvas flex-1",
            fullWidth ? "px-3 py-3 lg:px-4 lg:py-4" : "px-4 py-6 lg:px-8 lg:py-8"
          ),
          children: /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "mx-auto w-full",
                fullWidth ? "max-w-none space-y-3" : "max-w-7xl space-y-8"
              ),
              children
            }
          )
        }
      ),
      /* @__PURE__ */ jsx(CommandPalette, {})
    ] })
  ] });
}
const Card = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      className: cn("rounded-lg border border-border/80 bg-card text-card-foreground shadow-sm", className),
      ...props
    }
  )
);
Card.displayName = "Card";
const CardHeader = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props })
);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      className: cn("font-display font-semibold leading-none", className),
      ...props
    }
  )
);
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm text-muted-foreground", className), ...props })
);
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("flex items-center p-6 pt-0", className), ...props })
);
CardFooter.displayName = "CardFooter";
const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(SelectPrimitive.Icon, { asChild: true, children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" }) })
    ]
  }
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollUpButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
  }
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.ScrollDownButton,
  {
    ref,
    className: cn("flex cursor-default items-center justify-center py-1", className),
    ...props,
    children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
  }
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
  SelectPrimitive.Content,
  {
    ref,
    className: cn(
      "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
      position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
      className
    ),
    position,
    ...props,
    children: [
      /* @__PURE__ */ jsx(SelectScrollUpButton, {}),
      /* @__PURE__ */ jsx(
        SelectPrimitive.Viewport,
        {
          className: cn(
            "p-1",
            position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          ),
          children
        }
      ),
      /* @__PURE__ */ jsx(SelectScrollDownButton, {})
    ]
  }
) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", className),
    ...props
  }
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  SelectPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground focus:bg-primary focus:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })
    ]
  }
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SelectPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
const Table = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsx("table", { ref, className: cn("w-full caption-bottom text-sm", className), ...props }) })
);
Table.displayName = "Table";
const TableHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("thead", { ref, className: cn("[&_tr]:border-b", className), ...props }));
TableHeader.displayName = "TableHeader";
const TableBody = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("tbody", { ref, className: cn("[&_tr:last-child]:border-0", className), ...props }));
TableBody.displayName = "TableBody";
const TableFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tfoot",
  {
    ref,
    className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
    ...props
  }
));
TableFooter.displayName = "TableFooter";
const TableRow = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "tr",
    {
      ref,
      className: cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      ),
      ...props
    }
  )
);
TableRow.displayName = "TableRow";
const TableHead = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "th",
  {
    ref,
    className: cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
const TableCell = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "td",
  {
    ref,
    className: cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    ),
    ...props
  }
));
TableCell.displayName = "TableCell";
const TableCaption = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("caption", { ref, className: cn("mt-4 text-sm text-muted-foreground", className), ...props }));
TableCaption.displayName = "TableCaption";
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(LabelPrimitive.Root, { ref, className: cn(labelVariants(), className), ...props }));
Label.displayName = LabelPrimitive.Root.displayName;
const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
const Command = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1,
  {
    ref,
    className: cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    ),
    ...props
  }
));
Command.displayName = Command$1.displayName;
const CommandInput = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs("div", { className: "flex items-center border-b px-3", "cmdk-input-wrapper": "", children: [
  /* @__PURE__ */ jsx(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }),
  /* @__PURE__ */ jsx(
    Command$1.Input,
    {
      ref,
      className: cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props
    }
  )
] }));
CommandInput.displayName = Command$1.Input.displayName;
const CommandList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.List,
  {
    ref,
    className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
    ...props
  }
));
CommandList.displayName = Command$1.List.displayName;
const CommandEmpty = React.forwardRef((props, ref) => /* @__PURE__ */ jsx(Command$1.Empty, { ref, className: "py-6 text-center text-sm", ...props }));
CommandEmpty.displayName = Command$1.Empty.displayName;
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Group,
  {
    ref,
    className: cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    ),
    ...props
  }
));
CommandGroup.displayName = Command$1.Group.displayName;
const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Separator,
  {
    ref,
    className: cn("-mx-1 h-px bg-border", className),
    ...props
  }
));
CommandSeparator.displayName = Command$1.Separator.displayName;
const CommandItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Command$1.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:[&_.text-muted-foreground]:text-accent-foreground/80 data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    ),
    ...props
  }
));
CommandItem.displayName = Command$1.Item.displayName;
function NewBillReceivableDialog({ open, onOpenChange, onSaved, defaultPatientId }) {
  const { tenant } = useAuth();
  const [patients, setPatients] = useState([]);
  const [pros, setPros] = useState([]);
  const [appts, setAppts] = useState([]);
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [proId, setProId] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [apptId, setApptId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [psearch, setPsearch] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: pts } = await supabase.from("patients").select("id, full_name, cpf").eq("active", true).order("full_name");
      setPatients(pts ?? []);
      const { data: prs } = await supabase.from("profiles").select("id, full_name").eq("role", "professional").order("full_name");
      setPros(prs ?? []);
    })();
  }, [open]);
  useEffect(() => {
    if (!patientId) {
      setAppts([]);
      return;
    }
    (async () => {
      const { data } = await supabase.from("appointments").select("id, date, professional_id").eq("patient_id", patientId).order("date", { ascending: false }).limit(20);
      setAppts(data ?? []);
    })();
  }, [patientId]);
  useEffect(() => {
    if (!apptId) return;
    const appt = appts.find((a) => a.id === apptId);
    if (appt?.professional_id) setProId(appt.professional_id);
  }, [apptId, appts]);
  const save = async () => {
    if (!tenant) return;
    if (!patientId || !proId || !desc || !amount || !dueDate) {
      toast.error("Preencha paciente, profissional e demais campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("bills_receivable").insert({
      tenant_id: tenant.id,
      patient_id: patientId,
      professional_id: proId,
      appointment_id: apptId || null,
      description: desc,
      amount: parseBRLInput(amount),
      due_date: dueDate,
      payment_method: method || null,
      notes: notes || null,
      status: "pending"
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cobrança criada");
    onOpenChange(false);
    onSaved();
  };
  const patient = patients.find((p) => p.id === patientId);
  const filtered = patients.filter((p) => !psearch || p.full_name.toLowerCase().includes(psearch.toLowerCase()) || (p.cpf ?? "").includes(psearch)).slice(0, 30);
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Nova cobrança" }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Paciente *" }),
        /* @__PURE__ */ jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
          /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full justify-start font-normal", children: patient ? patient.full_name : "Selecionar..." }) }),
          /* @__PURE__ */ jsx(PopoverContent, { className: "w-80 p-0", align: "start", children: /* @__PURE__ */ jsxs(Command, { shouldFilter: false, children: [
            /* @__PURE__ */ jsx(CommandInput, { placeholder: "Buscar...", value: psearch, onValueChange: setPsearch }),
            /* @__PURE__ */ jsxs(CommandList, { children: [
              /* @__PURE__ */ jsx(CommandEmpty, { children: "Nenhum" }),
              /* @__PURE__ */ jsx(CommandGroup, { children: filtered.map((p) => /* @__PURE__ */ jsx(CommandItem, { value: p.id, onSelect: () => {
                setPatientId(p.id);
                setPatientOpen(false);
              }, children: /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: "font-medium", children: p.full_name }),
                p.cpf && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: maskCPF(p.cpf) })
              ] }) }, p.id)) })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Profissional *" }),
        /* @__PURE__ */ jsxs(Select, { value: proId, onValueChange: setProId, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: pros.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.id, children: p.full_name }, p.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Descrição *" }),
        /* @__PURE__ */ jsx(Input, { value: desc, onChange: (e) => setDesc(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Valor *" }),
          /* @__PURE__ */ jsx(Input, { placeholder: "R$ 0,00", value: amount, onChange: (e) => setAmount(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Vencimento *" }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Forma de pagamento" }),
        /* @__PURE__ */ jsxs(Select, { value: method, onValueChange: setMethod, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: PAYMENT_METHODS.map((m) => /* @__PURE__ */ jsxs(SelectItem, { value: m.value, children: [
            m.icon,
            " ",
            m.label
          ] }, m.value)) })
        ] })
      ] }),
      appts.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Vincular a agendamento" }),
        /* @__PURE__ */ jsxs(Select, { value: apptId, onValueChange: setApptId, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Opcional" }) }),
          /* @__PURE__ */ jsx(SelectContent, { children: appts.map((a) => /* @__PURE__ */ jsx(SelectItem, { value: a.id, children: new Date(a.date).toLocaleDateString("pt-BR") }, a.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsx(Textarea, { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        "Total: ",
        /* @__PURE__ */ jsx("strong", { children: fmt(parseBRLInput(amount)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), children: "Cancelar" }),
      /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, children: "Salvar" })
    ] })
  ] }) });
}
const Switch = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SwitchPrimitives.Root,
  {
    className: cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    ),
    ...props,
    ref,
    children: /* @__PURE__ */ jsx(
      SwitchPrimitives.Thumb,
      {
        className: cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )
      }
    )
  }
));
Switch.displayName = SwitchPrimitives.Root.displayName;
const Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  CheckboxPrimitive.Root,
  {
    ref,
    className: cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx(CheckboxPrimitive.Indicator, { className: cn("grid place-content-center text-current"), children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
  }
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
function drawClinicHeader(doc, clinic, w, x, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clinic.name, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let yy = y + 5;
  if (clinic.address) {
    doc.text(clinic.address, x, yy);
    yy += 4;
  }
  const l2 = [clinic.phone, clinic.email].filter(Boolean).join(" · ");
  if (l2) {
    doc.text(l2, x, yy);
    yy += 4;
  }
  if (clinic.cnpj) {
    doc.text(`CNPJ: ${clinic.cnpj}`, x, yy);
    yy += 4;
  }
  doc.setDrawColor(120);
  doc.line(x, yy + 1, w - x, yy + 1);
  return yy + 6;
}
function pageStart(doc, clinic, w, h, letterhead) {
  const pad = resolvePdfPadding(letterhead);
  const x = pdfContentX(pad);
  const contentW = pdfContentW(w, pad);
  if (letterhead) {
    paintLetterhead(doc, letterhead, w, h);
    return { y: pad.top, x, pad, contentW };
  }
  const y = drawClinicHeader(doc, clinic, w, x, pad.top);
  return { y, x, pad, contentW };
}
function generateReceiptPDF(r) {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = 148;
  const H = 210;
  const { y: startY, x, contentW } = pageStart(doc, r.clinic, W, H, r.letterhead);
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECIBO DE PAGAMENTO", x + contentW / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nº ${String(r.number).padStart(6, "0")}`, x + contentW, y, { align: "right" });
  y += 8;
  doc.setFontSize(11);
  const body = `Recebi de ${r.patientName} a quantia de ${fmt(r.amount)} referente a ${r.description}.`;
  const lines = doc.splitTextToSize(body, contentW);
  doc.text(lines, x, y);
  y += lines.length * 5 + 4;
  doc.setFontSize(9);
  doc.text(
    `Forma de pagamento: ${r.paymentMethod ? PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod : "—"}`,
    x,
    y
  );
  y += 5;
  doc.text(`Data do pagamento: ${fmtDate(r.paidDate)}`, x, y);
  y += 12;
  doc.line(x + contentW * 0.2, y, x + contentW * 0.8, y);
  y += 4;
  doc.text(r.professional ?? r.clinic.name, x + contentW / 2, y, { align: "center" });
  return doc.output("blob");
}
function generateBudgetPDF(b) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const H = 297;
  const { y: startY, x, contentW, pad } = pageStart(doc, b.clinic, W, H, b.letterhead);
  let y = startY;
  const bottomLimit = H - pad.bottom;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ORÇAMENTO", x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nº ORÇ-${String(b.number).padStart(4, "0")}`, x + contentW, y, { align: "right" });
  y += 7;
  doc.setFontSize(9);
  doc.text(`Paciente: ${b.patientName}`, x, y);
  doc.text(`Data: ${fmtDate(b.date)}`, x + contentW, y, { align: "right" });
  y += 5;
  doc.text(`Profissional: ${b.professionalName}`, x, y);
  if (b.validUntil) doc.text(`Válido até: ${fmtDate(b.validUntil)}`, x + contentW, y, { align: "right" });
  y += 8;
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y - 4, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Item", x + 2, y);
  doc.text("Descrição", x + 12, y);
  doc.text("Qtd", x + contentW * 0.57, y, { align: "right" });
  doc.text("Preço Unit.", x + contentW * 0.71, y, { align: "right" });
  doc.text("Total", x + contentW - 2, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  b.items.forEach((it, i) => {
    const descW = contentW * 0.45;
    const lines = doc.splitTextToSize(it.description, descW);
    const rowH = Math.max(5, lines.length * 4.5);
    if (y + rowH > bottomLimit - 30) return;
    doc.text(String(i + 1), x + 2, y);
    doc.text(lines, x + 12, y);
    doc.text(String(it.quantity), x + contentW * 0.57, y, { align: "right" });
    doc.text(fmt(it.unit_price), x + contentW * 0.71, y, { align: "right" });
    doc.text(fmt(it.total_price), x + contentW - 2, y, { align: "right" });
    y += rowH;
  });
  y += 4;
  doc.line(x + contentW * 0.52, y, x + contentW, y);
  y += 5;
  doc.text("Subtotal:", x + contentW * 0.62, y);
  doc.text(fmt(b.subtotal), x + contentW - 2, y, { align: "right" });
  y += 5;
  doc.text("Desconto:", x + contentW * 0.62, y);
  doc.text(`- ${fmt(b.discountValue)}`, x + contentW - 2, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total Final:", x + contentW * 0.62, y);
  doc.text(fmt(b.finalValue), x + contentW - 2, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (b.validUntil) {
    doc.text(`Este orçamento é válido até ${fmtDate(b.validUntil)}.`, x, y);
    y += 5;
  }
  if (b.notes) {
    y += 2;
    if (y < bottomLimit - 20) {
      doc.setFont("helvetica", "bold");
      doc.text("Observações:", x, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const ln = doc.splitTextToSize(b.notes, contentW);
      doc.text(ln, x, y);
      y += ln.length * 4.5;
    }
  }
  const signY = Math.min(y + 12, bottomLimit - 6);
  doc.text("De acordo: _________________________________________   Data: _______________", x, signY);
  return doc.output("blob");
}
const DEFAULT_LETTERHEAD_MARGINS = {
  top: 45,
  right: 20,
  bottom: 25,
  left: 20
};
function mimeToFormat(mime) {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  return "JPEG";
}
async function loadLetterheadSettings(professionalId) {
  const { data, error } = await supabase.from("profiles").select(
    "letterhead_path,letterhead_margin_top_mm,letterhead_margin_right_mm,letterhead_margin_bottom_mm,letterhead_margin_left_mm"
  ).eq("id", professionalId).maybeSingle();
  if (error) throw new Error(error.message);
  return {
    path: data?.letterhead_path ?? null,
    margins: {
      top: Number(data?.letterhead_margin_top_mm ?? DEFAULT_LETTERHEAD_MARGINS.top),
      right: Number(data?.letterhead_margin_right_mm ?? DEFAULT_LETTERHEAD_MARGINS.right),
      bottom: Number(data?.letterhead_margin_bottom_mm ?? DEFAULT_LETTERHEAD_MARGINS.bottom),
      left: Number(data?.letterhead_margin_left_mm ?? DEFAULT_LETTERHEAD_MARGINS.left)
    }
  };
}
async function loadLetterheadForPdf(professionalId) {
  const settings = await loadLetterheadSettings(professionalId);
  if (!settings.path) {
    return { margins: settings.margins };
  }
  const { data: signed, error: signErr } = await supabase.storage.from("professional-assets").createSignedUrl(settings.path, 120);
  if (signErr || !signed?.signedUrl) {
    return { margins: settings.margins };
  }
  const response = await fetch(signed.signedUrl);
  if (!response.ok) {
    return { margins: settings.margins };
  }
  const blob = await response.blob();
  const compressed = await compressLetterheadImage(blob);
  return {
    imageData: compressed.base64,
    format: compressed.format,
    margins: settings.margins
  };
}
const LETTERHEAD_MAX_WIDTH = 1240;
const LETTERHEAD_JPEG_QUALITY = 0.82;
async function compressLetterheadImage(blob) {
  if (typeof document === "undefined") {
    const base64 = await blobToBase64(blob);
    return { base64, format: mimeToFormat(blob.type || "image/png") };
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, LETTERHEAD_MAX_WIDTH / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const base64 = await blobToBase64(blob);
      return { base64, format: mimeToFormat(blob.type || "image/png") };
    }
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", LETTERHEAD_JPEG_QUALITY);
    return { base64: dataUrl.split(",")[1] ?? "", format: "JPEG" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erro ao carregar imagem do papel timbrado"));
    img.src = src;
  });
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Erro ao ler imagem do papel timbrado"));
    reader.readAsDataURL(blob);
  });
}
function letterheadStoragePath(professionalId, fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "png";
  return `${professionalId}/letterhead.${ext}`;
}
function resolveLetterheadProfessionalId(profile, explicitId) {
  if (explicitId) return explicitId;
  if (profile?.role === "professional") return profile.id;
  return null;
}
function splitInstallmentAmounts(total, count) {
  if (count <= 1) return [total];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const extra = cents % count;
  return Array.from({ length: count }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
}
function buildInstallmentDueDates(firstDue, count, intervalMonths = 1) {
  const base = /* @__PURE__ */ new Date(firstDue + "T12:00:00");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i * intervalMonths);
    return d.toISOString().slice(0, 10);
  });
}
function previewInstallments(total, firstDue, count, intervalMonths = 1) {
  const amounts = splitInstallmentAmounts(total, count);
  const dates = buildInstallmentDueDates(firstDue, count, intervalMonths);
  return amounts.map((amount, i) => ({
    number: i + 1,
    amount,
    dueDate: dates[i]
  }));
}
async function createStandaloneSale(patientId, items, dueDate, options) {
  const { data, error } = await supabase.rpc("create_standalone_sale", {
    p_patient_id: patientId,
    p_items: items,
    p_due_date: dueDate,
    p_notes: options?.notes ?? null,
    p_installment_count: options?.installmentCount ?? 1,
    p_installment_interval_months: options?.installmentIntervalMonths ?? 1
  });
  if (error) throw new Error(error.message);
  return data;
}
async function updateStandaloneSale(billId, items, dueDate, options) {
  const { data, error } = await supabase.rpc("update_standalone_sale", {
    p_bill_id: billId,
    p_items: items,
    p_due_date: dueDate,
    p_notes: options?.notes ?? null,
    p_installment_count: options?.installmentCount ?? null,
    p_installment_interval_months: options?.installmentIntervalMonths ?? 1
  });
  if (error) throw new Error(error.message);
  return data;
}
async function reverseSale(billId, reason) {
  const { data, error } = await supabase.rpc("reverse_sale", {
    p_bill_id: billId,
    p_reason: reason
  });
  if (error) throw new Error(error.message);
  return data;
}
async function deleteBill(billId) {
  const { data, error } = await supabase.rpc("delete_bill", {
    p_bill_id: billId
  });
  if (error) throw new Error(error.message);
  return data;
}
async function receiveBillPayment(billId, amount, method, paidDate, notes) {
  const { data, error } = await supabase.rpc("receive_bill_payment", {
    p_bill_id: billId,
    p_amount: amount,
    p_method: method,
    p_paid_date: paidDate,
    p_notes: notes ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}
function billHasSaleItems(row) {
  return Boolean(row.consultation_charge_id);
}
function billIsInstallment(row) {
  return row.installment_count != null && row.installment_count > 1;
}
function billIsEditable(row) {
  return row.status === "pending" && Number(row.paid_amount) === 0 && !row.budget_id && billHasSaleItems(row);
}
function billCanReverse(row) {
  return row.status !== "cancelled" && Number(row.paid_amount) === 0;
}
function billCanDelete(row) {
  return row.status !== "cancelled" && Number(row.paid_amount) === 0 && !billHasSaleItems(row);
}
function billCanReceive(row) {
  return row.status !== "cancelled" && row.status !== "paid" && Number(row.amount) > Number(row.paid_amount);
}
async function loadSaleChargeItems(billId) {
  const { data: bill } = await supabase.from("bills_receivable").select("consultation_charge_id").eq("id", billId).maybeSingle();
  let chargeId = bill?.consultation_charge_id ?? null;
  if (!chargeId) {
    const { data: charge } = await supabase.from("consultation_charges").select("id").eq("bill_receivable_id", billId).maybeSingle();
    chargeId = charge?.id ?? null;
  }
  if (!chargeId) return [];
  const { data, error } = await supabase.from("consultation_charge_items").select(
    "id, service_id, quantity, unit_price, total_price, item_type, services(name, session_count)"
  ).eq("charge_id", chargeId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}
function ReceivePaymentDialog({ open, onOpenChange, onSaved, defaultPatientId }) {
  const { tenant, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [psearch, setPsearch] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [bills, setBills] = useState([]);
  const [selected, setSelected] = useState({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidDate, setPaidDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [partial, setPartial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelected({});
    setAmount("");
    setNotes("");
    setPartial(false);
    setDone(null);
    if (defaultPatientId) setPatientId(defaultPatientId);
    (async () => {
      const { data } = await supabase.from("patients").select("id, full_name").eq("active", true).order("full_name");
      setPatients(data ?? []);
    })();
  }, [open, defaultPatientId]);
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      const { data } = await supabase.from("bills_receivable").select("id, description, amount, paid_amount, due_date, status, receipt_number, professional_id, profiles(full_name)").eq("patient_id", patientId).in("status", ["pending", "partial", "overdue"]).order("due_date");
      setBills(data ?? []);
    })();
  }, [patientId]);
  const selectedBills = bills.filter((b) => selected[b.id]);
  const totalSelected = useMemo(() => selectedBills.reduce((s, b) => s + (Number(b.amount) - Number(b.paid_amount)), 0), [selectedBills]);
  useEffect(() => {
    if (step === 3 && !amount) setAmount(totalSelected.toFixed(2).replace(".", ","));
  }, [step, totalSelected, amount]);
  const patient = patients.find((p) => p.id === patientId);
  const filtered = patients.filter((p) => !psearch || p.full_name.toLowerCase().includes(psearch.toLowerCase())).slice(0, 30);
  const confirm = async () => {
    if (!tenant || selectedBills.length === 0) return;
    setSaving(true);
    try {
      const received = parseBRLInput(amount);
      let remaining = received;
      for (const b of selectedBills) {
        const outstanding = Number(b.amount) - Number(b.paid_amount);
        const pay = partial ? Math.min(remaining, outstanding) : outstanding;
        if (pay <= 0) continue;
        await receiveBillPayment(b.id, pay, method, paidDate, notes || void 0);
        remaining -= pay;
        if (partial && remaining <= 0) break;
      }
      const { data: tdata } = await supabase.from("tenants").select("name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle();
      const totalReceived = received;
      const profId = resolveLetterheadProfessionalId(profile, selectedBills[0].professional_id);
      const letterhead = profId ? await loadLetterheadForPdf(profId) : { margins: DEFAULT_LETTERHEAD_MARGINS };
      const blob = generateReceiptPDF({
        clinic: { name: tdata?.name ?? tenant.name, address: tdata?.address, phone: tdata?.phone, email: tdata?.email, cnpj: tdata?.cnpj },
        number: selectedBills[0].receipt_number,
        patientName: patient?.full_name ?? "",
        description: selectedBills.map((b) => b.description).join(", "),
        amount: totalReceived,
        paymentMethod: method,
        paidDate,
        professional: selectedBills[0].profiles?.full_name ?? null,
        letterhead
      });
      const url = URL.createObjectURL(blob);
      setDone({ pdfUrl: url });
      toast.success("Pagamento registrado");
      onSaved();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (v) => {
    if (!v && done) URL.revokeObjectURL(done.pdfUrl);
    onOpenChange(v);
  }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
      "Receber pagamento — passo ",
      step,
      "/4"
    ] }) }),
    step === 1 && /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx(Label, { children: "Paciente" }),
      /* @__PURE__ */ jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
        /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full justify-start font-normal", children: patient ? patient.full_name : "Selecionar..." }) }),
        /* @__PURE__ */ jsx(PopoverContent, { className: "w-80 p-0", align: "start", children: /* @__PURE__ */ jsxs(Command, { shouldFilter: false, children: [
          /* @__PURE__ */ jsx(CommandInput, { placeholder: "Buscar...", value: psearch, onValueChange: setPsearch }),
          /* @__PURE__ */ jsxs(CommandList, { children: [
            /* @__PURE__ */ jsx(CommandEmpty, { children: "Nenhum" }),
            /* @__PURE__ */ jsx(CommandGroup, { children: filtered.map((p) => /* @__PURE__ */ jsx(CommandItem, { value: p.id, onSelect: () => {
              setPatientId(p.id);
              setPatientOpen(false);
            }, children: p.full_name }, p.id)) })
          ] })
        ] }) })
      ] })
    ] }),
    step === 2 && /* @__PURE__ */ jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: bills.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground py-6 text-center", children: "Nenhuma cobrança aberta para este paciente" }) : bills.map((b) => /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50", children: [
      /* @__PURE__ */ jsx(Checkbox, { checked: !!selected[b.id], onCheckedChange: (v) => setSelected((s) => ({ ...s, [b.id]: !!v })) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: b.description }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
          "Vence ",
          fmtDate(b.due_date),
          " · resta ",
          fmt(Number(b.amount) - Number(b.paid_amount))
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "font-semibold", children: fmt(b.amount) })
    ] }, b.id)) }),
    step === 3 && /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Valor recebido" }),
        /* @__PURE__ */ jsx(Input, { value: amount, onChange: (e) => setAmount(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Forma de pagamento" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: PAYMENT_METHODS.filter((m) => m.value !== "other").map((m) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setMethod(m.value),
            className: `p-2 rounded-md border-2 text-sm ${method === m.value ? "border-primary bg-primary/5" : "border-border"}`,
            children: [
              /* @__PURE__ */ jsx("div", { className: "text-lg", children: m.icon }),
              m.label
            ]
          },
          m.value
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Data do pagamento" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: paidDate, onChange: (e) => setPaidDate(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Switch, { checked: partial, onCheckedChange: setPartial }),
        /* @__PURE__ */ jsx(Label, { children: "Pagamento parcial" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { children: "Observações" }),
        /* @__PURE__ */ jsx(Input, { value: notes, onChange: (e) => setNotes(e.target.value) })
      ] })
    ] }),
    step === 4 && /* @__PURE__ */ jsx("div", { className: "space-y-3", children: done ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 text-sm", children: [
      /* @__PURE__ */ jsxs("p", { children: [
        "Pagamento de ",
        /* @__PURE__ */ jsx("strong", { children: fmt(parseBRLInput(amount)) }),
        " registrado com sucesso."
      ] }),
      /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => window.open(done.pdfUrl, "_blank"), children: [
        /* @__PURE__ */ jsx(Printer, { className: "h-4 w-4 mr-2" }),
        "Imprimir Recibo"
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
      /* @__PURE__ */ jsxs("p", { children: [
        /* @__PURE__ */ jsx("strong", { children: selectedBills.length }),
        " cobrança(s) selecionada(s)"
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Valor a receber: ",
        /* @__PURE__ */ jsx("strong", { children: fmt(parseBRLInput(amount)) })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Forma: ",
        /* @__PURE__ */ jsx("strong", { children: PAYMENT_METHODS.find((m) => m.value === method)?.label })
      ] }),
      /* @__PURE__ */ jsxs("p", { children: [
        "Data: ",
        /* @__PURE__ */ jsx("strong", { children: fmtDate(paidDate) })
      ] }),
      partial && /* @__PURE__ */ jsx("p", { className: "text-orange-600", children: "Pagamento parcial — saldo remanescente continuará em aberto." })
    ] }) }),
    /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2", children: [
      step > 1 && !done && /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setStep((s) => s - 1), children: "Voltar" }),
      step === 1 && /* @__PURE__ */ jsx(Button, { onClick: () => patientId && setStep(2), disabled: !patientId, children: "Continuar" }),
      step === 2 && /* @__PURE__ */ jsx(Button, { onClick: () => selectedBills.length > 0 && setStep(3), disabled: selectedBills.length === 0, children: "Continuar" }),
      step === 3 && /* @__PURE__ */ jsx(Button, { onClick: () => setStep(4), children: "Continuar" }),
      step === 4 && !done && /* @__PURE__ */ jsx(Button, { onClick: confirm, disabled: saving, children: "Confirmar Recebimento" }),
      done && /* @__PURE__ */ jsx(Button, { onClick: () => onOpenChange(false), children: "Fechar" })
    ] })
  ] }) });
}
const Route$n = createFileRoute("/_authenticated/financial/receivables")({ component: Page });
function Page() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const load = async () => {
    let qy = supabase.from("bills_receivable").select("id, description, amount, due_date, payment_method, status, patients(full_name), profiles:professional_id(full_name)", { count: "exact" }).order("due_date", { ascending: false }).range(page * 20, page * 20 + 19);
    if (status !== "all") qy = qy.eq("status", status);
    if (from) qy = qy.gte("due_date", from);
    if (to) qy = qy.lte("due_date", to);
    if (q) qy = qy.ilike("description", `%${q}%`);
    const { data, count } = await qy;
    setRows(data ?? []);
    setTotal(count ?? 0);
  };
  useEffect(() => {
    load();
  }, [page, status, from, to, q]);
  const exportCsv = () => {
    const head = "Paciente,Descricao,Valor,Vencimento,Forma,Situacao\n";
    const body = rows.map((r) => [r.patients?.full_name ?? "", r.description, r.amount, r.due_date, r.payment_method ?? "", r.status].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Contas a Receber", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
          /* @__PURE__ */ jsx(Input, { placeholder: "Buscar descrição", value: q, onChange: (e) => {
            setPage(0);
            setQ(e.target.value);
          }, className: "w-56" }),
          /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: (v) => {
            setPage(0);
            setStatus(v);
          }, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos status" }),
              Object.entries(BILL_STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k))
            ] })
          ] }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: from, onChange: (e) => {
            setPage(0);
            setFrom(e.target.value);
          }, className: "w-40" }),
          /* @__PURE__ */ jsx(Input, { type: "date", value: to, onChange: (e) => {
            setPage(0);
            setTo(e.target.value);
          }, className: "w-40" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: exportCsv, children: [
            /* @__PURE__ */ jsx(Download, { className: "h-4 w-4 mr-2" }),
            "Planilha"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setRecvOpen(true), children: [
            /* @__PURE__ */ jsx(HandCoins, { className: "h-4 w-4 mr-2" }),
            "Receber Pagamento"
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: () => setNewOpen(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }),
            "Nova Cobrança"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "text-center text-muted-foreground py-10", children: "Nenhuma cobrança" }) }) : rows.map((r) => {
          const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: r.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: r.profiles?.full_name ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: r.description }),
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: fmt(r.amount) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[eff], children: BILL_STATUS_LABEL[eff] }) })
          ] }, r.id);
        }) })
      ] }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          total,
          " registros"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: (page + 1) * 20 >= total, onClick: () => setPage((p) => p + 1), children: "Próxima" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(NewBillReceivableDialog, { open: newOpen, onOpenChange: setNewOpen, onSaved: load }),
    /* @__PURE__ */ jsx(ReceivePaymentDialog, { open: recvOpen, onOpenChange: setRecvOpen, onSaved: load })
  ] });
}
const $$splitComponentImporter$m = () => import("./financial.inventory-BFsOu0JM.js");
const Route$m = createFileRoute("/_authenticated/financial/inventory")({
  component: lazyRouteComponent($$splitComponentImporter$m, "component")
});
const $$splitComponentImporter$l = () => import("./financial.dashboard-Cn-E92Nj.js");
const Route$l = createFileRoute("/_authenticated/financial/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$l, "component")
});
const $$splitComponentImporter$k = () => import("./admin.settings-B1EtdGiO.js");
const Route$k = createFileRoute("/_authenticated/admin/settings")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("./admin.services-SWF4_ICh.js");
const Route$j = createFileRoute("/_authenticated/admin/services")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import("./admin.relatorios-Blmldg-p.js");
const Route$i = createFileRoute("/_authenticated/admin/relatorios")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import("./admin.dashboard-72OBEmhv.js");
const Route$h = createFileRoute("/_authenticated/admin/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("./reception.pacientes.index-C8ZkOeMI.js");
const Route$g = createFileRoute("/_authenticated/reception/pacientes/")({
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./professional.prescriptions.index-tMukE6zb.js");
const Route$f = createFileRoute("/_authenticated/professional/prescriptions/")({
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./professional.patients.index-Cu4wMQpz.js");
const Route$e = createFileRoute("/_authenticated/professional/patients/")({
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("./professional.financial.index-B8cOgaij.js");
const Route$d = createFileRoute("/_authenticated/professional/financial/")({
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./financial.inventory.index-Dorp_mJu.js");
const Route$c = createFileRoute("/_authenticated/financial/inventory/")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./reception.pacientes._id-BgWn9pnk.js");
const PATIENT_TABS$1 = ["dados", "consultas", "prontuarios", "prescricoes", "documentos", "financeiro"];
const Route$b = createFileRoute("/_authenticated/reception/pacientes/$id")({
  validateSearch: (search) => {
    const tab = String(search.tab ?? "dados");
    return {
      tab: PATIENT_TABS$1.includes(tab) ? tab : "dados"
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./professional.prescriptions.new-UM0RSB3c.js");
const Route$a = createFileRoute("/_authenticated/professional/prescriptions/new")({
  validateSearch: (s) => ({
    patient_id: typeof s.patient_id === "string" ? s.patient_id : void 0,
    duplicate: typeof s.duplicate === "string" ? s.duplicate : void 0,
    edit: typeof s.edit === "string" ? s.edit : void 0
  }),
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import("./professional.financial.relatorios-JF1yd-vV.js");
const Route$9 = createFileRoute("/_authenticated/professional/financial/relatorios")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./professional.financial.despesas-vY_SW7_q.js");
const Route$8 = createFileRoute("/_authenticated/professional/financial/despesas")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./professional.financial.caixa-B-5aX2Ad.js");
const Route$7 = createFileRoute("/_authenticated/professional/financial/caixa")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./financial.inventory.items-BFsOu0JM.js");
const Route$6 = createFileRoute("/_authenticated/financial/inventory/items")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./financial.inventory.categories-DZ0yjgTj.js");
const Route$5 = createFileRoute("/_authenticated/financial/inventory/categories")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./professional.patients._id.index-4tymUS1h.js");
const PATIENT_TABS = ["dados", "financeiro", "consultas", "sessoes"];
const Route$4 = createFileRoute("/_authenticated/professional/patients/$id/")({
  validateSearch: (search) => {
    const tab = String(search.tab ?? "dados");
    return {
      tab: PATIENT_TABS.includes(tab) ? tab : "dados"
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./financial.inventory.items.index-Sbx30RpU.js");
const Route$3 = createFileRoute("/_authenticated/financial/inventory/items/")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./professional.patients._id.record-t3ZseKRM.js");
const Route$2 = createFileRoute("/_authenticated/professional/patients/$id/record")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./professional.patients._id.new-evolution-BTU5dmpx.js");
const Route$1 = createFileRoute("/_authenticated/professional/patients/$id/new-evolution")({
  beforeLoad: ({
    params
  }) => {
    throw redirect({
      to: "/professional/patients/$id/record",
      params: {
        id: params.id
      }
    });
  },
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./financial.inventory.items._id-DYohwufI.js");
const Route = createFileRoute("/_authenticated/financial/inventory/items/$id")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const LoginRoute = Route$J.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$K
});
const AuthenticatedRouteRoute = Route$I.update({
  id: "/_authenticated",
  getParentRoute: () => Route$K
});
const IndexRoute = Route$H.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$K
});
const ProfessionalSafeidCallbackRoute = Route$G.update({
  id: "/professional/safeid/callback",
  path: "/professional/safeid/callback",
  getParentRoute: () => Route$K
});
const AuthenticatedReceptionPaymentsRoute = Route$F.update({
  id: "/reception/payments",
  path: "/reception/payments",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionPacientesRoute = Route$E.update({
  id: "/reception/pacientes",
  path: "/reception/pacientes",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionMensagensRoute = Route$D.update({
  id: "/reception/mensagens",
  path: "/reception/mensagens",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionMarketingRoute = Route$C.update({
  id: "/reception/marketing",
  path: "/reception/marketing",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionDashboardRoute = Route$B.update({
  id: "/reception/dashboard",
  path: "/reception/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionAgendaRoute = Route$A.update({
  id: "/reception/agenda",
  path: "/reception/agenda",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalSettingsRoute = Route$z.update({
  id: "/professional/settings",
  path: "/professional/settings",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalSessionsRoute = Route$y.update({
  id: "/professional/sessions",
  path: "/professional/sessions",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalProntuariosRoute = Route$x.update({
  id: "/professional/prontuarios",
  path: "/professional/prontuarios",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalProcedimentosRoute = Route$w.update({
  id: "/professional/procedimentos",
  path: "/professional/procedimentos",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalPrescriptionsRoute = Route$v.update({
  id: "/professional/prescriptions",
  path: "/professional/prescriptions",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalPatientsRoute = Route$u.update({
  id: "/professional/patients",
  path: "/professional/patients",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalInventoryRoute = Route$t.update({
  id: "/professional/inventory",
  path: "/professional/inventory",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalFinancialRoute = Route$s.update({
  id: "/professional/financial",
  path: "/professional/financial",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalDashboardRoute = Route$r.update({
  id: "/professional/dashboard",
  path: "/professional/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalBudgetsRoute = Route$q.update({
  id: "/professional/budgets",
  path: "/professional/budgets",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfessionalAgendaRoute = Route$p.update({
  id: "/professional/agenda",
  path: "/professional/agenda",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedFinancialRelatoriosRoute = Route$o.update({
  id: "/financial/relatorios",
  path: "/financial/relatorios",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedFinancialReceivablesRoute = Route$n.update({
  id: "/financial/receivables",
  path: "/financial/receivables",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedFinancialInventoryRoute = Route$m.update({
  id: "/financial/inventory",
  path: "/financial/inventory",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedFinancialDashboardRoute = Route$l.update({
  id: "/financial/dashboard",
  path: "/financial/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedAdminSettingsRoute = Route$k.update({
  id: "/admin/settings",
  path: "/admin/settings",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedAdminServicesRoute = Route$j.update({
  id: "/admin/services",
  path: "/admin/services",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedAdminRelatoriosRoute = Route$i.update({
  id: "/admin/relatorios",
  path: "/admin/relatorios",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedAdminDashboardRoute = Route$h.update({
  id: "/admin/dashboard",
  path: "/admin/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedReceptionPacientesIndexRoute = Route$g.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedReceptionPacientesRoute
});
const AuthenticatedProfessionalPrescriptionsIndexRoute = Route$f.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedProfessionalPrescriptionsRoute
});
const AuthenticatedProfessionalPatientsIndexRoute = Route$e.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedProfessionalPatientsRoute
});
const AuthenticatedProfessionalFinancialIndexRoute = Route$d.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedProfessionalFinancialRoute
});
const AuthenticatedFinancialInventoryIndexRoute = Route$c.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedFinancialInventoryRoute
});
const AuthenticatedReceptionPacientesIdRoute = Route$b.update({
  id: "/$id",
  path: "/$id",
  getParentRoute: () => AuthenticatedReceptionPacientesRoute
});
const AuthenticatedProfessionalPrescriptionsNewRoute = Route$a.update({
  id: "/new",
  path: "/new",
  getParentRoute: () => AuthenticatedProfessionalPrescriptionsRoute
});
const AuthenticatedProfessionalFinancialRelatoriosRoute = Route$9.update({
  id: "/relatorios",
  path: "/relatorios",
  getParentRoute: () => AuthenticatedProfessionalFinancialRoute
});
const AuthenticatedProfessionalFinancialDespesasRoute = Route$8.update({
  id: "/despesas",
  path: "/despesas",
  getParentRoute: () => AuthenticatedProfessionalFinancialRoute
});
const AuthenticatedProfessionalFinancialCaixaRoute = Route$7.update({
  id: "/caixa",
  path: "/caixa",
  getParentRoute: () => AuthenticatedProfessionalFinancialRoute
});
const AuthenticatedFinancialInventoryItemsRoute = Route$6.update({
  id: "/items",
  path: "/items",
  getParentRoute: () => AuthenticatedFinancialInventoryRoute
});
const AuthenticatedFinancialInventoryCategoriesRoute = Route$5.update({
  id: "/categories",
  path: "/categories",
  getParentRoute: () => AuthenticatedFinancialInventoryRoute
});
const AuthenticatedProfessionalPatientsIdIndexRoute = Route$4.update({
  id: "/$id/",
  path: "/$id/",
  getParentRoute: () => AuthenticatedProfessionalPatientsRoute
});
const AuthenticatedFinancialInventoryItemsIndexRoute = Route$3.update({
  id: "/",
  path: "/",
  getParentRoute: () => AuthenticatedFinancialInventoryItemsRoute
});
const AuthenticatedProfessionalPatientsIdRecordRoute = Route$2.update({
  id: "/$id/record",
  path: "/$id/record",
  getParentRoute: () => AuthenticatedProfessionalPatientsRoute
});
const AuthenticatedProfessionalPatientsIdNewEvolutionRoute = Route$1.update({
  id: "/$id/new-evolution",
  path: "/$id/new-evolution",
  getParentRoute: () => AuthenticatedProfessionalPatientsRoute
});
const AuthenticatedFinancialInventoryItemsIdRoute = Route.update({
  id: "/$id",
  path: "/$id",
  getParentRoute: () => AuthenticatedFinancialInventoryItemsRoute
});
const AuthenticatedFinancialInventoryItemsRouteChildren = {
  AuthenticatedFinancialInventoryItemsIdRoute,
  AuthenticatedFinancialInventoryItemsIndexRoute
};
const AuthenticatedFinancialInventoryItemsRouteWithChildren = AuthenticatedFinancialInventoryItemsRoute._addFileChildren(
  AuthenticatedFinancialInventoryItemsRouteChildren
);
const AuthenticatedFinancialInventoryRouteChildren = {
  AuthenticatedFinancialInventoryCategoriesRoute,
  AuthenticatedFinancialInventoryItemsRoute: AuthenticatedFinancialInventoryItemsRouteWithChildren,
  AuthenticatedFinancialInventoryIndexRoute
};
const AuthenticatedFinancialInventoryRouteWithChildren = AuthenticatedFinancialInventoryRoute._addFileChildren(
  AuthenticatedFinancialInventoryRouteChildren
);
const AuthenticatedProfessionalFinancialRouteChildren = {
  AuthenticatedProfessionalFinancialCaixaRoute,
  AuthenticatedProfessionalFinancialDespesasRoute,
  AuthenticatedProfessionalFinancialRelatoriosRoute,
  AuthenticatedProfessionalFinancialIndexRoute
};
const AuthenticatedProfessionalFinancialRouteWithChildren = AuthenticatedProfessionalFinancialRoute._addFileChildren(
  AuthenticatedProfessionalFinancialRouteChildren
);
const AuthenticatedProfessionalPatientsRouteChildren = {
  AuthenticatedProfessionalPatientsIndexRoute,
  AuthenticatedProfessionalPatientsIdNewEvolutionRoute,
  AuthenticatedProfessionalPatientsIdRecordRoute,
  AuthenticatedProfessionalPatientsIdIndexRoute
};
const AuthenticatedProfessionalPatientsRouteWithChildren = AuthenticatedProfessionalPatientsRoute._addFileChildren(
  AuthenticatedProfessionalPatientsRouteChildren
);
const AuthenticatedProfessionalPrescriptionsRouteChildren = {
  AuthenticatedProfessionalPrescriptionsNewRoute,
  AuthenticatedProfessionalPrescriptionsIndexRoute
};
const AuthenticatedProfessionalPrescriptionsRouteWithChildren = AuthenticatedProfessionalPrescriptionsRoute._addFileChildren(
  AuthenticatedProfessionalPrescriptionsRouteChildren
);
const AuthenticatedReceptionPacientesRouteChildren = {
  AuthenticatedReceptionPacientesIdRoute,
  AuthenticatedReceptionPacientesIndexRoute
};
const AuthenticatedReceptionPacientesRouteWithChildren = AuthenticatedReceptionPacientesRoute._addFileChildren(
  AuthenticatedReceptionPacientesRouteChildren
);
const AuthenticatedRouteRouteChildren = {
  AuthenticatedAdminDashboardRoute,
  AuthenticatedAdminRelatoriosRoute,
  AuthenticatedAdminServicesRoute,
  AuthenticatedAdminSettingsRoute,
  AuthenticatedFinancialDashboardRoute,
  AuthenticatedFinancialInventoryRoute: AuthenticatedFinancialInventoryRouteWithChildren,
  AuthenticatedFinancialReceivablesRoute,
  AuthenticatedFinancialRelatoriosRoute,
  AuthenticatedProfessionalAgendaRoute,
  AuthenticatedProfessionalBudgetsRoute,
  AuthenticatedProfessionalDashboardRoute,
  AuthenticatedProfessionalFinancialRoute: AuthenticatedProfessionalFinancialRouteWithChildren,
  AuthenticatedProfessionalInventoryRoute,
  AuthenticatedProfessionalPatientsRoute: AuthenticatedProfessionalPatientsRouteWithChildren,
  AuthenticatedProfessionalPrescriptionsRoute: AuthenticatedProfessionalPrescriptionsRouteWithChildren,
  AuthenticatedProfessionalProcedimentosRoute,
  AuthenticatedProfessionalProntuariosRoute,
  AuthenticatedProfessionalSessionsRoute,
  AuthenticatedProfessionalSettingsRoute,
  AuthenticatedReceptionAgendaRoute,
  AuthenticatedReceptionDashboardRoute,
  AuthenticatedReceptionMarketingRoute,
  AuthenticatedReceptionMensagensRoute,
  AuthenticatedReceptionPacientesRoute: AuthenticatedReceptionPacientesRouteWithChildren,
  AuthenticatedReceptionPaymentsRoute
};
const AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  LoginRoute,
  ProfessionalSafeidCallbackRoute
};
const routeTree = Route$K._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1e3 * 60 * 5,
        gcTime: 1e3 * 60 * 30,
        refetchOnWindowFocus: false
      }
    }
  });
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 1e3 * 60 * 5
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  CommandInput as $,
  Avatar as A,
  Button as B,
  Card as C,
  DashboardShell as D,
  Table as E,
  TableHeader as F,
  TableRow as G,
  TableHead as H,
  Input as I,
  TableBody as J,
  KeepAliveOutlet as K,
  Label as L,
  TableCell as M,
  APPOINTMENT_STATUS_LABEL as N,
  DEFAULT_APPOINTMENT_TYPES as O,
  Page as P,
  CardDescription as Q,
  Route$G as R,
  Select as S,
  Textarea as T,
  DEFAULT_LETTERHEAD_MARGINS as U,
  letterheadStoragePath as V,
  fmtDate as W,
  fmt as X,
  Switch as Y,
  parseBRLInput as Z,
  Command as _,
  CardHeader as a,
  SheetContent as a$,
  CommandList as a0,
  CommandEmpty as a1,
  CommandGroup as a2,
  CommandItem as a3,
  BUDGET_STATUS_LABEL as a4,
  BUDGET_STATUS_CLASS as a5,
  getTenantSetting as a6,
  loadLetterheadForPdf as a7,
  formatClinicAddress as a8,
  generateBudgetPDF as a9,
  SAMPLE_VARS as aA,
  TooltipProvider as aB,
  Tooltip as aC,
  TooltipTrigger as aD,
  TooltipContent as aE,
  PAYMENT_METHODS as aF,
  buttonVariants as aG,
  loadSaleChargeItems as aH,
  billCanReceive as aI,
  receiveBillPayment as aJ,
  previewInstallments as aK,
  updateStandaloneSale as aL,
  createStandaloneSale as aM,
  billHasSaleItems as aN,
  billIsInstallment as aO,
  DropdownMenu as aP,
  DropdownMenuTrigger as aQ,
  DropdownMenuContent as aR,
  DropdownMenuItem as aS,
  billIsEditable as aT,
  billCanReverse as aU,
  billCanDelete as aV,
  DropdownMenuSeparator as aW,
  reverseSale as aX,
  deleteBill as aY,
  Route$b as aZ,
  Sheet as a_,
  PROFESSIONAL_AGENDA_STATUS_TRIGGER as aa,
  PROFESSIONAL_AGENDA_STATUS_OPTIONS as ab,
  PROFESSIONAL_AGENDA_STATUS_ITEM as ac,
  PROFESSIONAL_AGENDA_STATUS_VALUES as ad,
  isOverdue as ae,
  BILL_STATUS_LABEL as af,
  BILL_STATUS_CLASS as ag,
  loadLetterheadSettings as ah,
  DialogDescription as ai,
  PAYMENT_LABEL as aj,
  resolveLetterheadProfessionalId as ak,
  Skeleton as al,
  DEFAULT_HOURS as am,
  maskCNPJ as an,
  maskPhone as ao,
  maskCEP as ap,
  DAY_LABELS as aq,
  fetchViaCEP as ar,
  setTenantSetting as as,
  FONT_OPTIONS as at,
  loadGoogleFont as au,
  applyThemeColors as av,
  applyFont as aw,
  resolveSpecialties as ax,
  isLegacySpecialtyList as ay,
  TEMPLATE_VARS as az,
  CardTitle as b,
  SheetHeader as b0,
  SheetTitle as b1,
  pushRecentPatient as b2,
  Route$a as b3,
  formatClinicAddressLines as b4,
  PopoverAnchor as b5,
  Route$4 as b6,
  Separator as b7,
  SheetDescription as b8,
  Route$2 as b9,
  Route as ba,
  router as bb,
  CardContent as c,
  dashboardPathFor as d,
  Popover as e,
  PopoverTrigger as f,
  PopoverContent as g,
  AvatarFallback as h,
  SelectTrigger as i,
  SelectValue as j,
  SelectContent as k,
  SelectItem as l,
  Badge as m,
  Checkbox as n,
  Dialog as o,
  DialogContent as p,
  DialogHeader as q,
  DialogTitle as r,
  DialogFooter as s,
  randomUUID as t,
  useAuth as u,
  renderTemplate as v,
  cn as w,
  APPOINTMENT_TYPE_LABEL as x,
  resolveAppointmentTypes as y,
  APPOINTMENT_TYPE_OPTIONS as z
};
