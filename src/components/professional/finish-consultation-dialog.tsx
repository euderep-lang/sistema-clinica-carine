import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  SessionCheckoffDialog,
  type SessionCheckoffTarget,
} from "@/components/professional/session-checkoff-dialog";
import { PostConsultationFollowUpDialog } from "@/components/professional/post-consultation-follow-up-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";
import { AUTOMATION_QUEUED_MESSAGE } from "@/lib/automation-messages";

interface Procedure {
  id: string;
  name: string;
  default_price: number;
  session_count: number;
}

interface Room {
  id: string;
  name: string;
}

interface SessionPackage {
  id: string;
  service_id: string;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
}

interface FinishConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

const PRICE_TABLES = [
  { value: "particular", label: "Particular" },
  { value: "convenio", label: "Convênio" },
];

export function FinishConsultationDialog({
  open,
  onOpenChange,
  patientId,
}: FinishConsultationDialogProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [roomId, setRoomId] = useState("geral");
  const [priceTable, setPriceTable] = useState("particular");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [patientName, setPatientName] = useState("Paciente");
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [finishedAppointmentId, setFinishedAppointmentId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    const { data, error } = await supabase
      .from("patient_session_packages")
      .select("id,service_id,total_sessions,used_sessions,services(name)")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("purchased_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setPackages(
      (data ?? []).map((row) => {
        const svc = row.services as { name: string } | { name: string }[] | null;
        const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
        return {
          id: row.id,
          service_id: row.service_id,
          service_name: name ?? "Procedimento",
          total_sessions: row.total_sessions,
          used_sessions: row.used_sessions,
        };
      }),
    );
  }, [patientId]);

  const openSessionCheckoff = (pkg: SessionPackage) => {
    const remaining = pkg.total_sessions - pkg.used_sessions;
    if (remaining <= 0) return;
    setCheckoffTarget({
      packageId: pkg.id,
      patientName,
      serviceName: pkg.service_name,
      usedSessions: pkg.used_sessions,
      totalSessions: pkg.total_sessions,
    });
    setCheckoffOpen(true);
  };

  useEffect(() => {
    if (!open || !profile) return;
    setLoading(true);
    setSearch("");
    setQuantities({});
    setRoomId("geral");
    setPriceTable("particular");

    (async () => {
      const [procRes, roomRes, , patientRes] = await Promise.all([
        supabase
          .from("services")
          .select("id,name,default_price,session_count")
          .eq("professional_id", profile.id)
          .eq("active", true)
          .order("name"),
        supabase.from("rooms").select("id,name").order("name"),
        loadPackages(),
        supabase.from("patients").select("full_name").eq("id", patientId).maybeSingle(),
      ]);

      if (procRes.error) toast.error(procRes.error.message);
      else {
        setProcedures(
          (procRes.data ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            default_price: Number(p.default_price),
            session_count: Number(p.session_count ?? 1),
          })),
        );
      }

      if (roomRes.error) toast.error(roomRes.error.message);
      else setRooms((roomRes.data ?? []) as Room[]);

      setPatientName(patientRes.data?.full_name ?? "Paciente");
      setLoading(false);
    })();
  }, [open, profile, patientId, loadPackages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [procedures, search]);

  const selectedNew = useMemo(
    () => procedures.filter((p) => (quantities[p.id] ?? 0) > 0),
    [procedures, quantities],
  );

  const estimatedTotal = selectedNew.reduce(
    (sum, p) => sum + p.default_price * (quantities[p.id] ?? 0),
    0,
  );

  const setQty = (id: string, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setQuantities((prev) => ({ ...prev, [id]: n }));
  };

  const finish = async () => {
    if (!profile) return;

    setSaving(true);
    const { data, error } = await supabase.rpc("finish_consultation", {
      p_patient_id: patientId,
      p_room_id: roomId === "geral" ? null : roomId,
      p_price_table: priceTable,
      p_new_items: selectedNew.map((p) => ({
        service_id: p.id,
        quantity: quantities[p.id],
      })),
      p_session_items: [],
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data as { total?: number; bill_id?: string; appointment_id?: string } | null;
    if (result?.total && result.total > 0) {
      toast.success(`Consulta finalizada · ${fmt(result.total)} lançado no financeiro`);
    } else {
      toast.success("Consulta finalizada");
    }

    if (result?.appointment_id) {
      toast.info(AUTOMATION_QUEUED_MESSAGE);
    }

    onOpenChange(false);
    setFinishedAppointmentId(result?.appointment_id ?? null);
    setFollowUpOpen(true);
  };

  const goToAgenda = () => {
    setFollowUpOpen(false);
    navigate({ to: "/professional/agenda" });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Finalizar Consultas</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Criar Fatura</p>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tabela / Convênio</Label>
                <Select value={priceTable} onValueChange={setPriceTable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TABLES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Procedimentos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar procedimentos"
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="mt-3 h-52 rounded-md border">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Carregando procedimentos…
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum procedimento encontrado. Cadastre em Administrativo → Procedimentos.
                </p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((proc) => (
                    <li
                      key={proc.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{proc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(proc.default_price)}
                          {proc.session_count > 1 && ` · ${proc.session_count} sessões`}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={quantities[proc.id] ?? 0}
                        onChange={(e) => setQty(proc.id, e.target.value)}
                        className="h-8 w-16 shrink-0 text-center"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          {packages.length > 0 && (
            <div className="rounded-lg border p-4">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mb-3 cursor-help">
                      <p className="text-sm font-semibold">Usar sessões do paciente</p>
                      <p className="text-xs text-muted-foreground">
                        Clique em um pacote para registrar a baixa completa (data, via, lote…).
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    Usar sessões do paciente serve para registrar que o paciente consumiu sessões
                    de um pacote que ele já comprou — sem cobrar de novo.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ul className="space-y-2">
                {packages.map((pkg) => {
                  const remaining = pkg.total_sessions - pkg.used_sessions;
                  const canCheckoff = remaining > 0;
                  return (
                    <li key={pkg.id}>
                      <button
                        type="button"
                        disabled={!canCheckoff}
                        onClick={() => openSessionCheckoff(pkg)}
                        className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{pkg.service_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pkg.used_sessions}/{pkg.total_sessions} realizadas · {remaining}{" "}
                            restantes
                          </p>
                        </div>
                        {canCheckoff && (
                          <span className="shrink-0 text-xs font-medium text-primary">
                            Dar baixa
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {estimatedTotal > 0 && (
            <p className="text-sm text-muted-foreground">
              Total a lançar no financeiro:{" "}
              <span className="font-semibold text-foreground">{fmt(estimatedTotal)}</span>
            </p>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void finish()} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Finalizar Consulta
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <SessionCheckoffDialog
      open={checkoffOpen}
      onOpenChange={setCheckoffOpen}
      target={checkoffTarget}
      onSuccess={() => void loadPackages()}
    />

    <PostConsultationFollowUpDialog
      open={followUpOpen}
      onOpenChange={setFollowUpOpen}
      patientId={patientId}
      patientName={patientName}
      appointmentId={finishedAppointmentId}
      onComplete={goToAgenda}
    />
    </>
  );
}
