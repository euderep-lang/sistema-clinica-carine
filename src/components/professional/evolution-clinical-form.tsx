import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadCID10List, searchCID10, bmiClass, type CID10 } from "@/lib/cid10";
import {
  CLINICAL_FIELD_LABELS,
  type EvolutionFormValues,
} from "@/lib/evolution-build";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EvolutionClinicalFormProps {
  values: EvolutionFormValues;
  onChange: (patch: Partial<EvolutionFormValues>) => void;
  cidQuery: string;
  onCidQueryChange: (q: string) => void;
}

const CLINICAL_FIELDS = [
  "consultReason",
  "familyHistory",
  "personalHistory",
  "continuousMedication",
  "supplementation",
  "sleepQuality",
  "bowelFunction",
  "libido",
  "foodAllergies",
  "diet",
  "physicalActivity",
] as const;

export function EvolutionClinicalForm({
  values,
  onChange,
  cidQuery,
  onCidQueryChange,
}: EvolutionClinicalFormProps) {
  const [cidList, setCidList] = useState<CID10[]>([]);
  const [cidLoading, setCidLoading] = useState(true);
  const [vitalsOpen, setVitalsOpen] = useState(false);

  useEffect(() => {
    void loadCID10List()
      .then(setCidList)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setCidLoading(false));
  }, []);

  const cidResults = useMemo(
    () => (values.cid || cidLoading ? [] : searchCID10(cidList, cidQuery)),
    [cidQuery, values.cid, cidList, cidLoading],
  );

  const bmi = useMemo(() => {
    const w = parseFloat(values.weight);
    const h = parseFloat(values.height);
    if (!w || !h) return null;
    const v = w / Math.pow(h / 100, 2);
    return { value: v.toFixed(1), label: bmiClass(v) };
  }, [values.weight, values.height]);

  const field = (key: keyof EvolutionFormValues) => (val: string) => onChange({ [key]: val });

  const hasVitals = Boolean(
    values.systolic ||
      values.diastolic ||
      values.hr ||
      values.temp ||
      values.weight ||
      values.height ||
      values.spo2 ||
      values.glucose,
  );

  return (
    <div className="space-y-4 p-4">
      <Collapsible open={vitalsOpen} onOpenChange={setVitalsOpen}>
        <section className="overflow-hidden rounded-lg border bg-card">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sinais vitais
                </h3>
                {!vitalsOpen && hasVitals && (
                  <Badge variant="secondary" className="text-[10px]">
                    Preenchido
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  vitalsOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 border-t px-3 pb-3 pt-3">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                <div className="col-span-2 xl:col-span-1">
                  <Label className="text-xs">Pressão (mmHg)</Label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="Sist."
                      value={values.systolic}
                      onChange={(e) => field("systolic")(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      placeholder="Diast."
                      value={values.diastolic}
                      onChange={(e) => field("diastolic")(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">FC (bpm)</Label>
                  <Input
                    type="number"
                    value={values.hr}
                    onChange={(e) => field("hr")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Temp. (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={values.temp}
                    onChange={(e) => field("temp")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={values.weight}
                    onChange={(e) => field("weight")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Altura (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={values.height}
                    onChange={(e) => field("height")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">IMC</Label>
                  <div className="mt-1 flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs">
                    {bmi ? (
                      <span>
                        <b>{bmi.value}</b>{" "}
                        <span className="text-muted-foreground">· {bmi.label}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">SpO₂ (%)</Label>
                  <Input
                    type="number"
                    value={values.spo2}
                    onChange={(e) => field("spo2")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Glicemia (mg/dL)</Label>
                  <Input
                    type="number"
                    value={values.glucose}
                    onChange={(e) => field("glucose")(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <section className="space-y-3 rounded-lg border bg-card p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Evolução clínica
        </h3>
        {CLINICAL_FIELDS.map((key) => (
          <div key={key}>
            <Label className="text-xs">
              {CLINICAL_FIELD_LABELS[key]}
              {key === "consultReason" && " *"}
            </Label>
            <Textarea
              value={values[key]}
              onChange={(e) => field(key)(e.target.value)}
              rows={key === "consultReason" ? 2 : 2}
              placeholder={
                key === "consultReason"
                  ? "Descreva o motivo da consulta…"
                  : "Descreva…"
              }
              className="mt-1 min-h-[3.5rem] resize-y text-sm"
            />
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Diagnóstico e conduta
        </h3>
        <div>
          <Label className="text-xs">CID-10</Label>
          {values.cid ? (
            <div className="mt-1">
              <Badge variant="secondary" className="gap-2 px-2 py-1 text-xs">
                {values.cid.code} - {values.cid.description}
                <button
                  type="button"
                  onClick={() => {
                    onChange({ cid: null });
                    onCidQueryChange("");
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </div>
          ) : (
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={cidQuery}
                onChange={(e) => onCidQueryChange(e.target.value)}
                placeholder={
                  cidLoading
                    ? "Carregando tabela CID-10…"
                    : "Buscar código ou descrição (ex.: M62, sarcopenia)…"
                }
                disabled={cidLoading}
                className="h-8 pl-8 text-sm"
              />
              {cidLoading && (
                <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
              {cidResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                  {cidResults.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        onChange({ cid: c });
                        onCidQueryChange("");
                      }}
                      className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-mono font-semibold">{c.code}</span> · {c.description}
                    </button>
                  ))}
                </div>
              )}
              {!cidLoading && cidQuery.trim().length >= 2 && cidResults.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Nenhum CID encontrado.</p>
              )}
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs">Diagnóstico descritivo</Label>
          <Textarea
            value={values.diagnosis}
            onChange={(e) => field("diagnosis")(e.target.value)}
            rows={2}
            className="mt-1 resize-y text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Conduta e plano terapêutico</Label>
          <Textarea
            value={values.conduct}
            onChange={(e) => field("conduct")(e.target.value)}
            rows={3}
            placeholder="Conduta, prescrições e orientações…"
            className="mt-1 resize-y text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Observações internas</Label>
          <Textarea
            value={values.notes}
            onChange={(e) => field("notes")(e.target.value)}
            rows={2}
            placeholder="Anotações visíveis apenas para profissionais…"
            className="mt-1 resize-y text-sm"
          />
        </div>
      </section>
    </div>
  );
}
