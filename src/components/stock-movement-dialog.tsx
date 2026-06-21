import { fmtDateTimeLocalInput } from "@/lib/locale";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import { MOVEMENT_LABEL, REASONS, applyMovement, type MovementType } from "@/lib/inventory";
import { cn } from "@/lib/utils";

interface Item { id: string; name: string; unit: string; current_stock: number; min_stock: number; }
interface Patient { id: string; full_name: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId?: string;
  fixedType?: MovementType;
  fixedReason?: string;
  title?: string;
  hidePatient?: boolean;
  onSaved?: () => void;
}

const TYPE_BTN: Record<MovementType, string> = {
  in: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
  out: "data-[active=true]:bg-red-600 data-[active=true]:text-white",
  adjustment: "data-[active=true]:bg-blue-600 data-[active=true]:text-white",
  waste: "data-[active=true]:bg-orange-600 data-[active=true]:text-white",
};

export function StockMovementDialog({
  open,
  onOpenChange,
  itemId,
  fixedType,
  fixedReason,
  title,
  hidePatient,
  onSaved,
}: Props) {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selItem, setSelItem] = useState<string>(itemId ?? "");
  const [type, setType] = useState<MovementType>(fixedType ?? "in");
  const [quantity, setQuantity] = useState<string>("");
  const [date, setDate] = useState(fmtDateTimeLocalInput());
  const [reason, setReason] = useState<string>(fixedReason ?? "");
  const [unitCost, setUnitCost] = useState<string>("");
  const [patient, setPatient] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelItem(itemId ?? "");
    setType(fixedType ?? "in");
    setReason(fixedReason ?? "");
    setQuantity(""); setUnitCost(""); setPatient(""); setNotes("");
    setDate(fmtDateTimeLocalInput());
    (async () => {
      const { data: it } = await supabase.from("inventory_items" as never)
        .select("id,name,unit,current_stock,min_stock").eq("active", true).order("name") as unknown as { data: Item[] };
      setItems(it ?? []);
      const { data: pt } = await supabase.from("patients").select("id,full_name").order("full_name").limit(200);
      setPatients((pt as Patient[]) ?? []);
    })();
  }, [open, itemId, fixedType, fixedReason]);

  const current = useMemo(() => items.find((i) => i.id === selItem), [items, selItem]);
  const qNum = Number(quantity) || 0;
  const after = current ? applyMovement(Number(current.current_stock), type, qNum) : 0;
  const reasonOptions = REASONS[type];

  useEffect(() => { if (fixedReason) setReason(fixedReason); else setReason(""); }, [type, fixedReason]);

  const save = async () => {
    if (!current || !profile) { toast.error("Selecione um item"); return; }
    if (qNum <= 0) { toast.error("Quantidade inválida"); return; }
    setSaving(true);
    const { error: mErr } = await supabase.from("inventory_movements" as never).insert({
      tenant_id: profile.tenant_id,
      item_id: current.id,
      type,
      quantity: qNum,
      unit_cost: type === "in" && unitCost ? Number(unitCost) : null,
      reason: reason || null,
      notes: notes || null,
      patient_id: patient || null,
      professional_id: profile.role === "professional" ? profile.id : null,
      created_by: profile.id,
      date: new Date(date).toISOString(),
    } as never);
    if (mErr) { setSaving(false); toast.error("Erro ao salvar"); return; }
    const { error: uErr } = await supabase.from("inventory_items" as never)
      .update({ current_stock: after } as never).eq("id", current.id);
    setSaving(false);
    if (uErr) { toast.error("Movimento salvo, mas erro ao atualizar estoque"); return; }
    toast.success("Movimento registrado");
    if (after <= Number(current.min_stock)) toast.warning("Atenção: estoque abaixo do mínimo");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? "Movimentação de Estoque"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Item</Label>
            <Select value={selItem} onValueChange={setSelItem} disabled={!!itemId}>
              <SelectTrigger><SelectValue placeholder="Selecione um item" /></SelectTrigger>
              <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            {current && <p className="text-xs text-muted-foreground mt-1">Estoque atual: {Number(current.current_stock)} {current.unit}</p>}
          </div>

          {!fixedType && (
            <div>
              <Label>Tipo</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => (
                  <button key={t} type="button" data-active={type === t}
                    onClick={() => setType(t)}
                    className={cn("rounded-md border px-2 py-1.5 text-sm", TYPE_BTN[t])}>
                    {MOVEMENT_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{type === "adjustment" ? "Novo estoque total" : "Quantidade"}</Label>
              <Input type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason} disabled={!!fixedReason}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{reasonOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {type === "in" && (
            <div>
              <Label>Preço unitário (R$)</Label>
              <Input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
          )}

          {!hidePatient && (
            <div>
              <Label>Paciente (opcional)</Label>
              <Select value={patient || "none"} onValueChange={(v) => setPatient(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {current && qNum > 0 && (
            <p className="text-sm bg-muted px-3 py-2 rounded-md">
              Após este registro: estoque passará de <strong>{Number(current.current_stock)}</strong> para <strong>{after}</strong> {current.unit}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}