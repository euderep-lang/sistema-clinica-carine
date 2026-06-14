import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyThemeColors, applyFont, getTenantSetting } from "@/lib/settings-helpers";

export type Role = "admin" | "receptionist" | "professional" | "financial";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  tenant_id: string;
  crm?: string | null;
  specialty?: string | null;
  cpf?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string | null;
}

interface AuthContextValue {
  profile: Profile | null;
  tenant: Tenant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function dashboardPathFor(role: Role): string {
  return `/${role === "receptionist" ? "reception" : role}/dashboard`;
}

async function loadProfileAndTenant(userId: string, email: string): Promise<{ profile: Profile; tenant: Tenant } | null> {
  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, full_name, role, crm, specialty, cpf, avatar_url, phone, active")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profileRow || !profileRow.tenant_id) return null;
  if (profileRow.active === false) return null;

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, slug, primary_color, secondary_color, logo_url")
    .eq("id", profileRow.tenant_id)
    .maybeSingle();
  if (!tenantRow) return null;

  return {
    profile: {
      id: profileRow.id,
      email,
      full_name: profileRow.full_name,
      role: profileRow.role as Role,
      tenant_id: profileRow.tenant_id,
      crm: profileRow.crm,
      specialty: profileRow.specialty,
      cpf: profileRow.cpf,
      avatar_url: profileRow.avatar_url,
      phone: profileRow.phone,
    },
    tenant: {
      id: tenantRow.id,
      name: tenantRow.name,
      slug: tenantRow.slug,
      primary_color: tenantRow.primary_color ?? "#1a2b4a",
      secondary_color: tenantRow.secondary_color ?? "#0ea5e9",
      logo_url: tenantRow.logo_url,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
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
      getTenantSetting<string>(res.tenant.id, "font_preference").then((f) => f && applyFont(f));
    } else {
      setProfile(null);
      setTenant(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let lastUserId: string | null = null;
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
      // Only re-hydrate when the user identity actually changes — token refreshes
      // and re-emits of SIGNED_IN for the same user would otherwise cause
      // duplicate profile/tenant fetches on every page.
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && uid && uid !== lastUserId) {
        lastUserId = uid;
        setTimeout(() => { hydrate(); }, 0);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      throw new Error(
        error?.message?.includes("Invalid login") || error?.message?.includes("invalid")
          ? "E-mail ou senha inválidos."
          : error?.message ?? "Falha ao entrar.",
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

  return (
    <AuthContext.Provider value={{ profile, tenant, loading, signIn, signOut, refresh: hydrate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}