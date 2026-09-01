import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/ui/money-input";
import { openCrmInbox } from "@/lib/crm-navigation";
import { fmt } from "@/lib/currency";
import {
  downloadBillNfsePdf,
  emitBillNfse,
  nfseWhatsAppDraft,
  type EmitNfseResult,
} from "@/lib/nfse";
import { consultNfse } from "@/lib/nfse.functions";

export type EmitNfseBillDefaults = {
  id: string;
  amount: number;
  description?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  patientPhoneDdi?: string | null;
};

type IssuedState = Extract<EmitNfseResult, { ok: true }> & {
  billId: string;
  patientId: string | null;
  patientName: string | null;
  patientPhone: string | null;
  patientPhoneDdi: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: EmitNfseBillDefaults | null;
  defaultDescription?: string;
  onIssued?: () => void;
};

export function EmitNfseDialog({
  open,
  onOpenChange,
  bill,
  defaultDescription = "Prestação de serviços de saúde",
  onIssued,
}: Props) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<IssuedState | null>(null);
  const [busy, setBusy] = useState<"pdf" | "refresh" | "wa" | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);

  useEffect(() => {
    if (!open || !bill) return;
    setAmount(Number(bill.amount) || 0);
    setDescription((bill.description?.trim() || defaultDescription).trim());
    setSubmitting(false);
    setIssued(null);
    setBusy(null);
    setPdfFailed(false);
  }, [open, bill, defaultDescription]);

  const closeAll = (next: boolean) => {
    if (!next) {
      setIssued(null);
      setPdfFailed(false);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!bill) return;
    if (!(amount > 0)) return;
    const desc = description.trim();
    if (!desc) return;
    setSubmitting(true);
    try {
      const result = await emitBillNfse(bill.id, { amount, description: desc });
      if (result.ok) {
        setIssued({
          ...result,
          billId: bill.id,
          patientId: bill.patientId ?? null,
          patientName: bill.patientName ?? null,
          patientPhone: bill.patientPhone ?? null,
          patientPhoneDdi: bill.patientPhoneDdi ?? null,
        });
        onIssued?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPdf = async () => {
    if (!issued) return;
    setBusy("pdf");
    setPdfFailed(false);
    try {
      const result = await downloadBillNfsePdf(issued.billId);
      if (!result.ok) {
        setPdfFailed(true);
        try {
          const res = await consultNfse({ data: { billId: issued.billId } });
          if (res.status === "issued") {
            setIssued((prev) =>
              prev
                ? {
                    ...prev,
                    status: "issued",
                    numero: ("numero" in res ? res.numero : prev.numero) as string | null,
                    url: ("url" in res ? res.url : prev.url) as string | null,
                    pdfUrl: ("pdfUrl" in res ? res.pdfUrl : prev.pdfUrl) as string | null,
                  }
                : prev,
            );
          }
        } catch {
          /* ignore */
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const refreshStatus = async () => {
    if (!issued) return;
    setBusy("refresh");
    try {
      const res = await consultNfse({ data: { billId: issued.billId } });
      if (res.status === "issued") {
        setIssued((prev) =>
          prev
            ? {
                ...prev,
                status: "issued",
                numero: ("numero" in res ? res.numero : prev.numero) as string | null,
                url: ("url" in res ? res.url : prev.url) as string | null,
                pdfUrl: ("pdfUrl" in res ? res.pdfUrl : prev.pdfUrl) as string | null,
              }
            : prev,
        );
        toast.success(
          `NFS-e autorizada${"numero" in res && res.numero ? ` (nº ${res.numero})` : ""}.`,
        );
        onIssued?.();
      } else if (res.status === "failed") {
        toast.error(`Falha: ${"message" in res ? res.message : "erro desconhecido"}`);
      } else if (res.status === "cancelled") {
        toast.error("NFS-e cancelada.");
      } else {
        toast.info("Ainda em processamento no Emissor Nacional.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sendWhatsApp = () => {
    if (!issued) return;
    if (!issued.patientId && !issued.patientPhone) {
      toast.error("Paciente sem telefone cadastrado para WhatsApp.");
      return;
    }
    setBusy("wa");
    const draft = nfseWhatsAppDraft({
      patientName: issued.patientName,
      nfseNumber: issued.numero,
      amount: issued.amount,
      description: issued.description,
      portalUrl: issued.url,
      pdfUrl: issued.pdfUrl,
    });
    const ok = openCrmInbox(navigate, {
      patientId: issued.patientId,
      phone: issued.patientPhone,
      phoneDdi: issued.patientPhoneDdi,
      draft,
    });
    setBusy(null);
    if (!ok) {
      toast.error("Não foi possível abrir o CRM WhatsApp.");
      return;
    }
    closeAll(false);
    toast.success("Abrindo CRM WhatsApp…");
  };

  if (issued) {
    const viewUrl = issued.url || issued.pdfUrl || null;
    return (
      <Dialog open={open} onOpenChange={closeAll}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {issued.status === "issued" ? "NFS-e emitida" : "NFS-e enviada"}
            </DialogTitle>
            <DialogDescription>
              {issued.patientName
                ? `${issued.patientName}${issued.numero ? ` · Nota ${issued.numero}` : ""}`
                : issued.numero
                  ? `Nota ${issued.numero}`
                  : "Aguarde a autorização do Emissor Nacional ou use as ações abaixo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 text-sm">
            {issued.amount != null ? (
              <p>
                Valor: <span className="font-semibold tabular-nums">{fmt(issued.amount)}</span>
              </p>
            ) : null}
            {issued.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{issued.description}</p>
            ) : null}
            {issued.status === "processing" ? (
              <p className="text-amber-700 text-xs">
                Ainda em processamento. Você pode atualizar o status ou enviar no WhatsApp.
              </p>
            ) : null}
            {pdfFailed ? (
              <p className="text-amber-700 text-xs">
                PDF indisponível no momento. Use “Visualizar NFS-e” para abrir no portal e
                imprimir/salvar.
              </p>
            ) : null}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              disabled={busy !== null}
              onClick={() => void downloadPdf()}
            >
              {busy === "pdf" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Baixar PDF
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={busy !== null}
              onClick={sendWhatsApp}
            >
              {busy === "wa" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 size-4" />
              )}
              Enviar no WhatsApp CRM
            </Button>
            {viewUrl ? (
              <Button variant="outline" className="w-full" asChild>
                <a href={viewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 size-4" />
                  Visualizar NFS-e
                </a>
              </Button>
            ) : null}
            {issued.status === "processing" || (!viewUrl && issued.status === "issued") ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={busy !== null}
                onClick={() => void refreshStatus()}
              >
                {busy === "refresh" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Atualizar status
              </Button>
            ) : null}
            <Button variant="ghost" className="w-full" onClick={() => closeAll(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={closeAll}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir NFS-e</DialogTitle>
          <DialogDescription>
            {bill?.patientName
              ? `Confirme o valor e a discriminação da nota para ${bill.patientName}.`
              : "Confirme o valor e a discriminação da nota."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Valor da nota *</Label>
            <MoneyInput value={amount} onValueChange={setAmount} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Discriminação / descrição *</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              placeholder="Ex.: Consulta médica / Prestação de serviços de saúde"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => closeAll(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={submitting || !(amount > 0) || !description.trim()}
          >
            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Emitir NFS-e
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
