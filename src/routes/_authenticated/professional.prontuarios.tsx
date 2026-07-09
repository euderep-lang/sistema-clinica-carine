import { useEffect, useState } from "react";
import { matchesSearch } from "@/lib/search";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmtDate } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/professional/prontuarios")({
  component: ProfessionalRecordsPage,
});

interface RecordRow {
  id: string;
  date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  icd10_code: string | null;
  patient_id: string;
  patients: { full_name: string } | null;
}

function ProfessionalRecordsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("medical_records")
        .select("id,date,chief_complaint,diagnosis,icd10_code,patient_id,patients(full_name)")
        .eq("professional_id", profile.id)
        .order("date", { ascending: false })
        .limit(200);
      setRows((data ?? []) as RecordRow[]);
      setLoading(false);
    })();
  }, [profile]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      matchesSearch(r.patients?.full_name, q) ||
      matchesSearch(r.chief_complaint, q) ||
      matchesSearch(r.diagnosis, q) ||
      matchesSearch(r.icd10_code, q)
    );
  });

  return (
    <DashboardShell title="Prontuários">
      <div className="space-y-6">
        <PageHeader
          title="Prontuários"
          description="Atendimentos registrados por você. Abra o prontuário completo do paciente."
        />

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por paciente, queixa, diagnóstico ou CID…"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Queixa principal</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                      Nenhum prontuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{fmtDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.patients?.full_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {r.chief_complaint ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {r.diagnosis ?? "—"}
                      </TableCell>
                      <TableCell>
                        {r.icd10_code ? <Badge variant="secondary">{r.icd10_code}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate({
                              to: "/professional/patients/$id/record",
                              params: { id: r.patient_id },
                            })
                          }
                        >
                          <Eye className="mr-1 size-4" />
                          Abrir
                        </Button>
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
