import { useEffect, useState, KeyboardEvent } from "react";
import { Plus, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/mock-auth";
import {
  getTenantSetting,
  isLegacySpecialtyList,
  resolveSpecialties,
  setTenantSetting,
} from "@/lib/settings-helpers";
import { toast } from "sonner";

export function SectionEspecialidades() {
  const { tenant } = useAuth();
  const [items, setItems] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!tenant) return;
    getTenantSetting<string[]>(tenant.id, "specialties").then(async (v) => {
      const resolved = resolveSpecialties(v);
      setItems(resolved);
      if (v && isLegacySpecialtyList(v)) {
        await setTenantSetting(tenant.id, "specialties", resolved);
      }
    });
  }, [tenant]);

  const persist = async (next: string[]) => {
    if (!tenant) return;
    setItems(next);
    await setTenantSetting(tenant.id, "specialties", next);
  };

  const add = async () => {
    const v = draft.trim(); if (!v) { setAdding(false); return; }
    if (items.includes(v)) { toast.error("Já existe"); return; }
    await persist([...items, v]); setDraft(""); setAdding(false);
  };

  const remove = async (s: string) => { await persist(items.filter((x) => x !== s)); };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Escape") { setAdding(false); setDraft(""); }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-2">
          {items.map((s) => (
            <Badge key={s} variant="secondary" className="text-sm py-1 px-3 gap-1">
              {s}
              <button type="button" onClick={() => remove(s)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {adding ? (
            <div className="flex items-center gap-1">
              <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} className="h-7 w-40" placeholder="Nome..." />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={add}><Check className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Adicionar Especialidade</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}