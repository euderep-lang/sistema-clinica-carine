import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Download, ArrowDownToLine } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import { stockStatus, STATUS_LABEL, STATUS_CLASS } from "@/lib/inventory";
import { InventoryItemDialog } from "@/components/inventory-item-dialog";
import { StockMovementDialog } from "@/components/stock-movement-dialog";

export const Route = createFileRoute("/_authenticated/financial/inventory/items/")({ component: Page });

interface Item {
  id: string; name: string; sku: string | null; unit: string;
  current_stock: number; min_stock: number; cost_price: number; sell_price: number;
  active: boolean; category_id: string | null;
  inventory_categories: { name: string; color: string } | null;
}
interface Category { id: string; name: string; }

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all");
  const [stat, setStat] = useState("all"); const [onlyActive, setOnlyActive] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("inventory_items" as never)
      .select("id,name,sku,unit,current_stock,min_stock,cost_price,sell_price,active,category_id,inventory_categories(name,color)")
      .order("name") as unknown as { data: Item[] };
    setItems(data ?? []);
    const { data: c } = await supabase.from("inventory_categories" as never)
      .select("id,name").order("name") as unknown as { data: Category[] };
    setCats(c ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((i) => {
    if (onlyActive && !i.active) return false;
    if (cat !== "all" && i.category_id !== cat) return false;
    const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
    if (stat !== "all" && st !== stat) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!i.name.toLowerCase().includes(s) && !(i.sku ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  }), [items, q, cat, stat, onlyActive]);

  const exportCsv = () => {
    const head = "Nome,Código interno,Unidade,Estoque,Minimo,Custo,Venda\n";
    const body = filtered.map((i) => [i.name, i.sku ?? "", i.unit, i.current_stock, i.min_stock, i.cost_price, i.sell_price].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <DashboardShell title="Itens de Estoque">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2 justify-between">
          <div className="flex flex-wrap gap-2 items-end">
            <Input placeholder="Buscar nome ou código interno" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stat} onValueChange={setStat}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="healthy">Saudável</SelectItem>
                <SelectItem value="low">Estoque Baixo</SelectItem>
                <SelectItem value="zero">Zerado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2"><Switch checked={onlyActive} onCheckedChange={setOnlyActive} id="act" /><Label htmlFor="act">Somente ativos</Label></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Planilha</Button>
            <Button variant="outline" onClick={() => setMoveOpen(true)}><ArrowDownToLine className="h-4 w-4 mr-2" />Entrada de Estoque</Button>
            <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Item</Button>
          </div>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow>
            <TableHead>Categoria</TableHead><TableHead>Nome</TableHead><TableHead>Código interno</TableHead>
            <TableHead>Un.</TableHead><TableHead>Atual</TableHead><TableHead>Mín.</TableHead>
            <TableHead>Custo</TableHead><TableHead>Venda</TableHead><TableHead>Situação</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">Nenhum item</TableCell></TableRow> :
              filtered.map((i) => {
                const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
                return (
                  <TableRow key={i.id} className="cursor-pointer">
                    <TableCell>{i.inventory_categories && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: i.inventory_categories.color }}>{i.inventory_categories.name}</span>
                    )}</TableCell>
                    <TableCell><Link to="/financial/inventory/items/$id" params={{ id: i.id }} className="font-medium hover:underline">{i.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{i.sku ?? "—"}</TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell>{Number(i.current_stock)}</TableCell>
                    <TableCell>{Number(i.min_stock)}</TableCell>
                    <TableCell>{fmt(Number(i.cost_price))}</TableCell>
                    <TableCell>{fmt(Number(i.sell_price))}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_CLASS[st]}>{STATUS_LABEL[st]}</Badge></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table></CardContent></Card>
      </div>

      <InventoryItemDialog open={newOpen} onOpenChange={setNewOpen} onSaved={load} />
      <StockMovementDialog open={moveOpen} onOpenChange={setMoveOpen} fixedType="in" onSaved={load} />
    </DashboardShell>
  );
}
