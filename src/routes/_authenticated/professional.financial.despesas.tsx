import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ExpenseDialog } from "@/components/professional/expense-dialog";
import { FinancialShell } from "@/components/professional/financial-shell";
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
import { useAuth } from "@/lib/mock-auth";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
  PAYMENT_LABEL,
} from "@/lib/currency";
import { loadExpenseCategories } from "@/lib/expense-categories";
import {
  cancelExpense,
  deleteProfessionalExpense,
  loadProfessionalExpenses,
  markExpensePaid,
  type ExpenseRow,
} from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/professional/financial/despesas")({
  component: ProfessionalDespesasPage,
});

function ProfessionalDespesasPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseRow | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        loadProfessionalExpenses(profile.id, { status, category, from, to, dateField: "due_date" }),
        loadExpenseCategories(),
      ]);
      setRows(data);
      setCategories(cats.map((c) => c.name));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile, status, category, from, to]);

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

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    for (const r of filtered) {
      if (r.status === "cancelled") continue;
      total += Number(r.amount);
      if (r.status === "paid") paid += Number(r.amount);
      else pending += Number(r.amount);
    }
    return { total, paid, pending };
  }, [filtered]);

  const openNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditTarget(row);
    setDialogOpen(true);
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
    <FinancialShell>
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
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

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Total: <strong className="text-foreground">{fmt(totals.total)}</strong></span>
        <span>Pago: <strong className="text-emerald-700">{fmt(totals.paid)}</strong></span>
        <span>Pendente: <strong className="text-amber-700">{fmt(totals.pending)}</strong></span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.category ?? "—"}</TableCell>
                      <TableCell>{r.supplier ?? "—"}</TableCell>
                      <TableCell>{fmt(r.amount)}</TableCell>
                      <TableCell>{fmtDate(r.due_date)}</TableCell>
                      <TableCell>
                        {r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={BILL_STATUS_CLASS[eff] ?? ""}>
                          {BILL_STATUS_LABEL[eff] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
    </div>
    </FinancialShell>
  );
}
