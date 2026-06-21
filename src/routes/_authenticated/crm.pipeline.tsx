import { createFileRoute } from "@tanstack/react-router";
import { CrmPipelinePage } from "@/components/crm/crm-pipeline-page";

export const Route = createFileRoute("/_authenticated/crm/pipeline")({
  component: CrmPipelinePage,
});
