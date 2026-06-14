import { createFileRoute } from "@tanstack/react-router";
import { Navigate } from "@tanstack/react-router";
import { dashboardPathFor, useAuth } from "@/lib/mock-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClinicOS — Gestão de Clínicas" },
      { name: "description", content: "Plataforma multi-tenant para gestão de clínicas médicas." },
    ],
  }),
  component: Index,
});

function Index() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;
  return <Navigate to={dashboardPathFor(profile.role)} />;
}
