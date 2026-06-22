import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function FinancialProfessionalFilter({ value, onChange }: Props) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!profile?.tenant_id) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("tenant_id", profile.tenant_id)
        .in("role", ["professional", "admin"])
        .eq("active", true)
        .order("full_name");
      setProfessionals((data ?? []) as { id: string; full_name: string }[]);
    })();
  }, [profile?.tenant_id]);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Profissional</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os profissionais</SelectItem>
          {professionals.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
