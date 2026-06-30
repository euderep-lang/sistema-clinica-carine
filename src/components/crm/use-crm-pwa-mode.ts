import { useEffect, useState } from "react";
import {
  isCrmStandalone,
  shouldUseCrmPwaExperience,
  markCrmPwaSession,
  isMobileViewport,
} from "@/lib/crm-pwa";

function isCrmMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  if (isCrmStandalone()) return true;
  return window.location.pathname.startsWith("/crm") && isMobileViewport();
}

/** Mobile ou PWA instalado — usa shell estilo WhatsApp Business. */
export function useCrmPwaMode(): boolean {
  const [pwa, setPwa] = useState(isCrmMobileShell);

  useEffect(() => {
    const sync = () => {
      if (window.location.pathname.startsWith("/crm") && isMobileViewport()) {
        markCrmPwaSession();
      }
      setPwa(shouldUseCrmPwaExperience() || isCrmMobileShell());
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return pwa;
}
