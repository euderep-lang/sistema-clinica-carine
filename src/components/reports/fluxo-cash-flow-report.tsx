import { useEffect, useMemo, useState } from "react";
import { BanknoteArrowDown, Download } from "lucide-react";
import { todayISO, shiftDateISO, fmtDate } from "@/lib/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import { resolveLetterheadProfessionalId } from "@/lib/letterhead";
import { printWithLetterhead } from "@/lib/letterhead-print";
import { TableSkeleton, EmptyState } from "@/components/feedback-states";
import { cn } from "@/lib/utils";

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

function formatDescription(description: string): { short: string; full: string } {
  const full = description.trim();
  if (full.length <= 96) return { short: full, full };

  const parts = full.split(/,\s*(?=\d+x\s|\d+\s*x\s|[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/i);
  if (parts.length > 1) {
    const first = parts[0].trim();
    const rest = parts.length - 1;
    return {
      short: `${first} · +${rest} ${rest === 1 ? "item" : "itens"}`,
      full,
    };
  }

  return { short: `${full.slice(0, 94).trim()}…`, full };
}

function CashFlowRow({ t }: { t: CashTx }) {
  const desc = formatDescription(t.description);
  const payment = paymentLabel(t.method);

  return (
    <div className="grid gap-2 border-b px-3 py-2.5 last:border-b-0 sm:grid-cols-[4.75rem_minmax(0,1fr)_6.5rem] sm:items-start sm:gap-3">
      <p className="text-xs text-muted-foreground sm:pt-0.5">{fmtDate(t.date)}</p>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{t.party}</p>
        <p className="break-words text-sm leading-snug text-muted-foreground line-clamp-2" title={desc.full}>
          {desc.short}
        </p>
        <p className="text-xs text-muted-foreground">{payment}</p>
      </div>

      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
        <Badge
          variant="outline"
          className={cn(
            "shrink-0",
            t.type === "in" ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700",
          )}
        >
          {t.type === "in" ? "Entrada" : "Saída"}
        </Badge>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            t.type === "in" ? "text-emerald-600" : "text-red-600",
          )}
        >
          {t.type === "in" ? "+" : "−"}
          {fmt(t.amount)}
        </span>
      </div>
    </div>
  );
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
      setTx(
        [...ins, ...outs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
      );
      setLoading(false);
    })();
  }, [from, to]);

  const totalIn = useMemo(() => tx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), [tx]);
  const totalOut = useMemo(() => tx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0), [tx]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
        <div className="flex flex-wrap items-end gap-2 pt-2">
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
      <CardContent className="min-w-0 space-y-4 overflow-x-hidden">
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

            <div className="overflow-hidden rounded-lg border">
              <div className="hidden border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[4.75rem_minmax(0,1fr)_6.5rem] sm:gap-3">
                <span>Data</span>
                <span>Movimentação</span>
                <span className="text-right">Valor</span>
              </div>
              <div className="max-h-[520px] overflow-y-auto overflow-x-hidden">
                {tx.map((t) => (
                  <CashFlowRow key={t.id} t={t} />
                ))}
              </div>
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                {tx.length} movimentações no período
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV("fluxo-caixa.csv", [
                    ["Data", "Tipo", "Descrição", "Paciente/Fornecedor", "Forma", "Valor"],
                    ...tx.map((t) => [
                      t.date,
                      t.type === "in" ? "Entrada" : "Saída",
                      t.description,
                      t.party,
                      paymentLabel(t.method),
                      t.amount,
                    ]),
                  ])
                }
              >
                <Download className="mr-2 size-4" />
                Exportar planilha
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void printWithLetterhead(resolveLetterheadProfessionalId(profile))}
              >
                Imprimir PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
