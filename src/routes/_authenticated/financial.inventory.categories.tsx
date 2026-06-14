import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Pencil } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financial/inventory/categories")({ component: Page });

interface Category { id: string; name: string; color: string; count: number; }

function Page() {
  const { profile } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState(""); const [color, setColor] = useState("#6b7280");

  const load = async () => {
    const { data } = await supabase.from("inventory_categories" as never)
      .select("id,name,color,inventory_items(count)")
      .order("name") as unknown as { data: Array<Category & { inventory_items: { count: number }[] }> };
    setCats((data ?? []).map((c) => ({ ...c, count: c.inventory_items?.[0]?.count ?? 0 })));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(""); setColor("#6b7280"); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setColor(c.color); setOpen(true); };

  const save = async () => {
    if (!name || !profile) return;
    const payload = { name, color };
    const { error } = editing
      ? await supabase.from("inventory_categories" as never).update(payload as never).eq("id", editing.id)
      : await supabase.from("inventory_categories" as never).insert({ ...payload, tenant_id: profile.tenant_id } as never);
    if (error) toast.error("Erro ao salvar"); else { toast.success("Salvo"); setOpen(false); load(); }
  };

  const remove = async (c: Category) => {
    if (c.count > 0) return;
    const { error } = await supabase.from("inventory_categories" as never).delete().eq("id", c.id);
    if (error) toast.error("Erro"); else { toast.success("Removida"); load(); }
  };

  return (
    <DashboardShell title="Categorias de Estoque">
      <div className="space-y-4">
        <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Categoria</Button></div>
        <div className="grid gap-3 md:grid-cols-3">
          {cats.map((c) => (
            <Card key={c.id}><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg shrink-0" style={{ background: c.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.count} {c.count === 1 ? "item" : "itens"}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
              <TooltipProvider><Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="icon" variant="ghost" disabled={c.count > 0} onClick={() => remove(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {c.count > 0 && <TooltipContent>Remova os itens primeiro</TooltipContent>}
              </Tooltip></TooltipProvider>
            </CardContent></Card>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}