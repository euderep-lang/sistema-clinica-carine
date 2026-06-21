import { jsx } from "react/jsx-runtime";
import { Navigate } from "@tanstack/react-router";
import { u as useAuth, d as dashboardPathFor } from "./router-C3L3OxIm.js";
import "@tanstack/react-query";
import "react";
import "../server.js";
import "node:crypto";
import "@supabase/supabase-js";
import "sonner";
import "lucide-react";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "@radix-ui/react-dropdown-menu";
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
function Index() {
  const {
    profile,
    loading
  } = useAuth();
  if (loading) return null;
  if (!profile) return /* @__PURE__ */ jsx(Navigate, { to: "/login" });
  return /* @__PURE__ */ jsx(Navigate, { to: dashboardPathFor(profile.role) });
}
export {
  Index as component
};
