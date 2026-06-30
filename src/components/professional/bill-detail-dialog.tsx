import { useCallback, useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/locale";
import { Loader2, Plus, RotateCcw, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
  parseBRLInput,
} from "@/lib/currency";
import {
  activePaymentMethods,
  calculatePaymentFee,
  loadPaymentMethodConfigs,
  getCachedPaymentMethodConfigs,
  paymentLabel,
  type PaymentMethodConfig,
} from "@/lib/payment-methods";
import {
  loadBillPayments,
  loadBillDiscounts,
  paymentCanReverse,
  reverseBillPayment,
  type BillDiscountRow,
  type BillPaymentRow,
} from "@/lib/payments";
import {
  addSaleItems,
  billCanReceive,
  loadSaleChargeItems,
  receiveBillPayment,
  removeSaleItem,
  updateSaleItem,
  type SaleBillRow,
  type SaleChargeItem,
} from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";

function formatBRLInput(value: number): string {
  if (value <= 0) return "";
  return value.toFixed(2).replace(".", ",");
}

type DiscountMode = "amount" | "percent";

interface PickerService {
  id: string;
  name: string;
  default_price: number;
  session_count: number;
}

function resolveDiscountValue(
  mode: DiscountMode,
  amountInput: string,
  percentInput: string,
  outstanding: number,
): number {
  if (outstanding <= 0) return 0;
  if (mode === "percent") {
    const pct = Math.min(100, Math.max(0, Number(percentInput.replace(",", ".")) || 0));
    return Math.min(outstanding, Math.round(outstanding * (pct / 100) * 100) / 100);
  }
  return Math.min(outstanding, parseBRLInput(amountInput));
}

function buildPaymentNotes(
  userNotes: string,
  methodLabel: string | undefined,
  supportsInstallments: boolean,
  installments: number,
): string | undefined {
  const parts: string[] = [];
  if (supportsInstallments && installments > 1) {
    parts.push(`${methodLabel ?? "Parcelado"} em ${installments}x`);
  }
  const trimmed = userNotes.trim();
  if (trimmed) parts.push(trimmed);
  return parts.length ? parts.join(" · ") : undefined;
}

interface BillDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: SaleBillRow | null;
  onChanged: () => void;
}

