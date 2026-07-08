import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import {
  PatientSessionsDialog,
  type PatientPackageRow,
  type PatientSessionGroup,
} from "@/components/professional/patient-sessions-dialog";
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

export const Route = createFileRoute("/_authenticated/professional/sessions")({
  component: ProfessionalSessionsPage,
});

interface SessionRow extends PatientPackageRow {
  patient_id: string;
  patient_name: string;
}

function ProfessionalSessionsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PatientSessionGroup | null>(null);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SessionHistoryTarget | null>(null);

  const load = useCallback(async (): Promise<SessionRow[]> => {
    if (!profile) return [];
    setLoading(true);
    let query = supabase
      .from("patient_session_packages")
      .select(
        "id,patient_id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),patients(full_name)",
      )
      .eq("tenant_id", profile.tenant_id)
      .order("purchased_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) console.error(error);
    const mapped = (data ?? []).map((row) => {
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
    });
    setRows(mapped);
    setLoading(false);
    return mapped;
  }, [profile, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => matchesSearch(r.patient_name, q) || matchesSearch(r.service_name, q),
    );
  }, [rows, search]);

  const patientGroups = useMemo(() => {
    const map = new Map<string, PatientSessionGroup>();
    for (const row of filtered) {
      const existing = map.get(row.patient_id);
      if (existing) {
        existing.packages.push(row);
      } else {
        map.set(row.patient_id, {
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          packages: [row],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.patient_name.localeCompare(b.patient_name, "pt-BR"),
    );
  }, [filtered]);

  const activePackageCount = rows.filter((r) => r.status === "active").length;
  const activePatientCount = useMemo(
    () => new Set(rows.filter((r) => r.status === "active").map((r) => r.patient_id)).size,
    [rows],
  );

  const openPatient = (group: PatientSessionGroup) => {
    setSelectedGroup(group);
    setPatientDialogOpen(true);
  };

  const toTarget = (pkg: PatientPackageRow, patientName: string): SessionCheckoffTarget => ({
    packageId: pkg.id,
    patientName,
    serviceName: pkg.service_name,
    usedSessions: pkg.used_sessions,
    totalSessions: pkg.total_sessions,
  });

  const openCheckoff = (pkg: PatientPackageRow, patientName: string) => {
    setCheckoffTarget(toTarget(pkg, patientName));
    setCheckoffOpen(true);
  };

  const openHistory = (pkg: PatientPackageRow, patientName: string) => {
    setHistoryTarget(toTarget(pkg, patientName));
    setHistoryOpen(true);
  };

  const summarizeGroup = (group: PatientSessionGroup) => {
    const totalSessions = group.packages.reduce((s, p) => s + p.total_sessions, 0);
    const usedSessions = group.packages.reduce((s, p) => s + p.used_sessions, 0);
    const remaining = totalSessions - usedSessions;
    const pct = totalSessions > 0 ? Math.round((usedSessions / totalSessions) * 100) : 0;
    const canCheckoff = group.packages.some(
      (p) => p.status === "active" && p.used_sessions < p.total_sessions,
    );
    return { totalSessions, usedSessions, remaining, pct, canCheckoff };
  };

  const refreshSelectedGroup = (patientId: string, freshRows: SessionRow[]) => {
    const packages = freshRows.filter((r) => r.patient_id === patientId);
    if (packages.length === 0) {
      setPatientDialogOpen(false);
      setSelectedGroup(null);
      return;
    }
    setSelectedGroup({
      patient_id: patientId,
      patient_name: packages[0].patient_name,
      packages,
    });
  };

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
          <Badge variant="secondary">
            {activePatientCount} paciente{activePatientCount !== 1 ? "s" : ""} · {activePackageCount}{" "}
            ativo{activePackageCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Pacotes</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Pendentes</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : patientGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum pacote de sessões encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                patientGroups.map((group) => {
                  const summary = summarizeGroup(group);
                  return (
                    <TableRow
                      key={group.patient_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openPatient(group)}
                    >
                      <TableCell className="font-medium">{group.patient_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-sm">
                            {group.packages.length} pacote{group.packages.length !== 1 ? "s" : ""}
                          </span>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {group.packages.map((p) => p.service_name).join(" · ")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[10rem]">
                        <div className="space-y-1">
                          <Progress value={summary.pct} className="h-1.5" />
                          <span className="text-xs text-muted-foreground">
                            {summary.usedSessions}/{summary.totalSessions} realizadas
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={summary.remaining > 0 ? "default" : "secondary"}>
                          {summary.remaining} sessão{summary.remaining !== 1 ? "ões" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPatient(group);
                          }}
                        >
                          {summary.canCheckoff ? "Dar baixa" : "Ver pacotes"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </PageSection>

      <PatientSessionsDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        group={selectedGroup}
        onCheckoff={(pkg) => {
          if (!selectedGroup) return;
          openCheckoff(pkg, selectedGroup.patient_name);
        }}
        onHistory={(pkg) => {
          if (!selectedGroup) return;
          openHistory(pkg, selectedGroup.patient_name);
        }}
      />

      <SessionCheckoffDialog
        open={checkoffOpen}
        onOpenChange={setCheckoffOpen}
        target={checkoffTarget}
        onSuccess={async () => {
          const patientId = selectedGroup?.patient_id;
          const fresh = await load();
          if (patientId && patientDialogOpen) refreshSelectedGroup(patientId, fresh);
        }}
      />

      <SessionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        target={historyTarget}
      />
    </DashboardShell>
  );
}
