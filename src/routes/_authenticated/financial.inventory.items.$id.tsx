import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtDT, MOVEMENT_CLASS, MOVEMENT_LABEL, stockStatus, STATUS_CLASS, STATUS_LABEL, UNITS, type MovementType } from "@/lib/inventory";
import { StockMovementDialog } from "@/components/stock-movement-dialog";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/financial/inventory/items/$id")({ component: Page });

interface Item {
  id: string; name: string; description: string | null; brand: string | null; category_id: string | null;
  unit: string; current_stock: number; min_stock: number; max_stock: number | null;
  cost_price: number; sell_price: number; sku: string | null; active: boolean;
  inventory_categories: { name: string; color: string } | null;
}
interface Movement {
  id: string; date: string; type: MovementType; quantity: number;
  reason: string | null; notes: string | null;
  profiles: { full_name: string } | null;
  patients: { full_name: string } | null;
}
interface Category { id: string; name: string; }

function Page() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveType, setMoveType] = useState<MovementType>("in");
  const [filterType, setFilterType] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const load = async () => {
    const { data } = await supabase.from("inventory_items" as never)
      .select("id,name,description,brand,category_id,unit,current_stock,min_stock,max_stock,cost_price,sell_price,sku,active,inventory_categories(name,color)")
      .eq("id", id).maybeSingle() as unknown as { data: Item };
    setItem(data ?? null);
    const { data: m } = await supabase.from("inventory_movements" as never)
      .select("id,date,type,quantity,reason,notes,profiles:professional_id(full_name),patients(full_name)")
      .eq("item_id", id).order("date", { ascending: false }) as unknown as { data: Movement[] };
    setMovements(m ?? []);
    const { data: c } = await supabase.from("inventory_categories" as never)
      .select("id,name").order("name") as unknown as { data: Category[] };
    setCats(c ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const filteredMov = useMemo(() => movements.filter((m) => {
    if (filterType !== "all" && m.type !== filterType) return false;
    if (from && m.date < from) return false;
    if (to && m.date > to + "T23:59:59") return false;
    return true;
  }), [movements, filterType, from, to]);
  const pageMov = filteredMov.slice(page * 20, page * 20 + 20);

  const openMov = (t: MovementType) => { setMoveType(t); setMoveOpen(true); };

  const save = async () => {
    if (!item) return;
    const { error } = await supabase.from("inventory_items" as never).update({
      name: item.name, description: item.description, brand: item.brand,
      category_id: item.category_id, unit: item.unit, min_stock: Number(item.min_stock),
      max_stock: item.max_stock != null ? Number(item.max_stock) : null,
      cost_price: Number(item.cost_price), sell_price: Number(item.sell_price),
      sku: item.sku, active: item.active,
    } as never).eq("id", id);
    if (error) toast.error("Erro ao salvar"); else toast.success("Item atualizado");
  };

  // Charts data: last 30 days
  const days = useMemo(() => {
    const out: { day: string; ts: number; in: number; out: number }[] = [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      out.push({ day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, ts: d.getTime(), in: 0, out: 0 });
    }
    movements.forEach((m) => {
      const d = new Date(m.date); d.setHours(0, 0, 0, 0);
      const slot = out.find((s) => s.ts === d.getTime());
      if (!slot) return;
      if (m.type === "in") slot.in += Number(m.quantity);
      else if (m.type === "out" || m.type === "waste") slot.out += Number(m.quantity);
    });
    return out;
  }, [movements]);

  const stockSeries = useMemo(() => {
    if (!item) return [];
    // walk backwards from current_stock subtracting each movement's effect
    const sorted = [...movements].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const result: { day: string; ts: number; stock: number }[] = [];
    let stock = Number(item.current_stock);
    // start from end going backwards across days
    const dayMap = new Map<number, number>();
    const now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dayMap.set(d.getTime(), 0);
    }
    // compute per-day net to walk back
    const movByDay: Record<number, number> = {};
    sorted.forEach((m) => {
      const d = new Date(m.date); d.setHours(0, 0, 0, 0);
      const t = d.getTime();
      const q = Number(m.quantity);
      const eff = m.type === "in" ? q : (m.type === "out" || m.type === "waste") ? -q : 0;
      movByDay[t] = (movByDay[t] ?? 0) + eff;
    });
    // build forward series from 30 days ago using inferred starting stock
    const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
    let s = stock;
    // walk backwards from today subtracting today's then earlier days
    for (let i = sortedDays.length - 1; i >= 0; i--) s -= (movByDay[sortedDays[i]] ?? 0);
    for (const t of sortedDays) {
      s += (movByDay[t] ?? 0);
      const d = new Date(t);
      result.push({ day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, ts: t, stock: s });
    }
    return result;
  }, [movements, item]);

  if (!item) return <DashboardShell title="Item"><p className="text-muted-foreground">Carregando…</p></DashboardShell>;
  const st = stockStatus(Number(item.current_stock), Number(item.min_stock));

  return (
    <DashboardShell title={item.name}>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {item.inventory_categories && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: item.inventory_categories.color }}>
                    {item.inventory_categories.name}
                  </span>
                )}
                {item.sku && <span className="text-xs text-muted-foreground">Código interno: {item.sku}</span>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <p className="text-4xl font-bold">{Number(item.current_stock)} <span className="text-base text-muted-foreground">{item.unit}</span></p>
                <Badge variant="outline" className={STATUS_CLASS[st]}>{STATUS_LABEL[st]}</Badge>
              </div>
            </div>
            <div className="w-full flex gap-2">
              <Button onClick={() => openMov("in")}>Registrar Entrada</Button>
              <Button variant="destructive" onClick={() => openMov("out")}>Registrar Saída</Button>
              <Button variant="outline" onClick={() => openMov("adjustment")}>Ajuste de Estoque</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="analytics">Análise</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card><CardContent className="p-4 grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome</Label><Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea value={item.description ?? ""} onChange={(e) => setItem({ ...item, description: e.target.value })} /></div>
              <div><Label>Marca</Label><Input value={item.brand ?? ""} onChange={(e) => setItem({ ...item, brand: e.target.value })} /></div>
              <div><Label>Código interno</Label><Input value={item.sku ?? ""} onChange={(e) => setItem({ ...item, sku: e.target.value })} /></div>
              <div><Label>Categoria</Label>
                <Select value={item.category_id ?? ""} onValueChange={(v) => setItem({ ...item, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unidade</Label>
                <Select value={item.unit} onValueChange={(v) => setItem({ ...item, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Estoque mínimo</Label><Input type="number" step="0.01" value={String(item.min_stock)} onChange={(e) => setItem({ ...item, min_stock: Number(e.target.value) })} /></div>
              <div><Label>Estoque máximo</Label><Input type="number" step="0.01" value={item.max_stock ?? ""} onChange={(e) => setItem({ ...item, max_stock: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Preço de custo (R$)</Label><Input type="number" step="0.01" value={String(item.cost_price)} onChange={(e) => setItem({ ...item, cost_price: Number(e.target.value) })} /></div>
              <div><Label>Preço de venda (R$)</Label><Input type="number" step="0.01" value={String(item.sell_price)} onChange={(e) => setItem({ ...item, sell_price: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={item.active} onCheckedChange={(v) => setItem({ ...item, active: v })} id="active" /><Label htmlFor="active">Ativo</Label></div>
              <div className="col-span-2 flex justify-end"><Button onClick={save}>Salvar alterações</Button></div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card><CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <Select value={filterType} onValueChange={(v) => { setPage(0); setFilterType(v); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos tipos</SelectItem>
                    {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => <SelectItem key={t} value={t}>{MOVEMENT_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} className="w-40" />
                <Input type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} className="w-40" />
              </div>
              {pageMov.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma movimentação</p> :
                <div className="space-y-2">
                  {pageMov.map((m) => {
                    const sign = m.type === "in" ? "+" : (m.type === "out" || m.type === "waste") ? "-" : "=";
                    return (
                      <div key={m.id} className="border rounded-md p-3 flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-32">{fmtDT(m.date)}</span>
                        <Badge variant="outline" className={MOVEMENT_CLASS[m.type]}>{MOVEMENT_LABEL[m.type]}</Badge>
                        <span className="font-medium">{sign}{Number(m.quantity)} {item.unit}</span>
                        {m.reason && <span className="text-sm text-muted-foreground">{m.reason}</span>}
                        {m.profiles?.full_name && <span className="text-xs text-muted-foreground ml-auto">por {m.profiles.full_name}</span>}
                        {m.patients?.full_name && <span className="text-xs text-muted-foreground">paciente: {m.patients.full_name}</span>}
                        {m.notes && <div className="w-full text-xs text-muted-foreground pl-32">{m.notes}</div>}
                      </div>
                    );
                  })}
                </div>
              }
              {filteredMov.length > 20 && (
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <span className="text-sm text-muted-foreground">Página {page + 1}</span>
                  <Button variant="outline" size="sm" disabled={(page + 1) * 20 >= filteredMov.length} onClick={() => setPage(page + 1)}>Próxima</Button>
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardContent className="p-4">
                <h3 className="font-semibold mb-2">Movimentações (últimos 30 dias)</h3>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={days}>
                      <XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
                      <Bar dataKey="in" name="Entradas" fill="#10b981" />
                      <Bar dataKey="out" name="Saídas" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <h3 className="font-semibold mb-2">Nível de estoque</h3>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stockSeries}>
                      <XAxis dataKey="day" /><YAxis /><Tooltip />
                      <ReferenceLine y={Number(item.min_stock)} stroke="#ef4444" strokeDasharray="4 4" label="Mínimo" />
                      <Line type="monotone" dataKey="stock" stroke="#3b82f6" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <StockMovementDialog open={moveOpen} onOpenChange={setMoveOpen} itemId={id} fixedType={moveType} onSaved={load} />
    </DashboardShell>
  );
}