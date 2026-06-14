import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PatientShortcuts } from "@/components/patient-shortcuts";
import { PatientSessionsDialog } from "@/components/professional/patient-sessions-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { PatientFormDialog } from "@/components/patient-form-dialog";

export const Route = createFileRoute("/_authenticated/reception/pacientes/")({
  component: PatientsList,
});

interface PatientRow {
  id: string;
  full_name: string;
  record_number: number | null;
  phone: string | null;
  active: boolean;
}

const PAGE_SIZE = 25;

function PatientsList() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsPatientId, setSessionsPatientId] = useState<string | null>(null);
  const [sessionsPatientName, setSessionsPatientName] = useState<string | undefined>();

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase
      .from("patients")
      .select("id, full_name, record_number, phone, active", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .order("record_number", { ascending: true, nullsFirst: false });

    if (filter === "active") q = q.eq("active", true);
    if (filter === "inactive") q = q.eq("active", false);

    if (query) {
      const term = query;
      const digits = term.replace(/\D/g, "");
      const parts = [`full_name.ilike.%${term}%`];
      if (digits) parts.push(`cpf.ilike.%${digits}%`, `phone.ilike.%${digits}%`);
      if (/^\d+$/.test(term)) parts.push(`record_number.eq.${term}`);
      q = q.or(parts.join(","));
    }

    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const [{ data, count, error }, { count: registeredCount }] = await Promise.all([
      q,
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id),
    ]);

    if (error) toast.error(error.message);
    setRows((data ?? []) as PatientRow[]);
    setTotal(count ?? 0);
    setTotalRegistered(registeredCount ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [profile, query, filter, page]);

  const onSearch = () => {
    setPage(0);
    setQuery(search.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const empty = !loading && total === 0 && !query;

  const openSessions = (patientId: string) => {
    const patient = rows.find((r) => r.id === patientId);
    setSessionsPatientId(patientId);
    setSessionsPatientName(patient?.full_name);
    setSessionsOpen(true);
  };

  return (
    <DashboardShell title="Pacientes">
      <div className="space-y-5">
        <PageHeader
          title="Contatos"
          description="Busque pacientes e acesse ficha, prontuário, financeiro e agenda."
          actions={
            <Button onClick={() => setOpenForm(true)}>
              <Plus className="mr-2 size-4" />
              Novo paciente
            </Button>
          }
        />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center">
            <Select
              value={filter}
              onValueChange={(v: "all" | "active" | "inactive") => {
                setFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contatos</SelectItem>
                <SelectItem value="active">Somente ativos</SelectItem>
                <SelectItem value="inactive">Somente inativos</SelectItem>
              </SelectContent>
            </Select>

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
            </div>
          </div>

          {empty ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                <UsersIcon className="size-7 text-muted-foreground" />
              </div>
              <p className="font-display text-lg font-semibold">Nenhum paciente cadastrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                O primeiro cadastro receberá o prontuário nº 1 automaticamente.
              </p>
              <Button className="mt-6" onClick={() => setOpenForm(true)}>
                <Plus className="mr-2 size-4" />
                Cadastrar primeiro paciente
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
                          {!p.active && (
                            <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Exibindo itens {from} – {to} de {total}
                  </span>
                  <span className="font-medium text-foreground">
                    {totalRegistered} {totalRegistered === 1 ? "paciente cadastrado" : "pacientes cadastrados"}
                  </span>
                </div>
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

      <PatientFormDialog open={openForm} onOpenChange={setOpenForm} onSaved={() => load()} />

      {sessionsPatientId && (
        <PatientSessionsDialog
          open={sessionsOpen}
          onOpenChange={setSessionsOpen}
          patientId={sessionsPatientId}
          patientName={sessionsPatientName}
        />
      )}
    </DashboardShell>
  );
}
