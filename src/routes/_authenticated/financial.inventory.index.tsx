import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, AlertTriangle, XCircle, DollarSign } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import { StockMovementDialog } from "@/components/stock-movement-dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/financial/inventory/")({ component: Page });

interface Item {
  id: string; name: string; current_stock: number; min_stock: number;
  cost_price: number; unit: string; active: boolean;
  inventory_categories: { name: string; color: string } | null;
  category_id: string | null;
}

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<string | undefined>();

  const load = async () => {
    const { data } = await supabase.from("inventory_items" as never)
      .select("id,name,current_stock,min_stock,cost_price,unit,active,category_id,inventory_categories(name,color)")
      .eq("active", true) as unknown as { data: Item[] };
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const total = items.length;
  const low = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock) && Number(i.current_stock) > 0).length;
  const zero = items.filter((i) => Number(i.current_stock) <= 0).length;
  const totalValue = items.reduce((s, i) => s + Number(i.current_stock) * Number(i.cost_price), 0);

  const alerts = items
    .filter((i) => Number(i.current_stock) <= Number(i.min_stock))
    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock));

  const byCategory = Object.values(
    items.reduce<Record<string, { name: string; color: string; value: number }>>((acc, i) => {
      const k = i.inventory_categories?.name ?? "Sem categoria";
      const c = i.inventory_categories?.color ?? "#9ca3af";
      acc[k] = acc[k] ?? { name: k, color: c, value: 0 };
      acc[k].value += Number(i.current_stock) * Number(i.cost_price);
      return acc;
    }, {})
  ).filter((d) => d.value > 0);

  const openMove = (id?: string) => { setMoveItem(id); setMoveOpen(true); };

  return (
    <DashboardShell title="Estoque">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Link to="/financial/inventory/categories"><Button variant="outline">Categorias</Button></Link>
          <Link to="/financial/inventory/items"><Button variant="outline">Gerenciar Itens</Button></Link>
          <Button onClick={() => openMove(undefined)}>Nova Movimentação</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center"><Package className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Total de Itens</p><p className="text-2xl font-bold">{total}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 grid place-items-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Estoque Baixo</p><p className="text-2xl font-bold text-amber-600">{low}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 grid place-items-center"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div><p className="text-xs text-muted-foreground">Itens Zerados</p><p className="text-2xl font-bold text-red-600">{zero}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 grid place-items-center"><DollarSign className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Valor em Estoque</p><p className="text-2xl font-bold text-blue-600">{fmt(totalValue)}</p></div>
          </CardContent></Card>
        </div>

        {alerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" />Alertas de Estoque</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((a) => {
                const isZero = Number(a.current_stock) <= 0;
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 border rounded-md p-3">
                    {a.inventory_categories && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: a.inventory_categories.color }}>
                        {a.inventory_categories.name}
                      </span>
                    )}
                    <span className="font-medium">{a.name}</span>
                    <Badge variant="outline" className={isZero ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"}>
                      {isZero ? "ZERADO" : "BAIXO"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Atual: {Number(a.current_stock)} {a.unit} · Mínimo: {Number(a.min_stock)} {a.unit}</span>
                    <Button size="sm" className="ml-auto" onClick={() => openMove(a.id)}>Repor Estoque</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Valor em Estoque por Categoria</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {byCategory.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {byCategory.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <StockMovementDialog open={moveOpen} onOpenChange={setMoveOpen} itemId={moveItem} onSaved={load} />
    </DashboardShell>
  );
}
