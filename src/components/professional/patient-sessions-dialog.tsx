import { useCallback, useEffect, useState } from "react";
import { fmtDateFromDate } from "@/lib/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SessionCheckoffDialog,
  type SessionCheckoffTarget,
} from "@/components/professional/session-checkoff-dialog";
import {
  SessionHistoryDialog,
  type SessionHistoryTarget,
} from "@/components/professional/session-history-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import {
  filterInventoryOptionsForProcedure,
  inventoryScopeForProcedure,
  inventoryScopeLabel,
  packageAllowsInsumoSwap,
  type ProcedureInventoryOption,
} from "@/lib/procedures";
import { parsePackageLinkedInsumo, updateSessionPackageInsumo } from "@/lib/sales";
import { cn } from "@/lib/utils";

export interface PatientPackageRow {
  id: string;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  unit_price: number;
  inventory_item_id?: string | null;
  inventory_item_name?: string | null;
}

export interface PatientSessionGroup {
  patient_id: string;
  patient_name: string;
  packages: PatientPackageRow[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const PACKAGE_INVENTORY_SELECT =
  "id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),session_package_inventory_items(id,inventory_item_id,quantity,inventory_items(name))";

export function mapPackageRow(row: {
  id: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  unit_price: number | string;
  services: { name: string } | { name: string }[] | null;
  session_package_inventory_items?: Array<{
    id: string;
    inventory_item_id: string;
    quantity: number | string;
    inventory_items: { name: string } | { name: string }[] | null;
  }> | null;
}): PatientPackageRow {
  const svc = row.services;
  const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
  const linked = parsePackageLinkedInsumo(row.session_package_inventory_items);
  return {
    id: row.id,
    service_name: name ?? "Procedimento",
    total_sessions: row.total_sessions,
    used_sessions: row.used_sessions,
    status: row.status,
    purchased_at: row.purchased_at,
    unit_price: Number(row.unit_price),
    inventory_item_id: linked?.inventoryItemId ?? null,
    inventory_item_name: linked?.name ?? null,
  };
}

interface PatientPackagesListProps {
  packages: PatientPackageRow[];
  onCheckoff: (pkg: PatientPackageRow) => void;
  onHistory: (pkg: PatientPackageRow) => void;
  onPackageUpdate?: (pkg: PatientPackageRow) => void;
}

function PatientPackagesList({
  packages,
  onCheckoff,
  onHistory,
  onPackageUpdate,
}: PatientPackagesListProps) {
  const [inventoryOptions, setInventoryOptions] = useState<ProcedureInventoryOption[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const needsOptions = packages.some((pkg) => packageAllowsInsumoSwap(pkg.service_name));
    if (!needsOptions) return;
    void (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id,name,unit,cost_price,inventory_categories(name)")
        .eq("active", true)
        .order("name");
      setInventoryOptions(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          cost_price: Number(item.cost_price ?? 0),
          categoryName:
            (item.inventory_categories as { name: string } | null | undefined)?.name ?? null,
        })),
      );
    })();
  }, [packages]);

  const handleInsumoChange = async (pkg: PatientPackageRow, inventoryItemId: string) => {
    if (inventoryItemId === pkg.inventory_item_id) return;
    setSavingId(pkg.id);
    try {
      await updateSessionPackageInsumo(pkg.id, inventoryItemId, 1);
      const name = inventoryOptions.find((o) => o.id === inventoryItemId)?.name ?? "Insumo";
      const next = {
        ...pkg,
        inventory_item_id: inventoryItemId,
        inventory_item_name: name,
      };
      onPackageUpdate?.(next);
      toast.success("Insumo atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível trocar o insumo");
    } finally {
      setSavingId(null);
    }
  };

  if (packages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum pacote de sessões ativo para este paciente.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => {
        const pct = Math.round((pkg.used_sessions / pkg.total_sessions) * 100);
        const remaining = pkg.total_sessions - pkg.used_sessions;
        const canCheckoff =
          pkg.status === "active" && pkg.used_sessions < pkg.total_sessions;
        const showInsumo = packageAllowsInsumoSwap(pkg.service_name);
        const filtered = showInsumo
          ? filterInventoryOptionsForProcedure(inventoryOptions, pkg.service_name)
          : [];
        const options =
          pkg.inventory_item_id && !filtered.some((o) => o.id === pkg.inventory_item_id)
            ? [
                {
                  id: pkg.inventory_item_id,
                  name: pkg.inventory_item_name ?? "Insumo atual",
                  unit: "",
                  cost_price: 0,
                  categoryName: null,
                },
                ...filtered,
              ]
            : filtered;
        const scopeHint = showInsumo
          ? inventoryScopeLabel(inventoryScopeForProcedure(pkg.service_name))
          : null;

        return (
          <div key={pkg.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{pkg.service_name}</p>
                <p className="text-xs text-muted-foreground">
                  Compra em {fmtDateFromDate(new Date(pkg.purchased_at))} ·{" "}
                  {fmt(pkg.unit_price)}
                </p>
              </div>
              <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                {STATUS_LABEL[pkg.status] ?? pkg.status}
              </Badge>
            </div>

            {showInsumo && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Insumo</Label>
                <Select
                  value={pkg.inventory_item_id ?? undefined}
                  onValueChange={(value) => void handleInsumoChange(pkg, value)}
                  disabled={!canCheckoff || savingId === pkg.id || options.length === 0}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        pkg.inventory_item_name ??
                        (options.length === 0 ? "Nenhum insumo cadastrado" : "Selecione o insumo")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scopeHint && (
                  <p className="text-[11px] text-muted-foreground">{scopeHint}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Progress value={pct} className="h-1.5" />

              {pkg.total_sessions <= 24 && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: pkg.total_sessions }).map((_, i) => {
                    const done = i < pkg.used_sessions;
                    return (
                      <span
                        key={i}
                        title={done ? `Sessão ${i + 1} realizada` : `Sessão ${i + 1} pendente`}
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-[11px] font-semibold",
                          done
                            ? "bg-emerald-500 text-white"
                            : "border border-dashed border-amber-400 bg-amber-50 text-amber-600",
                        )}
                      >
                        {i + 1}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {pkg.used_sessions} realizada{pkg.used_sessions === 1 ? "" : "s"}
                </span>
                {pkg.status === "active" && remaining > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-600">
                    <span className="size-2 rounded-full border border-dashed border-amber-400 bg-amber-50" />
                    {remaining} restante{remaining === 1 ? "" : "s"}
                  </span>
                )}
                <span className="text-muted-foreground">de {pkg.total_sessions} no total</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pkg.used_sessions > 0 && (
                <Button size="sm" variant="outline" onClick={() => onHistory(pkg)}>
                  Histórico
                </Button>
              )}
              {canCheckoff && (
                <Button size="sm" onClick={() => onCheckoff(pkg)}>
                  Dar baixa
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PatientSessionsDialogProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      patientId: string;
      patientName?: string;
      group?: never;
      onCheckoff?: never;
      onHistory?: never;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      group: PatientSessionGroup | null;
      patientId?: never;
      patientName?: never;
      onCheckoff: (pkg: PatientPackageRow) => void;
      onHistory: (pkg: PatientPackageRow) => void;
      onPackageUpdate?: (pkg: PatientPackageRow) => void;
    };

export function PatientSessionsDialog(props: PatientSessionsDialogProps) {
  if ("patientId" in props && props.patientId) {
    return (
      <PatientSessionsByPatientDialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        patientId={props.patientId}
        patientName={props.patientName}
      />
    );
  }
  return (
    <PatientSessionsGroupDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      group={props.group}
      onCheckoff={props.onCheckoff}
      onHistory={props.onHistory}
      onPackageUpdate={props.onPackageUpdate}
    />
  );
}

function PatientSessionsGroupDialog({
  open,
  onOpenChange,
  group,
  onCheckoff,
  onHistory,
  onPackageUpdate,
}: Extract<PatientSessionsDialogProps, { group: PatientSessionGroup | null }>) {
  const [localPackages, setLocalPackages] = useState<PatientPackageRow[]>([]);

  useEffect(() => {
    setLocalPackages(group?.packages ?? []);
  }, [group]);

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sessões — {group.patient_name}</DialogTitle>
        </DialogHeader>
        <PatientPackagesList
          packages={localPackages}
          onCheckoff={onCheckoff}
          onHistory={onHistory}
          onPackageUpdate={(pkg) => {
            setLocalPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
            onPackageUpdate?.(pkg);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PatientSessionsByPatientDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: Extract<PatientSessionsDialogProps, { patientId: string }>) {
  const [packages, setPackages] = useState<PatientPackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SessionHistoryTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_session_packages")
      .select(PACKAGE_INVENTORY_SELECT)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("purchased_at", { ascending: false });

    if (error) {
      setPackages([]);
    } else {
      setPackages(
        ((data ?? []) as unknown as Parameters<typeof mapPackageRow>[0][]).map(mapPackageRow),
      );
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (!open) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [open, load]);

  const toTarget = (pkg: PatientPackageRow): SessionCheckoffTarget => ({
    packageId: pkg.id,
    patientName: patientName ?? "Paciente",
    serviceName: pkg.service_name,
    usedSessions: pkg.used_sessions,
    totalSessions: pkg.total_sessions,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sessões — {patientName ?? "Paciente"}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <PatientPackagesList
              packages={packages}
              onCheckoff={(pkg) => {
                setCheckoffTarget(toTarget(pkg));
                setCheckoffOpen(true);
              }}
              onHistory={(pkg) => {
                setHistoryTarget(toTarget(pkg));
                setHistoryOpen(true);
              }}
              onPackageUpdate={(pkg) => {
                setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <SessionCheckoffDialog
        open={checkoffOpen}
        onOpenChange={setCheckoffOpen}
        target={checkoffTarget}
        onSuccess={() => void load()}
      />

      <SessionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        target={historyTarget}
      />
    </>
  );
}
