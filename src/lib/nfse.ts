import { toast } from "sonner";
import { consultNfse, emitNfse } from "@/lib/nfse.functions";

export type NfseStatus = "pending" | "processing" | "issued" | "failed" | "cancelled" | null;

export interface BillNfseFields {
  nfse_number?: string | null;
  nfse_status?: NfseStatus;
  nfse_issued_at?: string | null;
}

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Emite a NFS-e via Focus NFe e aguarda o processamento (polling). */
export async function emitBillNfse(billId: string): Promise<void> {
  const toastId = toast.loading("Enviando NFS-e para a prefeitura…");
  try {
    await emitNfse({ data: { billId } });
    // Polling do status (autorização é assíncrona na prefeitura).
    for (let i = 0; i < 8; i++) {
      await sleep(2500);
      const res = await consultNfse({ data: { billId } });
      if (res.status === "issued") {
        toast.success(`NFS-e emitida${"numero" in res && res.numero ? ` (nº ${res.numero})` : ""}.`, { id: toastId });
        return;
      }
      if (res.status === "failed") {
        toast.error(`Falha na emissão: ${"message" in res ? res.message : "erro desconhecido"}`, { id: toastId });
        return;
      }
      if (res.status === "cancelled") {
        toast.error("NFS-e cancelada pela prefeitura.", { id: toastId });
        return;
      }
    }
    toast.info("NFS-e em processamento na prefeitura. Atualize em instantes para ver o número.", { id: toastId });
  } catch (e) {
    toast.error((e as Error).message, { id: toastId });
  }
}
