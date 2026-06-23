import { useEffect, useState } from "react";
import { shouldUseCrmPwaExperience, markCrmPwaSession, isMobileViewport } from "@/lib/crm-pwa";

/** Mobile ou PWA instalado — usa shell estilo WhatsApp Business. */
export function useCrmPwaMode(): boolean {
  const [pwa, setPwa] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (window.location.pathname.startsWith("/crm") && isMobileViewport()) {
        markCrmPwaSession();
      }
      setPwa(shouldUseCrmPwaExperience());
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return pwa;
}
