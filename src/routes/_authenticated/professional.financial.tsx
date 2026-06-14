import { createFileRoute } from "@tanstack/react-router";
import { FinancialLayout } from "@/components/professional/financial-shell";

export const Route = createFileRoute("/_authenticated/professional/financial")({
  component: FinancialLayout,
});
