import { toast } from "sonner";

export type NfseStatus = "pending" | "issued" | "failed" | "cancelled" | null;

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
  if (bill.nfse_status === "pending") return "Emitindo…";
  if (bill.nfse_status === "failed") return "Erro";
  return "—";
}

/** Stub até integração Focus NFe. */
export async function emitBillNfse(_billId: string): Promise<void> {
  toast.info("Emissão de NFS-e via Focus NFe será habilitada em breve.");
}
