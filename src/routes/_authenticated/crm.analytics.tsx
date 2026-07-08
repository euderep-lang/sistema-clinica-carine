import { createFileRoute } from "@tanstack/react-router";
import { CrmAnalyticsPage } from "@/components/crm/crm-analytics-page";

export const Route = createFileRoute("/_authenticated/crm/analytics")({
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
  component: CrmAnalyticsPage,
});
