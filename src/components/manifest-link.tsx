import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { registerWaServiceWorker } from "@/lib/wa-pwa";

/**
 * Mantém um único <link rel="manifest"> no documento, escolhido pela rota atual:
 * - /crm/*  → PWA do CRM WhatsApp (scope /crm/)
 * - demais  → PWA Central (scope /, abre /inicio)
 *
 * Evita ter dois manifests ao mesmo tempo (o navegador só usa o primeiro).
 */
export function ManifestLink() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCrm = pathname.startsWith("/crm");

  useEffect(() => {
    const href = isCrm ? "/manifest.webmanifest" : "/central.webmanifest";

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  }, [isCrm]);

  // Registra o service worker do CRM já na primeira rota /crm (inclusive o
  // login, antes de autenticar). Sem um SW controlando a página, o Android
  // não considera o app instalável e não oferece "Instalar app".
  useEffect(() => {
    if (isCrm) void registerWaServiceWorker();
  }, [isCrm]);

  return null;
}
