import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/mock-auth";
import { getTenantSetting, setTenantSetting } from "@/lib/settings-helpers";
import {
  APPOINTMENT_DURATION_SETTING_KEY,
  APPOINTMENT_TYPE_OPTIONS,
  DEFAULT_APPOINTMENT_DURATIONS,
  resolveAppointmentDurations,
} from "@/lib/appointment-types";

export function SectionAgenda() {
  const { tenant } = useAuth();
  const [durations, setDurations] = useState<Record<string, number>>({
    ...DEFAULT_APPOINTMENT_DURATIONS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    getTenantSetting<Record<string, number>>(tenant.id, APPOINTMENT_DURATION_SETTING_KEY)
      .then((v) => setDurations(resolveAppointmentDurations(v)))
      .finally(() => setLoading(false));
  }, [tenant]);

  const setDuration = (type: string, value: string) => {
    const n = Number(value);
    setDurations((d) => ({ ...d, [type]: Number.isFinite(n) ? n : 0 }));
  };

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const clean = resolveAppointmentDurations(durations);
      await setTenantSetting(tenant.id, APPOINTMENT_DURATION_SETTING_KEY, clean);
      setDurations(clean);
      toast.success("Durações padrão salvas.");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          Duração padrão dos atendimentos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ao agendar, o horário de término é preenchido automaticamente somando esta duração ao
          horário de início, conforme o tipo escolhido.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {APPOINTMENT_TYPE_OPTIONS.map((t) => (
            <div key={t.value} className="space-y-1">
              <Label htmlFor={`dur-${t.value}`} className="text-sm">
                {t.label}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`dur-${t.value}`}
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={durations[t.value] ?? DEFAULT_APPOINTMENT_DURATIONS[t.value] ?? 30}
                  onChange={(e) => setDuration(t.value, e.target.value)}
                  disabled={loading}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
