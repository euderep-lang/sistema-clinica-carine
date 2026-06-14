import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

export interface SessionCheckoffTarget {
  packageId: string;
  patientName: string;
  serviceName: string;
  usedSessions: number;
  totalSessions: number;
}

interface ProfessionalOption {
  id: string;
  full_name: string;
}

interface SessionCheckoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SessionCheckoffTarget | null;
  onSuccess?: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const APPLICATION_ROUTES = [
  { value: "IM", label: "IM" },
  { value: "EV", label: "EV" },
  { value: "Oral", label: "Oral" },
] as const;

export function SessionCheckoffDialog({
  open,
  onOpenChange,
  target,
  onSuccess,
}: SessionCheckoffDialogProps) {
  const { profile } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionTime, setSessionTime] = useState(nowTime());
  const [professionalId, setProfessionalId] = useState("");
  const [productBatch, setProductBatch] = useState("");
  const [applicationRoute, setApplicationRoute] = useState("IM");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSessionDate(todayISO());
    setSessionTime(nowTime());
    setProductBatch("");
    setApplicationRoute("IM");
    setProfessionalId(profile?.id ?? "");

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name")
        .eq("role", "professional")
        .order("full_name");
      setProfessionals((data ?? []) as ProfessionalOption[]);
    })();
  }, [open, profile]);

  const submit = async () => {
    if (!target) return;
    if (!sessionDate || !sessionTime) {
      toast.error("Informe data e horário");
      return;
    }
    if (!professionalId) {
      toast.error("Selecione o profissional");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("register_session_checkoff", {
      p_package_id: target.packageId,
      p_session_date: sessionDate,
      p_session_time: sessionTime,
      p_professional_id: professionalId,
      p_product_batch: productBatch.trim() || null,
      p_application_route: applicationRoute,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as { used_sessions?: number; total_sessions?: number } | null;
    toast.success(
      `Sessão registrada · ${result?.used_sessions ?? target.usedSessions + 1}/${result?.total_sessions ?? target.totalSessions}`,
    );
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dar baixa na sessão</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions})`
              : "Registre os dados desta sessão."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-date">Data</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-time">Horário</Label>
              <Input
                id="session-time"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Via</Label>
              <Select value={applicationRoute} onValueChange={setApplicationRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a via" />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_ROUTES.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-batch">Lote do produto</Label>
              <Input
                id="product-batch"
                value={productBatch}
                onChange={(e) => setProductBatch(e.target.value)}
                placeholder="Ex.: LOTE-2026-0042"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !target}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirmar baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
