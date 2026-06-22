import { createFileRoute } from "@tanstack/react-router";
import { FinancialPage } from "@/components/professional/financial-page";

export const Route = createFileRoute("/_authenticated/professional/financial")({
  component: ProfessionalFinancialPage,
});

function ProfessionalFinancialPage() {
  return <FinancialPage scope="professional" />;
}
