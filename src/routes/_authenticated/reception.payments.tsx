import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./financial.receivables";

export const Route = createFileRoute("/_authenticated/reception/payments")({
  component: Page,
});
