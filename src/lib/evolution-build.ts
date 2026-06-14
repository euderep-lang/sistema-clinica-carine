import type { CID10 } from "@/lib/cid10";

export interface EvolutionFormValues {
  systolic: string;
  diastolic: string;
  hr: string;
  temp: string;
  weight: string;
  height: string;
  spo2: string;
  glucose: string;
  consultReason: string;
  familyHistory: string;
  personalHistory: string;
  continuousMedication: string;
  supplementation: string;
  sleepQuality: string;
  bowelFunction: string;
  libido: string;
  foodAllergies: string;
  diet: string;
  physicalActivity: string;
  cid: CID10 | null;
  diagnosis: string;
  conduct: string;
  notes: string;
}

export const CLINICAL_FIELD_LABELS: Record<
  keyof Pick<
    EvolutionFormValues,
    | "consultReason"
    | "familyHistory"
    | "personalHistory"
    | "continuousMedication"
    | "supplementation"
    | "sleepQuality"
    | "bowelFunction"
    | "libido"
    | "foodAllergies"
    | "diet"
    | "physicalActivity"
  >,
  string
> = {
  consultReason: "Qual o motivo da consulta?",
  familyHistory: "HF — Histórico Familiar de Doenças",
  personalHistory: "HPP — Histórico de Patologia Pessoal",
  continuousMedication: "Faz uso de medicação contínua?",
  supplementation: "Faz uso de alguma suplementação?",
  sleepQuality: "Como está a qualidade do seu sono?",
  bowelFunction: "Seu intestino funciona bem?",
  libido: "Como está seu libido hoje?",
  foodAllergies: "Possui alguma intolerância/alergia alimentar?",
  diet: "Como está sua alimentação hoje?",
  physicalActivity: "Pratica alguma atividade física?",
};

export const emptyEvolutionForm = (): EvolutionFormValues => ({
  systolic: "",
  diastolic: "",
  hr: "",
  temp: "",
  weight: "",
  height: "",
  spo2: "",
  glucose: "",
  consultReason: "",
  familyHistory: "",
  personalHistory: "",
  continuousMedication: "",
  supplementation: "",
  sleepQuality: "",
  bowelFunction: "",
  libido: "",
  foodAllergies: "",
  diet: "",
  physicalActivity: "",
  cid: null,
  diagnosis: "",
  conduct: "",
  notes: "",
});

export function buildClinicalHistory(v: EvolutionFormValues): string {
  const lines = [
    v.familyHistory && `${CLINICAL_FIELD_LABELS.familyHistory}\n${v.familyHistory}`,
    v.personalHistory && `${CLINICAL_FIELD_LABELS.personalHistory}\n${v.personalHistory}`,
    v.continuousMedication &&
      `${CLINICAL_FIELD_LABELS.continuousMedication}\n${v.continuousMedication}`,
    v.supplementation && `${CLINICAL_FIELD_LABELS.supplementation}\n${v.supplementation}`,
    v.sleepQuality && `${CLINICAL_FIELD_LABELS.sleepQuality}\n${v.sleepQuality}`,
    v.bowelFunction && `${CLINICAL_FIELD_LABELS.bowelFunction}\n${v.bowelFunction}`,
    v.libido && `${CLINICAL_FIELD_LABELS.libido}\n${v.libido}`,
    v.foodAllergies && `${CLINICAL_FIELD_LABELS.foodAllergies}\n${v.foodAllergies}`,
    v.diet && `${CLINICAL_FIELD_LABELS.diet}\n${v.diet}`,
    v.physicalActivity && `${CLINICAL_FIELD_LABELS.physicalActivity}\n${v.physicalActivity}`,
  ].filter(Boolean);
  return lines.join("\n\n");
}

export function buildEvolutionText(v: EvolutionFormValues): string {
  const clinicalHistory = buildClinicalHistory(v);
  const lines = [
    v.consultReason && `${CLINICAL_FIELD_LABELS.consultReason}\n${v.consultReason}`,
    clinicalHistory || null,
    v.diagnosis && `Diagnóstico: ${v.diagnosis}`,
    v.cid && `CID-10: ${v.cid.code} - ${v.cid.description}`,
    v.conduct && `Conduta: ${v.conduct}`,
    v.notes && `Observações: ${v.notes}`,
  ].filter(Boolean);
  return lines.join("\n\n");
}

export function evolutionFormHasContent(v: EvolutionFormValues): boolean {
  return Boolean(
    v.systolic ||
      v.diastolic ||
      v.hr ||
      v.temp ||
      v.weight ||
      v.height ||
      v.spo2 ||
      v.glucose ||
      v.consultReason ||
      v.familyHistory ||
      v.personalHistory ||
      v.continuousMedication ||
      v.supplementation ||
      v.sleepQuality ||
      v.bowelFunction ||
      v.libido ||
      v.foodAllergies ||
      v.diet ||
      v.physicalActivity ||
      v.cid ||
      v.diagnosis ||
      v.conduct ||
      v.notes,
  );
}
