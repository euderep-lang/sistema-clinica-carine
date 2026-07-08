import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Loader2, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import { AUTOMATION_QUEUED_MESSAGE } from "@/lib/automation-messages";
import { todayISO } from "@/lib/locale";

export const Route = createFileRoute("/_authenticated/reception/checkin")({
  component: CheckinPage,
});

type AppointmentRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string | null;
  notes: string | null;
  patient_id: string | null;
  professional_id: string | null;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
  rooms: { name: string } | null;
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  in_progress: "bg-violet-500/10 text-violet-700",
  completed: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-700",
};

function CheckinPage() {
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("appointments")
      .select(
        "id, date, start_time, end_time, status, type, notes, patient_id, professional_id, patients(full_name, phone), profiles:professional_id(full_name), rooms(name)",
      )
      .eq("date", date)
      .order("start_time");
    if (statusFilter === "active") {
      q = q.in("status", ["scheduled", "confirmed", "in_progress"]);
    } else if (statusFilter !== "all") {
      q = q.eq("status", statusFilter);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AppointmentRow[]);
    }
    setLoading(false);
  }, [date, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        matchesSearch(r.patients?.full_name, q) ||
        matchesSearch(r.profiles?.full_name, q) ||
        (r.patients?.phone?.includes(q) ?? false),
    );
  }, [rows, search]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "in_progress"
        ? "Check-in realizado"
        : status === "confirmed"
          ? "Consulta confirmada"
          : "Status atualizado",
    );
    if (status === "completed" || status === "no_show") {
      toast.info(AUTOMATION_QUEUED_MESSAGE);
    }
    void load();
  };

  const stats = useMemo(
    () => ({
      total: rows.length,
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      waiting: rows.filter((r) => r.status === "scheduled").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
    }),
    [rows],
  );

  return (
    <DashboardShell title="Check-in">
      <PageHeader
        title="Check-in do dia"
        description="Confirme chegada dos pacientes e acompanhe a fila de atendimento."
      />

      <div className="grid gap-4 sm:grid-cols-4 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Agendados hoje</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Confirmados</p>
            <p className="text-2xl font-semibold text-primary">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aguardando confirmação</p>
            <p className="text-2xl font-semibold text-amber-600">{stats.waiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em atendimento</p>
            <p className="text-2xl font-semibold text-violet-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos (agendado/confirmado)</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="in_progress">Em atendimento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="no_show">Falta</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente ou profissional…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Carregando agenda…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nenhum agendamento para este filtro.
            </p>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {filtered.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold tabular-nums">
                          {r.start_time.slice(0, 5)}
                        </p>
                        <p className="truncate font-medium">{r.patients?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.profiles?.full_name ?? "—"}
                          {r.rooms?.name ? ` · ${r.rooms.name}` : ""}
                        </p>
                      </div>
                      <Badge className={STATUS_CLASS[r.status] ?? ""}>
                        {APPOINTMENT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={updatingId === r.id}
                          onClick={() => void updateStatus(r.id, "confirmed")}
                        >
                          {updatingId === r.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3 mr-1" />
                          )}
                          Confirmar
                        </Button>
                      )}
                      {["scheduled", "confirmed"].includes(r.status) && (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={updatingId === r.id}
                          onClick={() => void updateStatus(r.id, "in_progress")}
                        >
                          {updatingId === r.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <UserCheck className="size-3 mr-1" />
                          )}
                          Check-in
                        </Button>
                      )}
                      {r.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          disabled={updatingId === r.id}
                          onClick={() => void updateStatus(r.id, "completed")}
                        >
                          <Clock className="size-3 mr-1" />
                          Finalizar
                        </Button>
                      )}
                      {r.patient_id && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/reception/pacientes/$id" params={{ id: r.patient_id }}>
                            Ver cadastro
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.start_time.slice(0, 5)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{r.patients?.full_name ?? "—"}</p>
                        {r.patient_id && (
                          <Link
                            to="/reception/pacientes/$id"
                            params={{ id: r.patient_id }}
                            className="text-xs text-primary hover:underline"
                          >
                            Ver cadastro
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell>{r.rooms?.name ?? "—"}</TableCell>
                    <TableCell>{APPOINTMENT_TYPE_LABEL[r.type ?? ""] ?? r.type ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CLASS[r.status] ?? ""}>
                        {APPOINTMENT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === r.id}
                            onClick={() => void updateStatus(r.id, "confirmed")}
                          >
                            {updatingId === r.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3 mr-1" />
                            )}
                            Confirmar
                          </Button>
                        )}
                        {["scheduled", "confirmed"].includes(r.status) && (
                          <Button
                            size="sm"
                            disabled={updatingId === r.id}
                            onClick={() => void updateStatus(r.id, "in_progress")}
                          >
                            {updatingId === r.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <UserCheck className="size-3 mr-1" />
                            )}
                            Check-in
                          </Button>
                        )}
                        {r.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={updatingId === r.id}
                            onClick={() => void updateStatus(r.id, "completed")}
                          >
                            <Clock className="size-3 mr-1" />
                            Finalizar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
