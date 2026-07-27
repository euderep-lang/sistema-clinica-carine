import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { emitBillNfse } from "@/lib/nfse";

export type EmitNfseBillDefaults = {
  id: string;
  amount: number;
  description?: string | null;
  patientName?: string | null;
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
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !bill) return;
    setAmount(Number(bill.amount) || 0);
    setDescription((bill.description?.trim() || defaultDescription).trim());
    setSubmitting(false);
  }, [open, bill, defaultDescription]);

  const submit = async () => {
    if (!bill) return;
    if (!(amount > 0)) return;
    const desc = description.trim();
    if (!desc) return;
    setSubmitting(true);
    try {
      const ok = await emitBillNfse(bill.id, { amount, description: desc });
      if (ok) {
        onOpenChange(false);
        onIssued?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
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
