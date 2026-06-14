import { createFileRoute } from "@tanstack/react-router";
import { Route as RecvRoute } from "./financial.receivables";
export const Route = createFileRoute("/_authenticated/reception/payments")({
  component: RecvRoute.options.component!,
});