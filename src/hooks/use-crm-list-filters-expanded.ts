import { useCallback, useState } from "react";

const STORAGE_KEY = "crm-inbox-list-filters-open";

function readStoredFiltersOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Lembra no mobile se a seção de filtros da lista CRM está aberta ou recolhida. */
export function useCrmListFiltersExpanded() {
  const [open, setOpenState] = useState(readStoredFiltersOpen);

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* quota / private mode */
      }
      return next;
    });
  }, []);

  return [open, setOpen] as const;
}
