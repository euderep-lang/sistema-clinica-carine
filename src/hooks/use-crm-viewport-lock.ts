import { useEffect } from "react";
import { isMobileViewport } from "@/lib/crm-pwa";

const BODY_CLASS = "crm-mobile-app";
const NO_ZOOM_VIEWPORT =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

/** Trava o frame do CRM no mobile (estilo app WhatsApp) e sincroniza com visualViewport/teclado. */
export function useCrmViewportLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    // Se a página estava rolada (ex.: veio do dashboard), fixed sem top:0
    // “prende” o body fora da tela — a UI parece toda travada no celular.
    const scrollY = window.scrollY || window.pageYOffset || 0;
    window.scrollTo(0, 0);
    body.classList.add(BODY_CLASS);
    body.style.top = "0px";
    body.style.left = "0px";
    body.dataset.crmScrollY = String(scrollY);

    // Bloqueia zoom (pinça e duplo-toque) enquanto o CRM está ativo — comportamento
    // de app nativo. No Android a meta viewport resolve; no iOS (que ignora
    // user-scalable) prevenimos os gestos de pinça manualmente.
    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = viewportMeta?.getAttribute("content") ?? null;
    viewportMeta?.setAttribute("content", NO_ZOOM_VIEWPORT);

    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);

    const applyViewport = () => {
      const vv = window.visualViewport;
      if (vv) {
        // Nunca deixe altura 0 (iOS às vezes reporta 0 no meio de resize).
        const height = Math.max(vv.height || 0, Math.min(window.innerHeight || 0, 320) || 320);
        const width = Math.max(vv.width || 0, window.innerWidth || 0, 1);
        root.style.setProperty("--crm-vv-height", `${height}px`);
        root.style.setProperty("--crm-vv-width", `${width}px`);
        const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--crm-keyboard-inset", `${keyboard}px`);
        // Só desloca o frame com o teclado aberto — offsetTop em repouso cortava o topo no iOS.
        const offsetTop = keyboard > 40 ? vv.offsetTop : 0;
        root.style.setProperty("--crm-vv-offset-top", `${offsetTop}px`);
        root.style.setProperty("--crm-vv-offset-left", `${vv.offsetLeft}px`);
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
      body.style.top = "";
      body.style.left = "";
      const restoreY = Number(body.dataset.crmScrollY || "0");
      delete body.dataset.crmScrollY;
      window.visualViewport?.removeEventListener("resize", applyViewport);
      window.visualViewport?.removeEventListener("scroll", applyViewport);
      window.removeEventListener("orientationchange", applyViewport);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      if (previousViewport !== null) viewportMeta?.setAttribute("content", previousViewport);
      root.style.removeProperty("--crm-vv-height");
      root.style.removeProperty("--crm-vv-width");
      root.style.removeProperty("--crm-vv-offset-top");
      root.style.removeProperty("--crm-vv-offset-left");
      root.style.removeProperty("--crm-keyboard-inset");
      if (restoreY > 0) window.scrollTo(0, restoreY);
    };
  }, [active]);
}
