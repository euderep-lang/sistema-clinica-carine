import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmtDate, todayISO } from "@/lib/locale";

interface RetroactivePaymentDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  retroactive: boolean;
  onRetroactiveChange: (value: boolean) => void;
  /** Data sugerida ao ativar (ex.: vencimento da cobrança) */
  suggestedDate?: string;
}

export function RetroactivePaymentDateField({
  value,
  onChange,
  retroactive,
  onRetroactiveChange,
  suggestedDate,
}: RetroactivePaymentDateFieldProps) {
  const today = todayISO();

  const handleToggle = (checked: boolean) => {
    onRetroactiveChange(checked);
    if (checked) {
      const suggested =
        suggestedDate && suggestedDate <= today ? suggestedDate : today;
      onChange(suggested);
    } else {
      onChange(today);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor="retroactive-pay" className="cursor-pointer text-xs font-medium">
            Pagamento retroativo
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {retroactive
              ? "Registra o recebimento em uma data passada"
              : `Recebimento de hoje (${fmtDate(today)})`}
          </p>
        </div>
        <Switch
          id="retroactive-pay"
          checked={retroactive}
          onCheckedChange={handleToggle}
        />
      </div>
      {retroactive && (
        <div className="space-y-1.5">
          <Label className="text-xs">Data do recebimento</Label>
          <Input
            type="date"
            value={value}
            max={today}
            onChange={(e) => onChange(e.target.value)}
            className="h-10"
          />
          <p className="text-[11px] text-muted-foreground">
            O pagamento entrará no caixa e nos relatórios desta data.
          </p>
        </div>
      )}
    </div>
  );
}

export function validatePaymentDate(paidDate: string): string | null {
  const today = todayISO();
  if (!paidDate) return "Informe a data do recebimento";
  if (paidDate > today) return "A data do recebimento não pode ser futura";
  return null;
}

export function resolvePaymentDate(paidDate: string, retroactive: boolean): string {
  return retroactive ? paidDate : todayISO();
}
