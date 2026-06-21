import { createFileRoute } from "@tanstack/react-router";
import { CrmInboxPage } from "@/components/crm/crm-inbox-page";

export const Route = createFileRoute("/_authenticated/crm/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    conversation: typeof search.conversation === "string" ? search.conversation : undefined,
    patient: typeof search.patient === "string" ? search.patient : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
    draft: typeof search.draft === "string" ? search.draft : undefined,
  }),
  component: CrmInboxPage,
});
