import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import { UNITS } from "@/lib/inventory";

interface Category { id: string; name: string; }

export function InventoryItemDialog({ open, onOpenChange, onSaved }:
  { open: boolean; onOpenChange: (v: boolean) => void; onSaved?: () => void }) {
  const { profile } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [brand, setBrand] = useState(""); const [category, setCategory] = useState<string>("");
  const [unit, setUnit] = useState<string>("un");
  const [current, setCurrent] = useState("0"); const [min, setMin] = useState("0");
  const [cost, setCost] = useState("0");
  const [sku, setSku] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(""); setDescription(""); setBrand(""); setCategory(""); setUnit("un");
    setCurrent("0"); setMin("0"); setCost("0"); setSku("");
    (async () => {
      const { data } = await supabase.from("inventory_categories" as never)
        .select("id,name").order("name") as unknown as { data: Category[] };
      setCats(data ?? []);
    })();
  }, [open]);

  const save = async () => {
    if (!profile || !name) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("inventory_items" as never).insert({
      tenant_id: profile.tenant_id, name, description: description || null, brand: brand || null,
      category_id: category || null, unit, current_stock: Number(current), min_stock: Number(min),
      cost_price: Number(cost), sell_price: 0, sku: sku || null,
    } as never);
    setSaving(false);
    if (error) { toast.error("Erro ao criar item"); return; }
    toast.success("Item criado");
    onOpenChange(false); onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Novo Item</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="col-span-2"><Label>Descrição</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Marca</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div><Label>Código interno</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div><Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Unidade</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Estoque atual</Label><Input type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div><Label>Estoque mínimo</Label><Input type="number" step="0.01" value={min} onChange={(e) => setMin(e.target.value)} /></div>
          <div className="col-span-2"><Label>Preço de custo (R$)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <p className="col-span-2 text-xs text-muted-foreground">O preço de venda é definido no procedimento vinculado, não no item de estoque.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}