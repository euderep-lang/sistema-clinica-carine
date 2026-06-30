import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useAuth } from "@/lib/mock-auth";
import {
  createPaymentMethodConfig,
  deletePaymentMethodConfig,
  ensurePaymentMethodConfigs,
  invalidatePaymentMethodConfigs,
  loadPaymentMethodConfigs,
  savePaymentMethodConfig,
  type InstallmentFees,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import { PAYMENT_METHODS } from "@/lib/currency";

export function SectionPagamentos() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PaymentMethodConfig[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newPercent, setNewPercent] = useState("0");
  const [newFixed, setNewFixed] = useState("0");
  const [newInstallments, setNewInstallments] = useState(false);
  const [newSettlement, setNewSettlement] = useState("0");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const updateInstallmentFee = (id: string, n: number, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const fees: InstallmentFees = { ...r.installment_fees };
        if (value === "") {
          delete fees[String(n)];
        } else {
          fees[String(n)] = Number(value) || 0;
        }
        return { ...r, installment_fees: fees };
      }),
    );
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
            supports_installments: r.supports_installments,
            max_installments: Number(r.max_installments) || 12,
            settlement_days: Number(r.settlement_days) || 0,
            installment_fees: r.installment_fees,
          }),
        ),
      );
      invalidatePaymentMethodConfigs();
      await loadPaymentMethodConfigs(true);
      toast.success("Formas de pagamento salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const methodIcon = (method: string) =>
    PAYMENT_METHODS.find((m) => m.value === method)?.icon ?? "•";

  const addMethod = async () => {
    if (!tenant) return;
    if (!newLabel.trim()) {
      toast.error("Informe o nome da forma de pagamento");
      return;
    }
    setAdding(true);
    try {
      const created = await createPaymentMethodConfig({
        tenantId: tenant.id,
        label: newLabel.trim(),
        feePercent: Number(newPercent) || 0,
        feeFixed: Number(newFixed) || 0,
        supportsInstallments: newInstallments,
        settlementDays: Number(newSettlement) || 0,
      });
      setRows((prev) => [...prev, created]);
      setNewLabel("");
      setNewPercent("0");
      setNewFixed("0");
      setNewInstallments(false);
      setNewSettlement("0");
      toast.success("Forma de pagamento adicionada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentMethodConfig(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Forma de pagamento removida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Formas de pagamento e taxas
        </CardTitle>
        <CardDescription>
          Configure parcelamento, prazo de recebimento e as taxas de cada forma. As taxas são
          descontadas do líquido e lançadas automaticamente como despesa na data em que o dinheiro
          cai na conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-lg border p-3 ${row.active ? "" : "opacity-60"}`}
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2 pb-2">
                      <span className="text-lg">{methodIcon(row.method)}</span>
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <Label className="text-xs text-muted-foreground">Nome exibido</Label>
                      <Input
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">
                        {row.supports_installments ? "Taxa 1x %" : "Taxa %"}
                      </Label>
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
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-muted-foreground">Taxa fixa (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.fee_fixed}
                        onChange={(e) => updateRow(row.id, { fee_fixed: Number(e.target.value) })}
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs text-muted-foreground">Dias p/ crédito</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={row.settlement_days}
                        onChange={(e) =>
                          updateRow(row.id, { settlement_days: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 pb-1">
                      <Label className="text-xs text-muted-foreground">Parcela</Label>
                      <Switch
                        checked={row.supports_installments}
                        onCheckedChange={(v) => updateRow(row.id, { supports_installments: v })}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 pb-1">
                      <Label className="text-xs text-muted-foreground">Ativa</Label>
                      <Switch
                        checked={row.active}
                        onCheckedChange={(v) => updateRow(row.id, { active: v })}
                      />
                    </div>
                    {row.is_custom && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mb-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                        title="Remover forma de pagamento"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  {row.supports_installments && (
                    <div className="mt-3 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-foreground">
                          Taxas por parcela (deixe vazio para usar a taxa 1x)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Até</Label>
                          <Input
                            type="number"
                            min={2}
                            max={24}
                            step="1"
                            className="h-8 w-16"
                            value={row.max_installments}
                            onChange={(e) =>
                              updateRow(row.id, {
                                max_installments: Math.min(
                                  24,
                                  Math.max(2, Number(e.target.value) || 12),
                                ),
                              })
                            }
                          />
                          <span className="text-xs text-muted-foreground">x</span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {Array.from({ length: row.max_installments }, (_, i) => i + 1).map((n) => (
                          <div key={n}>
                            <Label className="text-[11px] text-muted-foreground">{n}x %</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              className="h-8"
                              placeholder={String(row.fee_percent)}
                              value={
                                n === 1
                                  ? row.fee_percent
                                  : (row.installment_fees[String(n)] ?? "")
                              }
                              onChange={(e) =>
                                n === 1
                                  ? updateRow(row.id, { fee_percent: Number(e.target.value) })
                                  : updateInstallmentFee(row.id, n, e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-md border bg-muted/30 p-3">
              <Label className="text-foreground">Adicionar forma de pagamento</Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap">
                <div className="min-w-[160px] flex-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    placeholder="Ex.: Link de pagamento, Boleto, Cheque…"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-24">
                  <Label className="text-xs text-muted-foreground">Taxa %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={newPercent}
                    onChange={(e) => setNewPercent(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <Label className="text-xs text-muted-foreground">Taxa fixa (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={newFixed}
                    onChange={(e) => setNewFixed(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <Label className="text-xs text-muted-foreground">Dias p/ crédito</Label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={newSettlement}
                    onChange={(e) => setNewSettlement(e.target.value)}
                  />
                </div>
                <div className="flex flex-col items-center gap-1 pb-1">
                  <Label className="text-xs text-muted-foreground">Parcela</Label>
                  <Switch checked={newInstallments} onCheckedChange={setNewInstallments} />
                </div>
                <Button onClick={() => void addMethod()} disabled={adding}>
                  {adding ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Label className="text-foreground">Como funciona</Label>
              <p className="mt-1">
                Ex.: venda de R$ 1.000,00 no crédito 3x com taxa de 4,5% → taxa de R$ 45,00 →
                líquido de R$ 955,00. A taxa entra como despesa "Taxas de cartão" na data em que o
                dinheiro cai (hoje + dias p/ crédito).
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover forma de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.label}" deixará de aparecer nas seleções. Lançamentos antigos que já usaram esta forma continuam preservados.`
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
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
