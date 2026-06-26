import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  /** Permite cadastrar um paciente rápido (só nome + WhatsApp) quando não existe. */
  allowQuickCreate?: boolean;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function PatientSearchField({
  value,
  patientId,
  onChange,
  onClear,
  label = "Paciente",
  placeholder = "Digite o nome ou telefone do paciente",
  className,
  allowQuickCreate = true,
}: PatientSearchFieldProps) {
  const { tenant, profile } = useAuth();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [savingNew, setSavingNew] = useState(false);
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

  const startQuickCreate = () => {
    const term = query.trim();
    const digits = onlyDigits(term);
    // Se digitou um número, usa como telefone; senão, como nome.
    if (digits.length >= 8 && digits.length === term.replace(/[\s()+-]/g, "").length) {
      setCreateName("");
      setCreatePhone(term);
    } else {
      setCreateName(term);
      setCreatePhone("");
    }
    setCreating(true);
  };

  const saveQuickCreate = async () => {
    if (!tenant || !profile) return;
    const name = createName.trim();
    const phoneDigits = onlyDigits(createPhone);
    if (!name) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (phoneDigits.length < 10) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    setSavingNew(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({
        tenant_id: tenant.id,
        full_name: name,
        phone: phoneDigits,
        active: true,
      })
      .select("id, full_name, phone")
      .single();
    setSavingNew(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Paciente cadastrado");
    const created = data as PatientOption;
    setCreating(false);
    setCreateName("");
    setCreatePhone("");
    selectPatient(created);
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
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : (
              <>
                {options.length === 0 ? (
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
                {allowQuickCreate && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={startQuickCreate}
                  >
                    <UserPlus className="size-4" />
                    Cadastrar novo paciente
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {allowQuickCreate && creating && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Cadastro rápido — só nome e WhatsApp
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome completo</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome do paciente"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp (com DDD)</Label>
              <Input
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="(33) 99999-9999"
                inputMode="tel"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
              disabled={savingNew}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={() => void saveQuickCreate()} disabled={savingNew}>
              {savingNew ? "Salvando…" : "Cadastrar e selecionar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
