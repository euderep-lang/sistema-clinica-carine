import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";

export type PatientOption = { id: string; full_name: string; phone: string | null };

interface PatientSearchFieldProps {
  value: string;
  patientId: string;
  onChange: (patientId: string, displayName: string) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function PatientSearchField({
  value,
  patientId,
  onChange,
  onClear,
  label = "Paciente",
  placeholder = "Digite o nome ou telefone do paciente",
  className,
}: PatientSearchFieldProps) {
  const { tenant } = useAuth();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PatientOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const runSearch = useCallback(
    async (q: string) => {
      const term = q.trim();
      if (!tenant || term.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const digits = term.replace(/\D/g, "");
      let request = supabase
        .from("patients")
        .select("id, full_name, phone")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("full_name")
        .limit(20);

      if (digits.length >= 3) {
        request = request.or(`full_name.ilike.%${term}%,phone.ilike.%${digits}%`);
      } else {
        request = request.ilike("full_name", `%${term}%`);
      }

      const { data, error } = await request;
      setLoading(false);
      if (error) {
        setOptions([]);
        return;
      }
      setOptions((data ?? []) as PatientOption[]);
    },
    [tenant],
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (patientId) {
      onChange("", "");
      onClear?.();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(text), 250);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectPatient = (patient: PatientOption) => {
    onChange(patient.id, patient.full_name);
    setQuery(patient.full_name);
    setOpen(false);
    setOptions([]);
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className={`space-y-2 ${className ?? ""}`} ref={containerRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            if (query.trim().length >= 2) void runSearch(query);
          }}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
        />
        {showDropdown && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum paciente encontrado</div>
            ) : (
              options.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPatient(patient)}
                >
                  <span className="font-medium">{patient.full_name}</span>
                  {patient.phone && (
                    <span className="text-xs text-muted-foreground">{patient.phone}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
