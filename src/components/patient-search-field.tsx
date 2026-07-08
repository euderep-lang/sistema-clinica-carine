import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { normalizeSearch } from "@/lib/search";

export type PatientOption = { id: string; full_name: string; phone: string | null };

interface PatientSearchFieldProps {
  value: string;
  patientId: string;
  onChange: (patientId: string, displayName: string) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** Permite cadastrar um novo paciente quando não existe. */
  allowQuickCreate?: boolean;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function PatientSearchField({
  value,
  patientId,
  onChange,
  label = "Paciente",
  placeholder = "Digite o nome ou telefone do paciente",
  className,
  allowQuickCreate = true,
}: PatientSearchFieldProps) {
  const { tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<{ full_name?: string; phone?: string }>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const norm = normalizeSearch(term);
      let request = supabase
        .from("patients")
        .select("id, full_name, phone")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .order("full_name")
        .limit(20);

      if (digits.length >= 3) {
        request = request.or(`search_name.ilike.%${norm}%,phone.ilike.%${digits}%`);
      } else {
        request = request.ilike("search_name", `%${norm}%`);
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

  const handleQueryChange = (text: string) => {
    setQuery(text);
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
    setOpen(false);
  };

  const openCreate = () => {
    const term = query.trim();
    const digits = onlyDigits(term);
    // Se digitou um número, usa como telefone; senão, como nome.
    if (digits.length >= 8 && digits.length === term.replace(/[\s()+-]/g, "").length) {
      setCreateInitial({ phone: term });
    } else {
      setCreateInitial({ full_name: term });
    }
    setOpen(false);
    setCreateOpen(true);
  };

  const handleCreated = async (id: string) => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      selectPatient(data as PatientOption);
    } else {
      onChange(id, createInitial.full_name ?? "");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && !options.length && query.trim().length >= 2) void runSearch(query);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between gap-2 font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar nome ou telefone…"
              value={query}
              onValueChange={handleQueryChange}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando…
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {query.trim().length < 2
                      ? "Digite ao menos 2 caracteres"
                      : "Nenhum paciente encontrado"}
                  </CommandEmpty>
                  {options.length > 0 && (
                    <CommandGroup>
                      {options.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={patient.id}
                          onSelect={() => selectPatient(patient)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4 shrink-0",
                              patientId === patient.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{patient.full_name}</div>
                            {patient.phone && (
                              <div className="truncate text-xs text-muted-foreground">
                                {patient.phone}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
              {allowQuickCreate && (
                <CommandGroup className="border-t">
                  <CommandItem
                    value="__create_new__"
                    onSelect={openCreate}
                    className="text-emerald-700 dark:text-emerald-400"
                  >
                    <UserPlus className="mr-2 size-4 shrink-0" />
                    Cadastrar novo paciente
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allowQuickCreate && (
        <PatientFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          initial={createInitial}
          onSaved={(id) => void handleCreated(id)}
        />
      )}
    </div>
  );
}
