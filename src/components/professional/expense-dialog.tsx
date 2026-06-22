import { useEffect, useState } from "react";
import { todayISO } from "@/lib/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/mock-auth";
import { parseBRLInput } from "@/lib/currency";
import { loadExpenseCategories } from "@/lib/expense-categories";
import {
  createProfessionalExpense,
  createTenantExpense,
  updateProfessionalExpense,
  type ExpenseRow,
} from "@/lib/expenses";
import { activePaymentMethods, loadPaymentMethodConfigs } from "@/lib/payment-methods";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow | null;
  onSaved: () => void;
}

export function ExpenseDialog({ open, onOpenChange, expense, onSaved }: ExpenseDialogProps) {
  const { tenant, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [methods, setMethods] = useState<{ value: string; label: string }[]>([]);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState("pix");

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [cats, configs] = await Promise.all([
        loadExpenseCategories(),
        loadPaymentMethodConfigs(),
      ]);
      setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      setMethods(activePaymentMethods(configs).filter((m) => m.value !== "other"));
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDescription(expense.description);
      setCategory(expense.category ?? "");
      setSupplier(expense.supplier ?? "");
      setAmount(Number(expense.amount).toFixed(2).replace(".", ","));
      setDueDate(expense.due_date);
      setNotes(expense.notes ?? "");
      setMarkPaid(expense.status === "paid");
      setPaidDate(expense.paid_date ?? todayISO());
      setPaymentMethod(expense.payment_method ?? "pix");
    } else {
      setDescription("");
      setCategory("");
      setSupplier("");
      setAmount("");
      setDueDate(todayISO());
      setNotes("");
      setMarkPaid(false);
      setPaidDate(todayISO());
      setPaymentMethod("pix");
    }
  }, [open, expense]);

  const save = async () => {
    if (!tenant || !profile || !description.trim() || !amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const value = parseBRLInput(amount);
    if (value <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        category: category || null,
        supplier: supplier.trim() || null,
        amount: value,
        due_date: dueDate,
        notes: notes.trim() || null,
        status: markPaid ? "paid" : "pending",
        paid_date: markPaid ? paidDate : null,
        payment_method: markPaid ? paymentMethod : null,
      };
      if (expense) {
        await updateProfessionalExpense(expense.id, payload);
        toast.success("Despesa atualizada");
      } else if (profile.role === "financial") {
        await createTenantExpense(tenant.id, payload);
        toast.success("Despesa criada");
      } else {
        await createProfessionalExpense(tenant.id, profile.id, payload);
        toast.success("Despesa criada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor *</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={markPaid} onCheckedChange={setMarkPaid} />
            <Label>Já paga</Label>
          </div>
          {markPaid && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do pagamento</Label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
