import { Label } from "@/components/ui/label";
import { fmt } from "@/lib/currency";
import type { FeeBearer } from "@/lib/payment-methods";
import { Building2, User } from "lucide-react";

interface PaymentFeeBearerFieldProps {
  fee: number;
  net: number;
  amount: number;
  value: FeeBearer | null;
  onChange: (value: FeeBearer) => void;
}

export function PaymentFeeBearerField({
  fee,
  net,
  amount,
  value,
  onChange,
}: PaymentFeeBearerFieldProps) {
  if (fee <= 0) return null;

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <Label className="text-xs font-medium">Quem assume as taxas?</Label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("company")}
          className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
            value === "company"
              ? "border-primary bg-primary/5 font-medium"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5 shrink-0" />
            Empresa
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Taxa descontada do recebimento
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("client")}
          className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
            value === "client"
              ? "border-primary bg-primary/5 font-medium"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <User className="size-3.5 shrink-0" />
            Cliente
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Valor integral no financeiro
          </span>
        </button>
      </div>
      {value === "company" && (
        <p className="text-xs text-muted-foreground">
          Taxa estimada: <strong>{fmt(fee)}</strong> · Líquido: <strong>{fmt(net)}</strong>
        </p>
      )}
      {value === "client" && (
        <p className="text-xs text-muted-foreground">
          Será lançado <strong>{fmt(amount)}</strong> sem dedução de taxa.
        </p>
      )}
    </div>
  );
}

export function requiresFeeBearerChoice(fee: number, amount: number): boolean {
  return amount > 0 && fee > 0;
}
