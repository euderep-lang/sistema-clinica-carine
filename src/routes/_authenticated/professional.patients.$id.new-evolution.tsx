import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/professional/patients/$id/new-evolution")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/professional/patients/$id/record",
      params: { id: params.id },
    });
  },
  component: () => null,
});
