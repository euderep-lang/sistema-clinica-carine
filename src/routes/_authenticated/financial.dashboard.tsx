import { createFileRoute } from "@tanstack/react-router";
import { FinancialPage } from "@/components/professional/financial-page";

export const Route = createFileRoute("/_authenticated/financial/dashboard")({
  component: AdminFinancialPage,
});

function AdminFinancialPage() {
  return <FinancialPage scope="clinic" />;
}
