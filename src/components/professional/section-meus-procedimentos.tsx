import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, parseBRLInput } from "@/lib/currency";

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  default_price: number;
  duration_minutes: number | null;
  session_count: number;
  active: boolean;
}

interface InventoryOption {
  id: string;
  name: string;
  unit: string;
}

interface InventoryLink {
  inventory_item_id: string;
  quantity: string;
}

export function SectionMeusProcedimentos() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Procedure[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [dur, setDur] = useState("30");
  const [sessions, setSessions] = useState("1");
  const [active, setActive] = useState(true);
  const [inventoryLinks, setInventoryLinks] = useState<InventoryLink[]>([]);

  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,name,description,category,default_price,duration_minutes,session_count,active",
      )
      .eq("professional_id", profile.id)
      .order("name");
    if (error) toast.error(error.message);
    setItems((data ?? []).map((p) => ({ ...p, session_count: Number(p.session_count ?? 1) })) as Procedure[]);
  };

  const loadInventory = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("id,name,unit")
      .eq("active", true)
      .order("name");
    setInventoryOptions((data ?? []) as InventoryOption[]);
  };

  useEffect(() => {
    load();
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadInventoryLinks = async (serviceId: string) => {
    const { data } = await supabase
      .from("service_inventory_items")
      .select("inventory_item_id,quantity")
      .eq("service_id", serviceId);
    setInventoryLinks(
      (data ?? []).map((row) => ({
        inventory_item_id: row.inventory_item_id,
        quantity: String(row.quantity),
      })),
    );
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDesc("");
    setCat("");
    setPrice("");
    setDur("30");
    setSessions("1");
    setActive(true);
    setInventoryLinks([]);
    setOpen(true);
  };

  const openEdit = async (item: Procedure) => {
    setEditing(item);
    setName(item.name);
    setDesc(item.description ?? "");
    setCat(item.category ?? "");
    setPrice(String(item.default_price));
    setDur(String(item.duration_minutes ?? 30));
    setSessions(String(item.session_count));
    setActive(item.active);
    await loadInventoryLinks(item.id);
    setOpen(true);
  };

  const addInventoryRow = () => {
    setInventoryLinks((prev) => [...prev, { inventory_item_id: "", quantity: "1" }]);
  };

  const saveInventoryLinks = async (serviceId: string) => {
    await supabase.from("service_inventory_items").delete().eq("service_id", serviceId);
    const valid = inventoryLinks.filter(
      (l) => l.inventory_item_id && Number(l.quantity) > 0,
    );
    if (valid.length === 0) return;
    const { error } = await supabase.from("service_inventory_items").insert(
      valid.map((l) => ({
        service_id: serviceId,
        inventory_item_id: l.inventory_item_id,
        quantity: Number(l.quantity),
      })),
    );
    if (error) throw new Error(error.message);
  };

  const save = async () => {
    if (!name || !profile) return;
    const payload = {
      name,
      description: desc || null,
      category: cat || null,
      default_price: parseBRLInput(price) || 0,
      duration_minutes: Number(dur) || 30,
      session_count: Math.max(1, Number(sessions) || 1),
      active,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
        await saveInventoryLinks(editing.id);
      } else {
        const { data, error } = await supabase
          .from("services")
          .insert({
            ...payload,
            tenant_id: profile.tenant_id,
            professional_id: profile.id,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        if (data) await saveInventoryLinks(data.id);
      }
      toast.success("Procedimento salvo");
      setOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (item: Procedure) => {
    const { error } = await supabase.from("services").update({ active: false }).eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Procedimento desativado");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cadastre procedimentos com preço, pacotes de sessões e insumos de estoque consumidos a
          cada uso. Ao finalizar a consulta, cobrança, estoque e sessões são atualizados
          automaticamente.
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-2 size-4" />
          Novo procedimento
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Sessões</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum procedimento cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.category ?? "—"}
                  </TableCell>
                  <TableCell>{fmt(item.default_price)}</TableCell>
                  <TableCell>
                    {item.session_count > 1 ? (
                      <Badge variant="secondary">{item.session_count} sessões</Badge>
                    ) : (
                      "Avulso"
                    )}
                  </TableCell>
                  <TableCell>{item.duration_minutes ?? 30} min</TableCell>
                  <TableCell>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => void openEdit(item)}>
                      <Pencil className="size-4" />
                    </Button>
                    {item.active && (
                      <Button size="icon" variant="ghost" onClick={() => remove(item)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar procedimento" : "Novo procedimento"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div>
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Tirzepatida — 8 doses"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Ex.: Nutrologia" />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={dur} onChange={(e) => setDur(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço padrão</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="R$ 0,00" />
              </div>
              <div>
                <Label>Sessões por venda</Label>
                <Input
                  type="number"
                  min={1}
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value)}
                  placeholder="1 = avulso, 10 = pacote"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>Insumos de estoque (por uso)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInventoryRow}>
                  <Plus className="mr-1 size-3" />
                  Insumo
                </Button>
              </div>
              {inventoryLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum insumo vinculado. O estoque não será baixado automaticamente.
                </p>
              ) : (
                inventoryLinks.map((link, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        value={link.inventory_item_id}
                        onValueChange={(v) =>
                          setInventoryLinks((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, inventory_item_id: v } : row,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Item do estoque" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name} ({opt.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={link.quantity}
                      onChange={(e) =>
                        setInventoryLinks((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, quantity: e.target.value } : row,
                          ),
                        )
                      }
                      className="w-20"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setInventoryLinks((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
