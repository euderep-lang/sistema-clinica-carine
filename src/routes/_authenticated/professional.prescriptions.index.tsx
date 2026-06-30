import { useEffect, useState } from "react";
import { fmtDateTimeFromDate } from "@/lib/locale";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, FileDown, Copy, FilePlus2, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { softDelete } from "@/lib/trash";
import { useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/_authenticated/professional/prescriptions/")({
  component: PrescriptionsList,
});

interface RxRow {
  id: string;
  date: string;
  type: string;
  status: string;
  patient_id: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  patients: { full_name: string } | null;
}

function formatRxGeneratedAt(row: RxRow) {
  const iso =
    row.status === "finalized"
      ? row.signed_at ?? row.updated_at
      : row.created_at;
  return fmtDateTimeFromDate(new Date(iso), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 20;

function typeLabelText(t: string) {
  if (t === "controlada") return "Controlada";
  if (t === "especial_2vias") return "Especial 2 Vias";
  if (t === "especial") return "Especial";
  return "Simples";
}
function typeBadge(t: string) {
  if (t === "controlada") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Controlada</Badge>;
  if (t === "especial_2vias") return <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Especial 2 Vias</Badge>;
  if (t === "especial") return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Especial</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Simples</Badge>;
}
function statusBadge(s: string) {
  if (s === "finalized") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finalizada</Badge>;
  return <Badge variant="secondary">Rascunho</Badge>;
}

function signatureBadge(row: RxRow) {
  if (row.signed_at) {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Assinada</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Não assinada
    </Badge>
  );
}

function PrescriptionsList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RxRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("prescriptions" as never)
      .select(
        "id, date, type, status, patient_id, pdf_url, created_at, updated_at, signed_at, patients!inner(full_name)",
        { count: "exact" },
      )
      .eq("professional_id", profile!.id)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1) as never;
    if (type !== "all") query = (query as never as { eq: (a:string,b:string)=>unknown }).eq("type", type) as never;
    if (status !== "all") query = (query as never as { eq: (a:string,b:string)=>unknown }).eq("status", status) as never;
    if (from) query = (query as never as { gte: (a:string,b:string)=>unknown }).gte("date", from) as never;
    if (to) query = (query as never as { lte: (a:string,b:string)=>unknown }).lte("date", to) as never;
    if (q) query = (query as never as { ilike: (a:string,b:string)=>unknown }).ilike("patients.full_name", `%${q}%`) as never;
    const { data, count, error } = (await (query as unknown as Promise<{ data: RxRow[]; count: number | null; error: { message: string } | null }>));
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, type, status, from, to, q]);

  const openPdf = async (path: string | null) => {
    if (!path) { toast.error("Documento não disponível"); return; }
    const { data, error } = await supabase.storage.from("prescriptions").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Erro ao abrir documento"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const duplicate = async (id: string) => {
    navigate({ to: "/professional/prescriptions/new", search: { duplicate: id } as never });
  };

  const editDraft = (id: string) => {
    navigate({ to: "/professional/prescriptions/new", search: { edit: id } as never });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await softDelete({
        entityType: "prescription",
        table: "prescriptions",
        id: deleteTarget.id,
        label: deleteTarget.patients?.full_name ?? "Receita",
        summary: `Receita ${typeLabelText(deleteTarget.type)} · ${formatRxGeneratedAt(deleteTarget)}`,
        children: [{ table: "prescription_items", fk: "prescription_id" }],
      });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
      toast.success("Receita movida para a lixeira");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!profile) return null;

  return (
    <DashboardShell title="Receituário">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end justify-between">
          <div className="flex flex-wrap gap-2 items-end">
            <Input placeholder="Buscar por paciente" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} className="w-56" />
            <Select value={type} onValueChange={(v) => { setPage(0); setType(v); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="simples">Simples</SelectItem>
                <SelectItem value="controlada">Controlada</SelectItem>
                <SelectItem value="especial">Especial</SelectItem>
                <SelectItem value="especial_2vias">Especial 2 Vias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setPage(0); setStatus(v); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="finalized">Finalizada</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value); }} className="w-40" />
            <Input type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value); }} className="w-40" />
          </div>
          <Button asChild>
            <Link to="/professional/prescriptions/new"><Plus className="h-4 w-4 mr-2" />Nova Receita</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data e hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Carregando...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Nenhuma receita emitida ainda</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatRxGeneratedAt(r)}</TableCell>
                    <TableCell className="font-medium">{r.patients?.full_name ?? "—"}</TableCell>
                    <TableCell>{typeBadge(r.type)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>{signatureBadge(r)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {r.status === "draft" ? (
                          <Button size="sm" onClick={() => editDraft(r.id)}>
                            <PenLine className="h-4 w-4 mr-1" />
                            Continuar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => openPdf(r.pdf_url)} disabled={!r.pdf_url}>
                            <FileDown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => duplicate(r.id)}><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/professional/prescriptions/new", search: { patient_id: r.patient_id } as never })}><FilePlus2 className="h-4 w-4" /></Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `A receita de ${deleteTarget.patients?.full_name ?? "paciente"} será movida para a lixeira por 30 dias.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{total} receitas</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="px-2 py-1">Página {page + 1} de {pages}</span>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}