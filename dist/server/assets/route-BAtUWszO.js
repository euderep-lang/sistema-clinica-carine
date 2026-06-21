import { jsx } from "react/jsx-runtime";
import { useRouterState, Navigate } from "@tanstack/react-router";
import { u as useAuth, i as isCrmStaff, c as conversationDisplayName, p as playWaNotificationSound, v as vibrateWaNotification, a as useWaMessageNotifications, d as dashboardPathFor, K as KeepAliveOutlet } from "./router-C3L3OxIm.js";
import { useEffect } from "react";
import { toast } from "sonner";
import { s as supabase } from "../server.js";
import "@tanstack/react-query";
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
import "node:crypto";
import "@supabase/supabase-js";
function useWaReminderNotifications() {
  const { profile, tenant } = useAuth();
  useEffect(() => {
    if (!profile || !tenant || !isCrmStaff(profile.role)) return;
    const check = async () => {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data } = await supabase.from("wa_reminders").select("id, note, remind_at, conversation_id, wa_conversations(contact_name, contact_phone, patients(full_name))").eq("assigned_to", profile.id).eq("completed", false).lte("remind_at", now).order("remind_at", { ascending: true }).limit(5);
      for (const row of data ?? []) {
        const conv = row.wa_conversations;
        const name = conv ? conversationDisplayName(conv) : "Conversa";
        playWaNotificationSound();
        vibrateWaNotification();
        toast.message(`Lembrete CRM · ${name}`, {
          description: row.note ?? "Hora de retornar ao paciente",
          duration: 12e3
        });
        await supabase.from("wa_reminders").update({ completed: true }).eq("id", row.id);
      }
    };
    void check();
    const id = window.setInterval(() => void check(), 6e4);
    return () => window.clearInterval(id);
  }, [profile?.id, profile?.role, tenant?.id]);
}
const PREFIX_TO_ROLE = {
  admin: "admin",
  reception: "receptionist",
  professional: "professional",
  financial: "financial"
};
const CROSS_ROLE_PATH_PREFIXES = {
  professional: ["/financial/inventory", "/financial/inventory/items", "/financial/inventory/categories"],
  receptionist: ["/financial/inventory", "/financial/inventory/items", "/financial/inventory/categories"]
};
function canAccessPath(role, pathname) {
  if (role === "admin") return true;
  if (pathname === "/crm/inbox" || pathname.startsWith("/crm/")) {
    return role === "admin" || role === "professional" || role === "receptionist";
  }
  const crossRole = CROSS_ROLE_PATH_PREFIXES[role];
  if (crossRole?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  const segment = pathname.split("/")[1] ?? "";
  const expectedRole = PREFIX_TO_ROLE[segment];
  return !expectedRole || expectedRole === role;
}
function AuthGate() {
  const {
    profile,
    loading
  } = useAuth();
  const pathname = useRouterState({
    select: (s) => s.location.pathname
  });
  useWaMessageNotifications();
  useWaReminderNotifications();
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center text-muted-foreground text-sm", children: "Carregando…" });
  }
  if (!profile) return /* @__PURE__ */ jsx(Navigate, { to: "/login" });
  if (!canAccessPath(profile.role, pathname)) {
    return /* @__PURE__ */ jsx(Navigate, { to: dashboardPathFor(profile.role) });
  }
  return /* @__PURE__ */ jsx(KeepAliveOutlet, {});
}
export {
  AuthGate as component
};
