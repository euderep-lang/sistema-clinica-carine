import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  SessionCheckoffDialog,
  type SessionCheckoffTarget,
} from "@/components/professional/session-checkoff-dialog";
import { ProcedureInventoryDialog } from "@/components/professional/procedure-inventory-dialog";
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
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { matchesSearch } from "@/lib/search";
import { fmt, parseBRLInput } from "@/lib/currency";
import {
  buildProcedureInventoryQueue,
  expandSaleItemsWithPerUnitInventory,
  isClinicalService,
  sortProceduresForDisplay,
  type InventoryLinkInput,
} from "@/lib/procedures";
import { AUTOMATION_QUEUED_MESSAGE } from "@/lib/automation-messages";

interface Procedure {
  id: string;
  name: string;
  category: string | null;
  default_price: number;
  session_count: number;
  hasLinkedInventory: boolean;
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
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({});
  const [totalPrices, setTotalPrices] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState("Paciente");
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [finishedAppointmentId, setFinishedAppointmentId] = useState<string | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [saleInventory, setSaleInventory] = useState<Record<string, InventoryLinkInput[]>>({});

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
    setUnitPrices({});
    setTotalPrices({});
    setSaleInventory({});
    setInventoryOpen(false);
    setRoomId("geral");
    setPriceTable("particular");

    (async () => {
      const [procRes, roomRes, , patientRes, linkRes] = await Promise.all([
        supabase
          .from("services")
          .select("id,name,category,default_price,session_count")
          .eq("professional_id", profile.id)
          .eq("active", true)
          .order("name"),
        supabase.from("rooms").select("id,name").order("name"),
        loadPackages(),
        supabase.from("patients").select("full_name").eq("id", patientId).maybeSingle(),
        supabase.from("service_inventory_items").select("service_id"),
      ]);

      const linked = new Set((linkRes.data ?? []).map((r) => r.service_id));

      if (procRes.error) toast.error(procRes.error.message);
      else {
        setProcedures(
          sortProceduresForDisplay(
            (procRes.data ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              default_price: Number(p.default_price),
              session_count: Number(p.session_count ?? 1),
              hasLinkedInventory: linked.has(p.id),
            })),
          ),
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
    return procedures.filter((p) => matchesSearch(p.name, q));
  }, [procedures, search]);

  const selectedNew = useMemo(
    () => procedures.filter((p) => (quantities[p.id] ?? 0) > 0),
    [procedures, quantities],
  );

