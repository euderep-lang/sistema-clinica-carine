import { jsx } from "react/jsx-runtime";
import { useRouterState, Navigate } from "@tanstack/react-router";
import { u as useAuth, K as KeepAliveOutlet, d as dashboardPathFor } from "./router-uS_mSfDy.js";
import "@tanstack/react-query";
import "react";
import "./client-CUE-_UGz.js";
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
import "./letterhead-pdf-4K2s0GWH.js";
const PREFIX_TO_ROLE = {
  admin: "admin",
  reception: "receptionist",
  professional: "professional",
  financial: "financial"
};
function AuthGate() {
  const {
    profile,
    loading
  } = useAuth();
  const pathname = useRouterState({
    select: (s) => s.location.pathname
  });
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center text-muted-foreground text-sm", children: "Carregando…" });
  }
  if (!profile) return /* @__PURE__ */ jsx(Navigate, { to: "/login" });
  if (profile.role === "admin") return /* @__PURE__ */ jsx(KeepAliveOutlet, {});
  const segment = pathname.split("/")[1] ?? "";
  const expectedRole = PREFIX_TO_ROLE[segment];
  if (expectedRole && expectedRole !== profile.role) {
    return /* @__PURE__ */ jsx(Navigate, { to: dashboardPathFor(profile.role) });
  }
  return /* @__PURE__ */ jsx(KeepAliveOutlet, {});
}
export {
  AuthGate as component
};
