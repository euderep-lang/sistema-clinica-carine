export interface CID10 {
  code: string;
  description: string;
}

let cache: CID10[] | null = null;
let loadPromise: Promise<CID10[]> | null = null;

/** Carrega a tabela completa CID-10 brasileira (DATASUS, ~12 mil códigos). */
export function loadCID10List(): Promise<CID10[]> {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    loadPromise = fetch("/data/cid10.json")
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar a tabela CID-10.");
        return res.json() as Promise<CID10[]>;
      })
      .then((data) => {
        cache = data;
        return data;
      });
  }
  return loadPromise;
}

export function searchCID10(list: CID10[], query: string, limit = 20): CID10[] {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const qLower = q.toLowerCase();
  const qCode = q.toUpperCase().replace(/\./g, "");

  return list
    .filter((c) => {
      const codeNorm = c.code.toUpperCase().replace(/\./g, "");
      return codeNorm.includes(qCode) || c.description.toLowerCase().includes(qLower);
    })
    .slice(0, limit);
}

export function bmiClass(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
}
