/**
 * Normaliza um texto para busca: remove acentos/diacríticos, passa para
 * minúsculas e apara espaços. Assim "Flávia" e "flavia" viram "flavia".
 *
 * Deve corresponder à normalização usada na coluna `search_name` do banco
 * (ver migration 070_search_normalized.sql).
 */
export function normalizeSearch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** True quando `needle` aparece em `haystack`, ignorando acentos e caixa. */
export function matchesSearch(haystack: string | null | undefined, needle: string): boolean {
  const n = normalizeSearch(needle);
  if (!n) return true;
  return normalizeSearch(haystack).includes(n);
}
