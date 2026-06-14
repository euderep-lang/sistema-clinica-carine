import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, d as dashboardPathFor, L as Label, I as Input, B as Button } from "./router-uS_mSfDy.js";
import "@tanstack/react-query";
import "./client-CUE-_UGz.js";
import "@supabase/supabase-js";
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
const HIGHLIGHTS = ["Agenda, prontuário e financeiro em um só lugar", "Acesso por perfil: recepção, profissional e administrativo", "Interface pensada para rotina clínica diária"];
function LoginPage() {
  const {
    profile,
    signIn,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (!loading && profile) {
    return /* @__PURE__ */ jsx(Navigate, { to: dashboardPathFor(profile.role) });
  }
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const p = await signIn(email, password);
      toast.success(`Bem-vindo(a), ${p.full_name}`);
      navigate({
        to: dashboardPathFor(p.role)
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "grid min-h-dvh lg:grid-cols-[1.05fr_1fr]", children: [
    /* @__PURE__ */ jsxs("aside", { className: "relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15", children: /* @__PURE__ */ jsx(Activity, { className: "size-6", strokeWidth: 2.25 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-display text-xl font-semibold", children: "ClinicOS" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-primary-foreground/80", children: "Gestão clínica profissional" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "max-w-md space-y-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "font-display text-4xl font-semibold leading-tight", children: "Operação clínica organizada, do check-in ao fechamento." }),
        /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: HIGHLIGHTS.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3 text-sm text-primary-foreground/90", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "mt-0.5 size-4 shrink-0", "aria-hidden": true }),
          item
        ] }, item)) })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-primary-foreground/60", children: "Acesso restrito a colaboradores autorizados da clínica." })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "flex items-center justify-center px-6 py-10 sm:px-10", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-[22rem] space-y-8", children: [
      /* @__PURE__ */ jsx("div", { className: "space-y-2 lg:hidden", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground", children: /* @__PURE__ */ jsx(Activity, { className: "size-5", strokeWidth: 2.25 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "font-display text-xl font-semibold text-foreground", children: "ClinicOS" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Gestão clínica profissional" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-2xl font-semibold text-foreground", children: "Entrar" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Use suas credenciais para acessar o painel da clínica." })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit, className: "space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "E-mail" }),
          /* @__PURE__ */ jsx(Input, { id: "email", type: "email", autoComplete: "email", placeholder: "voce@clinica.com", value: email, onChange: (e) => setEmail(e.target.value), className: "h-11", required: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Senha" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "cursor-pointer text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80", onClick: () => toast.info("Em breve: redefinição de senha por e-mail."), children: "Esqueci minha senha" })
          ] }),
          /* @__PURE__ */ jsx(Input, { id: "password", type: "password", autoComplete: "current-password", placeholder: "••••••••", value: password, onChange: (e) => setPassword(e.target.value), className: "h-11", required: true })
        ] }),
        /* @__PURE__ */ jsx(Button, { type: "submit", className: "h-11 w-full", disabled: submitting, children: submitting ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : "Acessar painel" })
      ] })
    ] }) })
  ] });
}
export {
  LoginPage as component
};
