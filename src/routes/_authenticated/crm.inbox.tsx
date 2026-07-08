import { createFileRoute } from "@tanstack/react-router";
import { CrmInboxPage } from "@/components/crm/crm-inbox-page";

export const Route = createFileRoute("/_authenticated/crm/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    conversation: typeof search.conversation === "string" ? search.conversation : undefined,
    patient: typeof search.patient === "string" ? search.patient : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
    draft: typeof search.draft === "string" ? search.draft : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
  }),
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
  component: CrmInboxPage,
});
