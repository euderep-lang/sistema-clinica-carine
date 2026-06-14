export const MEDICATIONS = [
  "Amoxicilina","Azitromicina","Cefalexina","Ciprofloxacino","Metronidazol",
  "Dipirona","Paracetamol","Ibuprofeno","Nimesulida","Dexametasona",
  "Prednisona","Omeprazol","Pantoprazol","Ranitidina","Metoclopramida",
  "Ondansetrona","Loratadina","Cetirizina","Desloratadina","Fluconazol",
  "Nistatina","Aciclovir","Ivermectina","Albendazol","Metformina",
  "Glibenclamida","Insulina NPH","Enalapril","Losartana","Anlodipino",
  "Atenolol","Propranolol","Hidroclorotiazida","Furosemida","Espironolactona",
  "Sinvastatina","Atorvastatina","AAS","Clopidogrel","Warfarina",
  "Heparina","Clonazepam","Alprazolam","Diazepam","Bromazepam",
  "Zolpidem","Fluoxetina","Sertralina","Escitalopram","Venlafaxina",
  "Bupropiona","Amitriptilina","Nortriptilina","Haloperidol","Risperidona",
  "Quetiapina","Olanzapina","Carbamazepina","Fenitoína","Valproato",
  "Topiramato","Gabapentina","Pregabalina","Tramadol","Codeína",
  "Morfina","Oxicodona","Metadona","Dorflex","Miosan",
  "Ciclobenzaprina","Carisoprodol","Meloxicam","Piroxicam","Celecoxibe",
  "Colchicina","Alopurinol","Levotiroxina","Carbonato de Cálcio","Vitamina D",
  "Sulfato Ferroso","Ácido Fólico","Vitamina B12","Complexo B",
];

export const FORMS = ["Comprimido","Cápsula","Solução oral","Pomada","Creme","Gel","Injetável","Gotas","Spray","Supositório","Xarope","Outro"];
export const ROUTES = ["Oral","Tópica","Inalatória","Subcutânea","Intramuscular","Endovenosa","Ocular","Nasal","Retal"];
export const FREQUENCIES = ["1x ao dia","2x ao dia","3x ao dia","4x ao dia","A cada 6 horas","A cada 8 horas","A cada 12 horas","Se necessário","Uso contínuo","Outro"];
export const DOSE_UNITS = ["comprimido(s)","mL","gota(s)","aplicação(ões)","cápsula(s)"];

export type QuantityMode = "unidade" | "caixa";

export const QUANTITY_MODES: { value: QuantityMode; label: string }[] = [
  { value: "unidade", label: "Por unidade" },
  { value: "caixa", label: "Por caixa" },
];

const FORM_UNIT: Record<string, string> = {
  Comprimido: "comprimido",
  Cápsula: "cápsula",
  "Solução oral": "frasco",
  Pomada: "bisnaga",
  Creme: "bisnaga",
  Gel: "bisnaga",
  Injetável: "ampola",
  Gotas: "frasco",
  Spray: "frasco",
  Supositório: "supositório",
  Xarope: "frasco",
};

function pluralizePt(word: string, count: number) {
  if (count === 1) return word;
  if (word.endsWith("ão")) return `${word.slice(0, -2)}ões`;
  if (word.endsWith("m")) return `${word}ns`;
  return `${word}s`;
}

/** Monta texto de quantidade para receita (ex.: "1 caixa", "30 comprimidos"). */
export function formatPrescriptionQuantity(
  mode: QuantityMode,
  value: string,
  pharmaceuticalForm?: string | null,
): string {
  const raw = value.trim();
  if (!raw) return "";

  const num = Number(raw.replace(",", "."));
  if (!Number.isFinite(num) || num <= 0) return raw;

  const n = Number.isInteger(num) ? num : num;
  const nLabel = Number.isInteger(num) ? String(num) : String(num);

  if (mode === "caixa") {
    return n === 1 ? "1 caixa" : `${nLabel} caixas`;
  }

  const form = pharmaceuticalForm?.trim();
  const unit = form ? (FORM_UNIT[form] ?? form.toLowerCase()) : "unidade";
  return `${nLabel} ${pluralizePt(unit, n)}`;
}

/** Detecta modo ao carregar receita duplicada/rascunho. */
export function parsePrescriptionQuantity(stored: string | null | undefined): {
  mode: QuantityMode;
  value: string;
} {
  const q = (stored ?? "").trim();
  if (!q) return { mode: "unidade", value: "" };
  const caixaMatch = q.match(/^(\d+(?:[.,]\d+)?)\s+caixas?$/i);
  if (caixaMatch) return { mode: "caixa", value: caixaMatch[1].replace(",", ".") };
  const numMatch = q.match(/^(\d+(?:[.,]\d+)?)/);
  return { mode: "unidade", value: numMatch ? numMatch[1].replace(",", ".") : q };
}

export type RxType = "simples" | "controlada" | "especial" | "especial_2vias";

export const RX_TYPES: { value: RxType; label: string; sub?: string }[] = [
  { value: "simples", label: "Receita Simples" },
  { value: "controlada", label: "Receita de Controle Especial", sub: "Receita Amarela — 2 vias" },
  { value: "especial", label: "Receita Especial", sub: "Receita Azul" },
  { value: "especial_2vias", label: "Receita Especial 2 Vias", sub: "Receita Azul — 2 vias" },
];

export const TYPE_LABEL: Record<RxType, string> = {
  simples: "Receita Médica Simples",
  controlada: "Receituário Controle Especial",
  especial: "Receita Especial",
  especial_2vias: "Receituário Controle Especial",
};