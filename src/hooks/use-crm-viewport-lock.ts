import { useEffect } from "react";

const BODY_CLASS = "crm-mobile-app";
const NO_ZOOM_VIEWPORT =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

/**
 * Prepara o CRM no mobile sem “prender” o body com position:fixed
 * (isso, junto com keep-alive/overlays, deixava a tela sem toque/scroll).
 * O frame visual fica no .crm-mobile-shell (inset-0 / 100dvh).
 */
export function useCrmViewportLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    body.classList.add(BODY_CLASS);

    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = viewportMeta?.getAttribute("content") ?? null;
    viewportMeta?.setAttribute("content", NO_ZOOM_VIEWPORT);

    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    const applyViewport = () => {
      const vv = window.visualViewport;
      const height = Math.max(
        vv?.height || 0,
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        320,
      );
      const width = Math.max(
        vv?.width || 0,
        window.innerWidth || 0,
        document.documentElement.clientWidth || 0,
        1,
      );
      root.style.setProperty("--crm-vv-height", `${height}px`);
      root.style.setProperty("--crm-vv-width", `${width}px`);
      // Sem deslocar o frame (offsetTop/Left quebrava toque no iOS).
      root.style.setProperty("--crm-vv-offset-top", "0px");
      root.style.setProperty("--crm-vv-offset-left", "0px");
      if (vv) {
        const keyboard = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
        root.style.setProperty("--crm-keyboard-inset", `${keyboard > 40 ? keyboard : 0}px`);
      } else {
        root.style.setProperty("--crm-keyboard-inset", "0px");
      }
    };

    let raf = 0;
    const onViewportChange = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        applyViewport();
      });
    };

    applyViewport();
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    return () => {
      body.classList.remove(BODY_CLASS);
      if (raf) window.cancelAnimationFrame(raf);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      if (previousViewport !== null) viewportMeta?.setAttribute("content", previousViewport);
      root.style.removeProperty("--crm-vv-height");
      root.style.removeProperty("--crm-vv-width");
      root.style.removeProperty("--crm-vv-offset-top");
      root.style.removeProperty("--crm-vv-offset-left");
      root.style.removeProperty("--crm-keyboard-inset");
    };
  }, [active]);
}
