import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openCrmInbox } from "@/lib/crm-navigation";
import { fmt, fmtDate } from "@/lib/currency";
import {
  downloadBillNfsePdf,
  NFSE_STATUS_CLASS,
  NFSE_STATUS_LABEL,
  nfseWhatsAppDraft,
  refreshBillNfse,
  type NfseStatus,
} from "@/lib/nfse";

export type NfseBillDetail = {
  id: string;
  description: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  nfse_number: string | null;
  nfse_status: NfseStatus;
  nfse_issued_at: string | null;
  nfse_url: string | null;
  nfse_pdf_url: string | null;
  nfse_message: string | null;
  nfse_focus_ref: string | null;
  patients: {
    id: string;
    full_name: string;
    cpf: string | null;
    phone: string | null;
    phone_ddi: string | null;
  } | null;
  profiles: { full_name: string } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: NfseBillDetail | null;
  onChanged?: () => void;
};

export function NfseDetailDialog({ open, onOpenChange, bill, onChanged }: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"pdf" | "refresh" | "wa" | null>(null);

  if (!bill) return null;

  const status = bill.nfse_status;
  const statusLabel = status ? NFSE_STATUS_LABEL[status] : "Sem emissão";
  const statusClass = status ? NFSE_STATUS_CLASS[status] : "bg-muted text-muted-foreground";

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await downloadBillNfsePdf(bill.id);
      onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    setBusy("refresh");
    try {
      await refreshBillNfse(bill.id);
      onChanged?.();
    } finally {
      setBusy(null);
    }
  };

  const sendWhatsApp = () => {
    if (!bill.patients?.id && !bill.patients?.phone) {
      toast.error("Paciente sem telefone cadastrado para WhatsApp.");
      return;
    }
    setBusy("wa");
    const draft = nfseWhatsAppDraft({
      patientName: bill.patients?.full_name,
      nfseNumber: bill.nfse_number,
      amount: bill.amount,
      description: bill.description,
      portalUrl: bill.nfse_url,
    });
    const ok = openCrmInbox(navigate, {
      patientId: bill.patients?.id,
      phone: bill.patients?.phone,
      phoneDdi: bill.patients?.phone_ddi,
      draft,
    });
    setBusy(null);
    if (!ok) {
      toast.error("Não foi possível abrir o CRM WhatsApp para este paciente.");
      return;
    }
    onOpenChange(false);
    toast.success("Abrindo CRM WhatsApp com a mensagem da NFS-e…");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Detalhes da NFS-e
          </DialogTitle>
          <DialogDescription>
            {bill.patients?.full_name ?? "Paciente"}
            {bill.nfse_number ? ` · Nota ${bill.nfse_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusClass}>{statusLabel}</Badge>
            {bill.nfse_issued_at ? (
              <span className="text-muted-foreground">
                Emitida em {fmtDate(bill.nfse_issued_at.slice(0, 10))}
              </span>
            ) : null}
          </div>

          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2">
            <dt className="text-muted-foreground">Paciente</dt>
            <dd className="font-medium">{bill.patients?.full_name ?? "—"}</dd>

            <dt className="text-muted-foreground">CPF</dt>
            <dd>{bill.patients?.cpf ?? "—"}</dd>

            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{bill.patients?.phone ?? "—"}</dd>

            <dt className="text-muted-foreground">Profissional</dt>
            <dd>{bill.profiles?.full_name ?? "—"}</dd>

            <dt className="text-muted-foreground">Valor</dt>
            <dd className="font-semibold tabular-nums">{fmt(Number(bill.amount))}</dd>

            <dt className="text-muted-foreground">Vencimento</dt>
            <dd>{fmtDate(bill.due_date)}</dd>

            <dt className="text-muted-foreground">Nº NFS-e</dt>
            <dd className="font-mono">{bill.nfse_number ?? "—"}</dd>

            <dt className="text-muted-foreground">Ref. Focus</dt>
            <dd className="break-all font-mono text-xs">{bill.nfse_focus_ref ?? "—"}</dd>

            <dt className="text-muted-foreground">Descrição</dt>
            <dd className="whitespace-pre-wrap">{bill.description?.trim() || "—"}</dd>
          </dl>

          {bill.nfse_message ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
              {bill.nfse_message}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full flex-wrap gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy !== null}
              onClick={() => void refresh()}
            >
              {busy === "refresh" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Atualizar status
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy !== null || (status !== "issued" && !bill.nfse_pdf_url)}
              onClick={() => void downloadPdf()}
            >
              {busy === "pdf" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Baixar PDF
            </Button>
          </div>
          <div className="flex w-full flex-wrap gap-2">
            {bill.nfse_url ? (
              <Button variant="outline" className="flex-1" asChild>
                <a href={bill.nfse_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 size-4" />
                  Abrir portal
                </a>
              </Button>
            ) : null}
            <Button
              className="flex-1"
              disabled={busy !== null}
              onClick={sendWhatsApp}
            >
              {busy === "wa" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 size-4" />
              )}
              Enviar no WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
