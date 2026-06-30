import { useEffect } from "react";
import { isMobileViewport } from "@/lib/crm-pwa";

const BODY_CLASS = "crm-mobile-app";

/** Trava o frame do CRM no mobile (estilo app WhatsApp) e sincroniza com visualViewport/teclado. */
export function useCrmViewportLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    body.classList.add(BODY_CLASS);

    const applyViewport = () => {
      const vv = window.visualViewport;
      if (vv) {
        root.style.setProperty("--crm-vv-height", `${vv.height}px`);
        root.style.setProperty("--crm-vv-width", `${vv.width}px`);
        root.style.setProperty("--crm-vv-offset-top", `${vv.offsetTop}px`);
        root.style.setProperty("--crm-vv-offset-left", `${vv.offsetLeft}px`);
        const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--crm-keyboard-inset", `${keyboard}px`);
      } else if (isMobileViewport()) {
        root.style.setProperty("--crm-vv-height", "100svh");
        root.style.setProperty("--crm-vv-width", "100%");
        root.style.setProperty("--crm-vv-offset-top", "0px");
        root.style.setProperty("--crm-vv-offset-left", "0px");
        root.style.setProperty("--crm-keyboard-inset", "0px");
      }
    };

    applyViewport();
    window.visualViewport?.addEventListener("resize", applyViewport);
    window.visualViewport?.addEventListener("scroll", applyViewport);
    window.addEventListener("orientationchange", applyViewport);

    return () => {
      body.classList.remove(BODY_CLASS);
      window.visualViewport?.removeEventListener("resize", applyViewport);
      window.visualViewport?.removeEventListener("scroll", applyViewport);
      window.removeEventListener("orientationchange", applyViewport);
      root.style.removeProperty("--crm-vv-height");
      root.style.removeProperty("--crm-vv-width");
      root.style.removeProperty("--crm-vv-offset-top");
      root.style.removeProperty("--crm-vv-offset-left");
      root.style.removeProperty("--crm-keyboard-inset");
    };
  }, [active]);
}
