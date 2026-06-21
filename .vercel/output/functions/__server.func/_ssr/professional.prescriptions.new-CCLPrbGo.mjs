import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as todayISO, s as supabase, g as getTenantSetting, af as formatClinicAddressLines, U as formatClinicAddress, f as fmtDate } from "./index.mjs";
import { d as useNavigate, h as useSearch } from "../_libs/tanstack__react-router.mjs";
import { u as useServerFn } from "./createSsrRpc-fdWaaOKT.mjs";
import { o as openCrmInbox } from "./crm-navigation-CWVrTkjz.mjs";
import { u as useAuth, aS as Route$7, D as DashboardShell, B as Button, C as Card, f as CardContent, L as Label, g as Popover, h as PopoverTrigger, j as PopoverContent, $ as Command, a0 as CommandInput, a1 as CommandList, a2 as CommandEmpty, a3 as CommandGroup, a4 as CommandItem, I as Input, T as Textarea, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, y as DialogFooter, aT as PopoverAnchor, a7 as loadLetterheadForPdf, z as randomUUID } from "./router-DcWaovdP.mjs";
import { F as FORMS, Q as QUANTITY_MODES, D as DOSE_UNITS, R as ROUTES, a as FREQUENCIES, p as parsePrescriptionQuantity, M as MEDICATIONS, f as formatPrescriptionQuantity, g as generatePrescriptionPDF, c as computeSimpleSignatureAnchor, b as SIMPLE_RX_PAGE_H_MM, T as TYPE_LABEL, d as formatRxQuantityLabel, e as formatSignedProfessionalName } from "./prescription-pdf-BEoUnrBo.mjs";
import { m as maskCPF, g as formatPatientAddress, a as ageFromBirthDate } from "./patient-utils-YNqCHR6o.mjs";
import { g as getDigitalCertificateStatus, i as initiateSafeIdSignatureAuth, e as getSafeIdSignatureAuthStatus, f as signPrescriptionPdf } from "./digital-certificate.functions-uPyKL5o6.mjs";
import { t as toast$1 } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import "../_libs/jspdf.mjs";
import "../_libs/qrcode.mjs";
import { ai as ArrowLeft, u as Stethoscope, a9 as TriangleAlert, aO as Shield, aE as Copy, a1 as Trash2, P as Plus, ae as FileDown, K as Send } from "../_libs/lucide-react.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
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
import "./server-GGhSSPgi.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
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
import "./auth-middleware-DmvhAnC4.mjs";
import "../_libs/zod.mjs";
import "../_libs/dijkstrajs.mjs";
import "../_libs/pngjs.mjs";
import "zlib";
import "assert";
import "buffer";
function buildPrescriptionCaption(type, date, medications) {
  const typeLabel = TYPE_LABEL[type] ?? "Receita médica";
  const dateFmt = fmtDate(date);
  const meds = medications.map((m) => m.trim()).filter(Boolean).join(", ");
  return meds ? `${typeLabel} — ${dateFmt} — ${meds}` : `${typeLabel} — ${dateFmt}`;
}
async function savePrescriptionToPatientHistory(opts) {
  const mediaId = randomUUID();
  const dateSlug = opts.date.replace(/-/g, "");
  const storagePath = `${opts.patientId}/prescriptions/${opts.prescriptionId}/${dateSlug}_receita.pdf`;
  const caption = buildPrescriptionCaption(opts.type, opts.date, opts.medications);
  const fileName = `receita_${dateSlug}.pdf`;
  const fileSizeKb = Math.round(opts.pdfBlob.size / 1024 * 100) / 100;
  const { error: upErr } = await supabase.storage.from("patient-documents").upload(storagePath, opts.pdfBlob, {
    contentType: "application/pdf",
    upsert: true
  });
  if (upErr) throw new Error(upErr.message);
  const { error: dbErr } = await supabase.from("patient_media_history").insert({
    id: mediaId,
    tenant_id: opts.tenantId,
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: "application/pdf",
    file_size_kb: fileSizeKb,
    caption
  });
  if (dbErr) throw new Error(dbErr.message);
  return { mediaId, caption, storagePath };
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function base64ToBlob(base64, mimeType = "application/pdf") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
function SafeIdSignatureAuthDialog({
  open,
  onOpenChange,
  renewal = false,
  onAuthorized,
  saving = false
}) {
  const [authReady, setAuthReady] = reactExports.useState(false);
  const [authLoading, setAuthLoading] = reactExports.useState(false);
  const [authError, setAuthError] = reactExports.useState(null);
  const [authorizeUrl, setAuthorizeUrl] = reactExports.useState(null);
  const initiateSafeIdAuth = useServerFn(initiateSafeIdSignatureAuth);
  const fetchSafeIdAuthStatus = useServerFn(getSafeIdSignatureAuthStatus);
  reactExports.useEffect(() => {
    if (!open) {
      setAuthReady(false);
      setAuthLoading(false);
      setAuthError(null);
      setAuthorizeUrl(null);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    setAuthReady(false);
    setAuthError(null);
    setAuthorizeUrl(null);
    const openAuthorizeWindow = (url) => {
      const popup = window.open(url, "safeid-oauth", "width=520,height=720");
      if (!popup) {
        toast$1.error("Permita pop-ups neste site para abrir a autorização SafeID.");
      }
    };
    (async () => {
      const origin = window.location.origin;
      try {
        const status = await fetchSafeIdAuthStatus({ data: { origin } });
        if (cancelled) return;
        if (status.ready) {
          setAuthReady(true);
          return;
        }
        if (status.redirectError || !status.redirectUri) {
          const callback = `${origin}/professional/safeid/callback`;
          const msg = status.redirectError ?? `Cadastre ${callback} no painel SafeID e em SAFEID_REDIRECT_URI no .env.`;
          setAuthError(msg);
          toast$1.error(msg);
          return;
        }
        const result = await initiateSafeIdAuth({ data: { origin } });
        if (cancelled) return;
        if (result.alreadyAuthorized) {
          setAuthReady(true);
          return;
        }
        if (!result.authorizeUrl) return;
        setAuthorizeUrl(result.authorizeUrl);
        openAuthorizeWindow(result.authorizeUrl);
        toast$1.message(
          renewal ? "Sessão expirada — confirme no app SafeID para renovar por 12 horas" : "Confirme a autorização no app SafeID (válida por 12 horas)"
        );
      } catch (e) {
        if (!cancelled) {
          const msg = e.message;
          const hint = msg === "Failed to fetch" ? "Não foi possível falar com o servidor. Verifique se o app está na mesma URL do SAFEID_REDIRECT_URI no .env." : msg.includes("redirecionamento") || msg.includes("redirect") ? `${msg} Confirme que SAFEID_REDIRECT_URI no .env é idêntica à URL cadastrada no painel SafeID Integração.` : msg;
          setAuthError(hint);
          toast$1.error(hint);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    const onMessage = (event) => {
      if (event.data?.type === "safeid-oauth-done") {
        void fetchSafeIdAuthStatus({ data: { origin: window.location.origin } }).then((status) => {
          if (status.ready) setAuthReady(true);
        });
      }
    };
    window.addEventListener("message", onMessage);
    const interval = window.setInterval(async () => {
      try {
        const status = await fetchSafeIdAuthStatus({ data: { origin: window.location.origin } });
        if (status.ready) setAuthReady(true);
      } catch {
      }
    }, 2e3);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("message", onMessage);
    };
  }, [open, renewal, fetchSafeIdAuthStatus, initiateSafeIdAuth]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: renewal ? "Renovar autorização SafeID" : "Autorizar assinatura SafeID" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-sm text-muted-foreground", children: [
      renewal && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2", children: [
        "Sua autorização de ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "12 horas" }),
        " expirou. Confirme novamente no app",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "SafeID" }),
        " no celular para assinar esta receita."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "1." }),
        " Uma janela de autorização foi aberta. Confirme a notificação no app ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "SafeID" }),
        " no celular."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "2." }),
        " Após aprovar, a autorização vale por",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-foreground", children: "12 horas" }),
        " — você assina várias receitas sem repetir o passo."
      ] }),
      authError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-destructive", children: authError }),
      authLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-700", children: "Preparando autorização…" }),
      !authLoading && !authReady && !authError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-amber-700", children: "Aguardando confirmação no app SafeID…" }),
      authReady && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-emerald-700", children: "Autorização confirmada. Clique em Assinar e finalizar." })
    ] }),
    authorizeUrl && !authReady && !authError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        type: "button",
        variant: "outline",
        size: "sm",
        onClick: () => window.open(authorizeUrl, "safeid-oauth", "width=520,height=720"),
        children: "Abrir autorização novamente"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          disabled: saving || !authReady,
          onClick: () => {
            onOpenChange(false);
            onAuthorized();
          },
          children: "Assinar e finalizar"
        }
      )
    ] })
  ] }) });
}
function isSafeIdSessionExpiredMessage(message) {
  const m = message.toLowerCase();
  return m.includes("sessão safeid expirada") || m.includes("sessao safeid expirada") || m.includes("autorize novamente") || m.includes("401") || m.includes("unauthorized") || m.includes("token") && m.includes("expirad");
}
const emptyItem = () => ({
  medication: "",
  concentration: "",
  pharmaceutical_form: "",
  quantityMode: "unidade",
  quantityValue: "",
  doseValue: "",
  doseUnit: "comprimido(s)",
  route: "Oral",
  frequency: "1x ao dia",
  duration: "",
  instructions: ""
});
function itemQuantityLabel(it) {
  return formatPrescriptionQuantity(it.quantityMode, it.quantityValue, it.pharmaceutical_form);
}
function TypeCard({
  active,
  onClick,
  icon: Icon,
  title,
  sub,
  color,
  bg
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick, className: `flex-1 text-left rounded-lg border-2 p-3 transition ${active ? color : "border-border bg-card"} ${active ? bg : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-semibold", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }),
      title
    ] }),
    sub && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: sub })
  ] });
}
function MedAutocomplete({
  value,
  onChange
}) {
  const [open, setOpen] = reactExports.useState(false);
  const trimmed = value.trim();
  const matches = MEDICATIONS.filter((m) => !trimmed || m.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 12);
  const hasExactMatch = matches.some((m) => m.toLowerCase() === trimmed.toLowerCase());
  const showCustomOption = trimmed.length > 0 && !hasExactMatch;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverAnchor, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value, onChange: (e) => {
      onChange(e.target.value);
      setOpen(true);
    }, onFocus: () => setOpen(true), onBlur: () => window.setTimeout(() => setOpen(false), 180), onKeyDown: (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Enter") setOpen(false);
    }, placeholder: "Buscar ou digitar medicamento" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { className: "w-80 p-0", align: "start", onOpenAutoFocus: (e) => e.preventDefault(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Command, { shouldFilter: false, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandList, { children: [
      matches.length === 0 && !showCustomOption && /* @__PURE__ */ jsxRuntimeExports.jsx(CommandEmpty, { children: "Digite o nome do medicamento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandGroup, { children: [
        matches.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(CommandItem, { value: m, onSelect: () => {
          onChange(m);
          setOpen(false);
        }, children: m }, m)),
        showCustomOption && /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandItem, { value: `custom-${trimmed}`, onSelect: () => {
          onChange(trimmed);
          setOpen(false);
        }, children: [
          'Usar "',
          trimmed,
          '"'
        ] })
      ] })
    ] }) }) })
  ] });
}
function mapDbItemsToForm(srcItems) {
  return srcItems.map((it) => {
    const [dv, ...du] = (it.dosage ?? "").split(" ");
    const parsedQty = parsePrescriptionQuantity(it.quantity);
    return {
      medication: it.medication,
      concentration: it.concentration ?? "",
      pharmaceutical_form: it.pharmaceutical_form ?? "",
      quantityMode: parsedQty.mode,
      quantityValue: parsedQty.value,
      doseValue: dv ?? "",
      doseUnit: du.join(" ") || "comprimido(s)",
      route: it.route ?? "Oral",
      frequency: it.frequency ?? "1x ao dia",
      duration: it.duration ?? "",
      instructions: it.instructions ?? ""
    };
  });
}
function NewPrescription() {
  const navigate = useNavigate();
  const {
    profile,
    tenant
  } = useAuth();
  const search = useSearch({
    from: Route$7.id
  });
  const [tenantInfo, setTenantInfo] = reactExports.useState(null);
  const [clinicAddress, setClinicAddress] = reactExports.useState(null);
  const [patients, setPatients] = reactExports.useState([]);
  const [patientId, setPatientId] = reactExports.useState(search.patient_id ?? "");
  const [patientSearch, setPatientSearch] = reactExports.useState("");
  const [patientOpen, setPatientOpen] = reactExports.useState(false);
  const [date, setDate] = reactExports.useState(todayISO());
  const [type, setType] = reactExports.useState("simples");
  const [notes, setNotes] = reactExports.useState("");
  const [items, setItems] = reactExports.useState([emptyItem()]);
  const [draftId, setDraftId] = reactExports.useState(null);
  const [loadingDraft, setLoadingDraft] = reactExports.useState(Boolean(search.edit));
  const [saving, setSaving] = reactExports.useState(false);
  const [cancelOpen, setCancelOpen] = reactExports.useState(false);
  const [doneDialog, setDoneDialog] = reactExports.useState(null);
  const [safeIdDialogOpen, setSafeIdDialogOpen] = reactExports.useState(false);
  const [safeIdRenewal, setSafeIdRenewal] = reactExports.useState(false);
  const [certStatus, setCertStatus] = reactExports.useState(null);
  const fetchCertStatus = useServerFn(getDigitalCertificateStatus);
  const fetchSafeIdAuthStatus = useServerFn(getSafeIdSignatureAuthStatus);
  const signPdf = useServerFn(signPrescriptionPdf);
  reactExports.useEffect(() => {
    (async () => {
      if (tenant?.id) {
        const [{
          data
        }, addr] = await Promise.all([supabase.from("tenants").select("id, name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle(), getTenantSetting(tenant.id, "address")]);
        if (data) setTenantInfo(data);
        setClinicAddress(addr);
      }
      if (profile) {
        const {
          data: pts
        } = await supabase.from("patients").select("id, full_name, cpf, birth_date, phone, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip").eq("tenant_id", profile.tenant_id).eq("active", true).order("full_name");
        setPatients(pts ?? []);
      }
      if (search.edit && profile) {
        setLoadingDraft(true);
        const {
          data: src
        } = await supabase.from("prescriptions").select("*").eq("id", search.edit).eq("professional_id", profile.id).eq("status", "draft").maybeSingle();
        if (!src) {
          toast.error("Rascunho não encontrado ou já finalizado");
          navigate({
            to: "/professional/prescriptions"
          });
          return;
        }
        const s = src;
        const {
          data: srcItems
        } = await supabase.from("prescription_items").select("*").eq("prescription_id", s.id).order("position");
        setDraftId(s.id);
        setPatientId(s.patient_id);
        setDate(s.date);
        setType(s.type);
        setNotes(s.notes ?? "");
        if (srcItems && srcItems.length) {
          setItems(mapDbItemsToForm(srcItems));
        }
        setLoadingDraft(false);
      } else if (search.duplicate && profile) {
        const {
          data: src
        } = await supabase.from("prescriptions").select("*").eq("id", search.duplicate).eq("professional_id", profile.id).maybeSingle();
        const {
          data: srcItems
        } = await supabase.from("prescription_items").select("*").eq("prescription_id", search.duplicate).order("position");
        if (src) {
          const s = src;
          setPatientId(s.patient_id);
          setType(s.type);
          setNotes(s.notes ?? "");
        }
        if (srcItems && srcItems.length) {
          setItems(mapDbItemsToForm(srcItems));
        }
      }
    })();
  }, [tenant?.id, search.duplicate, search.edit, profile?.id, navigate]);
  reactExports.useEffect(() => {
    if (!profile || profile.role !== "professional") return;
    fetchCertStatus().then(setCertStatus).catch(() => setCertStatus(null));
  }, [profile?.id, profile?.role]);
  const patient = patients.find((p) => p.id === patientId) ?? null;
  const filteredPatients = reactExports.useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    const digits = q.replace(/\D/g, "");
    return patients.filter((p) => {
      if (p.full_name.toLowerCase().includes(q)) return true;
      if (digits && (p.cpf ?? "").replace(/\D/g, "").includes(digits)) return true;
      if (digits && (p.phone ?? "").replace(/\D/g, "").includes(digits)) return true;
      return false;
    }).slice(0, 30);
  }, [patients, patientSearch]);
  const updateItem = (i, patch) => setItems((arr) => arr.map((it, idx) => idx === i ? {
    ...it,
    ...patch
  } : it));
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addItem = () => setItems((arr) => [...arr, emptyItem()]);
  const clinicAddrLines = formatClinicAddressLines(clinicAddress);
  const clinicAddressFormatted = formatClinicAddress(clinicAddress) ?? tenantInfo?.address ?? null;
  const buildRxData = () => ({
    type,
    date,
    notes,
    clinic: {
      name: tenantInfo?.name ?? tenant?.name ?? "Clínica",
      address: clinicAddressFormatted,
      address_line1: clinicAddrLines.line1 ?? (tenantInfo?.address && !clinicAddrLines.line2 ? tenantInfo.address : null),
      address_line2: clinicAddrLines.line2,
      phone: tenantInfo?.phone ?? null,
      email: tenantInfo?.email ?? null,
      cnpj: tenantInfo?.cnpj ?? null
    },
    patient: {
      full_name: patient?.full_name ?? "—",
      cpf: patient?.cpf ?? null,
      birth_date: patient?.birth_date ?? null,
      address: patient ? formatPatientAddress(patient) || null : null
    },
    professional: {
      full_name: profile?.full_name ?? "",
      crm: profile?.crm ?? null,
      specialty: profile?.specialty ?? null,
      cpf: profile?.cpf ?? null
    },
    items: items.map((it, idx) => ({
      position: idx + 1,
      medication: it.medication,
      concentration: it.concentration || null,
      pharmaceutical_form: it.pharmaceutical_form || null,
      quantity: itemQuantityLabel(it) || null,
      dosage: [it.doseValue, it.doseUnit].filter(Boolean).join(" ").trim() || null,
      route: it.route || null,
      frequency: it.frequency || null,
      duration: it.duration || null,
      instructions: it.instructions || null
    }))
  });
  const validate = () => {
    if (!patientId) return "Selecione o paciente";
    if (items.length === 0 || !items.some((i) => i.medication.trim())) return "Adicione ao menos um medicamento";
    return null;
  };
  const canSignWithCert = certStatus?.configured && (certStatus.signingMode === "safeid_cloud" || !certStatus.isExpired);
  const finalizeLabel = canSignWithCert ? "Assinar e finalizar" : "Finalizar e gerar documento";
  const openSafeIdAuthDialog = (renewal) => {
    setSafeIdRenewal(renewal);
    setSafeIdDialogOpen(true);
  };
  const onFinalizeClick = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (certStatus?.configured && certStatus.signingMode === "safeid_cloud") {
      void (async () => {
        try {
          const status = await fetchSafeIdAuthStatus({
            data: {
              origin: window.location.origin
            }
          });
          if (status.ready) {
            void save(true, {
              sign: true
            });
            return;
          }
          openSafeIdAuthDialog(Boolean(status.sessionExpired));
        } catch {
          openSafeIdAuthDialog(false);
        }
      })();
      return;
    }
    void save(true, {
      sign: canSignWithCert
    });
  };
  const onDownloadPdfClick = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    void save(true, {
      sign: false
    });
  };
  const save = async (finalize, options) => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (!profile || !tenant) return;
    setSaving(true);
    try {
      const shouldSign = finalize && (options?.sign !== void 0 ? options.sign : canSignWithCert);
      const data = buildRxData();
      const itemsInsert = data.items.filter((i) => i.medication.trim()).map((i) => ({
        position: i.position,
        medication: i.medication,
        concentration: i.concentration,
        pharmaceutical_form: i.pharmaceutical_form,
        quantity: i.quantity,
        dosage: i.dosage,
        route: i.route,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions
      }));
      let rxId = draftId;
      if (draftId) {
        const {
          error: rxErr
        } = await supabase.from("prescriptions").update({
          patient_id: patientId,
          date,
          type,
          status: finalize ? "finalized" : "draft",
          notes: notes || null
        }).eq("id", draftId).eq("professional_id", profile.id).eq("status", "draft");
        if (rxErr) throw new Error(rxErr.message);
        const {
          error: delErr
        } = await supabase.from("prescription_items").delete().eq("prescription_id", draftId);
        if (delErr) throw new Error(delErr.message);
      } else {
        const {
          data: rxIns,
          error: rxErr
        } = await supabase.from("prescriptions").insert({
          tenant_id: tenant.id,
          patient_id: patientId,
          professional_id: profile.id,
          date,
          type,
          status: finalize ? "finalized" : "draft",
          notes: notes || null
        }).select("id").single();
        if (rxErr || !rxIns) throw new Error(rxErr?.message ?? "Erro ao salvar");
        rxId = rxIns.id;
      }
      if (!rxId) throw new Error("Erro ao salvar receita");
      if (itemsInsert.length) {
        const {
          error: itErr
        } = await supabase.from("prescription_items").insert(itemsInsert.map((i) => ({
          ...i,
          prescription_id: rxId
        })));
        if (itErr) throw new Error(itErr.message);
      }
      if (finalize) {
        const letterhead = await loadLetterheadForPdf(profile.id);
        let blob = await generatePrescriptionPDF({
          ...data,
          letterhead,
          digitalSignature: shouldSign
        });
        let signed = false;
        let signedAt = null;
        let signatureCn = null;
        if (shouldSign) {
          const bottomMarginMm = letterhead?.margins.bottom ?? (type === "simples" ? 14 : 25);
          const signatureLineMmFromTop = type === "simples" ? computeSimpleSignatureAnchor(SIMPLE_RX_PAGE_H_MM, bottomMarginMm, true).signatureLineY : void 0;
          const signedResult = await signPdf({
            data: {
              pdfBase64: await blobToBase64(blob),
              reason: `Receita médica — ${TYPE_LABEL[type]}`,
              location: data.clinic.name,
              bottomMarginMm,
              signatureLineMmFromTop,
              referencePageHeightMm: type === "simples" ? SIMPLE_RX_PAGE_H_MM : void 0
            }
          });
          blob = base64ToBlob(signedResult.pdfBase64);
          signed = true;
          signedAt = signedResult.signedAt;
          signatureCn = signedResult.signatureCn;
        } else if (certStatus?.configured && certStatus.signingMode === "a1_file" && certStatus.isExpired) {
          throw new Error("Certificado SafeID expirado. Atualize em Minhas configurações → Certificado digital.");
        }
        const path = `${tenant.id}/${rxId}.pdf`;
        const {
          error: upErr
        } = await supabase.storage.from("prescriptions").upload(path, blob, {
          contentType: "application/pdf",
          upsert: true
        });
        if (upErr) throw new Error(upErr.message);
        await supabase.from("prescriptions").update({
          pdf_url: path,
          signed_at: signedAt,
          signature_cn: signatureCn
        }).eq("id", rxId);
        const medNames = data.items.filter((i) => i.medication.trim()).map((i) => i.concentration ? `${i.medication} ${i.concentration}` : i.medication);
        await savePrescriptionToPatientHistory({
          tenantId: tenant.id,
          patientId,
          professionalId: profile.id,
          prescriptionId: rxId,
          type,
          date,
          medications: medNames,
          pdfBlob: blob
        });
        const url = URL.createObjectURL(blob);
        setDoneDialog({
          blob,
          url,
          path,
          signed
        });
        toast.success(signed ? "Receita assinada digitalmente e salva no histórico do paciente" : shouldSign ? "Receita finalizada e salva no histórico do paciente" : "PDF gerado sem assinatura digital e salvo no histórico do paciente");
      } else {
        toast.success(draftId ? "Rascunho atualizado" : "Rascunho salvo");
        navigate({
          to: "/professional/prescriptions"
        });
      }
    } catch (e) {
      const msg = e.message;
      if (certStatus?.signingMode === "safeid_cloud" && isSafeIdSessionExpiredMessage(msg)) {
        openSafeIdAuthDialog(true);
        return;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };
  const sendWhats = () => {
    if (!patient?.phone) {
      toast.error("Paciente sem telefone");
      return;
    }
    openCrmInbox(navigate, {
      patientId: patientId || void 0,
      phone: patient.phone,
      draft: "Segue sua receita médica"
    });
  };
  if (loadingDraft) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: draftId ? "Editar rascunho" : "Nova Receita", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-20 text-center text-muted-foreground", children: "Carregando rascunho…" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: draftId ? "Editar rascunho" : "Nova Receita", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-6 pb-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-3 space-y-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setCancelOpen(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4 mr-1" }),
          "Voltar"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-5 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "1. Cabeçalho" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Paciente" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Popover, { open: patientOpen, onOpenChange: setPatientOpen, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "w-full justify-start font-normal", children: patient ? patient.full_name : "Selecionar paciente..." }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverContent, { className: "w-80 p-0", align: "start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Command, { shouldFilter: false, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CommandInput, { placeholder: "Buscar nome ou CPF...", value: patientSearch, onValueChange: setPatientSearch }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(CommandList, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CommandEmpty, { children: "Nenhum paciente" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(CommandGroup, { children: filteredPatients.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(CommandItem, { value: p.id, onSelect: () => {
                      setPatientId(p.id);
                      setPatientOpen(false);
                    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: p.full_name }),
                      p.cpf && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: maskCPF(p.cpf) })
                    ] }) }, p.id)) })
                  ] })
                ] }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Data" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "mb-2 block", children: "Tipo de Receita" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TypeCard, { active: type === "simples", onClick: () => setType("simples"), icon: Stethoscope, title: "Receita Simples", color: "border-blue-500", bg: "bg-blue-50" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TypeCard, { active: type === "controlada", onClick: () => setType("controlada"), icon: TriangleAlert, title: "Receita de Controle Especial", sub: "(Receita Amarela — 2 vias)", color: "border-orange-500", bg: "bg-amber-50" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TypeCard, { active: type === "especial", onClick: () => setType("especial"), icon: Shield, title: "Receita Especial", sub: "(Receita Azul)", color: "border-sky-500", bg: "bg-sky-50" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TypeCard, { active: type === "especial_2vias", onClick: () => setType("especial_2vias"), icon: Copy, title: "Receita Especial 2 Vias", sub: "(Receita Azul — 2 vias)", color: "border-sky-600", bg: "bg-sky-50" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Observações gerais" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2 })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-5 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "2. Medicamentos" }),
          items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border p-3 space-y-3 relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-bold", children: i + 1 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: "Medicamento" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", className: "text-destructive", onClick: () => removeItem(i), disabled: items.length === 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Medicamento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MedAutocomplete, { value: it.medication, onChange: (v) => updateItem(i, {
                  medication: v
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Concentração" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: it.concentration, placeholder: "ex: 500mg", onChange: (e) => updateItem(i, {
                  concentration: e.target.value
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Forma farmacêutica" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: it.pharmaceutical_form, onValueChange: (v) => updateItem(i, {
                  pharmaceutical_form: v
                }), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: FORMS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: f, children: f }, f)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 md:col-span-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Quantidade a dispensar" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: it.quantityMode, onValueChange: (v) => updateItem(i, {
                    quantityMode: v
                  }), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-36", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: QUANTITY_MODES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: m.value, children: m.label }, m.value)) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "w-24", type: "number", min: 1, step: 1, value: it.quantityValue, placeholder: it.quantityMode === "caixa" ? "1" : "30", onChange: (e) => updateItem(i, {
                    quantityValue: e.target.value
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center text-sm text-muted-foreground", children: it.quantityMode === "caixa" ? "caixa(s)" : it.pharmaceutical_form ? it.pharmaceutical_form.toLowerCase() + "(s)" : "unidade(s)" })
                ] }),
                itemQuantityLabel(it) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                  "Na receita: ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: itemQuantityLabel(it) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Dose" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { className: "w-20", value: it.doseValue, onChange: (e) => updateItem(i, {
                    doseValue: e.target.value
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: it.doseUnit, onValueChange: (v) => updateItem(i, {
                    doseUnit: v
                  }), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: DOSE_UNITS.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: u, children: u }, u)) })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Via" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: it.route, onValueChange: (v) => updateItem(i, {
                  route: v
                }), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: ROUTES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: r, children: r }, r)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Frequência" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: it.frequency, onValueChange: (v) => updateItem(i, {
                  frequency: v
                }), children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: FREQUENCIES.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: f, children: f }, f)) })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Duração" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: it.duration, placeholder: "ex: 7 dias", onChange: (e) => updateItem(i, {
                  duration: e.target.value
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-3 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Instruções adicionais" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: it.instructions, placeholder: "ex: Tomar em jejum", onChange: (e) => updateItem(i, {
                  instructions: e.target.value
                }) })
              ] })
            ] })
          ] }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: addItem, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
            "Adicionar Medicamento"
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:sticky lg:top-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-muted-foreground mb-2", children: "Pré-visualização" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewPanel, { data: buildRxData() })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-background/95 backdrop-blur border-t z-30", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center gap-2 px-4 py-3 max-w-screen-2xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setCancelOpen(true), children: "Cancelar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => save(false), disabled: saving, children: "Salvar Rascunho" }),
        canSignWithCert && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: onDownloadPdfClick, disabled: saving, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "h-4 w-4 mr-2" }),
          "Baixar PDF"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onFinalizeClick, disabled: saving, children: finalizeLabel })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SafeIdSignatureAuthDialog, { open: safeIdDialogOpen, onOpenChange: setSafeIdDialogOpen, renewal: safeIdRenewal, saving, onAuthorized: () => void save(true, {
      sign: true
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: cancelOpen, onOpenChange: setCancelOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Descartar alterações?" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Os dados não salvos serão perdidos." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", onClick: () => setCancelOpen(false), children: "Continuar editando" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "destructive", onClick: () => navigate({
          to: "/professional/prescriptions"
        }), children: "Descartar" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: !!doneDialog, onOpenChange: (v) => {
      if (!v) {
        if (doneDialog) URL.revokeObjectURL(doneDialog.url);
        setDoneDialog(null);
        navigate({
          to: "/professional/prescriptions"
        });
      }
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Receita gerada com sucesso" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: doneDialog?.signed ? certStatus?.signingMode === "safeid_cloud" ? "A receita foi assinada com seu certificado SafeID em nuvem e está pronta." : "A receita foi assinada digitalmente com seu certificado SafeID e está pronta." : "A receita foi finalizada e o documento está pronto." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => doneDialog && window.open(doneDialog.url, "_blank"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "h-4 w-4 mr-2" }),
          "Baixar documento"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: sendWhats, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4 mr-2" }),
          "Enviar pelo CRM"
        ] })
      ] })
    ] }) })
  ] });
}
function PreviewPanel({
  data
}) {
  if (data.type === "simples") return /* @__PURE__ */ jsxRuntimeExports.jsx(SimplePreviewPanel, { data });
  if (data.type === "controlada" || data.type === "especial_2vias") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SpecialControlPreview, { data });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StandardPreviewPanel, { data });
}
function SpecialControlPreview({
  data
}) {
  const border = data.type === "controlada" ? "border-orange-500/50" : "border-sky-600/40";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-[10px] text-muted-foreground", children: "Pré-visualização da 1ª via · PDF com 2 páginas A4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: `overflow-hidden border-2 ${border}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex min-h-[520px] flex-col bg-white p-5 text-[10px] text-black", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-sm font-bold", children: "RECEITUÁRIO CONTROLE ESPECIAL" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-right text-[8px] leading-tight text-muted-foreground", children: "1ª VIA - RETENÇÃO DA FARMÁCIA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 w-[52%] rounded border border-black px-3 py-2.5 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] font-bold", children: "IDENTIFICAÇÃO DO EMITENTE" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-[13px] font-bold leading-tight", children: data.professional.full_name }),
        data.professional.specialty && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] font-bold", children: data.professional.specialty }),
        data.professional.crm && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-bold", children: data.professional.crm }),
        data.clinic.address_line1 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold", children: data.clinic.address_line1 }),
        data.clinic.address_line2 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold", children: data.clinic.address_line2 }),
        data.clinic.phone && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] font-bold", children: [
          "Tel: ",
          data.clinic.phone
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-b border-black/30 pb-0.5 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Paciente:" }),
          " ",
          data.patient.full_name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-b border-black/30 pb-0.5 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Endereço:" }),
          " ",
          data.patient.address || ""
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-4 font-medium", children: "Prescrição:" }),
        data.items.filter((i) => i.medication.trim()).map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              i.position,
              ".",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold", children: [
                i.medication.toUpperCase(),
                i.concentration ? ` ${i.concentration}` : ""
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-3 flex-1 border-b border-dotted border-black/40" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px]", children: formatRxQuantityLabel(i.quantity) })
          ] }),
          (i.dosage || i.route || i.frequency || i.duration) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "pl-3 italic", children: [
            "Tomar",
            " ",
            [i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null].filter(Boolean).join(", "),
            "."
          ] }),
          i.instructions && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pl-3 italic", children: i.instructions })
        ] }, i.position))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto space-y-3 pt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px]", children: [
            "DATA: ",
            fmtDate(data.date)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-black/50" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[8px]", children: "Assinatura e Carimbo do Emitente" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border border-black p-2 text-[7px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-center font-bold", children: "IDENTIFICAÇÃO DO COMPRADOR" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Nome: _____________________________________________" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Ident.: ___________________ Org. Emissor: _____________" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "End.: _______________________________________________" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Cidade: __________________________ UF: ____" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Telefone: ___________________________________________" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col rounded border border-black p-2 text-[7px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center font-bold", children: "IDENTIFICAÇÃO DO FORNECEDOR" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-auto text-center", children: "ASSINATURA DO FARMACÊUTICO DATA: ___/___/___" })
          ] })
        ] })
      ] })
    ] }) })
  ] });
}
function SimplePreviewPanel({
  data
}) {
  const age = ageFromBirthDate(data.patient.birth_date ?? null);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "overflow-hidden border-2 border-[#C5B358]/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "relative min-h-[420px] space-y-4 bg-white p-6 text-black", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-0 top-24 flex justify-center opacity-[0.06]", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-40 rounded-full border-[3px] border-[#C5B358] font-serif text-7xl leading-[10rem] text-[#C5B358]", children: "C" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-serif text-lg font-bold tracking-wide text-[#C5B358]", children: data.professional.full_name.toUpperCase() }),
      (data.professional.specialty || data.professional.crm) && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[9px] uppercase tracking-widest text-[#C5B358]/90", children: [data.professional.specialty, data.professional.crm].filter(Boolean).join(" · ") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold underline decoration-1 underline-offset-4", children: "RECEITUÁRIO" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative space-y-1 text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold uppercase tracking-wide", children: "Dados do paciente" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: data.patient.full_name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-muted-foreground", children: [data.patient.cpf ? `CPF: ${maskCPF(data.patient.cpf)}` : null, age !== null ? `Idade: ${age} anos` : null, `Data: ${fmtDate(data.date)}`].filter(Boolean).join(" · ") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative space-y-4 text-[11px]", children: data.items.filter((i) => i.medication.trim()).map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0", children: [
          i.position,
          ".",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-bold", children: [
            i.medication.toUpperCase(),
            i.concentration ? ` ${i.concentration}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-4 flex-1 border-b border-dotted border-black/40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-right text-[10px] font-normal", children: formatRxQuantityLabel(i.quantity) })
      ] }),
      (i.dosage || i.route || i.frequency || i.duration) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 pl-4 italic", children: [
        "Tomar",
        " ",
        [i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null].filter(Boolean).join(", "),
        "."
      ] }),
      i.instructions && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "pl-4 italic", children: i.instructions })
    ] }, i.position)) }),
    data.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "relative text-[11px] italic", children: data.notes }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-8 space-y-1 text-center text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto w-3/5 border-t border-black" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: formatSignedProfessionalName(data.professional.full_name) }),
      data.professional.crm && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: data.professional.crm }),
      data.professional.cpf && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        "CPF: ",
        maskCPF(data.professional.cpf)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute inset-x-0 bottom-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px bg-[#C5B358]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 bg-[#1A3021]" })
    ] })
  ] }) });
}
function StandardPreviewPanel({
  data
}) {
  const accent = data.type === "especial" ? "border-sky-500" : "border-orange-500";
  const age = ageFromBirthDate(data.patient.birth_date ?? null);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: `border-2 ${accent}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-3 bg-white p-5 font-serif text-xs text-black", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-between gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-bold", children: data.clinic.name }),
      data.clinic.address && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px]", children: data.clinic.address }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px]", children: [data.clinic.phone, data.clinic.email].filter(Boolean).join(" · ") }),
      data.clinic.cnpj && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px]", children: [
        "CNPJ: ",
        data.clinic.cnpj
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-y py-1 text-center font-bold uppercase tracking-wide", children: TYPE_LABEL[data.type] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Paciente: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: data.patient.full_name })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Data: ",
        fmtDate(data.date)
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[11px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "CPF: ",
        data.patient.cpf ? maskCPF(data.patient.cpf) : "—"
      ] }),
      age !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Idade: ",
        age,
        " anos"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: data.items.filter((i) => i.medication.trim()).map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold", children: [
        i.position,
        ". ",
        i.medication.toUpperCase(),
        i.concentration ? ` ${i.concentration}` : ""
      ] }),
      (i.pharmaceutical_form || i.quantity) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pl-3", children: i.quantity && /caixa/i.test(i.quantity) ? i.quantity : [i.pharmaceutical_form, i.quantity].filter(Boolean).join(" — ") }),
      (i.dosage || i.route || i.frequency || i.duration) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pl-3", children: [
        "Tomar",
        " ",
        [i.dosage, i.route ? `via ${i.route.toLowerCase()}` : null, i.frequency, i.duration ? `por ${i.duration}` : null].filter(Boolean).join(", "),
        "."
      ] }),
      i.instructions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pl-3 italic", children: i.instructions })
    ] }, i.position)) }),
    data.notes && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t pt-2 text-[11px] italic", children: [
      "Obs.: ",
      data.notes
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t pt-3 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold", children: data.professional.full_name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px]", children: [data.professional.crm, data.professional.specialty].filter(Boolean).join(" · ") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-[10px]", children: "Assinatura: ______________________________" })
    ] })
  ] }) });
}
export {
  NewPrescription as component
};
