import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Download, ArrowDownToLine, Trash2, Loader2, FileText, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";
import { stockStatus, STATUS_LABEL, STATUS_CLASS } from "@/lib/inventory";
import { softDeactivate } from "@/lib/trash";
import { InventoryItemDialog } from "@/components/inventory-item-dialog";
import { StockMovementDialog } from "@/components/stock-movement-dialog";

export const Route = createFileRoute("/_authenticated/financial/inventory/items/")({ component: Page });

interface Item {
  id: string; name: string; sku: string | null; unit: string; brand: string | null;
  current_stock: number; min_stock: number; cost_price: number;
  active: boolean; category_id: string | null;
  inventory_categories: { name: string; color: string } | null;
}
interface Category { id: string; name: string; }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("all");
  const [stat, setStat] = useState("all"); const [onlyActive, setOnlyActive] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("inventory_items" as never)
      .select("id,name,sku,unit,brand,current_stock,min_stock,cost_price,active,category_id,inventory_categories(name,color)")
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

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number; count: number }>();
    for (const i of items) {
      if (!i.active) continue;
      const name = i.inventory_categories?.name ?? "Sem categoria";
      const color = i.inventory_categories?.color ?? "#9ca3af";
      const cur = map.get(name) ?? { name, color, value: 0, count: 0 };
      cur.value += Number(i.current_stock) * Number(i.cost_price);
      cur.count += 1;
      map.set(name, cur);
    }
    const categories = [...map.values()].sort((a, b) => b.value - a.value);
    const total = categories.reduce((s, c) => s + c.value, 0);
    return { categories, total };
  }, [items]);

  const exportCsv = () => {
    const head = "Nome,Código interno,Unidade,Estoque,Minimo,Custo\n";
    const body = filtered.map((i) => [i.name, i.sku ?? "", i.unit, i.current_stock, i.min_stock, i.cost_price].join(",")).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const generateReport = (mode: "all" | "low") => {
    const active = items.filter((i) => i.active);
    const rows = mode === "low"
      ? active.filter((i) => Number(i.current_stock) <= Number(i.min_stock))
      : active;

    const groups = new Map<string, Item[]>();
    for (const i of rows) {
      const c = i.inventory_categories?.name ?? "Sem categoria";
      const arr = groups.get(c) ?? [];
      arr.push(i);
      groups.set(c, arr);
    }
    const sortedCats = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

    let grandValue = 0;
    let grandUnits = 0;
    const sections = sortedCats.map(([cat, list]) => {
      const sortedList = [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      let catValue = 0;
      let catUnits = 0;
      const trs = sortedList.map((i) => {
        const st = stockStatus(Number(i.current_stock), Number(i.min_stock));
        const value = Number(i.current_stock) * Number(i.cost_price);
        catValue += value;
        catUnits += Number(i.current_stock);
        return `<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.sku ?? "—")}</td><td>${escapeHtml(i.brand ?? "—")}</td><td class="num">${Number(i.current_stock)} ${escapeHtml(i.unit)}</td><td class="num">${Number(i.min_stock)}</td><td class="num">${fmt(Number(i.cost_price))}</td><td class="num">${fmt(value)}</td><td><span class="badge ${st}">${STATUS_LABEL[st]}</span></td></tr>`;
      }).join("");
      grandValue += catValue;
      grandUnits += catUnits;
      const color = sortedList[0]?.inventory_categories?.color ?? "#9ca3af";
      return `<section><h2><span class="dot" style="background:${escapeHtml(color)}"></span>${escapeHtml(cat)} <small>${sortedList.length} itens · ${catUnits} un · ${fmt(catValue)}</small></h2><table><thead><tr><th>Item</th><th>Código interno</th><th>Marca</th><th class="num">Estoque</th><th class="num">Mín.</th><th class="num">Custo</th><th class="num">Valor total</th><th>Situação</th></tr></thead><tbody>${trs}</tbody></table></section>`;
    }).join("");

    const title = mode === "low" ? "Relatório de Itens Abaixo do Mínimo" : "Relatório Geral de Estoque";
    const now = new Date().toLocaleString("pt-BR");
    const body = rows.length === 0
      ? `<p class="empty">Nenhum item ${mode === "low" ? "abaixo do estoque mínimo. Tudo em ordem!" : "cadastrado."}</p>`
      : `${sections}<div class="total"><span>Valor total do estoque</span><strong>${fmt(grandValue)}</strong></div><p class="meta">${rows.length} itens · ${grandUnits} unidades</p>`;

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      *{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:32px;font-size:13px}
      header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
      h1{font-size:20px;margin:0}
      .sub{color:#666;font-size:12px;margin-top:4px}
      button.print{padding:8px 14px;border:1px solid #111;background:#111;color:#fff;border-radius:6px;cursor:pointer;font-size:13px}
      h2{font-size:14px;margin:20px 0 6px;display:flex;align-items:center;gap:8px}
      h2 small{font-weight:400;color:#666;font-size:12px}
      .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e5e5}
      th{background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#555}
      td.num,th.num{text-align:right}
      .badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
      .badge.healthy{background:#d1fae5;color:#065f46}
      .badge.low{background:#fef3c7;color:#92400e}
      .badge.zero{background:#fee2e2;color:#991b1b}
      .total{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:12px;border-top:2px solid #111;font-size:16px}
      .total strong{font-size:20px}
      .meta{color:#666;font-size:12px;margin-top:4px}
      .empty{color:#666;padding:40px 0;text-align:center;font-size:15px}
      @media print{button.print{display:none}body{margin:0}}
    </style></head><body>
      <header><div><h1>${escapeHtml(title)}</h1><div class="sub">Gerado em ${escapeHtml(now)}</div></div><button class="print" onclick="window.print()">Imprimir / Salvar PDF</button></header>
      ${body}
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) { toast.error("Permita pop-ups para gerar o relatório"); return; }
    w.document.write(html);
    w.document.close();
    setReportOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await softDeactivate({
        entityType: "inventory_item",
        table: "inventory_items",
        id: deleteTarget.id,
        label: deleteTarget.name,
        summary: deleteTarget.sku ?? null,
        children: [
          { table: "inventory_movements", fk: "item_id" },
          { table: "service_inventory_items", fk: "inventory_item_id" },
        ],
      });
      setDeleteTarget(null);
      toast.success("Item movido para a lixeira");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
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
            <Button variant="outline" onClick={() => setReportOpen(true)}><FileText className="h-4 w-4 mr-2" />Gerar Relatório</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Planilha</Button>
            <Button variant="outline" onClick={() => setMoveOpen(true)}><ArrowDownToLine className="h-4 w-4 mr-2" />Entrada de Estoque</Button>
            <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Item</Button>
          </div>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow>
            <TableHead>Categoria</TableHead><TableHead>Nome</TableHead><TableHead>Código interno</TableHead>
            <TableHead>Un.</TableHead><TableHead>Atual</TableHead><TableHead>Mín.</TableHead>
            <TableHead>Custo</TableHead><TableHead>Situação</TableHead>
            <TableHead className="w-12" />
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
                    <TableCell><Badge variant="outline" className={STATUS_CLASS[st]}>{STATUS_LABEL[st]}</Badge></TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(i);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table></CardContent></Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Resumo do Estoque</h3>
            {summary.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens ativos.</p>
            ) : (
              <div className="space-y-1.5">
                {summary.categories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name} <span className="text-muted-foreground">({c.count} {c.count === 1 ? "item" : "itens"})</span>
                    </span>
                    <span className="font-medium">{fmt(c.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <span className="font-semibold">Valor total do estoque</span>
                  <span className="font-bold text-lg">{fmt(summary.total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar relatório de estoque</DialogTitle>
            <DialogDescription>
              O relatório abre em uma nova aba, pronto para imprimir ou salvar em PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => generateReport("all")}>
              <Package className="h-4 w-4 mr-3 shrink-0" />
              <span className="text-left">
                <span className="block font-medium">Relatório de todo o estoque</span>
                <span className="block text-xs text-muted-foreground">Todos os itens ativos, agrupados por categoria</span>
              </span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => generateReport("low")}>
              <AlertTriangle className="h-4 w-4 mr-3 shrink-0 text-amber-600" />
              <span className="text-left">
                <span className="block font-medium">Itens abaixo da quantidade mínima</span>
                <span className="block text-xs text-muted-foreground">Apenas itens que precisam de reposição</span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InventoryItemDialog open={newOpen} onOpenChange={setNewOpen} onSaved={load} />
      <StockMovementDialog open={moveOpen} onOpenChange={setMoveOpen} fixedType="in" onSaved={load} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" será inativado e movido para a lixeira por 30 dias. O histórico de movimentações é preservado para restauração.`
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
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
