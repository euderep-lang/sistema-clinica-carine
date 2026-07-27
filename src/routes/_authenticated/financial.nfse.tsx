import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { NfseDetailDialog, type NfseBillDetail } from "@/components/nfse/nfse-detail-dialog";
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
import { openCrmInbox } from "@/lib/crm-navigation";
import { fmt, fmtDate } from "@/lib/currency";
import { matchesSearch } from "@/lib/search";
import {
  downloadBillNfsePdf,
  NFSE_STATUS_CLASS,
  NFSE_STATUS_LABEL,
  nfseWhatsAppDraft,
  refreshBillNfse,
  type NfseStatus,
} from "@/lib/nfse";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/financial/nfse")({
  component: NfsePage,
  head: () => ({ meta: [{ title: "NFS-e — ClinicOS" }] }),
});

type StatusFilter = "all" | Exclude<NfseStatus, null>;

const SELECT =
  "id, description, amount, paid_amount, due_date, status, nfse_number, nfse_status, nfse_issued_at, nfse_url, nfse_pdf_url, nfse_message, nfse_focus_ref, nfse_amount, nfse_description, patients(id, full_name, cpf, phone, phone_ddi), profiles:professional_id(full_name)";

function NfsePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<NfseBillDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [detail, setDetail] = useState<NfseBillDetail | null>(null);
  const [rowBusy, setRowBusy] = useState<Record<string, "pdf" | "wa" | "refresh" | undefined>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("bills_receivable")
      .select(SELECT)
      .not("nfse_status", "is", null)
      .order("nfse_issued_at", { ascending: false, nullsFirst: false })
      .order("due_date", { ascending: false })
      .limit(300);

    if (status !== "all") {
      q = q.eq("nfse_status", status);
    }

    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as NfseBillDetail[]);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        matchesSearch(r.patients?.full_name, q) ||
        matchesSearch(r.description, q) ||
        matchesSearch(r.nfse_number, q) ||
        matchesSearch(r.profiles?.full_name, q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    let issued = 0;
    let processing = 0;
    let failed = 0;
    let issuedAmount = 0;
    for (const r of rows) {
      if (r.nfse_status === "issued") {
        issued += 1;
        issuedAmount += Number(r.nfse_amount ?? r.amount) || 0;
      } else if (r.nfse_status === "processing" || r.nfse_status === "pending") {
        processing += 1;
      } else if (r.nfse_status === "failed") {
        failed += 1;
      }
    }
    return { issued, processing, failed, issuedAmount, total: rows.length };
  }, [rows]);

  const setBusy = (id: string, kind?: "pdf" | "wa" | "refresh") =>
    setRowBusy((prev) => ({ ...prev, [id]: kind }));

  const onDownload = async (bill: NfseBillDetail) => {
    setBusy(bill.id, "pdf");
    try {
      await downloadBillNfsePdf(bill.id);
      await load();
    } finally {
      setBusy(bill.id, undefined);
    }
  };

  const onRefresh = async (bill: NfseBillDetail) => {
    setBusy(bill.id, "refresh");
    try {
      await refreshBillNfse(bill.id);
      await load();
    } finally {
      setBusy(bill.id, undefined);
    }
  };

  const onWhatsApp = (bill: NfseBillDetail) => {
    if (!bill.patients?.id && !bill.patients?.phone) {
      toast.error("Paciente sem telefone cadastrado para WhatsApp.");
      return;
    }
    setBusy(bill.id, "wa");
    const draft = nfseWhatsAppDraft({
      patientName: bill.patients?.full_name,
      nfseNumber: bill.nfse_number,
      amount: bill.nfse_amount ?? bill.amount,
      description: bill.nfse_description ?? bill.description,
      portalUrl: bill.nfse_url,
    });
    const ok = openCrmInbox(navigate, {
      patientId: bill.patients?.id,
      phone: bill.patients?.phone,
      phoneDdi: bill.patients?.phone_ddi,
      draft,
    });
    setBusy(bill.id, undefined);
    if (!ok) {
      toast.error("Não foi possível abrir o CRM WhatsApp.");
      return;
    }
    toast.success("Abrindo CRM WhatsApp…");
  };

  return (
    <DashboardShell title="NFS-e">
      <div className="space-y-5">
        <PageHeader
          title="NFS-e"
          description="Controle das notas fiscais de serviço emitidas pela clínica."
          actions={
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Atualizar lista
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard size="sm" label="Notas emitidas" value={String(stats.issued)} icon={FileText} />
          <StatCard
            size="sm"
            label="Valor emitido"
            value={fmt(stats.issuedAmount)}
            icon={FileText}
            tone="success"
          />
          <StatCard
            size="sm"
            label="Em processamento"
            value={String(stats.processing)}
            icon={Loader2}
            tone="warning"
          />
          <StatCard size="sm" label="Com erro" value={String(stats.failed)} icon={FileText} tone="danger" />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar paciente, nº da nota ou descrição…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(NFSE_STATUS_LABEL) as Exclude<NfseStatus, null>[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {NFSE_STATUS_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="min-w-0 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Nº NFS-e</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[1%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      Nenhuma NFS-e encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const st = r.nfse_status;
                    const busy = rowBusy[r.id];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.patients?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.profiles?.full_name ?? "Sem profissional"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.nfse_number ?? "—"}</TableCell>
                        <TableCell>
                          {st ? (
                            <Badge className={NFSE_STATUS_CLASS[st]}>{NFSE_STATUS_LABEL[st]}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {fmt(Number(r.nfse_amount ?? r.amount))}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.nfse_issued_at ? fmtDate(r.nfse_issued_at.slice(0, 10)) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-sm">
                          {r.nfse_description ?? r.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Detalhes"
                              onClick={() => setDetail(r)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Baixar PDF"
                              disabled={Boolean(busy) || (st !== "issued" && !r.nfse_pdf_url)}
                              onClick={() => void onDownload(r)}
                            >
                              {busy === "pdf" ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Download className="size-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Enviar no WhatsApp CRM"
                              disabled={Boolean(busy)}
                              onClick={() => onWhatsApp(r)}
                            >
                              {busy === "wa" ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MessageCircle className="size-4" />
                              )}
                            </Button>
                            {(st === "processing" || st === "pending" || st === "failed") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Atualizar status"
                                disabled={Boolean(busy)}
                                onClick={() => void onRefresh(r)}
                              >
                                {busy === "refresh" ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="size-4" />
                                )}
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

      <NfseDetailDialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        bill={detail}
        onChanged={() => void load()}
      />
    </DashboardShell>
  );
}
