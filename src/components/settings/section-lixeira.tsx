import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { fmtDateTimeFromDate } from "@/lib/locale";
import { listTrash, purgeTrashItem, restoreTrashItem, type TrashItem } from "@/lib/trash.functions";

const ENTITY_LABEL: Record<string, string> = {
  prescription: "Receita",
  clinical_template: "Modelo de documento",
  appointment: "Agendamento",
  expense: "Despesa",
  message_template: "Modelo de mensagem",
  inventory_category: "Categoria de estoque",
  inventory_item: "Item de estoque",
  service: "Serviço / procedimento",
  budget: "Orçamento",
  bill: "Cobrança / venda",
  patient: "Paciente",
  evolution: "Evolução",
  user: "Usuário",
};

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function SectionLixeira({ personal = false }: { personal?: boolean }) {
  const list = useServerFn(listTrash);
  const restore = useServerFn(restoreTrashItem);
  const purge = useServerFn(purgeTrashItem);
  const [rows, setRows] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await list();
      setRows(items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      const result = await restore({ data: { id: item.id } });
      setRows((prev) => prev.filter((r) => r.id !== item.id));
      if (result?.tempPassword) {
        toast.success(`Usuário restaurado. Senha temporária: ${result.tempPassword}`, {
          duration: 20000,
        });
      } else {
        toast.success("Item restaurado");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    setBusyId(purgeTarget.id);
    try {
      await purge({ data: { id: purgeTarget.id } });
      setRows((prev) => prev.filter((r) => r.id !== purgeTarget.id));
      setPurgeTarget(null);
      toast.success("Removido definitivamente");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lixeira</h2>
          <p className="text-sm text-muted-foreground">
            {personal
              ? "Itens que você excluiu ficam aqui por 30 dias. Restaure quando quiser voltar a usá-los."
              : "Itens excluídos ficam aqui por 30 dias e podem ser restaurados. Depois disso são removidos automaticamente."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Excluído por</TableHead>
              <TableHead>Excluído em</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  A lixeira está vazia.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">{ENTITY_LABEL[r.entity_type] ?? r.entity_type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.label || "—"}
                    {r.summary ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {r.summary}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.deleted_by_name ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {fmtDateTimeFromDate(new Date(r.deleted_at), {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        daysLeft(r.expires_at) <= 5
                          ? "border-amber-300 text-amber-700"
                          : "text-muted-foreground"
                      }
                    >
                      {daysLeft(r.expires_at)} dia(s)
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRestore(r)}
                        disabled={busyId === r.id}
                      >
                        <Undo2 className="mr-1 h-4 w-4" />
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPurgeTarget(r)}
                        disabled={busyId === r.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={purgeTarget !== null} onOpenChange={(v) => !v && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget
                ? `"${purgeTarget.label}" será apagado permanentemente e não poderá mais ser restaurado.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handlePurge();
              }}
              disabled={busyId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
