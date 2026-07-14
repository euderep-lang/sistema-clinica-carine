import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ban, CheckCircle2, Clock, UserCheck, Users, type LucideIcon } from "lucide-react";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { APPOINTMENT_STATUS_LABEL, showsOnAgendaGrid } from "@/lib/appointment-types";

export type ReceptionDayAppt = {
  id: string;
  start_time: string;
  status: string | null;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
  rooms: { name: string } | null;
};

type SummaryKey = "today" | "confirmed" | "scheduled" | "inProgress" | "completed" | "cancelledNoShow";

const CARD_META: Record<
  SummaryKey,
  { label: string; tone: "default" | "success" | "warning" | "danger"; icon: LucideIcon }
> = {
  today: { label: "Consultas hoje", tone: "default", icon: Users },
  confirmed: { label: "Confirmados", tone: "success", icon: CheckCircle2 },
  scheduled: { label: "Sem confirmar", tone: "warning", icon: Clock },
  inProgress: { label: "Em atendimento", tone: "default", icon: UserCheck },
  completed: { label: "Concluídos", tone: "success", icon: CheckCircle2 },
  cancelledNoShow: { label: "Cancelados / faltas", tone: "danger", icon: Ban },
};

function rowsForKey(rows: ReceptionDayAppt[], key: SummaryKey): ReceptionDayAppt[] {
  const active = rows.filter((r) => showsOnAgendaGrid(r));
  switch (key) {
    case "today":
      return active;
    case "confirmed":
      return active.filter((r) => r.status === "confirmed");
    case "scheduled":
      return active.filter((r) => r.status === "scheduled");
    case "inProgress":
      return active.filter((r) => r.status === "in_progress");
    case "completed":
      return active.filter((r) => r.status === "completed");
    case "cancelledNoShow":
      return rows.filter((r) => r.status === "cancelled" || r.status === "no_show");
  }
}

export function ReceptionDaySummaryCards({
  rows,
  loading,
  nextApptTime,
  cancelledCount,
  noShowCount,
}: {
  rows: ReceptionDayAppt[];
  loading: boolean;
  nextApptTime?: string | null;
  cancelledCount: number;
  noShowCount: number;
}) {
  const [openKey, setOpenKey] = useState<SummaryKey | null>(null);

  const totals = useMemo(
    () => ({
      today: rows.filter((r) => r.status !== "cancelled" && r.status !== "blocked").length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
      cancelledNoShow: rows.filter((r) => r.status === "cancelled" || r.status === "no_show").length,
    }),
    [rows],
  );

  const dialogRows = openKey ? rowsForKey(rows, openKey) : [];
  const meta = openKey ? CARD_META[openKey] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Consultas hoje"
          value={loading ? "—" : totals.today}
          icon={Users}
          sub={nextApptTime ? `Próxima: ${nextApptTime}` : "Sem consultas"}
          onClick={() => setOpenKey("today")}
        />
        <StatCard
          label="Confirmados"
          value={loading ? "—" : totals.confirmed}
          icon={CheckCircle2}
          tone="success"
          onClick={() => setOpenKey("confirmed")}
        />
        <StatCard
          label="Sem confirmar"
          value={loading ? "—" : totals.scheduled}
          icon={Clock}
          tone={totals.scheduled > 0 ? "warning" : "default"}
          onClick={() => setOpenKey("scheduled")}
        />
        <StatCard
          label="Em atendimento"
          value={loading ? "—" : totals.inProgress}
          icon={UserCheck}
          onClick={() => setOpenKey("inProgress")}
        />
        <StatCard
          label="Concluídos"
          value={loading ? "—" : totals.completed}
          icon={CheckCircle2}
          tone="success"
          onClick={() => setOpenKey("completed")}
        />
        <StatCard
          label="Cancelados / faltas"
          value={loading ? "—" : totals.cancelledNoShow}
          icon={Ban}
          tone={totals.cancelledNoShow > 0 ? "danger" : "default"}
          sub={
            totals.cancelledNoShow > 0
              ? `${cancelledCount} cancel. · ${noShowCount} falta(s)`
              : undefined
          }
          onClick={() => setOpenKey("cancelledNoShow")}
        />
      </div>

      <Dialog open={openKey !== null} onOpenChange={(v) => !v && setOpenKey(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{meta?.label ?? "Consultas"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto px-6 py-4">
            {dialogRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
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
                    <TableRow
                      key={r.id}
                      className={
                        r.status === "cancelled" || r.status === "no_show" ? "opacity-75" : undefined
                      }
                    >
                      <TableCell className="font-mono tabular-nums">{r.start_time.slice(0, 5)}</TableCell>
                      <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.profiles?.full_name ?? "—"}
                        {r.rooms?.name ? ` · ${r.rooms.name}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            r.status === "cancelled" || r.status === "no_show"
                              ? "border-destructive/40 text-destructive"
                              : undefined
                          }
                        >
                          {APPOINTMENT_STATUS_LABEL[r.status ?? ""] ?? r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" asChild>
              <Link to="/reception/agenda">Ver agenda</Link>
            </Button>
            <Button asChild>
              <Link to="/reception/checkin">Ir para check-in</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
