import { useCallback, useEffect, useState } from "react";
import { fmtDateFromDate } from "@/lib/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  SessionCheckoffDialog,
  type SessionCheckoffTarget,
} from "@/components/professional/session-checkoff-dialog";
import {
  SessionHistoryDialog,
  type SessionHistoryTarget,
} from "@/components/professional/session-history-dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/currency";

export interface PatientPackageRow {
  id: string;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  status: string;
  purchased_at: string;
  unit_price: number;
}

export interface PatientSessionGroup {
  patient_id: string;
  patient_name: string;
  packages: PatientPackageRow[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

interface PatientPackagesListProps {
  packages: PatientPackageRow[];
  onCheckoff: (pkg: PatientPackageRow) => void;
  onHistory: (pkg: PatientPackageRow) => void;
}

function PatientPackagesList({ packages, onCheckoff, onHistory }: PatientPackagesListProps) {
  if (packages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum pacote de sessões ativo para este paciente.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {packages.map((pkg) => {
        const pct = Math.round((pkg.used_sessions / pkg.total_sessions) * 100);
        const remaining = pkg.total_sessions - pkg.used_sessions;
        const canCheckoff =
          pkg.status === "active" && pkg.used_sessions < pkg.total_sessions;

        return (
          <div key={pkg.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{pkg.service_name}</p>
                <p className="text-xs text-muted-foreground">
                  Compra em {fmtDateFromDate(new Date(pkg.purchased_at))} ·{" "}
                  {fmt(pkg.unit_price)}
                </p>
              </div>
              <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                {STATUS_LABEL[pkg.status] ?? pkg.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {pkg.used_sessions}/{pkg.total_sessions} realizadas
                {pkg.status === "active" && remaining > 0 && ` · ${remaining} restantes`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {pkg.used_sessions > 0 && (
                <Button size="sm" variant="outline" onClick={() => onHistory(pkg)}>
                  Histórico
                </Button>
              )}
              {canCheckoff && (
                <Button size="sm" onClick={() => onCheckoff(pkg)}>
                  Dar baixa
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PatientSessionsDialogProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      patientId: string;
      patientName?: string;
      group?: never;
      onCheckoff?: never;
      onHistory?: never;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      group: PatientSessionGroup | null;
      patientId?: never;
      patientName?: never;
      onCheckoff: (pkg: PatientPackageRow) => void;
      onHistory: (pkg: PatientPackageRow) => void;
    };

export function PatientSessionsDialog(props: PatientSessionsDialogProps) {
  if ("patientId" in props && props.patientId) {
    return <PatientSessionsByPatientDialog {...props} />;
  }
  return <PatientSessionsGroupDialog {...props} />;
}

function PatientSessionsGroupDialog({
  open,
  onOpenChange,
  group,
  onCheckoff,
  onHistory,
}: Extract<PatientSessionsDialogProps, { group: PatientSessionGroup | null }>) {
  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sessões — {group.patient_name}</DialogTitle>
        </DialogHeader>
        <PatientPackagesList
          packages={group.packages}
          onCheckoff={onCheckoff}
          onHistory={onHistory}
        />
      </DialogContent>
    </Dialog>
  );
}

function PatientSessionsByPatientDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
}: Extract<PatientSessionsDialogProps, { patientId: string }>) {
  const [packages, setPackages] = useState<PatientPackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState<SessionCheckoffTarget | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<SessionHistoryTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_session_packages")
      .select("id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name)")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("purchased_at", { ascending: false });

    if (error) {
      setPackages([]);
    } else {
      setPackages(
        (data ?? []).map((row) => {
          const svc = row.services as { name: string } | { name: string }[] | null;
          const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
          return {
            id: row.id,
            service_name: name ?? "Procedimento",
            total_sessions: row.total_sessions,
            used_sessions: row.used_sessions,
            status: row.status,
            purchased_at: row.purchased_at,
            unit_price: Number(row.unit_price),
          };
        }),
      );
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    if (!open) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [open, load]);

  const toTarget = (pkg: PatientPackageRow): SessionCheckoffTarget => ({
    packageId: pkg.id,
    patientName: patientName ?? "Paciente",
    serviceName: pkg.service_name,
    usedSessions: pkg.used_sessions,
    totalSessions: pkg.total_sessions,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sessões — {patientName ?? "Paciente"}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <PatientPackagesList
              packages={packages}
              onCheckoff={(pkg) => {
                setCheckoffTarget(toTarget(pkg));
                setCheckoffOpen(true);
              }}
              onHistory={(pkg) => {
                setHistoryTarget(toTarget(pkg));
                setHistoryOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

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
    </>
  );
}
