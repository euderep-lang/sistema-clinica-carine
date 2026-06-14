import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  APPOINTMENT_TYPE_OPTIONS,
  DEFAULT_APPOINTMENT_TYPES,
  resolveAppointmentTypes,
} from "@/lib/appointment-types";
import { useAuth } from "@/lib/mock-auth";

export function SectionAgendaTipos() {
  const { profile, refresh } = useAuth();
  const [types, setTypes] = useState<string[]>([...DEFAULT_APPOINTMENT_TYPES]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("appointment_types")
        .eq("id", profile.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      else setTypes(resolveAppointmentTypes(data?.appointment_types));
      setLoading(false);
    })();
  }, [profile]);

  const toggle = (value: string, checked: boolean) => {
    setTypes((current) => {
      if (checked) return current.includes(value) ? current : [...current, value];
      return current.filter((t) => t !== value);
    });
  };

  const save = async () => {
    if (!profile) return;
    if (types.length === 0) {
      toast.error("Selecione ao menos um tipo de agendamento");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ appointment_types: types })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Tipos de agendamento salvos");
      await refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de agendamento</CardTitle>
        <CardDescription>
          Escolha quais tipos a recepção pode usar ao agendar consultas com você.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {APPOINTMENT_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={types.includes(option.value)}
                  onCheckedChange={(checked) => toggle(option.value, checked === true)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Salvando..." : "Salvar tipos"}
        </Button>
      </CardContent>
    </Card>
  );
}
