import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { D as DashboardShell, E as cn, u as useAuth, W as DEFAULT_APPOINTMENT_TYPES, G as resolveAppointmentTypes, C as Card, b as CardHeader, e as CardTitle, X as CardDescription, f as CardContent, H as APPOINTMENT_TYPE_OPTIONS, r as Checkbox, B as Button, Y as DEFAULT_LETTERHEAD_MARGINS, L as Label, I as Input, Z as letterheadStoragePath } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { s as supabase, P as fmtDateTimeFromDate, L as fmtDateFromDate } from "./index.mjs";
import { u as useServerFn } from "./createSsrRpc-fdWaaOKT.mjs";
import { R as RadioGroup$1, a as RadioGroupItem$1, b as RadioGroupIndicator } from "../_libs/radix-ui__react-radio-group.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BH0EiCRX.mjs";
import { g as getDigitalCertificateStatus, s as saveDigitalCertificate, a as saveCloudCertificate, d as discoverCloudCertificates, r as removeDigitalCertificate, b as revokeSafeIdSession } from "./digital-certificate.functions-uPyKL5o6.mjs";
import { m as maskCPF, i as isValidCPF } from "./patient-utils-YNqCHR6o.mjs";
import "../_libs/jspdf.mjs";
import "../_libs/seroval.mjs";
import { h as Calendar, $ as FileImage, z as ShieldCheck, l as Settings, E as LoaderCircle, a0 as Upload, a1 as Trash2, a2 as Cloud, a3 as FileKey, a4 as Smartphone, a5 as Image, y as Circle } from "../_libs/lucide-react.mjs";
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
import "./server-GGhSSPgi.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-tabs.mjs";
import "./auth-middleware-DmvhAnC4.mjs";
import "../_libs/zod.mjs";
function SectionAgendaTipos() {
  const { profile, refresh } = useAuth();
  const [types, setTypes] = reactExports.useState([...DEFAULT_APPOINTMENT_TYPES]);
  const [saving, setSaving] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Tipos de agendamento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "Escolha quais tipos a recepção pode usar ao agendar consultas com você." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
      loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: APPOINTMENT_TYPE_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                checked: types.includes(option.value),
                onCheckedChange: (checked) => toggle(option.value, checked === true)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: option.label })
          ]
        },
        option.value
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving || loading, children: saving ? "Salvando..." : "Salvar tipos" })
    ] })
  ] });
}
const RadioGroup = reactExports.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroup$1, { className: cn("grid gap-2", className), ...props, ref });
});
RadioGroup.displayName = RadioGroup$1.displayName;
const RadioGroupItem = reactExports.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    RadioGroupItem$1,
    {
      ref,
      className: cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupIndicator, { className: "flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-3.5 w-3.5 fill-primary" }) })
    }
  );
});
RadioGroupItem.displayName = RadioGroupItem$1.displayName;
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
  const [status, setStatus] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [tab, setTab] = reactExports.useState("a1");
  const [password, setPassword] = reactExports.useState("");
  const [file, setFile] = reactExports.useState(null);
  const fileRef = reactExports.useRef(null);
  const [cloudCpf, setCloudCpf] = reactExports.useState("");
  const [discovering, setDiscovering] = reactExports.useState(false);
  const [cloudSlots, setCloudSlots] = reactExports.useState([]);
  const [selectedSlot, setSelectedSlot] = reactExports.useState("");
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
  reactExports.useEffect(() => {
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex items-center justify-center gap-2 py-12 text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }),
      "Carregando certificado…"
    ] }) });
  }
  const configuredA1 = status?.configured && status.signingMode === "a1_file";
  const configuredCloud = status?.configured && status.signingMode === "safeid_cloud";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-5" }),
          "Certificado digital SafeID"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardDescription, { children: [
          "Escolha entre certificado ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "A1 (.pfx)" }),
          " ou ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "em nuvem" }),
          " (app SafeID no celular). As receitas finalizadas serão assinadas com validade ICP-Brasil."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
        status?.configured && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border bg-muted/30 p-4 text-sm space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: configuredCloud ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Cloud, { className: "size-4" }),
            " Certificado em nuvem ativo"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileKey, { className: "size-4" }),
            " Certificado A1 ativo"
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Titular:" }),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: status.certificateCn ?? status.cloudSlotLabel ?? "—" })
          ] }),
          status.certificateCpf && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "CPF:" }),
            " ",
            maskCPF(status.certificateCpf)
          ] }),
          configuredA1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Validade:" }),
            " ",
            formatDate(status.validFrom),
            " até",
            " ",
            formatDate(status.validUntil)
          ] }),
          configuredA1 && status.isExpired && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-destructive font-medium", children: "Certificado expirado — renove e envie novamente." }),
          configuredA1 && !status.isExpired && status.daysUntilExpiry !== null && status.daysUntilExpiry <= 30 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-amber-700", children: [
            "Expira em ",
            status.daysUntilExpiry,
            " dias."
          ] }),
          configuredCloud && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-muted-foreground", children: [
            status.safeIdSessionActive && status.safeIdSessionExpiresAt ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-emerald-700 font-medium", children: [
              "Sessão SafeID ativa até",
              " ",
              fmtDateTimeFromDate(new Date(status.safeIdSessionExpiresAt), {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }),
              ". Você pode assinar receitas sem autorizar de novo."
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
              "Na primeira assinatura do dia, confirme a notificação no app SafeID. A autorização vale por",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "12 horas" }),
              "."
            ] }),
            status.safeIdSessionActive && /* @__PURE__ */ jsxRuntimeExports.jsx(
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "destructive", size: "sm", onClick: onRemove, disabled: saving, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-4 mr-2" }),
            "Remover certificado"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onValueChange: (v) => setTab(v), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "a1", children: "A1 (.pfx)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "cloud", children: "Nuvem (app)" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "a1", className: "space-y-3 border-t pt-4 mt-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "Envie o arquivo ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: ".pfx" }),
              " exportado do SafeID Desktop."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Arquivo .pfx / .p12" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    ref: fileRef,
                    type: "file",
                    accept: ACCEPT,
                    onChange: (e) => setFile(e.target.files?.[0] ?? null)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Senha do certificado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
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
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: onSaveA1, disabled: saving || !file, children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "size-4 mr-2" }),
              configuredA1 ? "Substituir certificado A1" : "Salvar certificado A1"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "cloud", className: "space-y-4 border-t pt-4 mt-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
              "Vincule seu certificado ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "SafeID em nuvem" }),
              ". Autorize no app uma vez a cada 12 horas para assinar várias receitas."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 max-w-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "CPF do titular do certificado" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: cloudCpf,
                    onChange: (e) => setCloudCpf(maskCPF(e.target.value)),
                    placeholder: "000.000.000-00",
                    maxLength: 14
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: onDiscoverCloud, disabled: discovering, children: discovering ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin" }) : "Buscar" })
              ] })
            ] }),
            cloudSlots.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Certificado encontrado" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroup, { value: selectedSlot, onValueChange: setSelectedSlot, children: cloudSlots.map((slot) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 rounded-md border p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroupItem, { value: slot.slotAlias, id: slot.slotAlias }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: slot.slotAlias, className: "font-normal cursor-pointer", children: slot.label })
              ] }, slot.slotAlias)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: onSaveCloud, disabled: saving || !selectedSlot, children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "size-4 mr-2" }),
              configuredCloud ? "Atualizar certificado em nuvem" : "Vincular certificado em nuvem"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileKey, { className: "size-4" }),
        "Segurança"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "text-sm text-muted-foreground space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Certificado A1: arquivo e senha são criptografados no servidor. Certificado em nuvem: apenas o vínculo (CPF/slot) é salvo; o OTP nunca é armazenado." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "A assinatura ocorre somente ao finalizar a receita, no servidor ClinicOS." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "Integração em nuvem requer credenciais do painel",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
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
  const safeStyle = reactExports.useMemo(
    () => ({
      top: `${margins.top / A4.height * 100}%`,
      right: `${margins.right / A4.width * 100}%`,
      bottom: `${margins.bottom / A4.height * 100}%`,
      left: `${margins.left / A4.width * 100}%`
    }),
    [margins]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto w-full max-w-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative aspect-[210/297] overflow-hidden rounded-md border bg-muted/30 shadow-sm", children: [
      previewUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: previewUrl, alt: "Prévia do papel timbrado", className: "size-full object-cover" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex size-full flex-col items-center justify-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "size-8 opacity-40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: "Nenhuma imagem enviada" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "pointer-events-none absolute border-2 border-dashed border-primary/70 bg-primary/5",
          style: safeStyle
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-center text-xs text-muted-foreground", children: "Área tracejada = zona segura para texto (margens em mm, formato A4)" })
  ] });
}
function SectionPapelTimbrado() {
  const { profile } = useAuth();
  const fileRef = reactExports.useRef(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [uploading, setUploading] = reactExports.useState(false);
  const [storagePath, setStoragePath] = reactExports.useState(null);
  const [previewUrl, setPreviewUrl] = reactExports.useState(null);
  const [margins, setMargins] = reactExports.useState({ ...DEFAULT_LETTERHEAD_MARGINS });
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
  reactExports.useEffect(() => {
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando…" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Papel timbrado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { children: "Envie a imagem do seu papel timbrado e defina as margens onde o conteúdo (receitas, documentos) deve ser impresso." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarginPreview, { previewUrl, margins }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Arquivo do papel timbrado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Imagem em alta resolução do timbrado completo (A4). Formatos: JPG, PNG ou WebP." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "outline",
                disabled: uploading,
                onClick: () => fileRef.current?.click(),
                children: [
                  uploading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "mr-2 size-4" }),
                  storagePath ? "Substituir imagem" : "Enviar imagem"
                ]
              }
            ),
            storagePath && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                type: "button",
                variant: "ghost",
                className: "text-destructive hover:text-destructive",
                disabled: uploading,
                onClick: () => void removeLetterhead(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "mr-2 size-4" }),
                  "Remover"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 rounded-lg border p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Margens da área de conteúdo (mm)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "margin-top", children: "Superior" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
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
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "margin-right", children: "Direita" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
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
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "margin-bottom", children: "Inferior" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
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
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "margin-left", children: "Esquerda" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { type: "button", onClick: () => void saveMargins(), disabled: saving, children: [
            saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
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
  const [tab, setTab] = reactExports.useState("agenda");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Minhas configurações", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Minhas configurações", description: "Tipos de agendamento, papel timbrado e certificado digital do seu consultório." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-6 lg:flex-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-56 lg:flex-col", children: TABS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setTab(item.id), className: cn("flex min-w-[12rem] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition", tab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { className: "size-4 shrink-0" }),
        item.label
      ] }, item.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "size-4" }),
          TABS.find((t) => t.id === tab)?.description
        ] }),
        tab === "agenda" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionAgendaTipos, {}),
        tab === "timbrado" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionPapelTimbrado, {}),
        tab === "certificado" && /* @__PURE__ */ jsxRuntimeExports.jsx(SectionCertificadoDigital, {})
      ] })
    ] })
  ] }) });
}
export {
  ProfessionalSettingsPage as component
};
