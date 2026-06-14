import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import {
  SessionCheckoffDialog,
  type SessionCheckoffTarget,
} from "@/components/professional/session-checkoff-dialog";
import {
  SessionHistoryDialog,
  type SessionHistoryTarget,
} from "@/components/professional/session-history-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/professional/sessions")({
  component: ProfessionalSessionsPage,
});

interface SessionRow {
  id: string;
  patient_id: string;
  patient_name: string;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  unit_price: number;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function ProfessionalSessionsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SessionHistoryTarget | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase
      .from("patient_session_packages")
      .select(
        "id,patient_id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),patients(full_name)",
      )
      .eq("professional_id", profile.id)
      .order("purchased_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) console.error(error);
    setRows(
      (data ?? []).map((row) => {
        const svc = row.services as { name: string } | { name: string }[] | null;
        const pat = row.patients as { full_name: string } | { full_name: string }[] | null;
        return {
          id: row.id,
          patient_id: row.patient_id,
          patient_name: (Array.isArray(pat) ? pat[0]?.full_name : pat?.full_name) ?? "—",
          service_name: (Array.isArray(svc) ? svc[0]?.name : svc?.name) ?? "Procedimento",
          total_sessions: row.total_sessions,
          used_sessions: row.used_sessions,
          status: row.status,
          purchased_at: row.purchased_at,
          unit_price: Number(row.unit_price),
        };
      }),
    );
    setLoading(false);
  }, [profile, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const toTarget = (row: SessionRow) => ({
    packageId: row.id,
    patientName: row.patient_name,
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions,
  });

  const openCheckoff = (row: SessionRow) => {
    setCheckoffTarget(toTarget(row));
    setCheckoffOpen(true);
  };

  const openHistory = (row: SessionRow) => {
    setHistoryTarget(toTarget(row));
    setHistoryOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        r.service_name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <DashboardShell title="Sessões">
      <PageHeader
        title="Sessões"
        description="Pacotes e protocolos vendidos — acompanhe sessões realizadas e pendentes."
        icon={CalendarCheck}
      />

      <PageSection>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar paciente ou procedimento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Em andamento</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{activeCount} ativos</Badge>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum pacote de sessões encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const pct = Math.round((row.used_sessions / row.total_sessions) * 100);
                  const remaining = row.total_sessions - row.used_sessions;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          to="/professional/patients/$id/record"
                          params={{ id: row.patient_id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.patient_name}
                        </Link>
                      </TableCell>
                      <TableCell>{row.service_name}</TableCell>
                      <TableCell className="min-w-[10rem]">
                        <div className="space-y-1">
                          <Progress value={pct} className="h-1.5" />
                          <span className="text-xs text-muted-foreground">
                            {row.used_sessions}/{row.total_sessions}
                            {row.status === "active" && ` · ${remaining} restantes`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{fmt(row.unit_price)}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "active" ? "default" : "secondary"}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.purchased_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {row.used_sessions > 0 && (
                            <Button size="sm" variant="outline" onClick={() => openHistory(row)}>
                              Histórico
                            </Button>
                          )}
                          {row.status === "active" && row.used_sessions < row.total_sessions && (
                            <Button size="sm" onClick={() => openCheckoff(row)}>
                              Dar baixa
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </PageSection>

      <SessionCheckoffDialog
        open={checkoffOpen}
        onOpenChange={setCheckoffOpen}
        target={checkoffTarget}
        onSuccess={() => void load()}
      />

      <SessionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        target={historyTarget}
      />
    </DashboardShell>
  );
}
