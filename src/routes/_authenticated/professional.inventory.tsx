import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, AlertTriangle, ShoppingCart, Settings2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { stockStatus, STATUS_CLASS, STATUS_LABEL } from "@/lib/inventory";
import { StockMovementDialog } from "@/components/stock-movement-dialog";

export const Route = createFileRoute("/_authenticated/professional/inventory")({ component: Page });

interface Item {
  id: string; name: string; unit: string;
  current_stock: number; min_stock: number; category_id: string | null;
  inventory_categories: { name: string; color: string } | null;
}
interface Category { id: string; name: string; }

type MovementMode = "purchase" | "consumption" | null;

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [selItem, setSelItem] = useState<string | undefined>();
  const [mode, setMode] = useState<MovementMode>(null);

  const load = async () => {
    const { data } = await supabase.from("inventory_items" as never)
      .select("id,name,unit,current_stock,min_stock,category_id,inventory_categories(name,color)")
      .eq("active", true).order("name") as unknown as { data: Item[] };
    setItems(data ?? []);
    const { data: c } = await supabase.from("inventory_categories" as never)
      .select("id,name").order("name") as unknown as { data: Category[] };
    setCats(c ?? []);
  };
  useEffect(() => { load(); }, []);

  const openMovement = (movementMode: MovementMode, itemId?: string) => {
    setMode(movementMode);
    setSelItem(itemId);
    setOpen(true);
  };

  const filtered = useMemo(() => items.filter((i) => {
    if (cat !== "all" && i.category_id !== cat) return false;
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, q, cat]);

  const lowCount = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length;

  return (
    <DashboardShell title="Estoque">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center"><Package className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Itens Disponíveis</p><p className="text-2xl font-bold">{items.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 grid place-items-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Estoque Baixo</p><p className="text-2xl font-bold text-amber-600">{lowCount}</p></div>
          </CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder="Buscar item" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => openMovement("purchase")}>
            <ShoppingCart className="mr-2 size-4" />
            Nova compra
          </Button>
          <Link to="/financial/inventory/items">
            <Button variant="outline">
              <Settings2 className="mr-2 size-4" />
              Gerenciar itens
            </Button>
          </Link>
          <Link to="/financial/inventory/categories">
            <Button variant="outline">Categorias</Button>
          </Link>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow>
            <TableHead>Categoria</TableHead><TableHead>Nome</TableHead>
            <TableHead>Unidade</TableHead><TableHead>Disponível</TableHead>
            <TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Nenhum item</TableCell></TableRow> :
              filtered.map((i) => {
                const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
                return (
                  <TableRow key={i.id}>
                    <TableCell>{i.inventory_categories && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: i.inventory_categories.color }}>{i.inventory_categories.name}</span>
                    )}</TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell>{Number(i.current_stock)}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_CLASS[st]}>{STATUS_LABEL[st]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => openMovement("purchase", i.id)}
                        >
                          Registrar compra
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMovement("consumption", i.id)}
                        >
                          Registrar consumo
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table></CardContent></Card>
      </div>

      <StockMovementDialog
        open={open}
        onOpenChange={setOpen}
        itemId={selItem}
        fixedType={mode === "purchase" ? "in" : mode === "consumption" ? "out" : undefined}
        fixedReason={mode === "purchase" ? "Compra" : mode === "consumption" ? "Uso em procedimento" : undefined}
        title={mode === "purchase" ? "Registrar compra" : mode === "consumption" ? "Registrar consumo" : undefined}
        hidePatient={mode === "purchase"}
        onSaved={load}
      />
    </DashboardShell>
  );
}
