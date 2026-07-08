import { createFileRoute } from "@tanstack/react-router";
import { CrmPipelinePage } from "@/components/crm/crm-pipeline-page";

export const Route = createFileRoute("/_authenticated/crm/pipeline")({
  head: () => ({
    meta: [
      { name: "theme-color", content: "#075E54" },
      { name: "apple-mobile-web-app-title", content: "WhatsApp CRM" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  component: CrmPipelinePage,
});
