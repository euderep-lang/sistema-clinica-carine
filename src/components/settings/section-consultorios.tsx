import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

const PRESETS = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#ec4899","#6b7280","#0ea5e9","#10b981","#f43f5e"];

interface Room { id: string; name: string; description: string | null; color: string; active: boolean; }

export function SectionConsultorios() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [color, setColor] = useState(PRESETS[5]); const [active, setActive] = useState(true);
  const [delTarget, setDelTarget] = useState<Room | null>(null);

  const load = async () => {
    const { data } = await supabase.from("rooms").select("id,name,description,color,active").order("name");
    setRooms((data ?? []) as Room[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(""); setDesc(""); setColor(PRESETS[5]); setActive(true); setOpen(true); };
  const openEdit = (r: Room) => { setEditing(r); setName(r.name); setDesc(r.description ?? ""); setColor(r.color); setActive(r.active); setOpen(true); };

  const save = async () => {
    if (!name || !profile) return;
    const payload = { name, description: desc || null, color, active };
    const { error } = editing
      ? await supabase.from("rooms").update(payload).eq("id", editing.id)
      : await supabase.from("rooms").insert({ ...payload, tenant_id: profile.tenant_id });
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Salvo"); setOpen(false); load(); }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    await supabase.from("rooms").update({ active: false }).eq("id", delTarget.id);
    toast.success("Consultório desativado"); setDelTarget(null); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Consultório</Button></div>
      <div className="grid md:grid-cols-2 gap-3">
        {rooms.map((r) => (
          <Card key={r.id}><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full shrink-0" style={{ background: r.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><p className="font-medium truncate">{r.name}</p>
                <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
            {r.active && <Button size="icon" variant="ghost" onClick={() => setDelTarget(r)}><Trash2 className="h-4 w-4" /></Button>}
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Consultório</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESETS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
              <Input className="mt-2" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar consultório?</AlertDialogTitle>
            <AlertDialogDescription>Este consultório será desativado. Agendamentos existentes não serão afetados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Desativar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}