  const fmtInput = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",");

  const lineUnitPrice = (proc: Procedure) => {
    const parsed = parseBRLInput(unitPrices[proc.id] ?? "");
    if (parsed > 0) return parsed;
    return proc.default_price;
  };

  const lineTotalPrice = (proc: Procedure) => {
    const parsed = parseBRLInput(totalPrices[proc.id] ?? "");
    if (parsed > 0) return parsed;
    const qty = quantities[proc.id] ?? 0;
    return lineUnitPrice(proc) * qty;
  };

  const estimatedTotal = selectedNew.reduce((sum, p) => sum + lineTotalPrice(p), 0);

  const setQty = (id: string, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setQuantities((prev) => ({ ...prev, [id]: n }));
    const proc = procedures.find((p) => p.id === id);
    if (!proc) return;
    if (n <= 0) {
      setTotalPrices((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    const unitStr =
      unitPrices[id] ?? (proc.default_price > 0 ? fmtInput(proc.default_price) : "");
    const unitNum = parseBRLInput(unitStr) || proc.default_price;
    if (!unitPrices[id] && unitStr) {
      setUnitPrices((prev) => ({ ...prev, [id]: unitStr }));
    }
    setTotalPrices((prev) => ({ ...prev, [id]: fmtInput(unitNum * n) }));
  };

  const setUnit = (id: string, value: string) => {
    setUnitPrices((prev) => ({ ...prev, [id]: value }));
    const qty = quantities[id] ?? 0;
    const unit = parseBRLInput(value);
    if (qty > 0 && unit >= 0) {
      setTotalPrices((prev) => ({ ...prev, [id]: fmtInput(unit * qty) }));
    }
  };

  const setTotal = (id: string, value: string) => {
    setTotalPrices((prev) => ({ ...prev, [id]: value }));
    const qty = quantities[id] ?? 0;
    const total = parseBRLInput(value);
    if (qty > 0 && total >= 0) {
      setUnitPrices((prev) => ({ ...prev, [id]: fmtInput(total / qty) }));
    }
  };

  const finish = async (inventoryOverride?: Record<string, InventoryLinkInput[]>) => {
    if (!profile) return;

    const inventoryMap = inventoryOverride ?? saleInventory;

    setSaving(true);
    const { data, error } = await supabase.rpc("finish_consultation", {
      p_patient_id: patientId,
      p_room_id: roomId === "geral" ? null : roomId,
      p_price_table: priceTable,
      p_new_items: expandSaleItemsWithPerUnitInventory(
        selectedNew,
        quantities,
        (p) => {
          const qty = quantities[p.id] ?? 0;
          return qty > 0 ? lineTotalPrice(p) / qty : lineUnitPrice(p);
        },
        inventoryMap,
      ),
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

  const inventoryPendingQueue = useMemo(
    () =>
      buildProcedureInventoryQueue(
        selectedNew.filter((p) => !isClinicalService(p.category) && !p.hasLinkedInventory),
        quantities,
        saleInventory,
      ),
    [selectedNew, quantities, saleInventory],
  );

  const handleInventoryConfirmAll = (inventory: Record<string, InventoryLinkInput[]>) => {
    const nextInventory = { ...saleInventory, ...inventory };
    setSaleInventory(nextInventory);
    setInventoryOpen(false);
    void finish(nextInventory);
  };

  const handleFinishClick = () => {
    if (inventoryPendingQueue.length === 0) {
      void finish();
      return;
    }
    setInventoryOpen(true);
  };

  const goToAgenda = () => {
    setFollowUpOpen(false);
    navigate({ to: "/professional/agenda" });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Finalizar Consultas</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
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

            <div className="mt-3 max-h-60 overflow-y-auto rounded-md border">
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
                <>
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span className="min-w-0 flex-1">Procedimento</span>
                    <span className="w-14 shrink-0 text-center">Qtd</span>
                    <span className="w-24 shrink-0 text-right">Unitário</span>
                    <span className="w-24 shrink-0 text-right">Total</span>
                  </div>
                  <ul className="divide-y">
                  {filtered.map((proc) => {
                    const qty = quantities[proc.id] ?? 0;
                    const hasQty = qty > 0;
                    return (
                    <li
                      key={proc.id}
                      className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{proc.name}</p>
                        {proc.session_count > 1 && (
                          <p className="text-xs text-muted-foreground">{proc.session_count} sessões</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setQty(proc.id, e.target.value)}
                        className="h-8 w-14 shrink-0 text-center"
                      />
                      <Input
                        placeholder="0,00"
                        value={unitPrices[proc.id] ?? (hasQty && proc.default_price > 0 ? fmtInput(proc.default_price) : "")}
                        disabled={!hasQty}
                        onChange={(e) => setUnit(proc.id, e.target.value)}
                        className="h-8 w-24 shrink-0 text-right tabular-nums"
                      />
                      <Input
                        placeholder="0,00"
                        value={
                          totalPrices[proc.id] ??
                          (hasQty ? fmtInput(lineUnitPrice(proc) * qty) : "")
                        }
                        disabled={!hasQty}
                        onChange={(e) => setTotal(proc.id, e.target.value)}
                        className="h-8 w-24 shrink-0 text-right tabular-nums"
                      />
                    </li>
                  );})}
                </ul>
                </>
              )}
            </div>
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
          <Button onClick={handleFinishClick} disabled={saving}>
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

    <ProcedureInventoryDialog
      open={inventoryOpen}
      targets={inventoryPendingQueue}
      onOpenChange={setInventoryOpen}
      onConfirm={handleInventoryConfirmAll}
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
