import { useMemo, useState } from "react";
import { Ban, CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/appointment-types";

export type AgendaSummaryRow = {
  id: string;
  start_time: string;
  status: string;
  patients: { full_name: string } | null;
  profiles: { full_name: string } | null;
};

type SummaryKey = "active" | "pending" | "confirmed" | "completed" | "cancelled";

const CARD_META: Record<
  SummaryKey,
  { label: string; tone: "default" | "success" | "warning" | "danger"; icon: typeof Clock }
> = {
  active: { label: "Total ativos", tone: "default", icon: CalendarCheck },
  pending: { label: "Pendentes", tone: "warning", icon: Clock },
  confirmed: { label: "Confirmados", tone: "default", icon: CheckCircle2 },
  completed: { label: "Concluídos", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "Canceladas", tone: "danger", icon: Ban },
};

function rowsForKey(rows: AgendaSummaryRow[], key: SummaryKey): AgendaSummaryRow[] {
  switch (key) {
    case "active":
      return rows.filter((r) => r.status !== "cancelled");
    case "pending":
      return rows.filter((r) => r.status === "scheduled" || r.status === "rescheduled");
    case "confirmed":
      return rows.filter((r) => r.status === "confirmed");
    case "completed":
      return rows.filter((r) => r.status === "completed");
    case "cancelled":
      return rows.filter((r) => r.status === "cancelled");
  }
}

export function useAgendaSummaryTotals(rows: AgendaSummaryRow[]) {
  return useMemo(
    () => ({
      active: rows.filter((r) => r.status !== "cancelled").length,
      pending: rows.filter((r) => r.status === "scheduled" || r.status === "rescheduled").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      completed: rows.filter((r) => r.status === "completed").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
    }),
    [rows],
  );
}

export function AgendaSummaryCards({ rows }: { rows: AgendaSummaryRow[] }) {
  const totals = useAgendaSummaryTotals(rows);
  const [openKey, setOpenKey] = useState<SummaryKey | null>(null);

  const dialogRows = openKey ? rowsForKey(rows, openKey) : [];
  const meta = openKey ? CARD_META[openKey] : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        {(Object.keys(CARD_META) as SummaryKey[]).map((key) => {
          const m = CARD_META[key];
          return (
            <StatCard
              key={key}
              label={m.label}
              value={totals[key]}
              icon={m.icon}
              tone={m.tone}
              onClick={() => setOpenKey(key)}
            />
          );
        })}
      </div>

      <Dialog open={openKey !== null} onOpenChange={(v) => !v && setOpenKey(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{meta?.label ?? "Consultas"}</DialogTitle>
          </DialogHeader>
          {dialogRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma consulta nesta categoria.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialogRows.map((r) => (
                  <TableRow key={r.id} className={r.status === "cancelled" ? "opacity-70" : undefined}>
                    <TableCell>{r.start_time.slice(0, 5)}</TableCell>
                    <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.status === "cancelled"
                            ? "border-destructive/40 text-destructive"
                            : undefined
                        }
                      >
                        {APPOINTMENT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
