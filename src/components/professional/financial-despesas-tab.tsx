import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { BillDetailDialog } from "@/components/professional/bill-detail-dialog";
import { ExpenseDialog } from "@/components/professional/expense-dialog";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
} from "@/lib/currency";
import { paymentLabel } from "@/lib/payment-methods";
import { loadExpenseCategories } from "@/lib/expense-categories";
import {
  cancelExpense,
  deleteProfessionalExpense,
  findBillReceivableIdForFeeExpense,
  isCardFeeExpense,
  loadProfessionalExpenses,
  loadTenantExpenses,
  markExpensePaid,
  sumExpenseTotals,
  type ExpenseRow,
} from "@/lib/expenses";
import { FinancialProfessionalFilter } from "@/components/professional/financial-professional-filter";
import { RECEIVABLE_BILL_SELECT, type FinancialTabScopeProps } from "@/lib/financial-scope";
import type { SaleBillRow } from "@/lib/sales";
import { cn } from "@/lib/utils";

export function FinancialDespesasTab({
  scope,
  professionalFilter,
  onProfessionalFilterChange,
}: FinancialTabScopeProps) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [dateField, setDateField] = useState<"due_date" | "paid_date">("due_date");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseRow | null>(null);
  const [detailBill, setDetailBill] = useState<SaleBillRow | null>(null);
  const [openingSale, setOpeningSale] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        scope === "clinic"
          ? loadTenantExpenses({
              status,
              category,
              from,
              to,
              dateField,
              professionalFilter,
            })
          : loadProfessionalExpenses(profile.id, { status, category, from, to, dateField }),
        loadExpenseCategories(),
      ]);
      setRows(data);
      setCategories(cats.map((c) => c.name));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile, status, category, from, to, dateField, scope, professionalFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        (r.supplier?.toLowerCase().includes(q) ?? false) ||
        (r.category?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  const totals = useMemo(() => sumExpenseTotals(filtered), [filtered]);

  const dateFieldLabel = dateField === "due_date" ? "vencimento" : "pagamento";

  const openNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditTarget(row);
    setDialogOpen(true);
  };

  const openRelatedSale = async (row: ExpenseRow) => {
    if (!isCardFeeExpense(row)) {
      openEdit(row);
      return;
    }
    setOpeningSale(true);
    try {
      const billId = await findBillReceivableIdForFeeExpense(row.id);
      if (!billId) {
        toast.info("Não foi possível localizar a venda desta taxa");
        return;
      }
      const { data, error } = await supabase
        .from("bills_receivable")
        .select(RECEIVABLE_BILL_SELECT)
        .eq("id", billId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        toast.info("Cobrança da venda não encontrada");
        return;
      }
      setDetailBill(data as unknown as SaleBillRow);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpeningSale(false);
    }
  };

  const pay = async (row: ExpenseRow) => {
    try {
      await markExpensePaid(row.id, todayISO(), row.payment_method ?? "pix");
      toast.success("Despesa marcada como paga");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (row: ExpenseRow) => {
    try {
      await deleteProfessionalExpense(row.id);
      toast.success("Despesa excluída");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cancel = async (row: ExpenseRow) => {
    try {
      await cancelExpense(row.id);
      toast.success("Despesa cancelada");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {scope === "clinic" && (
            <FinancialProfessionalFilter value={professionalFilter} onChange={onProfessionalFilterChange} />
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          <Select
            value={dateField}
            onValueChange={(v) => setDateField(v as "due_date" | "paid_date")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Por vencimento</SelectItem>
              <SelectItem value="paid_date">Por pagamento</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Paga</SelectItem>
              <SelectItem value="overdue">Vencida</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 size-4" />
          Nova despesa
        </Button>
      </div>

      <PageSection
        title="Resumo"
        description={
          dateField === "due_date"
            ? `Contas com vencimento entre ${fmtDate(from)} e ${fmtDate(to)} — visão de contas a pagar`
            : `Contas pagas entre ${fmtDate(from)} e ${fmtDate(to)} — igual ao DRE e ao caixa`
        }
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <StatCard
            size="sm"
            label="Total"
            value={fmt(totals.total)}
            sub={`Por ${dateFieldLabel}`}
            tone="default"
          />
          <StatCard
            size="sm"
            label="Pago"
            value={fmt(totals.paid)}
            sub={dateField === "paid_date" ? "Pagas no período" : "Situação paga"}
            tone="success"
          />
          <StatCard
            size="sm"
            label="Pendente"
            value={fmt(totals.pending)}
            sub={dateField === "paid_date" ? "Só no filtro por vencimento" : "A pagar no período"}
            tone="warning"
          />
        </div>
        {dateField === "due_date" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Para comparar com o DRE (linha 4.01), use o filtro &quot;Por pagamento&quot; com situação
            &quot;Paga&quot;. O DRE também inclui comissões e taxas de cartão, que não aparecem aqui.
          </p>
        ) : null}
      </PageSection>

      <Card>
        <CardContent className="min-w-0 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                {scope === "clinic" && <TableHead>Profissional</TableHead>}
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-center">
                  {dateField === "paid_date" ? "Pagamento" : "Vencimento"}
                </TableHead>
                <TableHead className="text-center">Forma</TableHead>
                <TableHead className="text-center">Situação</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={scope === "clinic" ? 9 : 8} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={scope === "clinic" ? 9 : 8} className="py-10 text-center text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                  const profName = (r as ExpenseRow & { profiles?: { full_name: string } | null }).profiles?.full_name;
                  const cardFee = isCardFeeExpense(r);
                  return (
                    <TableRow
                      key={r.id}
                      className={cn(cardFee && "cursor-pointer hover:bg-muted/50")}
                      onClick={cardFee && !openingSale ? () => void openRelatedSale(r) : undefined}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className={cn(
                            "text-left font-medium hover:underline",
                            cardFee && "text-primary",
                          )}
                          disabled={openingSale}
                          onClick={(e) => {
                            e.stopPropagation();
                            void openRelatedSale(r);
                          }}
                        >
                          {r.description}
                        </button>
                        {cardFee && r.notes ? (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{r.notes}</p>
                        ) : null}
                      </TableCell>
                      {scope === "clinic" && <TableCell>{profName ?? "—"}</TableCell>}
                      <TableCell>{r.category ?? "—"}</TableCell>
                      <TableCell>{r.supplier ?? "—"}</TableCell>
                      <TableCell className="text-center tabular-nums">{fmt(r.amount)}</TableCell>
                      <TableCell className="text-center">
                        {dateField === "paid_date"
                          ? r.paid_date
                            ? fmtDate(r.paid_date)
                            : "—"
                          : fmtDate(r.due_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.payment_method ? paymentLabel(r.payment_method) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={BILL_STATUS_CLASS[eff] ?? ""}>
                          {BILL_STATUS_LABEL[eff] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {cardFee && (
                              <DropdownMenuItem onClick={() => void openRelatedSale(r)}>
                                Ver venda
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(r)}>
                              <Pencil className="mr-2 size-4" />
                              Editar
                            </DropdownMenuItem>
                            {r.status === "pending" && (
                              <DropdownMenuItem onClick={() => void pay(r)}>
                                <Check className="mr-2 size-4" />
                                Marcar como paga
                              </DropdownMenuItem>
                            )}
                            {r.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => void cancel(r)}>
                                <X className="mr-2 size-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => void remove(r)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editTarget}
        onSaved={() => void load()}
      />

      <BillDetailDialog
        open={Boolean(detailBill)}
        onOpenChange={(open) => !open && setDetailBill(null)}
        bill={detailBill}
        onChanged={() => void load()}
      />
    </div>
  );
}
