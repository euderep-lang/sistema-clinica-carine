import { toast } from "sonner";
import { consultNfse, downloadNfsePdf, emitNfse } from "@/lib/nfse.functions";
import { fmt } from "@/lib/currency";

export type NfseStatus = "pending" | "processing" | "issued" | "failed" | "cancelled" | null;

export interface BillNfseFields {
  nfse_number?: string | null;
  nfse_status?: NfseStatus;
  nfse_issued_at?: string | null;
}

export const NFSE_STATUS_LABEL: Record<Exclude<NfseStatus, null>, string> = {
  pending: "Pendente",
  processing: "Processando",
  issued: "Emitida",
  failed: "Erro",
  cancelled: "Cancelada",
};

export const NFSE_STATUS_CLASS: Record<Exclude<NfseStatus, null>, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-sky-100 text-sky-800",
  issued: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export function billOpenAmount(amount: number, paidAmount: number): number {
  return Math.max(0, Number(amount) - Number(paidAmount));
}

export function formatNfseLabel(bill: BillNfseFields): string {
  if (bill.nfse_number) return bill.nfse_number;
  if (bill.nfse_status === "pending" || bill.nfse_status === "processing") return "Emitindo…";
  if (bill.nfse_status === "failed") return "Erro";
  if (bill.nfse_status === "cancelled") return "Cancelada";
  return "—";
}

export function nfseWhatsAppDraft(opts: {
  patientName?: string | null;
  nfseNumber?: string | null;
  /** Preferir valor/discriminação do popup de emissão. */
  amount?: number | null;
  description?: string | null;
  portalUrl?: string | null;
  pdfUrl?: string | null;
}): string {
  const first = (opts.patientName ?? "").trim().split(/\s+/)[0] || "olá";
  const amount =
    opts.amount != null && Number.isFinite(Number(opts.amount)) ? Number(opts.amount) : null;
  const description = opts.description?.trim() || "";
  const lines = [
    `Olá, ${first}!`,
    opts.nfseNumber
      ? `Segue a NFS-e nº ${opts.nfseNumber}${amount != null ? ` no valor de ${fmt(amount)}` : ""}.`
      : `Segue a NFS-e${amount != null ? ` no valor de ${fmt(amount)}` : ""}.`,
  ];
  if (description) lines.push(`Referente a: ${description}`);

  const portal = opts.portalUrl?.trim() || "";
  const pdf = opts.pdfUrl?.trim() || "";
  const isS3 = (u: string) => /s3[.-].*amazonaws\.com/i.test(u);
  // Links Focus autenticados não abrem para a paciente.
  const isFocusAuth = (u: string) => /focusnfe\.com\.br/i.test(u);

  // Preferir portal municipal; se não houver, usar PDF (mesmo S3 público da DANFSe).
  let link: string | null = null;
  let linkLabel = "Consulta/portal";
  if (portal && !isS3(portal) && !isFocusAuth(portal)) {
    link = portal;
  } else if (pdf && !isFocusAuth(pdf)) {
    link = pdf;
    linkLabel = "PDF da NFS-e";
  } else if (portal && !isFocusAuth(portal)) {
    link = portal;
    linkLabel = "PDF da NFS-e";
  }
  if (link) lines.push(`${linkLabel}: ${link}`);

  lines.push("Qualquer dúvida, estamos à disposição.");
  return lines.join("\n");
}

/** Dispara download do PDF no navegador a partir do base64 do servidor. */
export function triggerBase64Download(fileName: string, mimeType: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadBillNfsePdf(
  billId: string,
): Promise<{ ok: true } | { ok: false; portalUrl?: string | null; message: string }> {
  const toastId = toast.loading("Baixando PDF da NFS-e…");
  try {
    const file = await downloadNfsePdf({ data: { billId } });
    triggerBase64Download(file.fileName, file.mimeType, file.base64);
    toast.success("PDF baixado.", { id: toastId });
    return { ok: true };
  } catch (e) {
    const message = (e as Error).message;
    toast.error(message, { id: toastId });
    return { ok: false, message, portalUrl: null };
  }
}

export type EmitNfseResult =
  | {
      ok: true;
      status: "issued" | "processing";
      numero: string | null;
      url: string | null;
      pdfUrl: string | null;
      amount: number | null;
      description: string | null;
    }
  | { ok: false };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Emite a NFS-e via Focus NFe e aguarda o processamento (polling). */
export async function emitBillNfse(
  billId: string,
  overrides?: { amount?: number; description?: string },
): Promise<EmitNfseResult> {
  const toastId = toast.loading("Enviando NFS-e para a prefeitura…");
  const amount = overrides?.amount ?? null;
  const description = overrides?.description?.trim() || null;
  try {
    await emitNfse({
      data: {
        billId,
        amount: overrides?.amount,
        description: overrides?.description,
      },
    });
    // Polling do status (autorização é assíncrona na prefeitura).
    for (let i = 0; i < 8; i++) {
      await sleep(2500);
      const res = await consultNfse({ data: { billId } });
      if (res.status === "issued") {
        toast.success(`NFS-e emitida${"numero" in res && res.numero ? ` (nº ${res.numero})` : ""}.`, {
          id: toastId,
        });
        return {
          ok: true,
          status: "issued",
          numero: "numero" in res ? (res.numero as string | null) : null,
          url: "url" in res ? (res.url as string | null) : null,
          pdfUrl: "pdfUrl" in res ? (res.pdfUrl as string | null) : null,
          amount,
          description,
        };
      }
      if (res.status === "failed") {
        toast.error(`Falha na emissão: ${"message" in res ? res.message : "erro desconhecido"}`, {
          id: toastId,
        });
        return { ok: false };
      }
      if (res.status === "cancelled") {
        toast.error("NFS-e cancelada pela prefeitura.", { id: toastId });
        return { ok: false };
      }
    }
    toast.info("NFS-e em processamento na prefeitura. Você já pode enviar no WhatsApp ou visualizar depois.", {
      id: toastId,
    });
    return {
      ok: true,
      status: "processing",
      numero: null,
      url: null,
      pdfUrl: null,
      amount,
      description,
    };
  } catch (e) {
    toast.error((e as Error).message, { id: toastId });
    return { ok: false };
  }
}

export async function refreshBillNfse(billId: string): Promise<boolean> {
  const toastId = toast.loading("Consultando status na Focus…");
  try {
    const res = await consultNfse({ data: { billId } });
    if (res.status === "issued") {
      toast.success(`NFS-e autorizada${"numero" in res && res.numero ? ` (nº ${res.numero})` : ""}.`, {
        id: toastId,
      });
      return true;
    }
    if (res.status === "failed") {
      toast.error(`Falha: ${"message" in res ? res.message : "erro desconhecido"}`, { id: toastId });
      return false;
    }
    if (res.status === "cancelled") {
      toast.error("NFS-e cancelada.", { id: toastId });
      return false;
    }
    toast.info("Ainda em processamento na prefeitura.", { id: toastId });
    return true;
  } catch (e) {
    toast.error((e as Error).message, { id: toastId });
    return false;
  }
}
