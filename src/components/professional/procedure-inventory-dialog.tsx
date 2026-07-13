import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import {
  filterInventoryOptionsForProcedure,
  inventoryScopeForProcedure,
  inventoryScopeLabel,
  procedureInventoryTargetLabel,
  type InventoryLinkInput,
  type ProcedureInventoryOption,
  type ProcedureInventoryTarget,
} from "@/lib/procedures";

export type { ProcedureInventoryTarget };

interface Props {
  open: boolean;
  targets: ProcedureInventoryTarget[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (inventory: Record<string, InventoryLinkInput[]>) => void;
}

export function ProcedureInventoryDialog({
  open,
  targets,
  onOpenChange,
  onConfirm,
}: Props) {
  const [options, setOptions] = useState<ProcedureInventoryOption[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setSelections({});
    void (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id,name,unit,cost_price,inventory_categories(name)")
        .eq("active", true)
        .order("name");
      setOptions(
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
  }, [open]);

  const optionById = useMemo(() => new Map(options.map((opt) => [opt.id, opt])), [options]);

  const optionsForTarget = useMemo(() => {
    const map = new Map<string, ProcedureInventoryOption[]>();
    for (const target of targets) {
      map.set(
        target.unitKey,
        filterInventoryOptionsForProcedure(options, target.serviceName),
      );
    }
    return map;
  }, [options, targets]);

  const totalCost = useMemo(() => {
    let sum = 0;
    for (const target of targets) {
      const itemId = selections[target.unitKey];
      if (!itemId) continue;
      sum += optionById.get(itemId)?.cost_price ?? 0;
    }
    return sum;
  }, [targets, selections, optionById]);

  const confirm = () => {
    if (targets.length === 0) return;

    const missing = targets.filter((target) => !selections[target.unitKey]);
    if (missing.length > 0) {
      toast.error("Selecione o insumo de cada procedimento");
      return;
    }

    const inventory: Record<string, InventoryLinkInput[]> = {};
    for (const target of targets) {
      const itemId = selections[target.unitKey];
      inventory[target.unitKey] = [{ inventory_item_id: itemId, quantity: 1 }];
    }

    onConfirm(inventory);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Insumos da venda</DialogTitle>
          <DialogDescription>
            Escolha o insumo de cada procedimento vendido. Não altera o cadastro padrão — a baixa
            no estoque ocorre quando você der baixa na sessão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {targets.map((target) => {
            const unitLabel = procedureInventoryTargetLabel(target);
            const filteredOptions = optionsForTarget.get(target.unitKey) ?? [];
            const filterHint = inventoryScopeLabel(inventoryScopeForProcedure(target.serviceName));
            const selectedId = selections[target.unitKey] ?? "";
            const selectedOpt = selectedId ? optionById.get(selectedId) : undefined;

            return (
              <div key={target.unitKey} className="rounded-lg border bg-muted/10 p-3 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Label className="text-sm font-semibold">Insumo {unitLabel}</Label>
                  {selectedOpt ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Custo: {fmt(selectedOpt.cost_price)}
                    </span>
                  ) : null}
                </div>

                {filterHint ? (
                  <p className="text-xs text-muted-foreground">{filterHint}</p>
                ) : null}

                {filteredOptions.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-2 text-center text-sm text-muted-foreground">
                    Nenhum insumo disponível para este procedimento.
                  </p>
                ) : (
                  <Select
                    value={selectedId}
                    onValueChange={(value) =>
                      setSelections((prev) => ({ ...prev, [target.unitKey]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Item do estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name} ({opt.unit}) · {fmt(opt.cost_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}

          {targets.length > 0 ? (
            <div className="flex items-center justify-end border-t pt-3 text-sm">
              <span className="text-muted-foreground">Custo total estimado:</span>
              <span className="ml-2 font-semibold tabular-nums">{fmt(totalCost)}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={targets.length === 0}>
            Confirmar insumos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
