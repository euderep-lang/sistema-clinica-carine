import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { PageSection } from "@/components/layout/page-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, fmtDate } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/professional/budgets")({
  component: ProfessionalBudgetsPage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
};

interface BudgetRow {
  id: string;
  number: number;
  date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  final_value: number;
  patients: { full_name: string } | null;
}

function ProfessionalBudgetsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("budgets")
        .select("id,number,date,valid_until,status,subtotal,final_value,patients(full_name)")
        .eq("professional_id", profile.id)
        .order("date", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      setRows((data ?? []) as BudgetRow[]);
      setLoading(false);
    })();
  }, [profile, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.number).includes(q) ||
        (r.patients?.full_name?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  const totals = useMemo(
    () => ({
      count: filtered.length,
      value: filtered.reduce((s, r) => s + Number(r.final_value), 0),
      approved: filtered.filter((r) => r.status === "approved").length,
    }),
    [filtered],
  );

  return (
    <DashboardShell title="Orçamentos">
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Propostas de tratamento emitidas por você."
        />

        <PageSection title="Resumo">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total de orçamentos" value={totals.count} icon={Receipt} />
            <StatCard label="Valor total" value={fmt(totals.value)} icon={Receipt} />
            <StatCard label="Aprovados" value={totals.approved} icon={Receipt} tone="success" />
          </div>
        </PageSection>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Buscar por paciente ou número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">#{r.number}</TableCell>
                      <TableCell>{fmtDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell>{fmtDate(r.valid_until)}</TableCell>
                      <TableCell>{fmt(r.final_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
