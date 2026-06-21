import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { D as DashboardShell, E as cn, u as useAuth, C as Card, b as CardHeader, e as CardTitle, f as CardContent, L as Label, I as Input, _ as Switch, B as Button, q as Badge, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, T as Textarea, y as DialogFooter, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, A as Avatar, k as AvatarFallback, ae as DialogDescription, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, X as CardDescription, aG as TooltipProvider, aH as Tooltip, aI as TooltipTrigger, aJ as TooltipContent, aF as clearKeepAliveCache, W as DEFAULT_APPOINTMENT_TYPES, aK as PAYMENT_METHODS } from "./router-DcWaovdP.mjs";
import { a2 as DEFAULT_HOURS, s as supabase, g as getTenantSetting, a3 as maskCNPJ, a4 as maskPhone, a5 as maskCEP, a6 as DAY_LABELS, a9 as FONT_OPTIONS, aa as loadGoogleFont, ab as resolveSpecialties, ac as isLegacySpecialtyList, a8 as setTenantSetting, J as renderTemplate, ad as SAMPLE_VARS, $ as TEMPLATE_VARS, a7 as fetchViaCEP, a as applyThemeColors, b as applyFont } from "./index.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { A as AlertDialog, a as AlertDialogContent, b as AlertDialogHeader, c as AlertDialogTitle, d as AlertDialogDescription, e as AlertDialogFooter, f as AlertDialogCancel, g as AlertDialogAction } from "./alert-dialog-BCJH3nkG.mjs";
import { u as useServerFn, c as createSsrRpc } from "./createSsrRpc-fdWaaOKT.mjs";
import { a as createServerFn } from "./server-GGhSSPgi.mjs";
import { r as requireSupabaseAuth } from "./auth-middleware-DmvhAnC4.mjs";
import { m as maskCPF, i as isValidCPF } from "./patient-utils-YNqCHR6o.mjs";
import { S as SectionServicos } from "./section-servicos-Doimuvfn.mjs";
import { l as loadPaymentMethodConfigs, e as ensurePaymentMethodConfigs, s as savePaymentMethodConfig } from "./payment-methods-B6YcEEZ8.mjs";
import { l as loadExpenseCategories, e as ensureExpenseCategories, c as createExpenseCategory, s as saveExpenseCategory } from "./expense-categories-BsKcdGzG.mjs";
import "../_libs/jspdf.mjs";
import "../_libs/seroval.mjs";
import { Q as Building2, aA as Palette, aB as DoorOpen, u as Stethoscope, i as Users, R as Receipt, n as CreditCard, aC as FolderOpen, M as MessageSquare, aD as Plug, E as LoaderCircle, a0 as Upload, a1 as Trash2, a as Check, P as Plus, a8 as Pencil, X, aE as Copy, aj as RefreshCw, aF as Save, aG as Mail, J as Phone, aH as FilePenLine, h as Calendar, a2 as Cloud } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
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
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
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
import "../_libs/radix-ui__react-alert-dialog.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
function SectionClinica() {
  const { tenant, refresh } = useAuth();
  const [saving, setSaving] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [tradeName, setTradeName] = reactExports.useState("");
  const [cnpj, setCnpj] = reactExports.useState("");
  const [phone, setPhone] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [website, setWebsite] = reactExports.useState("");
  const [whatsapp, setWhatsapp] = reactExports.useState("");
  const [addr, setAddr] = reactExports.useState({});
  const [hours, setHours] = reactExports.useState(DEFAULT_HOURS);
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const [uploading, setUploading] = reactExports.useState(false);
  const fileRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!tenant) return;
    (async () => {
      const { data } = await supabase.from("tenants").select("name,trade_name,cnpj,phone,email,logo_url").eq("id", tenant.id).maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setTradeName(data.trade_name ?? "");
        setCnpj(data.cnpj ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setLogoUrl(data.logo_url ?? null);
      }
      const a = await getTenantSetting(tenant.id, "address");
      if (a) {
        setAddr(a);
        setWebsite(a.website ?? "");
        setWhatsapp(a.whatsapp ?? "");
      }
      const h = await getTenantSetting(tenant.id, "business_hours");
      if (h) setHours(h);
    })();
  }, [tenant]);
  const onCEPBlur = async () => {
    if (!addr.cep) return;
    const r = await fetchViaCEP(addr.cep);
    if (r) setAddr((p) => ({ ...p, ...r }));
  };
  const setDay = (d, patch) => setHours((p) => ({ ...p, [d]: { ...p[d], ...patch } }));
  const uploadLogo = async (file) => {
    if (!tenant) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${tenant.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("tenant-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? null;
      await supabase.from("tenants").update({ logo_url: url }).eq("id", tenant.id);
      setLogoUrl(url);
      toast.success("Logo atualizada");
      refresh();
    } catch (e) {
      toast.error("Erro ao enviar logo: " + e.message);
    } finally {
      setUploading(false);
    }
  };
  const removeLogo = async () => {
    if (!tenant) return;
    await supabase.from("tenants").update({ logo_url: null }).eq("id", tenant.id);
    setLogoUrl(null);
    toast.success("Logo removida");
    refresh();
  };
  const save = async () => {
    if (!tenant || !name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tenants").update({
        name,
        trade_name: tradeName.trim() || null,
        cnpj,
        phone,
        email
      }).eq("id", tenant.id);
      if (error) throw error;
      await setTenantSetting(tenant.id, "address", { ...addr, website, whatsapp });
      await setTenantSetting(tenant.id, "business_hours", hours);
      toast.success("Dados salvos");
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Dados da Clínica" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome da clínica *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome fantasia" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: tradeName, onChange: (e) => setTradeName(e.target.value), placeholder: "Nome comercial da clínica" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CNPJ" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: cnpj, onChange: (e) => setCnpj(maskCNPJ(e.target.value)), placeholder: "00.000.000/0000-00" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Telefone principal" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: phone, onChange: (e) => setPhone(maskPhone(e.target.value)), placeholder: "(00) 00000-0000" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "WhatsApp" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: whatsapp, onChange: (e) => setWhatsapp(maskPhone(e.target.value)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "E-mail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Site" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "url", value: website, onChange: (e) => setWebsite(e.target.value), placeholder: "https://..." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-4 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CEP" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.cep ?? "", onChange: (e) => setAddr((p) => ({ ...p, cep: maskCEP(e.target.value) })), onBlur: onCEPBlur, placeholder: "00000-000" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Logradouro" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.logradouro ?? "", onChange: (e) => setAddr((p) => ({ ...p, logradouro: e.target.value })) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Número" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.numero ?? "", onChange: (e) => setAddr((p) => ({ ...p, numero: e.target.value })) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Complemento" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.complemento ?? "", onChange: (e) => setAddr((p) => ({ ...p, complemento: e.target.value })) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Bairro" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.bairro ?? "", onChange: (e) => setAddr((p) => ({ ...p, bairro: e.target.value })) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Cidade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: addr.cidade ?? "", onChange: (e) => setAddr((p) => ({ ...p, cidade: e.target.value })) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid md:grid-cols-4 gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Estado (UF)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { maxLength: 2, value: addr.estado ?? "", onChange: (e) => setAddr((p) => ({ ...p, estado: e.target.value.toUpperCase() })) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Horário de funcionamento" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-2", children: Object.entries(hours).map(([d, h]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border rounded-md p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 font-medium", children: DAY_LABELS[d] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: h.active, onCheckedChange: (v) => setDay(d, { active: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground w-20", children: h.active ? "Aberto" : "Fechado" }),
        h.active && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Abertura" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "time", className: "w-32", value: h.open, onChange: (e) => setDay(d, { open: e.target.value }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Fechamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "time", className: "w-32", value: h.close, onChange: (e) => setDay(d, { close: e.target.value }) })
        ] })
      ] }, d)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Logo da clínica" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-24 w-24 rounded-lg border bg-muted grid place-items-center overflow-hidden", children: logoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, alt: "logo", className: "h-full w-full object-contain" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-bold text-muted-foreground", children: initials || "?" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: fileRef, type: "file", accept: "image/png,image/jpeg,image/svg+xml", className: "hidden", onChange: (e) => e.target.files?.[0] && uploadLogo(e.target.files[0]) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", disabled: uploading, onClick: () => fileRef.current?.click(), children: [
            uploading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4 mr-2" }),
            logoUrl ? "Trocar logo" : "Enviar logo"
          ] }),
          logoUrl && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", onClick: removeLogo, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4 mr-2" }),
            "Remover logo"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "PNG, JPG ou SVG. Máx 2MB." })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving || !name, children: "Salvar Alterações" }) })
  ] });
}
const DEFAULT_PRIMARY = "#1a2b4a";
const DEFAULT_SECONDARY = "#0ea5e9";
function SectionAparencia() {
  const { tenant, refresh } = useAuth();
  const [primary, setPrimary] = reactExports.useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = reactExports.useState(DEFAULT_SECONDARY);
  const [font, setFont] = reactExports.useState("system");
  const [saving, setSaving] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!tenant) return;
    setPrimary(tenant.primary_color || DEFAULT_PRIMARY);
    setSecondary(tenant.secondary_color || DEFAULT_SECONDARY);
    getTenantSetting(tenant.id, "font_preference").then((f) => f && setFont(f));
    FONT_OPTIONS.forEach((o) => "google" in o && o.google && loadGoogleFont(o.id));
  }, [tenant]);
  const reset = () => {
    setPrimary(DEFAULT_PRIMARY);
    setSecondary(DEFAULT_SECONDARY);
  };
  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await supabase.from("tenants").update({ primary_color: primary, secondary_color: secondary }).eq("id", tenant.id);
      await setTenantSetting(tenant.id, "font_preference", font);
      applyThemeColors(primary, secondary);
      applyFont(font);
      toast.success("Aparência salva");
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-2 gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Cores" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Cor Primária" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "color", value: primary, onChange: (e) => setPrimary(e.target.value), className: "h-10 w-16 p-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: primary, onChange: (e) => setPrimary(e.target.value), className: "flex-1" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Usada na barra lateral, botões principais e elementos de destaque." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Cor secundária / destaque" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "color", value: secondary, onChange: (e) => setSecondary(e.target.value), className: "h-10 w-16 p-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: secondary, onChange: (e) => setSecondary(e.target.value), className: "flex-1" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Usada em badges, links e destaques secundários." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: reset, children: "Restaurar Cores Padrão" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Tipografia" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: FONT_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setFont(opt.id),
            className: `relative rounded-lg border p-4 text-left transition hover:bg-muted/50 ${font === opt.id ? "border-primary ring-2 ring-primary/30" : ""}`,
            children: [
              font === opt.id && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mb-1", children: opt.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-semibold", style: { fontFamily: opt.stack }, children: "Aa Bb Cc" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs mt-1", style: { fontFamily: opt.stack }, children: "A rápida raposa marrom" })
            ]
          },
          opt.id
        )) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving, children: "Salvar Aparência" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Prévia da aparência" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border overflow-hidden", style: { background: "#f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-72", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-48 text-white p-3 space-y-1", style: { background: primary, fontFamily: FONT_OPTIONS.find((f) => f.id === font)?.stack }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold mb-3", children: tenant?.name ?? "Sua Clínica" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-1.5 rounded text-sm opacity-80", children: "Painel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-1.5 rounded text-sm opacity-80", children: "Agenda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-1.5 rounded text-sm font-medium", style: { background: secondary }, children: "Pacientes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-1.5 rounded text-sm opacity-80", children: "Financeiro" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 p-4 space-y-3", style: { fontFamily: FONT_OPTIONS.find((f) => f.id === font)?.stack }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold text-slate-800", children: "Página de exemplo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "px-3 py-2 rounded text-white text-sm font-medium", style: { background: primary }, children: "Botão Primário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { style: { background: secondary, color: "#fff" }, children: "Etiqueta" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "text-sm underline", style: { color: secondary }, children: "Link de exemplo" })
        ] })
      ] }) }) })
    ] }) })
  ] });
}
const PRESETS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#0ea5e9", "#10b981", "#f43f5e"];
function SectionConsultorios() {
  const { profile } = useAuth();
  const [rooms, setRooms] = reactExports.useState([]);
  const [open, setOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [name, setName] = reactExports.useState("");
  const [desc, setDesc] = reactExports.useState("");
  const [color, setColor] = reactExports.useState(PRESETS[5]);
  const [active, setActive] = reactExports.useState(true);
  const [delTarget, setDelTarget] = reactExports.useState(null);
  const load = async () => {
    const { data } = await supabase.from("rooms").select("id,name,description,color,active").order("name");
    setRooms(data ?? []);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const openNew = () => {
    setEditing(null);
    setName("");
    setDesc("");
    setColor(PRESETS[5]);
    setActive(true);
    setOpen(true);
  };
  const openEdit = (r) => {
    setEditing(r);
    setName(r.name);
    setDesc(r.description ?? "");
    setColor(r.color);
    setActive(r.active);
    setOpen(true);
  };
  const save = async () => {
    if (!name || !profile) return;
    const payload = { name, description: desc || null, color, active };
    const { error } = editing ? await supabase.from("rooms").update(payload).eq("id", editing.id) : await supabase.from("rooms").insert({ ...payload, tenant_id: profile.tenant_id });
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Salvo");
      setOpen(false);
      load();
    }
  };
  const confirmDelete = async () => {
    if (!delTarget) return;
    await supabase.from("rooms").update({ active: false }).eq("id", delTarget.id);
    toast.success("Consultório desativado");
    setDelTarget(null);
    load();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openNew, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
      "Novo Consultório"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid md:grid-cols-2 gap-3", children: rooms.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 rounded-full shrink-0", style: { background: r.color } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium truncate", children: r.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: r.active ? "default" : "secondary", children: r.active ? "Ativo" : "Inativo" })
        ] }),
        r.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: r.description })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) }),
      r.active && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => setDelTarget(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }) })
    ] }) }, r.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        editing ? "Editar" : "Novo",
        " Consultório"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Descrição" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: desc, onChange: (e) => setDesc(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Cor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 mt-1", children: PRESETS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setColor(c),
              className: `h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`,
              style: { background: c }
            },
            c
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "mt-2", value: color, onChange: (e) => setColor(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: active, onCheckedChange: setActive }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Ativo" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Salvar" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open: !!delTarget, onOpenChange: (v) => !v && setDelTarget(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Desativar consultório?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "Este consultório será desativado. Agendamentos existentes não serão afetados." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogAction, { onClick: confirmDelete, children: "Desativar" })
      ] })
    ] }) })
  ] });
}
function SectionEspecialidades() {
  const { tenant } = useAuth();
  const [items, setItems] = reactExports.useState([]);
  const [adding, setAdding] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (!tenant) return;
    getTenantSetting(tenant.id, "specialties").then(async (v) => {
      const resolved = resolveSpecialties(v);
      setItems(resolved);
      if (v && isLegacySpecialtyList(v)) {
        await setTenantSetting(tenant.id, "specialties", resolved);
      }
    });
  }, [tenant]);
  const persist = async (next) => {
    if (!tenant) return;
    setItems(next);
    await setTenantSetting(tenant.id, "specialties", next);
  };
  const add = async () => {
    const v = draft.trim();
    if (!v) {
      setAdding(false);
      return;
    }
    if (items.includes(v)) {
      toast.error("Já existe");
      return;
    }
    await persist([...items, v]);
    setDraft("");
    setAdding(false);
  };
  const remove = async (s) => {
    await persist(items.filter((x) => x !== s));
  };
  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
    if (e.key === "Escape") {
      setAdding(false);
      setDraft("");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
    items.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", className: "text-sm py-1 px-3 gap-1", children: [
      s,
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => remove(s), className: "ml-1 hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" }) })
    ] }, s)),
    adding ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { autoFocus: true, value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: onKey, className: "h-7 w-40", placeholder: "Nome..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", className: "h-7 w-7", onClick: add, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4" }) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => setAdding(true), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3 w-3 mr-1" }),
      "Adicionar Especialidade"
    ] })
  ] }) }) });
}
const listTenantUsers = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).handler(createSsrRpc("03ee0b320151e35f89f67c5bb54a15963eaa4e3224507a2684abe1073e33de1c"));
const createTenantUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createSsrRpc("1bb0dafb088cd91e112e6a468179eccc6177fce97337c2187786b4abdf97f102"));
const getTenantUserEmail = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createSsrRpc("ca8aed5939e392c4a5c041d45553cfdca95e689e3c20cf3fc5d22669c25bc39e"));
const updateTenantUser = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createSsrRpc("9107488cdf0bcf2165a99fce727e1d4cf355e147dd9673d7c15dece02ea558a0"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createSsrRpc("885dfaeb905362b51c8672c1a11f2c3922f6092128c10666ec8f070d6e7c75f8"));
createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((data) => data).handler(createSsrRpc("d095d7f98195e9cda09e0ebca6bcf785f4ed5e3119335f5419cbbf762ef3f935"));
const ROLE_LABEL = { admin: "Administrador", receptionist: "Recepcionista", professional: "Profissional", financial: "Financeiro" };
const ROLE_CLASS = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  receptionist: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-teal-100 text-teal-700 border-teal-200",
  financial: "bg-amber-100 text-amber-700 border-amber-200"
};
function SectionUsuarios() {
  const { profile, refresh } = useAuth();
  const create = useServerFn(createTenantUser);
  const update = useServerFn(updateTenantUser);
  const listUsers = useServerFn(listTenantUsers);
  const fetchEmail = useServerFn(getTenantUserEmail);
  const [rows, setRows] = reactExports.useState([]);
  const [specialties, setSpecialties] = reactExports.useState([]);
  const [open, setOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [tempPwd, setTempPwd] = reactExports.useState(null);
  const [pwdContext, setPwdContext] = reactExports.useState(null);
  const [resetPwd, setResetPwd] = reactExports.useState(genPassword());
  const [changePassword, setChangePassword] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState(genPassword());
  const [role, setRole] = reactExports.useState("receptionist");
  const [specialty, setSpecialty] = reactExports.useState("");
  const [crm, setCrm] = reactExports.useState("");
  const [cpf, setCpf] = reactExports.useState("");
  const [commission, setCommission] = reactExports.useState(0);
  const [phone, setPhone] = reactExports.useState("");
  const [active, setActive] = reactExports.useState(true);
  const [busy, setBusy] = reactExports.useState(false);
  function genPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#$";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  }
  const load = async () => {
    const { users } = await listUsers();
    setRows(users);
  };
  const loadSpecialties = async () => {
    if (!profile) return;
    const stored = await getTenantSetting(profile.tenant_id, "specialties");
    const resolved = resolveSpecialties(stored);
    setSpecialties(resolved);
    if (stored && isLegacySpecialtyList(stored)) {
      await setTenantSetting(profile.tenant_id, "specialties", resolved);
    }
  };
  reactExports.useEffect(() => {
    void load().catch((e) => toast.error(e.message));
    void loadSpecialties();
  }, [profile]);
  const openNew = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword(genPassword());
    setRole("receptionist");
    setSpecialty("");
    setCrm("");
    setCpf("");
    setCommission(0);
    setPhone("");
    setActive(true);
    setTempPwd(null);
    setPwdContext(null);
    setResetPwd(genPassword());
    setChangePassword(false);
    void loadSpecialties();
    setOpen(true);
  };
  const openEdit = async (r) => {
    setEditing(r);
    setName(r.full_name);
    setEmail(r.email);
    setRole(r.role);
    setSpecialty(r.specialty ?? "");
    setCrm(r.crm ?? "");
    setCpf(r.cpf ? maskCPF(r.cpf) : "");
    setCommission(Number(r.commission_pct ?? 0));
    setPhone(r.phone ?? "");
    setActive(r.active);
    setTempPwd(null);
    setPwdContext(null);
    setResetPwd(genPassword());
    setChangePassword(false);
    void loadSpecialties();
    setOpen(true);
    if (!r.email) {
      try {
        const { email: userEmail } = await fetchEmail({ data: { user_id: r.id } });
        setEmail(userEmail);
      } catch (e) {
        toast.error(e.message);
      }
    }
  };
  const save = async () => {
    if (!name) {
      toast.error("Nome obrigatório");
      return;
    }
    if (role === "professional") {
      if (!cpf.replace(/\D/g, "")) {
        toast.error("CPF é obrigatório para profissionais");
        return;
      }
      if (!isValidCPF(cpf)) {
        toast.error("CPF inválido");
        return;
      }
    }
    setBusy(true);
    try {
      if (editing) {
        if (editing.id === profile?.id && role !== editing.role) {
          throw new Error("Você não pode mudar seu próprio cargo. Peça a outro administrador.");
        }
        if (changePassword && (!resetPwd || resetPwd.length < 6)) {
          throw new Error("A senha deve ter pelo menos 6 caracteres");
        }
        const cpfToSave = role === "professional" ? cpf || (editing.cpf ? maskCPF(editing.cpf) : "") : null;
        const { user: saved } = await update({
          data: {
            user_id: editing.id,
            full_name: name.trim(),
            role,
            phone: phone || null,
            active,
            specialty: role === "professional" ? specialty : null,
            crm: role === "professional" ? crm : null,
            cpf: cpfToSave,
            commission_pct: commission,
            password: changePassword ? resetPwd : null
          }
        });
        setRows((prev) => prev.map((r) => r.id === saved.id ? saved : r));
        if (editing.id === profile?.id) await refresh();
        clearKeepAliveCache();
        if (changePassword) {
          setTempPwd(resetPwd);
          setPwdContext("reset");
          setChangePassword(false);
          toast.success("Usuário e senha atualizados");
        } else {
          toast.success("Usuário atualizado");
          setOpen(false);
        }
        await load();
      } else {
        if (!email) {
          toast.error("E-mail obrigatório");
          setBusy(false);
          return;
        }
        await create({
          data: {
            email,
            password,
            full_name: name,
            role,
            phone,
            specialty,
            crm,
            cpf,
            commission_pct: commission,
            active,
            appointment_types: role === "professional" ? [...DEFAULT_APPOINTMENT_TYPES] : null
          }
        });
        setTempPwd(password);
        setPwdContext("created");
        await load();
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const toggleActive = async (r) => {
    try {
      const { user: saved } = await update({
        data: {
          user_id: r.id,
          full_name: r.full_name,
          role: r.role,
          phone: r.phone,
          active: !r.active,
          specialty: r.specialty,
          crm: r.crm,
          cpf: r.cpf,
          commission_pct: Number(r.commission_pct ?? 0)
        }
      });
      setRows((prev) => prev.map((row) => row.id === saved.id ? saved : row));
      if (r.id === profile?.id && !r.active) await refresh();
      clearKeepAliveCache();
      await load();
      toast.success(r.active ? "Desativado" : "Reativado");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openNew, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
      "Novo Usuário"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "E-mail" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Cargo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Especialidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "CRM" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "h-8 w-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { children: r.full_name.split(" ").slice(0, 2).map((s) => s[0]).join("") }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { className: "font-medium", children: [
          r.full_name,
          r.id === profile?.id ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-[10px] text-muted-foreground", children: "(você)" }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm text-muted-foreground", children: r.email || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: ROLE_CLASS[r.role], children: ROLE_LABEL[r.role] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm text-muted-foreground", children: r.specialty ?? "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm text-muted-foreground", children: r.crm ?? "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: r.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200", children: r.active ? "Ativo" : "Inativo" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { className: "text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => toggleActive(r), children: r.active ? "Desativar" : "Reativar" })
        ] })
      ] }, r.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-lg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editing ? "Editar Usuário" : "Novo Usuário" }) }),
      tempPwd ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: pwdContext === "reset" ? "Senha redefinida. Compartilhe a nova senha com o usuário para ele entrar em /login." : "Usuário criado com sucesso. O acesso é feito com o e-mail cadastrado e a senha abaixo em /login." }),
        email && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border bg-muted/50 px-3 py-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "E-mail de acesso: " }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: email })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border rounded-md p-3 bg-muted flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono text-sm", children: tempPwd }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
            navigator.clipboard.writeText(tempPwd);
            toast.success("Copiada");
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-4 w-4 mr-1" }),
            "Copiar"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogFooter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "Fechar" }) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome completo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "E-mail *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "email",
              value: editing ? email || "Carregando…" : email,
              disabled: !!editing,
              onChange: (e) => setEmail(e.target.value)
            }
          ),
          editing && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "O e-mail de login não pode ser alterado aqui. Use redefinir senha abaixo se o usuário esqueceu o acesso." })
        ] }),
        !editing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Senha temporária" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: password, onChange: (e) => setPassword(e.target.value) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", onClick: () => setPassword(genPassword()), children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Após salvar, copie e envie ao usuário. Ele entra em /login com este e-mail e esta senha." })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border p-3 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: changePassword, onCheckedChange: setChangePassword }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Alterar senha de acesso" })
          ] }),
          changePassword ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: resetPwd, onChange: (e) => setResetPwd(e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "button", variant: "outline", onClick: () => setResetPwd(genPassword()), children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "A nova senha será aplicada ao clicar em Salvar. Compartilhe com o usuário para entrar em /login." })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Ative a opção acima para definir uma nova senha junto com as demais alterações." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Cargo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: role, onValueChange: (v) => setRole(v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "admin", children: "Administrador" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "receptionist", children: "Recepcionista" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "professional", children: "Profissional" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "financial", children: "Financeiro" })
            ] })
          ] }),
          editing?.id === profile?.id ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-amber-600", children: "Seu próprio cargo não pode ser alterado aqui — outro admin precisa fazer isso." }) : null
        ] }),
        role === "professional" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CPF *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: cpf, onChange: (e) => setCpf(maskCPF(e.target.value)), placeholder: "000.000.000-00", maxLength: 14 })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Especialidade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: specialty, onValueChange: setSpecialty, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: specialties.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: s, children: s }, s)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CRM" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: crm, onChange: (e) => setCrm(e.target.value), placeholder: "CRM-MG 12345" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Comissão (%)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", min: 0, max: 100, value: commission, onChange: (e) => setCommission(Number(e.target.value)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "O profissional configura tipos de agendamento em Minhas configurações e procedimentos em Administrativo → Procedimentos, após o primeiro acesso." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Telefone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: phone, onChange: (e) => setPhone(maskPhone(e.target.value)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: active, onCheckedChange: setActive }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Ativo" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: busy, children: busy ? "Salvando..." : "Salvar" })
        ] })
      ] })
    ] }) })
  ] });
}
const CHANNEL_LABEL = { whatsapp: "WhatsApp", sms: "Mensagem de texto", email: "E-mail" };
const TRIGGER_LABEL = {
  appointment_confirmation: "Confirmação de consulta",
  appointment_reminder: "Lembrete 24h antes",
  post_appointment: "Pós-consulta",
  birthday: "Aniversário",
  custom: "Personalizado"
};
const CHANNEL_ICONS = { whatsapp: MessageSquare, sms: Phone, email: Mail };
function SectionMensagens() {
  const { profile, tenant } = useAuth();
  const [items, setItems] = reactExports.useState([]);
  const [open, setOpen] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [name, setName] = reactExports.useState("");
  const [channel, setChannel] = reactExports.useState("whatsapp");
  const [trigger, setTrigger] = reactExports.useState("custom");
  const [content, setContent] = reactExports.useState("");
  const taRef = reactExports.useRef(null);
  const load = async () => {
    const { data } = await supabase.from("message_templates").select("id,name,channel,trigger,content,active").order("name");
    setItems(data ?? []);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const openNew = () => {
    setEditing(null);
    setName("");
    setChannel("whatsapp");
    setTrigger("custom");
    setContent("");
    setOpen(true);
  };
  const openEdit = (t) => {
    setEditing(t);
    setName(t.name);
    setChannel(t.channel);
    setTrigger(t.trigger);
    setContent(t.content);
    setOpen(true);
  };
  const insertVar = (v) => {
    const ta = taRef.current;
    if (!ta) {
      setContent((c) => c + `{{${v}}}`);
      return;
    }
    const s = ta.selectionStart ?? content.length;
    const e = ta.selectionEnd ?? content.length;
    const next = content.slice(0, s) + `{{${v}}}` + content.slice(e);
    setContent(next);
    setTimeout(() => {
      ta.focus();
      const pos = s + v.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };
  const save = async () => {
    if (!name || !content || !profile) return;
    const payload = { name, channel, trigger, content };
    const { error } = editing ? await supabase.from("message_templates").update(payload).eq("id", editing.id) : await supabase.from("message_templates").insert({ ...payload, tenant_id: profile.tenant_id });
    if (error) toast.error(error.message);
    else {
      toast.success("Salvo");
      setOpen(false);
      load();
    }
  };
  const remove = async (t) => {
    await supabase.from("message_templates").delete().eq("id", t.id);
    toast.success("Removido");
    load();
  };
  const toggle = async (t) => {
    await supabase.from("message_templates").update({ active: !t.active }).eq("id", t.id);
    load();
  };
  const preview = renderTemplate(content, { ...SAMPLE_VARS, nome_clinica: tenant?.name ?? "Sua Clínica" });
  const maxChars = channel === "whatsapp" ? 1024 : channel === "sms" ? 160 : 5e3;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: openNew, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
      "Novo Modelo"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid md:grid-cols-2 gap-3", children: items.map((t) => {
      const Icon = CHANNEL_ICONS[t.channel];
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: t.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 mt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3 w-3" }),
                CHANNEL_LABEL[t.channel]
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: TRIGGER_LABEL[t.trigger] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: t.active, onCheckedChange: () => toggle(t) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground line-clamp-2", children: [
          t.content.slice(0, 80),
          t.content.length > 80 ? "..." : ""
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: () => openEdit(t), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3 w-3 mr-1" }),
            "Editar"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: () => remove(t), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3 mr-1" }),
            "Excluir"
          ] })
        ] })
      ] }) }, t.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editing ? "Editar Modelo" : "Novo Modelo" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Canal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 mt-1", children: ["whatsapp", "sms", "email"].map((c) => {
            const Icon = CHANNEL_ICONS[c];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", size: "sm", variant: channel === c ? "default" : "outline", onClick: () => setChannel(c), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4 mr-1" }),
              CHANNEL_LABEL[c]
            ] }, c);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Gatilho" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: trigger, onValueChange: (v) => setTrigger(v), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.keys(TRIGGER_LABEL).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: t, children: TRIGGER_LABEL[t] }, t)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Conteúdo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { ref: taRef, value: content, onChange: (e) => setContent(e.target.value), rows: 6, maxLength: maxChars }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-xs text-muted-foreground mt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: TEMPLATE_VARS.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => insertVar(v), className: "px-2 py-0.5 rounded bg-muted hover:bg-muted/70 font-mono", children: `{{${v}}}` }, v)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              content.length,
              "/",
              maxChars
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Pré-visualização" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border rounded-md p-3 bg-muted/50 text-sm whitespace-pre-wrap", children: preview || /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "A pré-visualização aparece aqui..." }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, children: "Salvar" })
      ] })
    ] }) })
  ] });
}
const INTEGRATIONS = [
  { id: "whatsapp", name: "WhatsApp (Z-API)", desc: "CRM com inbox via Z-API — QR code no celular, sem burocracia Meta", icon: MessageSquare, color: "#22c55e", active: true },
  { id: "clicksign", name: "ClickSign", desc: "Assinatura digital de documentos e contratos", icon: FilePenLine, color: "#0ea5e9", active: false },
  { id: "mercadopago", name: "Mercado Pago", desc: "Receba pagamentos online e gere links de cobrança", icon: CreditCard, color: "#3b82f6", active: false },
  { id: "gcal", name: "Google Agenda", desc: "Sincronize a agenda com o Google Calendar", icon: Calendar, color: "#ef4444", active: false },
  { id: "gdrive", name: "Google Drive", desc: "Armazene documentos na nuvem automaticamente", icon: Cloud, color: "#eab308", active: false },
  { id: "nfse", name: "Nota Fiscal", desc: "Emissão automática de NFS-e", icon: Receipt, color: "#8b5cf6", active: false }
];
function SectionIntegracoes() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid md:grid-cols-3 gap-4", children: INTEGRATIONS.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 w-10 rounded-lg grid place-items-center text-white", style: { background: i.color }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(i.icon, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium truncate", children: i.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: i.active ? "bg-green-50 text-green-700 border-green-200 mt-0.5" : "bg-amber-50 text-amber-700 border-amber-200 mt-0.5", children: i.active ? "Ativo via .env" : "Em breve" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground min-h-[2.5rem]", children: i.desc }),
    i.id === "whatsapp" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
      "Configure ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1", children: "WHATSAPP_PROVIDER=zapi" }),
      ",",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1", children: "ZAPI_INSTANCE_ID" }),
      " e",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1", children: "ZAPI_TOKEN" }),
      ". Webhook:",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-muted px-1", children: "/api/whatsapp/webhook" }),
      ". Inbox em ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "CRM WhatsApp" }),
      "."
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", disabled: true, className: "w-full", children: "Configurar" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TooltipContent, { children: "Integração em desenvolvimento" })
    ] })
  ] }) }, i.id)) }) });
}
function SectionPagamentos() {
  const { tenant } = useAuth();
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [rows, setRows] = reactExports.useState([]);
  const load = reactExports.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const data = await loadPaymentMethodConfigs();
      if (data.length === 0) {
        setRows(await ensurePaymentMethodConfigs(tenant.id));
      } else {
        setRows(data);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };
  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        rows.map(
          (r) => savePaymentMethodConfig(r.id, {
            label: r.label,
            fee_percent: Number(r.fee_percent),
            fee_fixed: Number(r.fee_fixed),
            active: r.active
          })
        )
      );
      toast.success("Formas de pagamento salvas");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const methodIcon = (method) => PAYMENT_METHODS.find((m) => m.value === method)?.icon ?? "•";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, { className: "size-5" }),
        "Formas de pagamento e taxas"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "Configure as taxas de cada forma de pagamento. O valor líquido (após taxa) é usado nos recebimentos. Vendas parceladas são antecipadas: o valor total entra na competência do mês de lançamento." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Forma" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome exibido" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-28", children: "Taxa %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-32", children: "Taxa fixa (R$)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-20 text-center", children: "Ativa" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-2", children: methodIcon(row.method) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: row.method })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: row.label,
              onChange: (e) => updateRow(row.id, { label: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "number",
              min: 0,
              max: 100,
              step: "0.01",
              value: row.fee_percent,
              onChange: (e) => updateRow(row.id, { fee_percent: Number(e.target.value) })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              type: "number",
              min: 0,
              step: "0.01",
              value: row.fee_fixed,
              onChange: (e) => updateRow(row.id, { fee_fixed: Number(e.target.value) })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: row.active,
              onCheckedChange: (v) => updateRow(row.id, { active: v })
            }
          ) })
        ] }, row.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-foreground", children: "Exemplo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: "Pagamento de R$ 1.000,00 no crédito com taxa de 2,5% → taxa de R$ 25,00 → líquido de R$ 975,00." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void saveAll(), disabled: saving, children: [
        saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 size-4" }),
        "Salvar configurações"
      ] })
    ] }) })
  ] });
}
function SectionDespesas() {
  const { tenant } = useAuth();
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [rows, setRows] = reactExports.useState([]);
  const [newName, setNewName] = reactExports.useState("");
  const load = reactExports.useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const data = await loadExpenseCategories(false);
      if (data.length === 0) {
        setRows(await ensureExpenseCategories(tenant.id));
      } else {
        setRows(data);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };
  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        rows.map(
          (r) => saveExpenseCategory(r.id, { name: r.name, active: r.active, sort_order: r.sort_order })
        )
      );
      toast.success("Categorias salvas");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const addCategory = async () => {
    if (!tenant || !newName.trim()) return;
    try {
      const created = await createExpenseCategory(tenant.id, newName.trim());
      setRows((prev) => [...prev, created]);
      setNewName("");
      toast.success("Categoria adicionada");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { className: "size-5" }),
        "Categorias de despesa"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "Categorias usadas nas despesas do profissional e no financeiro da clínica." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-6 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-24 text-center", children: "Ativa" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              value: row.name,
              onChange: (e) => updateRow(row.id, { name: e.target.value })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Switch,
            {
              checked: row.active,
              onCheckedChange: (v) => updateRow(row.id, { active: v })
            }
          ) })
        ] }, row.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            placeholder: "Nova categoria",
            value: newName,
            onChange: (e) => setNewName(e.target.value),
            className: "max-w-xs"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => void addCategory(), disabled: !newName.trim(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
          "Adicionar"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => void saveAll(), disabled: saving, children: [
        saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "mr-2 size-4" }),
        "Salvar categorias"
      ] })
    ] }) })
  ] });
}
const SECTIONS = [{
  id: "clinica",
  label: "Clínica",
  icon: Building2
}, {
  id: "aparencia",
  label: "Aparência",
  icon: Palette
}, {
  id: "consultorios",
  label: "Consultórios",
  icon: DoorOpen
}, {
  id: "especialidades",
  label: "Especialidades",
  icon: Stethoscope
}, {
  id: "usuarios",
  label: "Usuários",
  icon: Users
}, {
  id: "servicos",
  label: "Serviços",
  icon: Receipt
}, {
  id: "pagamentos",
  label: "Pagamentos",
  icon: CreditCard
}, {
  id: "despesas",
  label: "Despesas",
  icon: FolderOpen
}, {
  id: "mensagens",
  label: "Modelos de Mensagem",
  icon: MessageSquare
}, {
  id: "integracoes",
  label: "Integrações",
  icon: Plug
}];
function Page() {
  const [active, setActive] = reactExports.useState("clinica");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Configurações", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "w-60 shrink-0 space-y-1", children: SECTIONS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setActive(s.id), className: cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition", active === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(s.icon, { className: "h-4 w-4" }),
      s.label
    ] }, s.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
      active === "clinica" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionClinica, {}),
      active === "aparencia" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionAparencia, {}),
      active === "consultorios" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionConsultorios, {}),
      active === "especialidades" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionEspecialidades, {}),
      active === "usuarios" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionUsuarios, {}),
      active === "servicos" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionServicos, {}),
      active === "pagamentos" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionPagamentos, {}),
      active === "despesas" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionDespesas, {}),
      active === "mensagens" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionMensagens, {}),
      active === "integracoes" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionIntegracoes, {})
    ] })
  ] }) });
}
export {
  Page as component
};
