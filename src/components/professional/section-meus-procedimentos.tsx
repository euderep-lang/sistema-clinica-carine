import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { softDeactivate } from "@/lib/trash";
import { useAuth } from "@/lib/mock-auth";
import { fmt, parseBRLInput } from "@/lib/currency";
import { sortProceduresForDisplay } from "@/lib/procedures";

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

const NO_CONSULTATION_SERVICE = "__none__";

export function SectionMeusProcedimentos() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Procedure[]>([]);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [consultationServiceId, setConsultationServiceId] = useState<string>(NO_CONSULTATION_SERVICE);
  const [onlineConsultationServiceId, setOnlineConsultationServiceId] =
    useState<string>(NO_CONSULTATION_SERVICE);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Procedure | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [price, setPrice] = useState("");
  const [dur, setDur] = useState("30");
  const [sessions, setSessions] = useState("1");
  const [inventoryLinks, setInventoryLinks] = useState<InventoryLink[]>([]);

  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,name,description,category,default_price,duration_minutes,session_count,active",
      )
      .eq("professional_id", profile.id)
      .eq("active", true)
      .order("name");
    if (error) toast.error(error.message);
    setItems(
      sortProceduresForDisplay(
        (data ?? []).map((p) => ({ ...p, session_count: Number(p.session_count ?? 1) })) as Procedure[],
      ),
    );
  };

  const loadInventory = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("id,name,unit")
      .eq("active", true)
      .order("name");
    setInventoryOptions((data ?? []) as InventoryOption[]);
  };

  const loadConsultationMapping = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("profiles")
      .select("consultation_service_id, online_consultation_service_id")
      .eq("id", profile.id)
      .maybeSingle();
    setConsultationServiceId(
      (data as { consultation_service_id?: string | null } | null)?.consultation_service_id ??
        NO_CONSULTATION_SERVICE,
    );
    setOnlineConsultationServiceId(
      (data as { online_consultation_service_id?: string | null } | null)
        ?.online_consultation_service_id ?? NO_CONSULTATION_SERVICE,
    );
  };

  const saveConsultationMapping = async (
    field: "consultation_service_id" | "online_consultation_service_id",
    value: string,
  ) => {
    if (!profile) return;
    const dbValue = value === NO_CONSULTATION_SERVICE ? null : value;
    if (field === "consultation_service_id") setConsultationServiceId(value);
    else setOnlineConsultationServiceId(value);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: dbValue })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else toast.success("Consulta padrão atualizada");
  };

  useEffect(() => {
    load();
    loadInventory();
    loadConsultationMapping();
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
      active: true,
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await softDeactivate({
        entityType: "service",
        table: "services",
        id: deleteTarget.id,
        label: deleteTarget.name,
        summary: deleteTarget.category ?? null,
        children: [{ table: "service_inventory_items", fk: "service_id" }],
      });
      setDeleteTarget(null);
      toast.success("Procedimento movido para a lixeira. Restaure em Minhas configurações → Lixeira.");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cadastre serviços e procedimentos com preço e pacotes de sessões. Procedimentos podem
          vincular insumos de estoque (baixa automática no uso); serviços como consultas não
          precisam de estoque vinculado.
        </p>
        <Button onClick={openNew}>
          <Plus className="mr-2 size-4" />
          Novo serviço / procedimento
        </Button>
      </div>

      <Card className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Consulta padrão por modalidade</h3>
          <p className="text-xs text-muted-foreground">
            Escolha qual procedimento representa a sua consulta. Ao agendar, a fatura da consulta é
            lançada automaticamente com esse preço (presencial ou online).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Consulta presencial</Label>
            <Select
              value={consultationServiceId}
              onValueChange={(v) => void saveConsultationMapping("consultation_service_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CONSULTATION_SERVICE}>Não lançar automaticamente</SelectItem>
                {items
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} — {fmt(i.default_price)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Consulta online</Label>
            <Select
              value={onlineConsultationServiceId}
              onValueChange={(v) => void saveConsultationMapping("online_consultation_service_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CONSULTATION_SERVICE}>Não lançar automaticamente</SelectItem>
                {items
                  .map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} — {fmt(i.default_price)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Sessões</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                    <Badge variant="secondary">
                      {item.session_count === 1
                        ? "1 sessão/un."
                        : `${item.session_count} sessões/un.`}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.duration_minutes ?? 30} min</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => void openEdit(item)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="size-4" />
                    </Button>
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
                  placeholder="1 = 1 baixa por unidade vendida"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir procedimento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" sairá da sua lista e ficará na lixeira por 30 dias. Você pode restaurá-lo em Minhas configurações → Lixeira.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
