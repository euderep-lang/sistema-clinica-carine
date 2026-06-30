import { useEffect, useMemo, useState } from "react";
import { Info, Power } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { softDeactivate } from "@/lib/trash";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  default_price: number;
  duration_minutes: number | null;
  active: boolean;
  professional_id: string | null;
  professional: { full_name: string } | null;
}

export function SectionServicos() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ServiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");

  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,name,description,category,default_price,duration_minutes,active,professional_id,professional:profiles!services_professional_id_fkey(full_name)",
      )
      .order("name");
    if (error) toast.error(error.message);
    else setItems((data ?? []) as ServiceRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const professionals = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.professional_id && item.professional?.full_name) {
        map.set(item.professional_id, item.professional.full_name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (professionalFilter === "all") return true;
        if (professionalFilter === "clinic") return !item.professional_id;
        return item.professional_id === professionalFilter;
      })
      .filter((item) => {
        if (!q) return true;
        const prof = item.professional?.full_name?.toLowerCase() ?? "";
        return (
          item.name.toLowerCase().includes(q) ||
          (item.category?.toLowerCase().includes(q) ?? false) ||
          prof.includes(q)
        );
      })
      .sort((a, b) => {
        const profA = a.professional?.full_name ?? "Clínica";
        const profB = b.professional?.full_name ?? "Clínica";
        const byProf = profA.localeCompare(profB, "pt-BR");
        return byProf !== 0 ? byProf : a.name.localeCompare(b.name, "pt-BR");
      });
  }, [items, search, professionalFilter]);

  const activeCount = filtered.filter((i) => i.active).length;

  const toggleActive = async (item: ServiceRow) => {
    const next = !item.active;
    try {
      if (!next) {
        await softDeactivate({
          entityType: "service",
          table: "services",
          id: item.id,
          label: item.name,
          summary: item.professional?.full_name ?? "Clínica",
          children: [{ table: "service_inventory_items", fk: "service_id" }],
        });
        toast.success("Procedimento movido para a lixeira");
      } else {
        const { error } = await supabase.from("services").update({ active: true }).eq("id", item.id);
        if (error) throw error;
        toast.success("Procedimento reativado");
      }
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Catálogo consolidado da clínica. Cada profissional cadastra e mantém seus procedimentos em{" "}
          <strong>Administrativo → Procedimentos</strong>; as alterações aparecem aqui
          automaticamente. Como administrador, você pode <strong>desativar ou reativar</strong> qualquer
          procedimento da clínica.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} procedimento{filtered.length !== 1 ? "s" : ""} · {activeCount} ativo
          {activeCount !== 1 ? "s" : ""}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Buscar por nome, categoria ou profissional…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              <SelectItem value="clinic">Somente clínica (sem vínculo)</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {items.length === 0
                    ? "Nenhum procedimento cadastrado ainda. Os profissionais podem incluir os seus em Minhas configurações."
                    : "Nenhum resultado para os filtros aplicados."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">
                    {item.professional?.full_name ?? (
                      <span className="text-muted-foreground">Clínica</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.category ?? "—"}</TableCell>
                  <TableCell>{fmt(item.default_price)}</TableCell>
                  <TableCell>{item.duration_minutes ?? 30} min</TableCell>
                  <TableCell>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={item.active ? "ghost" : "outline"}
                      onClick={() => toggleActive(item)}
                    >
                      <Power className="mr-1 size-4" />
                      {item.active ? "Desativar" : "Reativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
