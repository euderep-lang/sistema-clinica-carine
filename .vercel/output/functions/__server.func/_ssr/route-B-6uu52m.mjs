import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { e as useRouterState, N as Navigate } from "../_libs/tanstack__react-router.mjs";
import { u as useAuth, a as useWaMessageNotifications, d as dashboardPathFor, K as KeepAliveOutlet, i as isCrmStaff, c as conversationDisplayName, p as playWaNotificationSound, v as vibrateWaNotification } from "./router-DcWaovdP.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { s as supabase } from "./index.mjs";
import "../_libs/jspdf.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-dialog.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "tslib";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/radix-ui__react-tooltip.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/radix-ui__react-avatar.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__react-dropdown-menu.mjs";
import "../_libs/radix-ui__react-menu.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "./patient-utils-YNqCHR6o.mjs";
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
import "../_libs/lucide-react.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "../_libs/supabase__functions-js.mjs";
import "fs";
import "path";
import "../_libs/fflate.mjs";
import "../_libs/fast-png.mjs";
import "../_libs/iobuffer.mjs";
import "../_libs/pako.mjs";
import "../_libs/html2canvas.mjs";
import "../_libs/dompurify.mjs";
import "../_libs/canvg.mjs";
import "../_libs/core-js.mjs";
import "../_libs/babel__runtime.mjs";
import "../_libs/raf.mjs";
import "../_libs/performance-now.mjs";
import "../_libs/rgbcolor.mjs";
import "../_libs/svg-pathdata.mjs";
import "../_libs/stackblur-canvas.mjs";
function useWaReminderNotifications() {
  const { profile, tenant } = useAuth();
  reactExports.useEffect(() => {
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen grid place-items-center text-muted-foreground text-sm", children: "Carregando…" });
  }
  if (!profile) return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/login" });
  if (!canAccessPath(profile.role, pathname)) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: dashboardPathFor(profile.role) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(KeepAliveOutlet, {});
}
export {
  AuthGate as component
};
