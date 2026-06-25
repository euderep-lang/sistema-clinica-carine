import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, ShieldCheck, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth, type Role } from "@/lib/mock-auth";
import { getTenantSetting, setTenantSetting } from "@/lib/settings-helpers";
import {
  CONFIGURABLE_ROLES,
  featureGroupsForRole,
  PERMISSION_SETTING_KEY,
  ROLE_LABEL,
  type PermissionMatrix,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SectionPermissoes() {
  const { tenant, reloadPermissions } = useAuth();
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState<(typeof CONFIGURABLE_ROLES)[number]>(
    CONFIGURABLE_ROLES[0],
  );

  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    getTenantSetting<PermissionMatrix>(tenant.id, PERMISSION_SETTING_KEY)
      .then((p) => setMatrix(p ?? {}))
      .finally(() => setLoading(false));
  }, [tenant]);

  const groups = useMemo(() => featureGroupsForRole(activeRole), [activeRole]);

  // Default liberado: indefinido conta como true.
  const isOn = (role: Role, key: string) => matrix[role]?.[key] !== false;

  const toggle = (role: Role, key: string, value: boolean) => {
    setMatrix((prev) => {
      const roleMap = { ...(prev[role] ?? {}) };
      roleMap[key] = value;
      return { ...prev, [role]: roleMap };
    });
  };

  const enableAll = (role: (typeof CONFIGURABLE_ROLES)[number]) => {
    setMatrix((prev) => {
      const roleMap = { ...(prev[role] ?? {}) };
      for (const { features } of featureGroupsForRole(role)) {
        for (const f of features) roleMap[f.key] = true;
      }
      return { ...prev, [role]: roleMap };
    });
  };

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await setTenantSetting(tenant.id, PERMISSION_SETTING_KEY, matrix);
      await reloadPermissions();
      toast.success("Permissões salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Permissões por perfil
          </CardTitle>
          <CardDescription>
            Escolha quais áreas cada perfil pode acessar. O perfil{" "}
            <strong>Administrador</strong> tem acesso total e não é configurável. As alterações
            controlam os menus e a navegação; cada usuário vê o ajuste ao entrar novamente.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        {CONFIGURABLE_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setActiveRole(role)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition",
              activeRole === role
                ? "bg-primary text-primary-foreground"
                : "border bg-card hover:bg-muted",
            )}
          >
            {ROLE_LABEL[role]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando permissões…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configurando o perfil <strong>{ROLE_LABEL[activeRole]}</strong>
            </p>
            <Button variant="ghost" size="sm" onClick={() => enableAll(activeRole)}>
              <RotateCcw className="mr-1.5 size-3.5" />
              Liberar tudo
            </Button>
          </div>

          {groups.map(({ group, features }) => (
            <Card key={group}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {features.map((f) => (
                  <label
                    key={f.key}
                    className="flex cursor-pointer items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <Switch
                      checked={isOn(activeRole, f.key)}
                      onCheckedChange={(v) => toggle(activeRole, f.key, v)}
                    />
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Salvar permissões
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
