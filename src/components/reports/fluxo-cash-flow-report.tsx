import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { todayISO, shiftDateISO, fmtDate } from "@/lib/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, PAYMENT_LABEL } from "@/lib/currency";
import { resolveLetterheadProfessionalId } from "@/lib/letterhead";
import { printWithLetterhead } from "@/lib/letterhead-print";
import { TableSkeleton, EmptyState } from "@/components/feedback-states";
import { BanknoteArrowDown } from "lucide-react";

type CashTx = {
  id: string;
  date: string;
  type: "in" | "out";
  description: string;
  party: string;
  method: string;
  amount: number;
};

function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export function FluxoCashFlowReport() {
  const { profile } = useAuth();
  const [from, setFrom] = useState(() => shiftDateISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<CashTx[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rec } = await supabase
        .from("bills_receivable")
        .select("id, paid_date, description, payment_method, paid_amount, patients(full_name)")
        .eq("status", "paid")
        .gte("paid_date", from)
        .lte("paid_date", to);
      const { data: pay } = await supabase
        .from("bills_payable")
        .select("id, paid_date, description, supplier, payment_method, amount")
        .eq("status", "paid")
        .gte("paid_date", from)
        .lte("paid_date", to);
      const ins = (rec ?? []).map((r) => ({
        id: r.id as string,
        date: r.paid_date as string,
        type: "in" as const,
        description: r.description as string,
        party: (r.patients as { full_name?: string } | null)?.full_name ?? "—",
        method: (r.payment_method as string) ?? "—",
        amount: Number(r.paid_amount),
      }));
      const outs = (pay ?? []).map((p) => ({
        id: p.id as string,
        date: p.paid_date as string,
        type: "out" as const,
        description: p.description as string,
        party: (p.supplier as string) ?? "—",
        method: (p.payment_method as string) ?? "—",
        amount: Number(p.amount),
      }));
      setTx([...ins, ...outs].sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    })();
  }, [from, to]);

  const grouped = useMemo(() => {
    const g: Record<string, CashTx[]> = {};
    tx.forEach((t) => {
      (g[t.date] ??= []).push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tx]);

  const totalIn = tx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = tx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
        <div className="flex flex-wrap gap-2 items-end pt-2">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <TableSkeleton />
        ) : tx.length === 0 ? (
          <EmptyState icon={BanknoteArrowDown} title="Sem movimentações no período" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-semibold text-emerald-600">{fmt(totalIn)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-lg font-semibold text-red-600">{fmt(totalOut)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="text-lg font-semibold">{fmt(totalIn - totalOut)}</p>
              </div>
            </div>
            <div className="space-y-4 max-h-[480px] overflow-y-auto">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 sticky top-0 bg-card py-1">
                    {fmtDate(date)}
                  </p>
                  <div className="space-y-1">
                    {items.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{t.party} · {PAYMENT_LABEL[t.method] ?? t.method}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={t.type === "in" ? "text-emerald-600" : "text-red-600"}>
                            {t.type === "in" ? "Entrada" : "Saída"}
                          </Badge>
                          <span className={`font-medium ${t.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                            {t.type === "in" ? "+" : "−"}{fmt(t.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV("fluxo-caixa.csv", [
                    ["Data", "Tipo", "Descrição", "Parte", "Forma", "Valor"],
                    ...tx.map((t) => [
                      t.date,
                      t.type === "in" ? "Entrada" : "Saída",
                      t.description,
                      t.party,
                      t.method,
                      t.amount,
                    ]),
                  ])
                }
              >
                <Download className="size-4 mr-2" />
                Exportar planilha
              </Button>
              <Button variant="outline" size="sm" onClick={() => void printWithLetterhead(resolveLetterheadProfessionalId(profile))}>
                Imprimir PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
