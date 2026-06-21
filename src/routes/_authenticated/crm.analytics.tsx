import { createFileRoute } from "@tanstack/react-router";
import { CrmAnalyticsPage } from "@/components/crm/crm-analytics-page";

export const Route = createFileRoute("/_authenticated/crm/analytics")({
  component: CrmAnalyticsPage,
});
