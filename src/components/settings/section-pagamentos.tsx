import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/mock-auth";
import {
  ensurePaymentMethodConfigs,
  loadPaymentMethodConfigs,
  savePaymentMethodConfig,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import { PAYMENT_METHODS } from "@/lib/currency";

export function SectionPagamentos() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PaymentMethodConfig[]>([]);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const data = await loadPaymentMethodConfigs();
      if (data.length === 0) {
        setRows(await ensurePaymentMethodConfigs(tenant.id));
      } else {
        setRows(data);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (id: string, patch: Partial<PaymentMethodConfig>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        rows.map((r) =>
          savePaymentMethodConfig(r.id, {
            label: r.label,
            fee_percent: Number(r.fee_percent),
            fee_fixed: Number(r.fee_fixed),
            active: r.active,
          }),
        ),
      );
      toast.success("Formas de pagamento salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const methodIcon = (method: string) =>
    PAYMENT_METHODS.find((m) => m.value === method)?.icon ?? "•";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Formas de pagamento e taxas
        </CardTitle>
        <CardDescription>
          Configure as taxas de cada forma de pagamento. O valor líquido (após taxa) é usado nos
          recebimentos. Vendas parceladas são antecipadas: o valor total entra na competência do
          mês de lançamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Forma</TableHead>
                  <TableHead>Nome exibido</TableHead>
                  <TableHead className="w-28">Taxa %</TableHead>
                  <TableHead className="w-32">Taxa fixa (R$)</TableHead>
                  <TableHead className="w-20 text-center">Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="mr-2">{methodIcon(row.method)}</span>
                      <span className="text-xs text-muted-foreground">{row.method}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={row.fee_percent}
                        onChange={(e) =>
                          updateRow(row.id, { fee_percent: Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.fee_fixed}
                        onChange={(e) => updateRow(row.id, { fee_fixed: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.active}
                        onCheckedChange={(v) => updateRow(row.id, { active: v })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Label className="text-foreground">Exemplo</Label>
              <p className="mt-1">
                Pagamento de R$ 1.000,00 no crédito com taxa de 2,5% → taxa de R$ 25,00 → líquido
                de R$ 975,00.
              </p>
            </div>

            <Button onClick={() => void saveAll()} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Salvar configurações
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
