import { useCallback, useEffect, useState } from "react";
import { fmtDateFromDate } from "@/lib/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface SessionRow {
  id: string;
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

interface PatientSessionsContentProps {
  patientId: string;
  patientName?: string;
  active?: boolean;
}

export function PatientSessionsContent({
  patientId,
  patientName,
  active = true,
}: PatientSessionsContentProps) {
  const [rows, setRows] = useState<SessionRow[]>([]);
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
      .order("purchased_at", { ascending: false });

    if (error) toast.error(error.message);
    else {
      setRows(
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
    if (!active) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [active, load]);

  const toTarget = (row: SessionRow) => ({
    packageId: row.id,
    patientName: patientName ?? "Paciente",
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Carregando sessões…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhum pacote de sessões para este paciente.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((row) => {
          const pct = Math.round((row.used_sessions / row.total_sessions) * 100);
          const remaining = row.total_sessions - row.used_sessions;
          return (
            <li key={row.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmt(row.unit_price)} ·{" "}
                        {fmtDateFromDate(new Date(row.purchased_at))}
                      </p>
                    </div>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {row.used_sessions} de {row.total_sessions} realizadas
                      {row.status === "active" && ` · ${remaining} restantes`}
                    </p>
                    <div className="flex gap-1">
                      {row.used_sessions > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setHistoryTarget(toTarget(row));
                            setHistoryOpen(true);
                          }}
                        >
                          Histórico
                        </Button>
                      )}
                      {row.status === "active" && row.used_sessions < row.total_sessions && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCheckoffTarget(toTarget(row));
                            setCheckoffOpen(true);
                          }}
                        >
                          Dar baixa
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

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
