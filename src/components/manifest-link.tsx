import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Mantém um único <link rel="manifest"> no documento, escolhido pela rota atual:
 * - /crm/*  → PWA do CRM WhatsApp (scope /crm/)
 * - demais  → PWA Central (scope /, abre /inicio)
 *
 * Evita ter dois manifests ao mesmo tempo (o navegador só usa o primeiro).
 */
export function ManifestLink() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const href = pathname.startsWith("/crm")
      ? "/manifest.webmanifest"
      : "/central.webmanifest";

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  }, [pathname]);

  return null;
}
