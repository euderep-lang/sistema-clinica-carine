import { jsxs, jsx } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { Circle, Loader2, ShieldCheck, Cloud, FileKey2, Trash2, Upload, Smartphone, ImageIcon, Calendar, FileImage, Settings } from "lucide-react";
import { u as useAuth, W as DEFAULT_APPOINTMENT_TYPES, G as resolveAppointmentTypes, C as Card, b as CardHeader, e as CardTitle, X as CardDescription, f as CardContent, H as APPOINTMENT_TYPE_OPTIONS, r as Checkbox, B as Button, E as cn, L as Label, I as Input, Y as DEFAULT_LETTERHEAD_MARGINS, Z as letterheadStoragePath, D as DashboardShell } from "./router-D_mhnWOa.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { toast } from "sonner";
import { s as supabase, P as fmtDateTimeFromDate, L as fmtDateFromDate } from "../server.js";
import { u as useServerFn } from "./createSsrRpc-CzfufYmk.js";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-C9JcLYqK.js";
import { g as getDigitalCertificateStatus, s as saveDigitalCertificate, a as saveCloudCertificate, d as discoverCloudCertificates, r as removeDigitalCertificate, b as revokeSafeIdSession } from "./digital-certificate.functions-C_U-2qGf.js";
import { m as maskCPF, c as isValidCPF } from "./patient-utils-YNqCHR6o.js";
import "@tanstack/react-query";
import "@tanstack/react-router";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "@radix-ui/react-dropdown-menu";
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
import "./server-CATTbrgJ.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@radix-ui/react-tabs";
import "zod";
import "./auth-middleware-C1kGvq5j.js";
function SectionAgendaTipos() {
  const { profile, refresh } = useAuth();
  const [types, setTypes] = useState([...DEFAULT_APPOINTMENT_TYPES]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("appointment_types").eq("id", profile.id).maybeSingle();
      if (error) toast.error(error.message);
      else setTypes(resolveAppointmentTypes(data?.appointment_types));
      setLoading(false);
    })();
  }, [profile]);
  const toggle = (value, checked) => {
    setTypes((current) => {
      if (checked) return current.includes(value) ? current : [...current, value];
      return current.filter((t) => t !== value);
    });
  };
  const save = async () => {
    if (!profile) return;
    if (types.length === 0) {
      toast.error("Selecione ao menos um tipo de agendamento");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ appointment_types: types }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Tipos de agendamento salvos");
      await refresh();
    }
  };
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Tipos de agendamento" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Escolha quais tipos a recepção pode usar ao agendar consultas com você." })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
      loading ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando..." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: APPOINTMENT_TYPE_OPTIONS.map((option) => /* @__PURE__ */ jsxs(
        "label",
        {
          className: "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          children: [
            /* @__PURE__ */ jsx(
              Checkbox,
              {
                checked: types.includes(option.value),
                onCheckedChange: (checked) => toggle(option.value, checked === true)
              }
            ),
            /* @__PURE__ */ jsx("span", { children: option.label })
          ]
        },
        option.value
      )) }),
      /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving || loading, children: saving ? "Salvando..." : "Salvar tipos" })
    ] })
  ] });
}
const RadioGroup = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(RadioGroupPrimitive.Root, { className: cn("grid gap-2", className), ...props, ref });
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;
const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    RadioGroupPrimitive.Item,
    {
      ref,
      className: cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsx(RadioGroupPrimitive.Indicator, { className: "flex items-center justify-center", children: /* @__PURE__ */ jsx(Circle, { className: "h-3.5 w-3.5 fill-primary" }) })
    }
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;
const ACCEPT = ".pfx,.p12";
function formatDate(iso) {
  if (!iso) return "—";
  return fmtDateFromDate(new Date(iso));
}
function SectionCertificadoDigital() {
  const fetchStatus = useServerFn(getDigitalCertificateStatus);
  const saveCert = useServerFn(saveDigitalCertificate);
  const saveCloud = useServerFn(saveCloudCertificate);
  const discoverCerts = useServerFn(discoverCloudCertificates);
  const removeCert = useServerFn(removeDigitalCertificate);
  const revokeSession = useServerFn(revokeSafeIdSession);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("a1");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [cloudCpf, setCloudCpf] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [cloudSlots, setCloudSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchStatus();
      setStatus(s);
      if (s.signingMode === "safeid_cloud") {
        setTab("cloud");
        if (s.certificateCpf) setCloudCpf(maskCPF(s.certificateCpf));
        if (s.cloudSlotAlias) setSelectedSlot(s.cloudSlotAlias);
      } else if (s.configured) {
        setTab("a1");
      }
    } catch (e) {
      const msg = e.message;
      toast.error(msg.trimStart().startsWith("<") ? "Erro ao carregar certificado. Recarregue a página." : msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const onSaveA1 = async () => {
    if (!file) {
      toast.error("Selecione o arquivo .pfx do SafeID");
      return;
    }
    if (!password.trim()) {
      toast.error("Informe a senha do certificado");
      return;
    }
    setSaving(true);
    try {
      const pfxBase64 = await file.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      });
      const next = await saveCert({ data: { pfxBase64, password, provider: "safeid" } });
      setStatus(next);
      setPassword("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Certificado A1 configurado com sucesso");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const onDiscoverCloud = async () => {
    const cpf = cloudCpf.replace(/\D/g, "");
    if (!isValidCPF(cpf)) {
      toast.error("CPF inválido");
      return;
    }
    setDiscovering(true);
    setCloudSlots([]);
    setSelectedSlot("");
    try {
      const result = await discoverCerts({ data: { cpf } });
      setCloudSlots(result.slots);
      if (result.slots.length === 1) setSelectedSlot(result.slots[0].slotAlias);
      toast.success("Certificado em nuvem encontrado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDiscovering(false);
    }
  };
  const onSaveCloud = async () => {
    const cpf = cloudCpf.replace(/\D/g, "");
    if (!isValidCPF(cpf)) {
      toast.error("CPF inválido");
      return;
    }
    if (!selectedSlot) {
      toast.error("Selecione o certificado em nuvem");
      return;
    }
    const slot = cloudSlots.find((s) => s.slotAlias === selectedSlot);
    setSaving(true);
    try {
      const next = await saveCloud({
        data: {
          cpf,
          slotAlias: selectedSlot,
          slotLabel: slot?.label,
          certificateCn: slot?.label
        }
      });
      setStatus(next);
      toast.success("Certificado SafeID em nuvem configurado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const onRemove = async () => {
    setSaving(true);
    try {
      const next = await removeCert();
      setStatus(next);
      setCloudSlots([]);
      setSelectedSlot("");
      toast.success("Certificado removido");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center justify-center gap-2 py-12 text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }),
      "Carregando certificado…"
    ] }) });
  }
  const configuredA1 = status?.configured && status.signingMode === "a1_file";
  const configuredCloud = status?.configured && status.signingMode === "safeid_cloud";
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "size-5" }),
          "Certificado digital SafeID"
        ] }),
        /* @__PURE__ */ jsxs(CardDescription, { children: [
          "Escolha entre certificado ",
          /* @__PURE__ */ jsx("strong", { children: "A1 (.pfx)" }),
          " ou ",
          /* @__PURE__ */ jsx("strong", { children: "em nuvem" }),
          " (app SafeID no celular). As receitas finalizadas serão assinadas com validade ICP-Brasil."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
        status?.configured && /* @__PURE__ */ jsxs("div", { className: "rounded-md border bg-muted/30 p-4 text-sm space-y-2", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium", children: configuredCloud ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Cloud, { className: "size-4" }),
            " Certificado em nuvem ativo"
          ] }) : /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(FileKey2, { className: "size-4" }),
            " Certificado A1 ativo"
          ] }) }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Titular:" }),
            " ",
            /* @__PURE__ */ jsx("strong", { children: status.certificateCn ?? status.cloudSlotLabel ?? "—" })
          ] }),
          status.certificateCpf && /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "CPF:" }),
            " ",
            maskCPF(status.certificateCpf)
          ] }),
          configuredA1 && /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Validade:" }),
            " ",
            formatDate(status.validFrom),
            " até",
            " ",
            formatDate(status.validUntil)
          ] }),
          configuredA1 && status.isExpired && /* @__PURE__ */ jsx("p", { className: "text-destructive font-medium", children: "Certificado expirado — renove e envie novamente." }),
          configuredA1 && !status.isExpired && status.daysUntilExpiry !== null && status.daysUntilExpiry <= 30 && /* @__PURE__ */ jsxs("p", { className: "text-amber-700", children: [
            "Expira em ",
            status.daysUntilExpiry,
            " dias."
          ] }),
          configuredCloud && /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-muted-foreground", children: [
            status.safeIdSessionActive && status.safeIdSessionExpiresAt ? /* @__PURE__ */ jsxs("p", { className: "text-emerald-700 font-medium", children: [
              "Sessão SafeID ativa até",
              " ",
              fmtDateTimeFromDate(new Date(status.safeIdSessionExpiresAt), {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }),
              ". Você pode assinar receitas sem autorizar de novo."
            ] }) : /* @__PURE__ */ jsxs("p", { children: [
              "Na primeira assinatura do dia, confirme a notificação no app SafeID. A autorização vale por",
              " ",
              /* @__PURE__ */ jsx("strong", { className: "text-foreground", children: "12 horas" }),
              "."
            ] }),
            status.safeIdSessionActive && /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outline",
                size: "sm",
                disabled: saving,
                onClick: async () => {
                  setSaving(true);
                  try {
                    await revokeSession();
                    toast.success("Sessão SafeID encerrada");
                    await load();
                  } catch (e) {
                    toast.error(e.message);
                  } finally {
                    setSaving(false);
                  }
                },
                children: "Encerrar sessão SafeID"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", onClick: onRemove, disabled: saving, children: [
            /* @__PURE__ */ jsx(Trash2, { className: "size-4 mr-2" }),
            "Remover certificado"
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Tabs, { value: tab, onValueChange: (v) => setTab(v), children: [
          /* @__PURE__ */ jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [
            /* @__PURE__ */ jsx(TabsTrigger, { value: "a1", children: "A1 (.pfx)" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "cloud", children: "Nuvem (app)" })
          ] }),
          /* @__PURE__ */ jsxs(TabsContent, { value: "a1", className: "space-y-3 border-t pt-4 mt-4", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "Envie o arquivo ",
              /* @__PURE__ */ jsx("strong", { children: ".pfx" }),
              " exportado do SafeID Desktop."
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { children: "Arquivo .pfx / .p12" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    ref: fileRef,
                    type: "file",
                    accept: ACCEPT,
                    onChange: (e) => setFile(e.target.files?.[0] ?? null)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsx(Label, { children: "Senha do certificado" }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    placeholder: "Senha definida na exportação",
                    autoComplete: "off"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Button, { onClick: onSaveA1, disabled: saving || !file, children: [
              saving ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "size-4 mr-2" }),
              configuredA1 ? "Substituir certificado A1" : "Salvar certificado A1"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(TabsContent, { value: "cloud", className: "space-y-4 border-t pt-4 mt-4", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "Vincule seu certificado ",
              /* @__PURE__ */ jsx("strong", { children: "SafeID em nuvem" }),
              ". Autorize no app uma vez a cada 12 horas para assinar várias receitas."
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1 max-w-sm", children: [
              /* @__PURE__ */ jsx(Label, { children: "CPF do titular do certificado" }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    value: cloudCpf,
                    onChange: (e) => setCloudCpf(maskCPF(e.target.value)),
                    placeholder: "000.000.000-00",
                    maxLength: 14
                  }
                ),
                /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: onDiscoverCloud, disabled: discovering, children: discovering ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : "Buscar" })
              ] })
            ] }),
            cloudSlots.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { children: "Certificado encontrado" }),
              /* @__PURE__ */ jsx(RadioGroup, { value: selectedSlot, onValueChange: setSelectedSlot, children: cloudSlots.map((slot) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-md border p-3", children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: slot.slotAlias, id: slot.slotAlias }),
                /* @__PURE__ */ jsx(Label, { htmlFor: slot.slotAlias, className: "font-normal cursor-pointer", children: slot.label })
              ] }, slot.slotAlias)) })
            ] }),
            /* @__PURE__ */ jsxs(Button, { onClick: onSaveCloud, disabled: saving || !selectedSlot, children: [
              saving ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsx(Smartphone, { className: "size-4 mr-2" }),
              configuredCloud ? "Atualizar certificado em nuvem" : "Vincular certificado em nuvem"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsx(FileKey2, { className: "size-4" }),
        "Segurança"
      ] }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "text-sm text-muted-foreground space-y-2", children: [
        /* @__PURE__ */ jsx("p", { children: "Certificado A1: arquivo e senha são criptografados no servidor. Certificado em nuvem: apenas o vínculo (CPF/slot) é salvo; o OTP nunca é armazenado." }),
        /* @__PURE__ */ jsx("p", { children: "A assinatura ocorre somente ao finalizar a receita, no servidor ClinicOS." }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Integração em nuvem requer credenciais do painel",
          " ",
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "https://www.safeweb.com.br/produtos/safeidintegracao",
              target: "_blank",
              rel: "noreferrer",
              className: "underline",
              children: "SafeID Integração"
            }
          ),
          " ",
          "(SAFEID_CLIENT_ID, SAFEID_CLIENT_SECRET e SAFEID_REDIRECT_URI no .env do servidor)."
        ] })
      ] })
    ] })
  ] });
}
const A4 = { width: 210, height: 297 };
function MarginPreview({
  previewUrl,
  margins
}) {
  const safeStyle = useMemo(
    () => ({
      top: `${margins.top / A4.height * 100}%`,
      right: `${margins.right / A4.width * 100}%`,
      bottom: `${margins.bottom / A4.height * 100}%`,
      left: `${margins.left / A4.width * 100}%`
    }),
    [margins]
  );
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-xs", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative aspect-[210/297] overflow-hidden rounded-md border bg-muted/30 shadow-sm", children: [
      previewUrl ? /* @__PURE__ */ jsx("img", { src: previewUrl, alt: "Prévia do papel timbrado", className: "size-full object-cover" }) : /* @__PURE__ */ jsxs("div", { className: "flex size-full flex-col items-center justify-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(ImageIcon, { className: "size-8 opacity-40" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs", children: "Nenhuma imagem enviada" })
      ] }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "pointer-events-none absolute border-2 border-dashed border-primary/70 bg-primary/5",
          style: safeStyle
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-center text-xs text-muted-foreground", children: "Área tracejada = zona segura para texto (margens em mm, formato A4)" })
  ] });
}
function SectionPapelTimbrado() {
  const { profile } = useAuth();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storagePath, setStoragePath] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [margins, setMargins] = useState({ ...DEFAULT_LETTERHEAD_MARGINS });
  const loadPreview = async (path) => {
    if (!path) {
      setPreviewUrl(null);
      return;
    }
    const { data, error } = await supabase.storage.from("professional-assets").createSignedUrl(path, 3600);
    if (error) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(data.signedUrl);
  };
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select(
        "letterhead_path,letterhead_margin_top_mm,letterhead_margin_right_mm,letterhead_margin_bottom_mm,letterhead_margin_left_mm"
      ).eq("id", profile.id).maybeSingle();
      if (error) toast.error(error.message);
      else {
        setStoragePath(data?.letterhead_path ?? null);
        setMargins({
          top: Number(data?.letterhead_margin_top_mm ?? DEFAULT_LETTERHEAD_MARGINS.top),
          right: Number(data?.letterhead_margin_right_mm ?? DEFAULT_LETTERHEAD_MARGINS.right),
          bottom: Number(data?.letterhead_margin_bottom_mm ?? DEFAULT_LETTERHEAD_MARGINS.bottom),
          left: Number(data?.letterhead_margin_left_mm ?? DEFAULT_LETTERHEAD_MARGINS.left)
        });
        await loadPreview(data?.letterhead_path ?? null);
      }
      setLoading(false);
    })();
  }, [profile]);
  const patchMargin = (key, value) => {
    const n = Math.max(0, parseFloat(value) || 0);
    setMargins((prev) => ({ ...prev, [key]: n }));
  };
  const uploadFile = async (file) => {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setUploading(true);
    try {
      const path = letterheadStoragePath(profile.id, file.name);
      const { error: upErr } = await supabase.storage.from("professional-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { error: dbErr } = await supabase.from("profiles").update({ letterhead_path: path }).eq("id", profile.id);
      if (dbErr) throw new Error(dbErr.message);
      setStoragePath(path);
      await loadPreview(path);
      toast.success("Papel timbrado enviado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const removeLetterhead = async () => {
    if (!profile || !storagePath) return;
    setUploading(true);
    try {
      await supabase.storage.from("professional-assets").remove([storagePath]);
      const { error } = await supabase.from("profiles").update({ letterhead_path: null }).eq("id", profile.id);
      if (error) throw new Error(error.message);
      setStoragePath(null);
      setPreviewUrl(null);
      toast.success("Papel timbrado removido");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const saveMargins = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      letterhead_margin_top_mm: margins.top,
      letterhead_margin_right_mm: margins.right,
      letterhead_margin_bottom_mm: margins.bottom,
      letterhead_margin_left_mm: margins.left
    }).eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Margens salvas");
  };
  if (loading) {
    return /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando…" });
  }
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Papel timbrado" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Envie a imagem do seu papel timbrado e defina as margens onde o conteúdo (receitas, documentos) deve ser impresso." })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { className: "space-y-6", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsx(MarginPreview, { previewUrl, margins }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Arquivo do papel timbrado" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Imagem em alta resolução do timbrado completo (A4). Formatos: JPG, PNG ou WebP." }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxs(
              Button,
              {
                type: "button",
                variant: "outline",
                disabled: uploading,
                onClick: () => fileRef.current?.click(),
                children: [
                  uploading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "mr-2 size-4" }),
                  storagePath ? "Substituir imagem" : "Enviar imagem"
                ]
              }
            ),
            storagePath && /* @__PURE__ */ jsxs(
              Button,
              {
                type: "button",
                variant: "ghost",
                className: "text-destructive hover:text-destructive",
                disabled: uploading,
                onClick: () => void removeLetterhead(),
                children: [
                  /* @__PURE__ */ jsx(Trash2, { className: "mr-2 size-4" }),
                  "Remover"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: fileRef,
              type: "file",
              accept: "image/jpeg,image/png,image/webp",
              className: "hidden",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-lg border p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Margens da área de conteúdo (mm)" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "margin-top", children: "Superior" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "margin-top",
                  type: "number",
                  min: 0,
                  step: 1,
                  value: margins.top,
                  onChange: (e) => patchMargin("top", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "margin-right", children: "Direita" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "margin-right",
                  type: "number",
                  min: 0,
                  step: 1,
                  value: margins.right,
                  onChange: (e) => patchMargin("right", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "margin-bottom", children: "Inferior" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "margin-bottom",
                  type: "number",
                  min: 0,
                  step: 1,
                  value: margins.bottom,
                  onChange: (e) => patchMargin("bottom", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "margin-left", children: "Esquerda" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  id: "margin-left",
                  type: "number",
                  min: 0,
                  step: 1,
                  value: margins.left,
                  onChange: (e) => patchMargin("left", e.target.value)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Button, { type: "button", onClick: () => void saveMargins(), disabled: saving, children: [
            saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
            "Salvar margens"
          ] })
        ] })
      ] })
    ] }) })
  ] });
}
const TABS = [{
  id: "agenda",
  label: "Tipos de agendamento",
  icon: Calendar,
  description: "Consulta, retorno, procedimento, exame — o que aparece na agenda da recepção."
}, {
  id: "timbrado",
  label: "Papel timbrado",
  icon: FileImage,
  description: "Imagem do timbrado e margens para receitas e documentos impressos."
}, {
  id: "certificado",
  label: "Certificado digital",
  icon: ShieldCheck,
  description: "Certificado A1 ou em nuvem SafeID para assinar receitas com validade ICP-Brasil."
}];
function ProfessionalSettingsPage() {
  const [tab, setTab] = useState("agenda");
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Minhas configurações", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Minhas configurações", description: "Tipos de agendamento, papel timbrado e certificado digital do seu consultório." }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 lg:flex-row", children: [
      /* @__PURE__ */ jsx("nav", { className: "flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-56 lg:flex-col", children: TABS.map((item) => /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setTab(item.id), className: cn("flex min-w-[12rem] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition", tab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"), children: [
        /* @__PURE__ */ jsx(item.icon, { className: "size-4 shrink-0" }),
        item.label
      ] }, item.id)) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Settings, { className: "size-4" }),
          TABS.find((t) => t.id === tab)?.description
        ] }),
        tab === "agenda" && /* @__PURE__ */ jsx(SectionAgendaTipos, {}),
        tab === "timbrado" && /* @__PURE__ */ jsx(SectionPapelTimbrado, {}),
        tab === "certificado" && /* @__PURE__ */ jsx(SectionCertificadoDigital, {})
      ] })
    ] })
  ] }) });
}
export {
  ProfessionalSettingsPage as component
};
