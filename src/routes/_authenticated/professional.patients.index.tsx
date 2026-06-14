import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users as UsersIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientShortcuts } from "@/components/patient-shortcuts";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/professional/patients/")({
  component: ProfessionalPatients,
});

interface Row {
  id: string;
  full_name: string;
  record_number: number | null;
  phone: string | null;
}

const PAGE_SIZE = 25;

function ProfessionalPatients() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);

  const load = async () => {
    if (!profile) return;
    setLoading(true);

    let q = supabase
      .from("patients")
      .select("id, full_name, record_number, phone", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .eq("active", true)
      .order("record_number", { ascending: true, nullsFirst: false });

    if (query) {
      const term = query;
      const digits = term.replace(/\D/g, "");
      const parts = [`full_name.ilike.%${term}%`];
      if (digits) parts.push(`cpf.ilike.%${digits}%`, `phone.ilike.%${digits}%`);
      if (/^\d+$/.test(term)) parts.push(`record_number.eq.${term}`);
      q = q.or(parts.join(","));
    }

    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count, error } = await q;
    if (error) setRows([]);
    else {
      setRows((data ?? []) as Row[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, query, page]);

  const onSearch = () => {
    setPage(0);
    setQuery(search.trim());
  };

  const openSessions = (patientId: string) => {
    navigate({
      to: "/professional/patients/$id",
      params: { id: patientId },
      search: { tab: "sessoes" },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const empty = !loading && total === 0 && !query;

  return (
    <DashboardShell title="Meus Pacientes">
      <div className="space-y-5">
        <PageHeader
          title="Meus Pacientes"
          description="Busque pacientes e acesse ficha, prontuário, sessões e agenda."
          actions={
            <Button onClick={() => setOpenForm(true)}>
              <Plus className="mr-2 size-4" />
              Novo paciente
            </Button>
          }
        />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  placeholder="Digite o nome ou parte do nome para buscar"
                  className="h-11 pl-10"
                />
              </div>
              <Button className="h-11 px-6" onClick={onSearch}>
                Buscar
              </Button>
              <Button variant="outline" className="h-11 shrink-0" onClick={() => setOpenForm(true)}>
                <Plus className="mr-2 size-4" />
                Novo paciente
              </Button>
            </div>
          </div>

          {empty ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                <UsersIcon className="size-7 text-muted-foreground" />
              </div>
              <p className="font-display text-lg font-semibold">Nenhum paciente ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre pacientes da clínica ou busque na lista abaixo.
              </p>
              <Button className="mt-6" onClick={() => setOpenForm(true)}>
                <Plus className="mr-2 size-4" />
                Cadastrar paciente
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[13rem]">Atalhos</TableHead>
                    <TableHead className="w-28 text-center">Nº Prontuário</TableHead>
                    <TableHead>Nome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        Carregando pacientes…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        Nenhum resultado para esta busca
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p, i) => (
                      <TableRow
                        key={p.id}
                        className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      >
                        <TableCell>
                          <PatientShortcuts
                            variant="professional"
                            patientId={p.id}
                            phone={p.phone}
                            onSessionsClick={openSessions}
                          />
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm tabular-nums text-muted-foreground">
                          {p.record_number ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{p.full_name}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Exibindo itens {from} – {to} de {total}
                </span>
                {total > PAGE_SIZE && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <PatientFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onSaved={(id) => {
          void load();
          navigate({ to: "/professional/patients/$id", params: { id } });
        }}
      />
    </DashboardShell>
  );
}
