import { useCallback, useEffect, useState } from "react";
import { fmtDateFromDate } from "@/lib/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { mapPackageRow, type PatientPackageRow } from "@/components/professional/patient-sessions-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import {
  filterInventoryOptionsForProcedure,
  inventoryScopeForProcedure,
  inventoryScopeLabel,
  packageAllowsInsumoSwap,
  type ProcedureInventoryOption,
} from "@/lib/procedures";
import { updateSessionPackageInsumo } from "@/lib/sales";

const STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

interface PatientSessionsContentProps {
  patientId: string;
  patientName?: string;
  active?: boolean;
}

export function PatientSessionsContent({
  patientId,
  patientName,
  active = true,
}: PatientSessionsContentProps) {
  const [rows, setRows] = useState<PatientPackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SessionHistoryTarget | null>(null);
  const [inventoryOptions, setInventoryOptions] = useState<ProcedureInventoryOption[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_session_packages")
      .select(
        "id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),session_package_inventory_items(id,inventory_item_id,quantity,inventory_items(name))",
      )
      .eq("patient_id", patientId)
      .order("purchased_at", { ascending: false });

    if (error) toast.error(error.message);
    else {
      setRows(
        ((data ?? []) as unknown as Parameters<typeof mapPackageRow>[0][]).map(mapPackageRow),
      );
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (!active) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [active, load]);

  useEffect(() => {
    if (!active || !rows.some((r) => packageAllowsInsumoSwap(r.service_name))) return;
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
  }, [active, rows]);

  const toTarget = (row: PatientPackageRow) => ({
    packageId: row.id,
    patientName: patientName ?? "Paciente",
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions,
  });

  const handleInsumoChange = async (pkg: PatientPackageRow, inventoryItemId: string) => {
    if (inventoryItemId === pkg.inventory_item_id) return;
    setSavingId(pkg.id);
    try {
      await updateSessionPackageInsumo(pkg.id, inventoryItemId, 1);
      const name = inventoryOptions.find((o) => o.id === inventoryItemId)?.name ?? "Insumo";
      setRows((prev) =>
        prev.map((p) =>
          p.id === pkg.id
            ? { ...p, inventory_item_id: inventoryItemId, inventory_item_name: name }
            : p,
        ),
      );
      toast.success("Insumo atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível trocar o insumo");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Carregando sessões…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum pacote de sessões para este paciente.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((row) => {
          const pct = Math.round((row.used_sessions / row.total_sessions) * 100);
          const remaining = row.total_sessions - row.used_sessions;
          const canCheckoff =
            row.status === "active" && row.used_sessions < row.total_sessions;
          const showInsumo = packageAllowsInsumoSwap(row.service_name);
          const filtered = showInsumo
            ? filterInventoryOptionsForProcedure(inventoryOptions, row.service_name)
            : [];
          const options =
            row.inventory_item_id && !filtered.some((o) => o.id === row.inventory_item_id)
              ? [
                  {
                    id: row.inventory_item_id,
                    name: row.inventory_item_name ?? "Insumo atual",
                    unit: "",
                    cost_price: 0,
                    categoryName: null,
                  },
                  ...filtered,
                ]
              : filtered;
          const scopeHint = showInsumo
            ? inventoryScopeLabel(inventoryScopeForProcedure(row.service_name))
            : null;

          return (
            <li key={row.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(row.unit_price)} ·{" "}
                        {fmtDateFromDate(new Date(row.purchased_at))}
                      </p>
                    </div>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </div>

                  {showInsumo && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Insumo</Label>
                      <Select
                        value={row.inventory_item_id ?? undefined}
                        onValueChange={(value) => void handleInsumoChange(row, value)}
                        disabled={!canCheckoff || savingId === row.id || options.length === 0}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={
                              row.inventory_item_name ??
                              (options.length === 0
                                ? "Nenhum insumo cadastrado"
                                : "Selecione o insumo")
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

                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {row.used_sessions} de {row.total_sessions} realizadas
                      {row.status === "active" && ` · ${remaining} restantes`}
                    </p>
                    <div className="flex gap-1">
                      {row.used_sessions > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setHistoryTarget(toTarget(row));
                            setHistoryOpen(true);
                          }}
                        >
                          Histórico
                        </Button>
                      )}
                      {canCheckoff && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCheckoffTarget(toTarget(row));
                            setCheckoffOpen(true);
                          }}
                        >
                          Dar baixa
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

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