export function BillDetailDialog({
  open,
  onOpenChange,
  bill,
  onChanged,
}: BillDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SaleChargeItem[]>([]);
  const [payments, setPayments] = useState<BillPaymentRow[]>([]);
  const [discounts, setDiscounts] = useState<BillDiscountRow[]>([]);
  const [methodConfigs, setMethodConfigs] = useState<PaymentMethodConfig[]>(
    () => getCachedPaymentMethodConfigs(),
  );

  const [payAmount, setPayAmount] = useState("");
  const [payDiscount, setPayDiscount] = useState("");
  const [payDiscountPercent, setPayDiscountPercent] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [payMethod, setPayMethod] = useState("pix");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNotes, setPayNotes] = useState("");
  const [creditInstallments, setCreditInstallments] = useState("1");
  const [paySaving, setPaySaving] = useState(false);

  const [reversePaymentTarget, setReversePaymentTarget] = useState<BillPaymentRow | null>(null);
  const [reversingPayment, setReversingPayment] = useState(false);

  const { profile } = useAuth();
  const [addingItems, setAddingItems] = useState(false);
  const [services, setServices] = useState<PickerService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});
  const [addSaving, setAddSaving] = useState(false);
  const [itemQty, setItemQty] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [removeItemTarget, setRemoveItemTarget] = useState<SaleChargeItem | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  const discountTotal = Number(bill?.discount_value ?? 0);
  const originalAmount = bill ? Number(bill.amount) + discountTotal : 0;
  const outstanding = bill
    ? Math.max(0, Number(bill.amount) - Number(bill.paid_amount))
    : 0;

  const payValue = parseBRLInput(payAmount);
  const discountValue = useMemo(
    () => resolveDiscountValue(discountMode, payDiscount, payDiscountPercent, outstanding),
    [discountMode, payDiscount, payDiscountPercent, outstanding],
  );
  const settlementTotal = payValue + discountValue;
  const remainingAfterSettlement = Math.max(0, outstanding - settlementTotal);
  const installmentCount = Number(creditInstallments) || 1;

  const paymentMethods = useMemo(() => activePaymentMethods(methodConfigs), [methodConfigs]);

  const selectedMethod = useMemo(
    () => paymentMethods.find((m) => m.value === payMethod),
    [paymentMethods, payMethod],
  );
  const supportsInstallments = selectedMethod?.supports_installments ?? false;
  const maxInstallments = Math.max(1, selectedMethod?.max_installments ?? 12);

  const installmentValue = useMemo(() => {
    if (!supportsInstallments || payValue <= 0 || installmentCount <= 1) return 0;
    return payValue / installmentCount;
  }, [supportsInstallments, payValue, installmentCount]);

  const feePreview = useMemo(() => {
    const config = methodConfigs.find((c) => c.method === payMethod && c.active);
    if (!config || payValue <= 0) return null;
    return calculatePaymentFee(payValue, config, supportsInstallments ? installmentCount : 1);
  }, [methodConfigs, payMethod, payValue, supportsInstallments, installmentCount]);

  useEffect(() => {
    if (!open) return;
    loadPaymentMethodConfigs()
      .then(setMethodConfigs)
      .catch((e) => toast.error((e as Error).message));
  }, [open]);

  const loadDetails = useCallback(async () => {
    if (!bill) return;
    setLoading(true);
    try {
      const isOps = profile?.role !== "professional";
      let serviceQuery = supabase
        .from("services")
        .select("id, name, default_price, session_count")
        .eq("active", true)
        .order("name");
      if (profile?.tenant_id) serviceQuery = serviceQuery.eq("tenant_id", profile.tenant_id);
      if (!isOps && profile?.id) {
        serviceQuery = serviceQuery.or(`professional_id.eq.${profile.id},professional_id.is.null`);
      }

      const [chargeItems, billPayments, billDiscounts, svcRes] = await Promise.all([
        loadSaleChargeItems(bill.id),
        loadBillPayments({ billId: bill.id, limit: 50 }),
        loadBillDiscounts({ billId: bill.id, limit: 50 }),
        serviceQuery,
      ]);
      setItems(chargeItems);
      setItemQty(
        Object.fromEntries(chargeItems.map((it) => [it.id, String(it.quantity)])),
      );
      setPayments(billPayments);
      setDiscounts(billDiscounts);
      setServices(
        (svcRes.data ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
          default_price: Number(s.default_price),
          session_count: Number(s.session_count ?? 1),
        })),
      );
      setPayAmount("");
      setPayDiscount("");
      setPayDiscountPercent("");
      setDiscountMode("amount");
      setPayDate(todayISO());
      setPayMethod("pix");
      setCreditInstallments("1");
      setPayNotes("");
      setAddingItems(false);
      setServiceSearch("");
      setAddQuantities({});
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [bill, profile]);

  const syncPaymentToSettlement = (discount: number) => {
    const pay = parseBRLInput(payAmount);
    if (pay + discount > outstanding) {
      setPayAmount(formatBRLInput(Math.max(0, outstanding - discount)));
    }
  };

  const handlePayAmountChange = (raw: string) => {
    setPayAmount(raw);
    const pay = parseBRLInput(raw);
    const disc = resolveDiscountValue(discountMode, payDiscount, payDiscountPercent, outstanding);
    if (pay + disc > outstanding) {
      if (discountMode === "amount") {
        setPayDiscount(formatBRLInput(Math.max(0, outstanding - pay)));
      } else {
        const pct = outstanding > 0 ? (Math.max(0, outstanding - pay) / outstanding) * 100 : 0;
        setPayDiscountPercent(pct > 0 ? pct.toFixed(2).replace(".", ",") : "");
      }
    }
  };

  const handlePayDiscountChange = (raw: string) => {
    setPayDiscount(raw);
    const disc = resolveDiscountValue("amount", raw, payDiscountPercent, outstanding);
    syncPaymentToSettlement(disc);
  };

  const handlePayDiscountPercentChange = (raw: string) => {
    setPayDiscountPercent(raw);
    const disc = resolveDiscountValue("percent", payDiscount, raw, outstanding);
    syncPaymentToSettlement(disc);
  };

  const fillPaymentWithOutstanding = () => {
    const disc = resolveDiscountValue(discountMode, payDiscount, payDiscountPercent, outstanding);
    setPayAmount(formatBRLInput(Math.max(0, outstanding - disc)));
  };

  useEffect(() => {
    if (!open || !bill) return;
    void loadDetails();
  }, [open, bill, loadDetails]);

  const refreshAll = async () => {
    await loadDetails();
    onChanged();
  };

  const historyEntries = useMemo(() => {
    const entries: Array<
      | { kind: "payment"; date: string; createdAt: string; data: BillPaymentRow }
      | { kind: "discount"; date: string; createdAt: string; data: BillDiscountRow }
    > = [
      ...payments.map((p) => ({
        kind: "payment" as const,
        date: p.paid_date,
        createdAt: p.created_at,
        data: p,
      })),
      ...discounts.map((d) => ({
        kind: "discount" as const,
        date: d.applied_date,
        createdAt: d.created_at,
        data: d,
      })),
    ];
    return entries.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [payments, discounts]);

  const canAddItems = bill ? bill.status !== "cancelled" && !bill.budget_id : false;

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const addSelection = useMemo(
    () => services.filter((s) => (addQuantities[s.id] ?? 0) > 0),
    [services, addQuantities],
  );

  const addTotal = addSelection.reduce(
    (sum, s) => sum + s.default_price * (addQuantities[s.id] ?? 0),
    0,
  );

  const setAddQty = (id: string, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setAddQuantities((prev) => ({ ...prev, [id]: n }));
  };

  const submitAddItems = async () => {
    if (!bill || addSelection.length === 0) return;
    setAddSaving(true);
    try {
      const result = await addSaleItems(
        bill.id,
        addSelection.map((s) => ({ service_id: s.id, quantity: addQuantities[s.id] ?? 1 })),
      );
      toast.success(`${fmt(result.added_total)} adicionado(s) à conta`);
      setAddingItems(false);
      setServiceSearch("");
      setAddQuantities({});
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAddSaving(false);
    }
  };

  const commitItemQty = async (item: SaleChargeItem) => {
    const raw = itemQty[item.id];
    const next = Math.max(1, parseInt(raw ?? "", 10) || 0);
    if (next === item.quantity) {
      setItemQty((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
      return;
    }
    setSavingItemId(item.id);
    try {
      await updateSaleItem(item.id, next);
      toast.success("Quantidade atualizada");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
      setItemQty((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
    } finally {
      setSavingItemId(null);
    }
  };

  const confirmRemoveItem = async () => {
    if (!removeItemTarget) return;
    setRemovingItem(true);
    try {
      await removeSaleItem(removeItemTarget.id);
      toast.success("Item removido da conta");
      setRemoveItemTarget(null);
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRemovingItem(false);
    }
  };

  const submitPayment = async () => {
    if (!bill) return;
    const value = parseBRLInput(payAmount);
    const discount = discountValue;
    if (value <= 0 && discount <= 0) {
      toast.error("Informe o valor recebido ou o desconto");
      return;
    }
    if (settlementTotal > outstanding) {
      toast.error(`Recebido + desconto (${fmt(settlementTotal)}) não pode passar de ${fmt(outstanding)} em aberto`);
      return;
    }
    if (value > 0 && supportsInstallments && (!creditInstallments || installmentCount < 1)) {
      toast.error("Informe o parcelamento");
      return;
    }
    setPaySaving(true);
    try {
      let notes = buildPaymentNotes(
        payNotes,
        selectedMethod?.label,
        supportsInstallments,
        installmentCount,
      );
      if (discount > 0 && discountMode === "percent") {
        const pct = Number(payDiscountPercent.replace(",", ".")) || 0;
        const discountLabel = `Desconto ${pct}% (${fmt(discount)})`;
        notes = notes ? `${discountLabel} · ${notes}` : discountLabel;
      }
      await receiveBillPayment(
        bill.id,
        value,
        value > 0 ? payMethod : "other",
        payDate,
        notes,
        discount,
        supportsInstallments ? installmentCount : 1,
      );
      toast.success(
        value > 0 && discount > 0
          ? "Pagamento e desconto registrados"
          : discount > 0
            ? "Desconto aplicado"
            : "Pagamento registrado",
      );
      setPayNotes("");
      setPayDiscount("");
      setPayDiscountPercent("");
      setDiscountMode("amount");
      setCreditInstallments("1");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaySaving(false);
    }
  };

  const confirmReversePayment = async () => {
    if (!reversePaymentTarget) return;
    setReversingPayment(true);
    try {
      await reverseBillPayment(reversePaymentTarget.id, "Estorno manual");
      toast.success("Pagamento estornado");
      setReversePaymentTarget(null);
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReversingPayment(false);
    }
  };

  if (!bill) return null;

  const effStatus = isOverdue(bill.due_date, bill.status) ? "overdue" : bill.status;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-12">
            <DialogTitle className="text-lg">
              {bill.patients?.full_name ?? "Paciente"}
            </DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <DialogDescription className="text-sm">{bill.description}</DialogDescription>
              <Badge className={BILL_STATUS_CLASS[effStatus]}>
                {BILL_STATUS_LABEL[effStatus]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Vence {fmtDate(bill.due_date)}
              </span>
              {bill.competence_date && bill.competence_date !== bill.due_date && (
                <span className="text-sm text-muted-foreground">
                  · Competência {fmtDate(bill.competence_date)}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <span className="text-muted-foreground">Total</span>
                <div className="font-semibold tabular-nums">{fmt(originalAmount)}</div>
              </div>
              {discountTotal > 0 && (
                <div>
                  <span className="text-muted-foreground">Desconto</span>
                  <div className="font-semibold tabular-nums text-violet-700">- {fmt(discountTotal)}</div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Líquido</span>
                <div className="font-semibold tabular-nums">{fmt(bill.amount)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Recebido</span>
                <div className="font-semibold tabular-nums text-emerald-700">{fmt(bill.paid_amount)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Em aberto</span>
                <div className="font-semibold tabular-nums text-amber-700">{fmt(outstanding)}</div>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
                <section className="shrink-0 border-b p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <ShoppingBag className="size-4 text-primary" />
                      O que comprou nesta conta
                    </h3>
                    {canAddItems && !addingItems && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setAddingItems(true)}
                      >
                        <Plus className="mr-1 size-4" />
                        Adicionar itens
                      </Button>
                    )}
                  </div>
                  {items.length > 0 ? (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">
                              {item.services?.name ?? "Procedimento"}
                              {item.services && item.services.session_count > 1 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({item.services.session_count} sessões/un)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fmt(item.unit_price)} / un
                            </p>
                          </div>
                          {canAddItems ? (
                            <>
                              <Input
                                type="number"
                                min={1}
                                value={itemQty[item.id] ?? String(item.quantity)}
                                disabled={savingItemId === item.id}
                                onChange={(e) =>
                                  setItemQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                onBlur={() => void commitItemQty(item)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                className="h-8 w-14 shrink-0 text-center"
                              />
                              <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                                {fmt(item.total_price)}
                              </span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 shrink-0 text-destructive hover:text-destructive"
                                title="Remover item"
                                disabled={savingItemId === item.id}
                                onClick={() => setRemoveItemTarget(item)}
                              >
                                {savingItemId === item.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <span className="font-medium">
                              {item.quantity}x · {fmt(item.total_price)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{bill.description}</p>
                  )}

                  {addingItems && (
                    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Fazer uma venda</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => {
                            setAddingItems(false);
                            setAddQuantities({});
                            setServiceSearch("");
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Buscar procedimento ou produto"
                          className="h-9 pl-9"
                        />
                      </div>
                      <ScrollArea className="h-44 rounded-md border bg-background">
                        {filteredServices.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum item encontrado.
                          </p>
                        ) : (
                          <ul className="divide-y">
                            {filteredServices.map((svc) => (
                              <li
                                key={svc.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{svc.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {fmt(svc.default_price)}
                                    {svc.session_count > 1 && ` · ${svc.session_count} sessões`}
                                  </p>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  value={addQuantities[svc.id] ?? 0}
                                  onChange={(e) => setAddQty(svc.id, e.target.value)}
                                  className="h-8 w-16 shrink-0 text-center"
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </ScrollArea>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                          {addTotal > 0 ? (
                            <>
                              Total: <span className="font-semibold text-foreground">{fmt(addTotal)}</span>
                            </>
                          ) : (
                            "Selecione a quantidade"
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void submitAddItems()}
                          disabled={addSaving || addSelection.length === 0}
                        >
                          {addSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                          Adicionar à conta
                        </Button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="flex min-h-0 flex-1 flex-col p-5">
                  <h3 className="mb-3 text-sm font-semibold">Histórico</h3>
                  <ScrollArea className="min-h-0 flex-1">
                    {historyEntries.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum lançamento registrado.
                      </p>
                    ) : (
                      <ul className="space-y-2 pr-3">
                        {historyEntries.map((entry) =>
                          entry.kind === "payment" ? (
                            (() => {
                              const p = entry.data;
                              return (
                                <li
                                  key={`payment-${p.id}`}
                                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${p.status === "reversed" ? "opacity-60" : ""}`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-medium">{fmt(p.amount)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {fmtDate(p.paid_date)} · {paymentLabel(p.payment_method)}
                                      {p.fee_amount != null && Number(p.fee_amount) > 0 && (
                                        <> · Líquido {fmt(p.net_amount ?? p.amount)}</>
                                      )}
                                      {p.status === "reversed" && " · Estornado"}
                                    </div>
                                    {p.notes && (
                                      <div className="mt-0.5 text-xs text-muted-foreground">{p.notes}</div>
                                    )}
                                  </div>
                                  {paymentCanReverse(p) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 shrink-0 text-destructive hover:text-destructive"
                                      title="Estornar pagamento"
                                      onClick={() => setReversePaymentTarget(p)}
                                    >
                                      <RotateCcw className="size-4" />
                                    </Button>
                                  )}
                                </li>
                              );
                            })()
                          ) : (
                            (() => {
                              const d = entry.data;
                              return (
                                <li
                                  key={`discount-${d.id}`}
                                  className="flex items-center justify-between gap-2 rounded-md border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm dark:border-violet-900 dark:bg-violet-950/20"
                                >
                                  <div className="min-w-0">
                                    <div className="font-medium text-violet-800 dark:text-violet-300">
                                      - {fmt(d.amount)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {fmtDate(d.applied_date)} · Desconto
                                    </div>
                                    {d.notes && (
                                      <div className="mt-0.5 text-xs text-muted-foreground">{d.notes}</div>
                                    )}
                                  </div>
                                </li>
                              );
                            })()
                          ),
                        )}
                      </ul>
                    )}
                  </ScrollArea>
                </section>
              </div>

              <div className="flex min-h-0 flex-col overflow-y-auto p-5">
                <h3 className="mb-4 text-sm font-semibold">Lançar pagamento</h3>
                {billCanReceive(bill) ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <Label className="text-xs">Valor recebido</Label>
                        <Label className="text-xs">Desconto</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex h-7 items-center">
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline"
                            onClick={fillPaymentWithOutstanding}
                          >
                            Usar saldo
                          </button>
                        </div>
                        <div className="flex h-7 items-center justify-end">
                          <div className="flex rounded-md border p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setDiscountMode("amount")}
                              className={`rounded px-2 py-0.5 transition-colors ${
                                discountMode === "amount"
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              R$
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiscountMode("percent")}
                              className={`rounded px-2 py-0.5 transition-colors ${
                                discountMode === "percent"
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              %
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          value={payAmount}
                          onChange={(e) => handlePayAmountChange(e.target.value)}
                          placeholder="0,00"
                          className="h-10"
                        />
                        {discountMode === "amount" ? (
                          <Input
                            value={payDiscount}
                            onChange={(e) => handlePayDiscountChange(e.target.value)}
                            placeholder="0,00"
                            className="h-10"
                          />
                        ) : (
                          <Input
                            value={payDiscountPercent}
                            onChange={(e) => handlePayDiscountPercentChange(e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                            className="h-10"
                          />
                        )}
                      </div>
                      {discountMode === "percent" && discountValue > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Desconto de {fmt(discountValue)} sobre {fmt(outstanding)} em aberto
                        </p>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Saldo em aberto: <strong>{fmt(outstanding)}</strong>. Recebido + desconto abatem esse valor.
                      Para quitar só com desconto, deixe valor recebido vazio.
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    {settlementTotal > 0 && (
                      <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        Abatimento de <strong>{fmt(settlementTotal)}</strong>
                        {discountValue > 0 && payValue > 0 && (
                          <>
                            {" "}
                            ({fmt(payValue)} recebido + {fmt(discountValue)} desconto
                            {discountMode === "percent" && payDiscountPercent
                              ? ` · ${payDiscountPercent}%`
                              : ""}
                            )
                          </>
                        )}
                        {discountValue > 0 && payValue <= 0 && (
                          <>
                            {" "}
                            (somente desconto
                            {discountMode === "percent" && payDiscountPercent
                              ? ` · ${payDiscountPercent}%`
                              : ""}
                            )
                          </>
                        )}
                        {" · "}
                        Saldo após: <strong>{fmt(remainingAfterSettlement)}</strong>
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs">Forma de pagamento</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {paymentMethods.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            disabled={payValue <= 0}
                            onClick={() => {
                              setPayMethod(m.value);
                              if (!m.supports_installments) setCreditInstallments("1");
                            }}
                            className={`flex h-10 items-center justify-center gap-1 rounded-md border px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              payMethod === m.value
                                ? "border-primary bg-primary/5 font-medium"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <span>{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {supportsInstallments && payValue > 0 && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                        <Label className="text-xs">Parcelamento</Label>
                        <Select
                          value={creditInstallments}
                          onValueChange={setCreditInstallments}
                        >
                          <SelectTrigger className="mt-1 bg-background">
                            <SelectValue placeholder="Selecione as parcelas" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n === 1 ? "À vista (1x)" : `${n}x`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {installmentCount > 1 && payValue > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {installmentCount}x de <strong>{fmt(installmentValue)}</strong> no
                            cartão
                          </p>
                        )}
                      </div>
                    )}
                    {feePreview && feePreview.fee > 0 && payValue > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Taxa estimada: <strong>{fmt(feePreview.fee)}</strong> · Líquido:{" "}
                        <strong>{fmt(feePreview.net)}</strong>
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        rows={3}
                        placeholder="Opcional"
                        className="resize-none"
                      />
                    </div>
                    <Button
                      className="mt-auto w-full"
                      onClick={() => void submitPayment()}
                      disabled={paySaving || settlementTotal <= 0}
                    >
                      {paySaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                      {discountValue > 0 && payValue <= 0
                        ? "Aplicar desconto"
                        : discountValue > 0
                          ? "Confirmar recebimento e desconto"
                          : "Confirmar recebimento"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta cobrança está quitada ou cancelada.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removeItemTarget)}
        onOpenChange={(o) => !o && setRemoveItemTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeItemTarget && (
                <>
                  <strong>
                    {removeItemTarget.quantity}x{" "}
                    {removeItemTarget.services?.name ?? "Procedimento"}
                  </strong>{" "}
                  ({fmt(removeItemTarget.total_price)}) será removido e o total da fatura será
                  recalculado. O estoque dos insumos será devolvido.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingItem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingItem}
              onClick={(e) => {
                e.preventDefault();
                void confirmRemoveItem();
              }}
            >
              Remover item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(reversePaymentTarget)}
        onOpenChange={(o) => !o && setReversePaymentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento de{" "}
              <strong>{reversePaymentTarget && fmt(reversePaymentTarget.amount)}</strong> será
              estornado e o saldo em aberto da cobrança será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversingPayment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reversingPayment}
              onClick={(e) => {
                e.preventDefault();
                void confirmReversePayment();
              }}
            >
              Confirmar estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
