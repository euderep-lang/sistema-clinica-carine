import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileDown,
  Pencil,
  Plus,
  Receipt,
  Send,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { BudgetFormDialog } from "@/components/professional/budget-form-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { PageSection } from "@/components/layout/page-section";
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
import { useAuth } from "@/lib/mock-auth";
import {
  BUDGET_STATUS_CLASS,
  BUDGET_STATUS_LABEL,
  fmt,
  fmtDate,
} from "@/lib/currency";
import { generateBudgetPDF, type BudgetPDFData } from "@/lib/financial-pdf";
import { loadLetterheadForPdf } from "@/lib/letterhead";
import { formatClinicAddress, getTenantSetting, type ClinicAddress } from "@/lib/settings-helpers";

export const Route = createFileRoute("/_authenticated/professional/budgets")({
  component: ProfessionalBudgetsPage,
});

interface BudgetRow {
  id: string;
  number: number;
  date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  discount_value: number;
  final_value: number;
  notes: string | null;
  patient_id: string | null;
  patients: { full_name: string } | null;
}

function statusBadge(status: string) {
  return (
    <Badge className={BUDGET_STATUS_CLASS[status] ?? "bg-gray-100 text-gray-700"}>
      {BUDGET_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function ProfessionalBudgetsPage() {
  const { profile, tenant } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase
      .from("budgets")
      .select(
        "id,number,date,valid_until,status,subtotal,discount_value,final_value,notes,patient_id,patients(full_name)",
      )
      .eq("professional_id", profile.id)
      .order("date", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = (data ?? []) as BudgetRow[];
    setRows(list);

    const ids = list.map((r) => r.id);
    if (ids.length) {
      const { data: bills } = await supabase
        .from("bills_receivable")
        .select("id, budget_id")
        .in("budget_id", ids);
      const converted = new Set<string>();
      for (const b of bills ?? []) {
        if (b.budget_id) converted.add(b.budget_id);
      }
      setConvertedIds(converted);
    } else {
      setConvertedIds(new Set());
    }
    setLoading(false);
  }, [profile, status]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setFormOpen(true);
  };

  const updateStatus = async (id: string, next: string) => {
    const { error } = await supabase.from("budgets").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Orçamento marcado como ${BUDGET_STATUS_LABEL[next] ?? next}`);
    void load();
  };

  const exportPdf = async (row: BudgetRow) => {
    if (!profile || !tenant) return;
    try {
      const [{ data: items }, { data: tenantRow }, addr, letterhead] = await Promise.all([
        supabase.from("budget_items").select("*").eq("budget_id", row.id).order("position"),
        supabase.from("tenants").select("name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle(),
        getTenantSetting<ClinicAddress>(tenant.id, "address"),
        loadLetterheadForPdf(profile.id),
      ]);

      if (!letterhead.imageData) {
        toast.warning(
          "Papel timbrado não encontrado — PDF gerado com as margens configuradas. Cadastre o timbrado em Minhas configurações.",
        );
      }

      const pdfData: BudgetPDFData = {
        clinic: {
          name: tenantRow?.name ?? tenant.name,
          address: formatClinicAddress(addr) ?? tenantRow?.address ?? null,
          phone: tenantRow?.phone ?? null,
          email: tenantRow?.email ?? null,
          cnpj: tenantRow?.cnpj ?? null,
        },
        number: row.number,
        date: row.date,
        validUntil: row.valid_until,
        patientName: row.patients?.full_name ?? "—",
        professionalName: profile.full_name,
        items: (items ?? []).map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          total_price: Number(it.total_price),
        })),
        subtotal: Number(row.subtotal),
        discountValue: Number(row.discount_value),
        finalValue: Number(row.final_value),
        notes: row.notes,
        letterhead,
      };

      const blob = generateBudgetPDF(pdfData);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const convertToSale = async (row: BudgetRow) => {
    if (convertedIds.has(row.id)) {
      toast.error("Orçamento já convertido");
      return;
    }
    if (row.status !== "approved") {
      toast.error("Aprove o orçamento antes de converter em venda");
      return;
    }
    setConvertingId(row.id);
    try {
      const { data, error } = await supabase.rpc("convert_budget_to_sale", {
        p_budget_id: row.id,
      });
      if (error) throw error;
      const result = data as { patient_id?: string; amount?: number } | null;
      toast.success(
        `Venda criada — ${fmt(result?.amount ?? row.final_value)} no financeiro do paciente`,
      );
      void load();
      if (result?.patient_id) {
        navigate({
          to: "/professional/patients/$id",
          params: { id: result.patient_id },
          search: { tab: "financeiro" },
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <DashboardShell title="Orçamentos">
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Propostas de tratamento — crie, envie ao paciente e converta em venda."
          actions={
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Novo orçamento
            </Button>
          }
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
              {Object.entries(BUDGET_STATUS_LABEL).map(([k, v]) => (
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
                  <TableHead className="text-right">Ações</TableHead>
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
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const converted = convertedIds.has(r.id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">#{r.number}</TableCell>
                        <TableCell>{fmtDate(r.date)}</TableCell>
                        <TableCell className="font-medium">{r.patients?.full_name ?? "—"}</TableCell>
                        <TableCell>{fmtDate(r.valid_until)}</TableCell>
                        <TableCell>{fmt(r.final_value)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {statusBadge(r.status)}
                            {converted && (
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                Vendido
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r.id)} title="Editar">
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void exportPdf(r)} title="PDF">
                              <FileDown className="size-4" />
                            </Button>
                            {r.status === "draft" && !converted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void updateStatus(r.id, "sent")}
                                title="Marcar como enviado"
                              >
                                <Send className="mr-1 size-3" />
                                Enviar
                              </Button>
                            )}
                            {(r.status === "draft" || r.status === "sent") && !converted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void updateStatus(r.id, "approved")}
                                title="Aprovar orçamento"
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                Aprovar
                              </Button>
                            )}
                            {r.status === "approved" && !converted && (
                              <Button
                                size="sm"
                                onClick={() => void convertToSale(r)}
                                disabled={convertingId === r.id}
                                title="Converter em venda"
                              >
                                <ShoppingCart className="mr-1 size-3" />
                                Converter
                              </Button>
                            )}
                            {converted && r.patient_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate({
                                    to: "/professional/patients/$id",
                                    params: { id: r.patient_id! },
                                    search: { tab: "financeiro" },
                                  })
                                }
                              >
                                Financeiro
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
          </CardContent>
        </Card>
      </div>

      <BudgetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        budgetId={editId}
        onSaved={() => void load()}
      />
    </DashboardShell>
  );
}
