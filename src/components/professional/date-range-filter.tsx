import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstDayOfMonthISO, todayISO } from "@/lib/locale";

export { firstDayOfMonthISO as firstDayOfMonth, todayISO };

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "De",
  toLabel = "Até",
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <Label className="text-xs">{fromLabel}</Label>
        <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="w-40" />
      </div>
      <div>
        <Label className="text-xs">{toLabel}</Label>
        <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="w-40" />
      </div>
    </div>
  );
}
