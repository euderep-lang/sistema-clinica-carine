import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export interface SessionHistoryTarget {
  packageId: string;
  patientName: string;
  serviceName: string;
  usedSessions: number;
  totalSessions: number;
}

interface UsageRow {
  id: string;
  session_date: string | null;
  session_time: string | null;
  used_at: string;
  product_batch: string | null;
  application_route: string | null;
  quantity: number;
  professional_name: string;
}

interface SessionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SessionHistoryTarget | null;
}

function formatDate(value: string | null, fallback: string) {
  if (value) {
    const [y, m, d] = value.split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return new Date(fallback).toLocaleDateString("pt-BR");
}

function formatTime(value: string | null, fallback: string) {
  if (value) return value.slice(0, 5);
  return new Date(fallback).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionHistoryDialog({
  open,
  onOpenChange,
  target,
}: SessionHistoryDialogProps) {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("session_usages")
        .select(
          "id,session_date,session_time,used_at,product_batch,application_route,quantity,profiles(full_name)",
        )
        .eq("package_id", target.packageId)
        .order("used_at", { ascending: false });

      if (error) {
        toast.error(error.message);
        setRows([]);
      } else {
        setRows(
          (data ?? []).map((row) => {
            const pro = row.profiles as { full_name: string } | { full_name: string }[] | null;
            return {
              id: row.id,
              session_date: row.session_date,
              session_time: row.session_time,
              used_at: row.used_at,
              product_batch: row.product_batch,
              application_route: row.application_route,
              quantity: row.quantity,
              professional_name:
                (Array.isArray(pro) ? pro[0]?.full_name : pro?.full_name) ?? "—",
            };
          }),
        );
      }
      setLoading(false);
    })();
  }, [open, target]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" />
            Histórico de sessões
          </DialogTitle>
          <DialogDescription>
            {target
              ? `${target.serviceName} · ${target.patientName} (${target.usedSessions}/${target.totalSessions} realizadas)`
              : "Sessões já registradas neste pacote."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Carregando histórico…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma sessão registrada ainda.
          </p>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Via</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.session_date, row.used_at)}</TableCell>
                    <TableCell>{formatTime(row.session_time, row.used_at)}</TableCell>
                    <TableCell>{row.professional_name}</TableCell>
                    <TableCell>
                      {row.application_route ? (
                        <Badge variant="secondary">{row.application_route}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.product_batch ? (
                        <Badge variant="outline">{row.product_batch}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{row.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
