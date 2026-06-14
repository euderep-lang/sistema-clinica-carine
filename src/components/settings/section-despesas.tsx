import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  createExpenseCategory,
  ensureExpenseCategories,
  loadExpenseCategories,
  saveExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense-categories";

export function SectionDespesas() {
  const { tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ExpenseCategory[]>([]);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const data = await loadExpenseCategories(false);
      if (data.length === 0) {
        setRows(await ensureExpenseCategories(tenant.id));
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

  const updateRow = (id: string, patch: Partial<ExpenseCategory>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        rows.map((r) =>
          saveExpenseCategory(r.id, { name: r.name, active: r.active, sort_order: r.sort_order }),
        ),
      );
      toast.success("Categorias salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!tenant || !newName.trim()) return;
    try {
      const created = await createExpenseCategory(tenant.id, newName.trim());
      setRows((prev) => [...prev, created]);
      setNewName("");
      toast.success("Categoria adicionada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="size-5" />
          Categorias de despesa
        </CardTitle>
        <CardDescription>
          Categorias usadas nas despesas do profissional e no financeiro da clínica.
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
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-24 text-center">Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
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

            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={() => void addCategory()} disabled={!newName.trim()}>
                <Plus className="mr-2 size-4" />
                Adicionar
              </Button>
            </div>

            <Button onClick={() => void saveAll()} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Salvar categorias
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
