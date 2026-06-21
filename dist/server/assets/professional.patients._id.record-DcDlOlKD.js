import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo, useRef, Fragment as Fragment$1 } from "react";
import { s as supabase, t as todayISO, d as fmt, P as fmtDateTimeFromDate, L as fmtDateFromDate } from "../server.js";
import { toast } from "sonner";
import { f as formatFileSizeKb, c as compressForUpload } from "./media-compress-Cz9BOr4H.js";
import { GripVertical, ArrowLeftRight, Loader2, ImageOff, ChevronDown, X, Search, Flag, CalendarCheck, FilePenLine, Camera, Salad, LayoutGrid, FlaskConical, Columns2, Paperclip, FileText, Image, DollarSign, CheckCircle2 } from "lucide-react";
import { E as cn, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, ae as DialogDescription, L as Label, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, B as Button, q as Badge, I as Input, T as Textarea, y as DialogFooter, u as useAuth, aG as TooltipProvider, aH as Tooltip, aI as TooltipTrigger, aJ as TooltipContent, aV as Separator$1, aN as Sheet, aO as SheetContent, aP as SheetHeader, aQ as SheetTitle, aW as SheetDescription, C as Card, f as CardContent, aX as Route, D as DashboardShell, z as randomUUID } from "./router-DKQJQoSP.js";
import { P as PatientSessionsDialog } from "./patient-sessions-dialog-BXFXf94l.js";
import { Panel, Group, Separator } from "react-resizable-panels";
import { S as ScrollArea } from "./scroll-area-PxN7ZI4Y.js";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useNavigate } from "@tanstack/react-router";
import { S as SessionCheckoffDialog } from "./session-history-dialog-WB9jLVnI.js";
import { u as useServerFn } from "./createSsrRpc-tPKO4KfQ.js";
import { J as setupPostConsultationFollowUp } from "./whatsapp-crm.functions-ymrxBlWd.js";
import { d as ageFromBirthDate, s as shortDisplayName } from "./patient-utils-YNqCHR6o.js";
import "node:crypto";
import "@supabase/supabase-js";
import "@tanstack/react-query";
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
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-progress";
import "./server-CAXiU2vY.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "./auth-middleware-BBfyoGmP.js";
const ResizablePanelGroup = ({ className, ...props }) => /* @__PURE__ */ jsx(
  Group,
  {
    className: cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className),
    ...props
  }
);
const ResizablePanel = Panel;
const ResizableHandle = ({
  withHandle,
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  Separator,
  {
    className: cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    ),
    ...props,
    children: withHandle && /* @__PURE__ */ jsx("div", { className: "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border", children: /* @__PURE__ */ jsx(GripVertical, { className: "h-2.5 w-2.5" }) })
  }
);
const PHOTO_GROUP_RE = /^Foto do dia (\d{2}\/\d{2}\/\d{4})$/;
function parsePhotoGroupDateLabel(evolutionText) {
  const match = evolutionText.trim().match(PHOTO_GROUP_RE);
  return match ? match[1] : null;
}
function parseBRDateLabel(label) {
  const [day, month, year] = label.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}
async function signedPhotoUrl(storagePath) {
  const { data, error } = await supabase.storage.from("patient-documents").createSignedUrl(storagePath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
async function loadBeforeAfterDateGroups(patientId) {
  const { data, error } = await supabase.from("patient_evolutions").select(
    "id, created_at, evolution_text, evolution_attachments(id, storage_path, file_name, mime_type, caption)"
  ).eq("patient_id", patientId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const byDate = /* @__PURE__ */ new Map();
  for (const row of data ?? []) {
    const dateLabel = parsePhotoGroupDateLabel(row.evolution_text);
    if (!dateLabel) continue;
    const attachments = row.evolution_attachments ?? [];
    const images = attachments.filter((att) => att.mime_type.startsWith("image/"));
    if (images.length === 0) continue;
    const existing = byDate.get(dateLabel);
    if (!existing || new Date(row.created_at) > new Date(existing.createdAt)) {
      byDate.set(dateLabel, {
        dateLabel,
        sortKey: parseBRDateLabel(dateLabel),
        evolutionId: row.id,
        createdAt: row.created_at,
        photos: images.slice(0, 2)
      });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => b.sortKey - a.sortKey);
}
function pickComparisonDates(groups, dateX, dateY) {
  const a = groups.find((g) => g.dateLabel === dateX);
  const b = groups.find((g) => g.dateLabel === dateY);
  if (!a || !b || dateX === dateY) return null;
  if (a.sortKey <= b.sortKey) {
    return { top: a, bottom: b };
  }
  return { top: b, bottom: a };
}
function StoryPhotoCell({
  url,
  alt,
  className
}) {
  if (!url) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "flex items-center justify-center bg-muted/80 text-muted-foreground",
          className
        ),
        children: /* @__PURE__ */ jsx(ImageOff, { className: "size-5 opacity-50" })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    "img",
    {
      src: url,
      alt,
      className: cn("size-full object-cover", className),
      loading: "lazy"
    }
  );
}
function StoryRow({
  dateLabel,
  urls,
  position
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "shrink-0 px-2 py-1.5 text-center text-[11px] font-semibold tracking-wide",
          position === "top" ? "bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white" : "bg-gradient-to-r from-primary/90 to-teal-600/90 text-white"
        ),
        children: dateLabel
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-2", children: [
      /* @__PURE__ */ jsx(StoryPhotoCell, { url: urls[0], alt: `${dateLabel} — foto 1` }),
      /* @__PURE__ */ jsx(
        StoryPhotoCell,
        {
          url: urls[1],
          alt: `${dateLabel} — foto 2`,
          className: "border-l border-white/20"
        }
      )
    ] })
  ] });
}
function BeforeAfterComparisonDialog({
  open,
  onOpenChange,
  patientId,
  patientName
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [dateX, setDateX] = useState("");
  const [dateY, setDateY] = useState("");
  const [urlCache, setUrlCache] = useState({});
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadBeforeAfterDateGroups(patientId);
      setGroups(data);
      if (data.length >= 2) {
        setDateX(data[1].dateLabel);
        setDateY(data[0].dateLabel);
      } else {
        setDateX("");
        setDateY("");
      }
    } catch (e) {
      toast.error(e.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);
  useEffect(() => {
    if (!open) return;
    void loadGroups();
  }, [open, loadGroups]);
  const comparison = useMemo(() => {
    if (!dateX || !dateY) return null;
    return pickComparisonDates(groups, dateX, dateY);
  }, [groups, dateX, dateY]);
  useEffect(() => {
    if (!comparison) return;
    let cancelled = false;
    (async () => {
      const paths = [
        ...comparison.top.photos.map((p) => p.storage_path),
        ...comparison.bottom.photos.map((p) => p.storage_path)
      ];
      const unique = [...new Set(paths)];
      const entries = await Promise.all(
        unique.map(async (path) => [path, await signedPhotoUrl(path)])
      );
      if (cancelled) return;
      const next = {};
      for (const [path, url] of entries) {
        if (url) next[path] = url;
      }
      setUrlCache((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [comparison]);
  const topUrls = useMemo(() => {
    if (!comparison) return [null, null];
    return [
      comparison.top.photos[0] ? urlCache[comparison.top.photos[0].storage_path] ?? null : null,
      comparison.top.photos[1] ? urlCache[comparison.top.photos[1].storage_path] ?? null : null
    ];
  }, [comparison, urlCache]);
  const bottomUrls = useMemo(() => {
    if (!comparison) return [null, null];
    return [
      comparison.bottom.photos[0] ? urlCache[comparison.bottom.photos[0].storage_path] ?? null : null,
      comparison.bottom.photos[1] ? urlCache[comparison.bottom.photos[1].storage_path] ?? null : null
    ];
  }, [comparison, urlCache]);
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[92vh] max-w-lg overflow-y-auto", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ArrowLeftRight, { className: "size-5 text-amber-600" }),
        "Comparação Antes x Depois"
      ] }),
      /* @__PURE__ */ jsx(DialogDescription, { children: patientName ? `Montagem vertical das fotos de ${patientName}, organizadas por data.` : "Selecione duas datas para comparar as fotos no formato Stories." })
    ] }),
    loading ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }),
      "Carregando fotos…"
    ] }) : groups.length < 2 ? /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground", children: [
      "É necessário ter fotos de ",
      /* @__PURE__ */ jsx("strong", { children: "Antes x Depois" }),
      " em pelo menos",
      " ",
      /* @__PURE__ */ jsx("strong", { children: "duas datas" }),
      " diferentes para gerar a comparação."
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Data superior (mais antiga)" }),
          /* @__PURE__ */ jsxs(Select, { value: dateX, onValueChange: setDateX, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione a data" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: groups.map((group) => /* @__PURE__ */ jsxs(SelectItem, { value: group.dateLabel, children: [
              group.dateLabel,
              " (",
              group.photos.length,
              " foto",
              group.photos.length !== 1 ? "s" : "",
              ")"
            ] }, group.dateLabel)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Data inferior (mais recente)" }),
          /* @__PURE__ */ jsxs(Select, { value: dateY, onValueChange: setDateY, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione a data" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: groups.map((group) => /* @__PURE__ */ jsxs(SelectItem, { value: group.dateLabel, children: [
              group.dateLabel,
              " (",
              group.photos.length,
              " foto",
              group.photos.length !== 1 ? "s" : "",
              ")"
            ] }, group.dateLabel)) })
          ] })
        ] })
      ] }),
      dateX === dateY ? /* @__PURE__ */ jsx("p", { className: "text-center text-sm text-destructive", children: "Selecione duas datas diferentes para comparar." }) : comparison ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-center text-xs text-muted-foreground", children: [
          "Formato Stories — 2 fotos de cima (",
          comparison.top.dateLabel,
          ") · 2 fotos de baixo (",
          comparison.bottom.dateLabel,
          ")"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-foreground/10 bg-black shadow-2xl", children: /* @__PURE__ */ jsxs("div", { className: "flex aspect-[9/16] flex-col", children: [
          /* @__PURE__ */ jsx(
            StoryRow,
            {
              dateLabel: comparison.top.dateLabel,
              urls: topUrls,
              position: "top"
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "h-0.5 shrink-0 bg-white/30" }),
          /* @__PURE__ */ jsx(
            StoryRow,
            {
              dateLabel: comparison.bottom.dateLabel,
              urls: bottomUrls,
              position: "bottom"
            }
          )
        ] }) })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-muted/30 p-3", children: [
        /* @__PURE__ */ jsxs("p", { className: "mb-2 text-xs font-medium text-muted-foreground", children: [
          "Fotos por data (",
          groups.length,
          ")"
        ] }),
        /* @__PURE__ */ jsx("ul", { className: "max-h-32 space-y-1 overflow-y-auto text-xs", children: groups.map((group) => /* @__PURE__ */ jsxs(
          "li",
          {
            className: "flex items-center justify-between gap-2 rounded px-1 py-0.5",
            children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: group.dateLabel }),
              /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                group.photos.length,
                " imagem",
                group.photos.length !== 1 ? "ns" : ""
              ] })
            ]
          },
          group.dateLabel
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Fechar" }) })
  ] }) });
}
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
let cache = null;
let loadPromise = null;
function loadCID10List() {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    loadPromise = fetch("/data/cid10.json").then((res) => {
      if (!res.ok) throw new Error("Não foi possível carregar a tabela CID-10.");
      return res.json();
    }).then((data) => {
      cache = data;
      return data;
    });
  }
  return loadPromise;
}
function searchCID10(list, query, limit = 20) {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const qLower = q.toLowerCase();
  const qCode = q.toUpperCase().replace(/\./g, "");
  return list.filter((c) => {
    const codeNorm = c.code.toUpperCase().replace(/\./g, "");
    return codeNorm.includes(qCode) || c.description.toLowerCase().includes(qLower);
  }).slice(0, limit);
}
function bmiClass(bmi) {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidade";
}
const CLINICAL_FIELD_LABELS = {
  consultReason: "Qual o motivo da consulta?",
  familyHistory: "HF — Histórico Familiar de Doenças",
  personalHistory: "HPP — Histórico de Patologia Pessoal",
  continuousMedication: "Faz uso de medicação contínua?",
  supplementation: "Faz uso de alguma suplementação?",
  sleepQuality: "Como está a qualidade do seu sono?",
  bowelFunction: "Seu intestino funciona bem?",
  libido: "Como está seu libido hoje?",
  foodAllergies: "Possui alguma intolerância/alergia alimentar?",
  diet: "Como está sua alimentação hoje?",
  physicalActivity: "Pratica alguma atividade física?"
};
const emptyEvolutionForm = () => ({
  systolic: "",
  diastolic: "",
  hr: "",
  temp: "",
  weight: "",
  height: "",
  spo2: "",
  glucose: "",
  consultReason: "",
  familyHistory: "",
  personalHistory: "",
  continuousMedication: "",
  supplementation: "",
  sleepQuality: "",
  bowelFunction: "",
  libido: "",
  foodAllergies: "",
  diet: "",
  physicalActivity: "",
  cid: null,
  diagnosis: "",
  conduct: "",
  notes: ""
});
function buildClinicalHistory(v) {
  const lines = [
    v.familyHistory && `${CLINICAL_FIELD_LABELS.familyHistory}
${v.familyHistory}`,
    v.personalHistory && `${CLINICAL_FIELD_LABELS.personalHistory}
${v.personalHistory}`,
    v.continuousMedication && `${CLINICAL_FIELD_LABELS.continuousMedication}
${v.continuousMedication}`,
    v.supplementation && `${CLINICAL_FIELD_LABELS.supplementation}
${v.supplementation}`,
    v.sleepQuality && `${CLINICAL_FIELD_LABELS.sleepQuality}
${v.sleepQuality}`,
    v.bowelFunction && `${CLINICAL_FIELD_LABELS.bowelFunction}
${v.bowelFunction}`,
    v.libido && `${CLINICAL_FIELD_LABELS.libido}
${v.libido}`,
    v.foodAllergies && `${CLINICAL_FIELD_LABELS.foodAllergies}
${v.foodAllergies}`,
    v.diet && `${CLINICAL_FIELD_LABELS.diet}
${v.diet}`,
    v.physicalActivity && `${CLINICAL_FIELD_LABELS.physicalActivity}
${v.physicalActivity}`
  ].filter(Boolean);
  return lines.join("\n\n");
}
function buildEvolutionText(v) {
  const clinicalHistory = buildClinicalHistory(v);
  const lines = [
    v.consultReason && `${CLINICAL_FIELD_LABELS.consultReason}
${v.consultReason}`,
    clinicalHistory || null,
    v.diagnosis && `Diagnóstico: ${v.diagnosis}`,
    v.cid && `CID-10: ${v.cid.code} - ${v.cid.description}`,
    v.conduct && `Conduta: ${v.conduct}`,
    v.notes && `Observações: ${v.notes}`
  ].filter(Boolean);
  return lines.join("\n\n");
}
const CLINICAL_FIELDS = [
  "consultReason",
  "familyHistory",
  "personalHistory",
  "continuousMedication",
  "supplementation",
  "sleepQuality",
  "bowelFunction",
  "libido",
  "foodAllergies",
  "diet",
  "physicalActivity"
];
function EvolutionClinicalForm({
  values,
  onChange,
  cidQuery,
  onCidQueryChange
}) {
  const [cidList, setCidList] = useState([]);
  const [cidLoading, setCidLoading] = useState(true);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  useEffect(() => {
    void loadCID10List().then(setCidList).catch((e) => toast.error(e.message)).finally(() => setCidLoading(false));
  }, []);
  const cidResults = useMemo(
    () => values.cid || cidLoading ? [] : searchCID10(cidList, cidQuery),
    [cidQuery, values.cid, cidList, cidLoading]
  );
  const bmi = useMemo(() => {
    const w = parseFloat(values.weight);
    const h = parseFloat(values.height);
    if (!w || !h) return null;
    const v = w / Math.pow(h / 100, 2);
    return { value: v.toFixed(1), label: bmiClass(v) };
  }, [values.weight, values.height]);
  const field = (key) => (val) => onChange({ [key]: val });
  const hasVitals = Boolean(
    values.systolic || values.diastolic || values.hr || values.temp || values.weight || values.height || values.spo2 || values.glucose
  );
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 p-4", children: [
    /* @__PURE__ */ jsx(Collapsible, { open: vitalsOpen, onOpenChange: setVitalsOpen, children: /* @__PURE__ */ jsxs("section", { className: "overflow-hidden rounded-lg border bg-card", children: [
      /* @__PURE__ */ jsx(CollapsibleTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Sinais vitais" }),
              !vitalsOpen && hasVitals && /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px]", children: "Preenchido" })
            ] }),
            /* @__PURE__ */ jsx(
              ChevronDown,
              {
                className: cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  vitalsOpen && "rotate-180"
                )
              }
            )
          ]
        }
      ) }),
      /* @__PURE__ */ jsx(CollapsibleContent, { children: /* @__PURE__ */ jsx("div", { className: "space-y-3 border-t px-3 pb-3 pt-3", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 xl:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "col-span-2 xl:col-span-1", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Pressão (mmHg)" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                placeholder: "Sist.",
                value: values.systolic,
                onChange: (e) => field("systolic")(e.target.value),
                className: "h-8 text-sm"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "/" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "number",
                placeholder: "Diast.",
                value: values.diastolic,
                onChange: (e) => field("diastolic")(e.target.value),
                className: "h-8 text-sm"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "FC (bpm)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: values.hr,
              onChange: (e) => field("hr")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Temp. (°C)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              step: "0.1",
              value: values.temp,
              onChange: (e) => field("temp")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Peso (kg)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              step: "0.1",
              value: values.weight,
              onChange: (e) => field("weight")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Altura (cm)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              step: "0.1",
              value: values.height,
              onChange: (e) => field("height")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "IMC" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs", children: bmi ? /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("b", { children: bmi.value }),
            " ",
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
              "· ",
              bmi.label
            ] })
          ] }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "—" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "SpO₂ (%)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: values.spo2,
              onChange: (e) => field("spo2")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Glicemia (mg/dL)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              type: "number",
              value: values.glucose,
              onChange: (e) => field("glucose")(e.target.value),
              className: "mt-1 h-8 text-sm"
            }
          )
        ] })
      ] }) }) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "space-y-3 rounded-lg border bg-card p-3", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Evolução clínica" }),
      CLINICAL_FIELDS.map((key) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs(Label, { className: "text-xs", children: [
          CLINICAL_FIELD_LABELS[key],
          key === "consultReason" && " *"
        ] }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: values[key],
            onChange: (e) => field(key)(e.target.value),
            rows: key === "consultReason" ? 2 : 2,
            placeholder: key === "consultReason" ? "Descreva o motivo da consulta…" : "Descreva…",
            className: "mt-1 min-h-[3.5rem] resize-y text-sm"
          }
        )
      ] }, key))
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "space-y-3 rounded-lg border bg-card p-3", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", children: "Diagnóstico e conduta" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "CID-10" }),
        values.cid ? /* @__PURE__ */ jsx("div", { className: "mt-1", children: /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-2 px-2 py-1 text-xs", children: [
          values.cid.code,
          " - ",
          values.cid.description,
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => {
                onChange({ cid: null });
                onCidQueryChange("");
              },
              children: /* @__PURE__ */ jsx(X, { className: "size-3" })
            }
          )
        ] }) }) : /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
          /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              value: cidQuery,
              onChange: (e) => onCidQueryChange(e.target.value),
              placeholder: cidLoading ? "Carregando tabela CID-10…" : "Buscar código ou descrição (ex.: M62, sarcopenia)…",
              disabled: cidLoading,
              className: "h-8 pl-8 text-sm"
            }
          ),
          cidLoading && /* @__PURE__ */ jsx(Loader2, { className: "absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" }),
          cidResults.length > 0 && /* @__PURE__ */ jsx("div", { className: "absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-lg", children: cidResults.map((c) => /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                onChange({ cid: c });
                onCidQueryChange("");
              },
              className: "w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground",
              children: [
                /* @__PURE__ */ jsx("span", { className: "font-mono font-semibold", children: c.code }),
                " · ",
                c.description
              ]
            },
            c.code
          )) }),
          !cidLoading && cidQuery.trim().length >= 2 && cidResults.length === 0 && /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Nenhum CID encontrado." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Diagnóstico descritivo" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: values.diagnosis,
            onChange: (e) => field("diagnosis")(e.target.value),
            rows: 2,
            className: "mt-1 resize-y text-sm"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Conduta e plano terapêutico" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: values.conduct,
            onChange: (e) => field("conduct")(e.target.value),
            rows: 3,
            placeholder: "Conduta, prescrições e orientações…",
            className: "mt-1 resize-y text-sm"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Observações internas" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            value: values.notes,
            onChange: (e) => field("notes")(e.target.value),
            rows: 2,
            placeholder: "Anotações visíveis apenas para profissionais…",
            className: "mt-1 resize-y text-sm"
          }
        )
      ] })
    ] })
  ] });
}
function EvolutionEditor({ saving, onSave }) {
  const [mode, setMode] = useState("form");
  const [form, setForm] = useState(emptyEvolutionForm);
  const [freeText, setFreeText] = useState("");
  const [cidQuery, setCidQuery] = useState("");
  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const clear = () => {
    setForm(emptyEvolutionForm());
    setFreeText("");
    setMode("form");
    setCidQuery("");
  };
  const handleSave = async () => {
    if (mode === "write") {
      if (!freeText.trim()) {
        toast.error("Escreva a evolução antes de salvar.");
        return;
      }
      await onSave(form, { writeMode: true, freeText: freeText.trim() });
    } else {
      if (!form.consultReason.trim()) {
        toast.error("O motivo da consulta é obrigatório.");
        return;
      }
      await onSave(form);
    }
    clear();
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 flex-col rounded-lg border border-primary/10 bg-card shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center justify-between border-b border-primary/10 bg-primary/[0.04] px-4 py-2.5", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-display text-sm font-semibold", children: "Nova evolução" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: clear, disabled: saving, children: "Cancelar" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: mode === "write" ? "secondary" : "outline",
            size: "sm",
            onClick: () => setMode((m) => m === "write" ? "form" : "write"),
            disabled: saving,
            children: "Escrever"
          }
        ),
        /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => void handleSave(), disabled: saving, children: [
          saving ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }) : null,
          "Salvar"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(ScrollArea, { className: "min-h-0 flex-1", children: [
      mode === "write" ? /* @__PURE__ */ jsx(
        Textarea,
        {
          value: freeText,
          onChange: (e) => setFreeText(e.target.value),
          placeholder: "Digite a evolução do paciente…",
          className: "min-h-[280px] resize-none rounded-none border-0 border-b px-4 py-3 text-sm shadow-none focus-visible:ring-0"
        }
      ) : /* @__PURE__ */ jsx(
        EvolutionClinicalForm,
        {
          values: form,
          onChange: patchForm,
          cidQuery,
          onCidQueryChange: setCidQuery
        }
      ),
      mode === "write" && /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 text-right text-xs text-muted-foreground", children: [
        freeText.length,
        " caracteres"
      ] })
    ] })
  ] });
}
function PostConsultationFollowUpDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  appointmentId,
  onComplete
}) {
  const setupFn = useServerFn(setupPostConsultationFollowUp);
  const [contactDate, setContactDate] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!contactDate) {
      toast.error("Selecione a data para a secretária entrar em contato.");
      return;
    }
    setSaving(true);
    try {
      await setupFn({
        data: {
          patientId,
          appointmentId: appointmentId ?? null,
          contactDate,
          secretaryNotes: notes
        }
      });
      toast.success("Follow-up agendado para a recepção");
      onOpenChange(false);
      onComplete();
    } catch (e) {
      toast.error(e.message || "Não foi possível agendar o follow-up");
    } finally {
      setSaving(false);
    }
  };
  const skip = () => {
    onOpenChange(false);
    onComplete();
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Follow-up pós-consulta" }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
      "Consulta de ",
      /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: patientName }),
      " finalizada. Quando a secretária deve entrar em contato?"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "follow-up-date", children: "Data do contato" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "follow-up-date",
            type: "date",
            min: todayISO(),
            value: contactDate,
            onChange: (e) => setContactDate(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "follow-up-notes", children: "O que a secretária deve abordar" }),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            id: "follow-up-notes",
            rows: 4,
            placeholder: "Ex.: confirmar adesão à conduta, tirar dúvidas sobre medicação, convidar para retorno…",
            value: notes,
            onChange: (e) => setNotes(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Será criado um lembrete para a recepção, a tag",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-emerald-800", children: "Follow-up Pós-Consulta" }),
        " no WhatsApp (se houver conversa) e a sequência automática pós-consulta (24h, 7d, 15d, 30d)."
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2 sm:gap-0", children: [
      /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: skip, disabled: saving, children: "Pular" }),
      /* @__PURE__ */ jsxs(Button, { type: "button", onClick: () => void submit(), disabled: saving, children: [
        saving ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }) : null,
        "Agendar follow-up"
      ] })
    ] })
  ] }) });
}
const PRICE_TABLES = [
  { value: "particular", label: "Particular" },
  { value: "convenio", label: "Convênio" }
];
function FinishConsultationDialog({
  open,
  onOpenChange,
  patientId
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [packages, setPackages] = useState([]);
  const [roomId, setRoomId] = useState("geral");
  const [priceTable, setPriceTable] = useState("particular");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState({});
  const [patientName, setPatientName] = useState("Paciente");
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [finishedAppointmentId, setFinishedAppointmentId] = useState(null);
  const loadPackages = useCallback(async () => {
    const { data, error } = await supabase.from("patient_session_packages").select("id,service_id,total_sessions,used_sessions,services(name)").eq("patient_id", patientId).eq("status", "active").order("purchased_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPackages(
      (data ?? []).map((row) => {
        const svc = row.services;
        const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
        return {
          id: row.id,
          service_id: row.service_id,
          service_name: name ?? "Procedimento",
          total_sessions: row.total_sessions,
          used_sessions: row.used_sessions
        };
      })
    );
  }, [patientId]);
  const openSessionCheckoff = (pkg) => {
    const remaining = pkg.total_sessions - pkg.used_sessions;
    if (remaining <= 0) return;
    setCheckoffTarget({
      packageId: pkg.id,
      patientName,
      serviceName: pkg.service_name,
      usedSessions: pkg.used_sessions,
      totalSessions: pkg.total_sessions
    });
    setCheckoffOpen(true);
  };
  useEffect(() => {
    if (!open || !profile) return;
    setLoading(true);
    setSearch("");
    setQuantities({});
    setRoomId("geral");
    setPriceTable("particular");
    (async () => {
      const [procRes, roomRes, , patientRes] = await Promise.all([
        supabase.from("services").select("id,name,default_price,session_count").eq("professional_id", profile.id).eq("active", true).order("name"),
        supabase.from("rooms").select("id,name").order("name"),
        loadPackages(),
        supabase.from("patients").select("full_name").eq("id", patientId).maybeSingle()
      ]);
      if (procRes.error) toast.error(procRes.error.message);
      else {
        setProcedures(
          (procRes.data ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            default_price: Number(p.default_price),
            session_count: Number(p.session_count ?? 1)
          }))
        );
      }
      if (roomRes.error) toast.error(roomRes.error.message);
      else setRooms(roomRes.data ?? []);
      setPatientName(patientRes.data?.full_name ?? "Paciente");
      setLoading(false);
    })();
  }, [open, profile, patientId, loadPackages]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [procedures, search]);
  const selectedNew = useMemo(
    () => procedures.filter((p) => (quantities[p.id] ?? 0) > 0),
    [procedures, quantities]
  );
  const estimatedTotal = selectedNew.reduce(
    (sum, p) => sum + p.default_price * (quantities[p.id] ?? 0),
    0
  );
  const setQty = (id, value) => {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setQuantities((prev) => ({ ...prev, [id]: n }));
  };
  const finish = async () => {
    if (!profile) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("finish_consultation", {
      p_patient_id: patientId,
      p_room_id: roomId === "geral" ? null : roomId,
      p_price_table: priceTable,
      p_new_items: selectedNew.map((p) => ({
        service_id: p.id,
        quantity: quantities[p.id]
      })),
      p_session_items: []
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data;
    if (result?.total && result.total > 0) {
      toast.success(`Consulta finalizada · ${fmt(result.total)} lançado no financeiro`);
    } else {
      toast.success("Consulta finalizada");
    }
    onOpenChange(false);
    setFinishedAppointmentId(result?.appointment_id ?? null);
    setFollowUpOpen(true);
  };
  const goToAgenda = () => {
    setFollowUpOpen(false);
    navigate({ to: "/professional/agenda" });
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0", children: [
      /* @__PURE__ */ jsx(DialogHeader, { className: "border-b px-6 py-4", children: /* @__PURE__ */ jsx(DialogTitle, { children: "Finalizar Consultas" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "mb-3 text-sm font-semibold text-foreground", children: "Criar Fatura" }),
          /* @__PURE__ */ jsxs("div", { className: "mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Unidade" }),
              /* @__PURE__ */ jsxs(Select, { value: roomId, onValueChange: setRoomId, children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione" }) }),
                /* @__PURE__ */ jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsx(SelectItem, { value: "geral", children: "Geral" }),
                  rooms.map((room) => /* @__PURE__ */ jsx(SelectItem, { value: room.id, children: room.name }, room.id))
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Tabela / Convênio" }),
              /* @__PURE__ */ jsxs(Select, { value: priceTable, onValueChange: setPriceTable, children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsx(SelectContent, { children: PRICE_TABLES.map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t.value, children: t.label }, t.value)) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Procedimentos" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  placeholder: "Buscar procedimentos",
                  className: "pl-9"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx(ScrollArea, { className: "mt-3 h-52 rounded-md border", children: loading ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-12 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
            "Carregando procedimentos…"
          ] }) : filtered.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-12 text-center text-sm text-muted-foreground", children: "Nenhum procedimento encontrado. Cadastre em Administrativo → Procedimentos." }) : /* @__PURE__ */ jsx("ul", { className: "divide-y", children: filtered.map((proc) => /* @__PURE__ */ jsxs(
            "li",
            {
              className: "flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40",
              children: [
                /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: proc.name }),
                  /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                    fmt(proc.default_price),
                    proc.session_count > 1 && ` · ${proc.session_count} sessões`
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    type: "number",
                    min: 0,
                    value: quantities[proc.id] ?? 0,
                    onChange: (e) => setQty(proc.id, e.target.value),
                    className: "h-8 w-16 shrink-0 text-center"
                  }
                )
              ]
            },
            proc.id
          )) }) })
        ] }),
        packages.length > 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border p-4", children: [
          /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 200, children: /* @__PURE__ */ jsxs(Tooltip, { children: [
            /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs("div", { className: "mb-3 cursor-help", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: "Usar sessões do paciente" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Clique em um pacote para registrar a baixa completa (data, via, lote…)." })
            ] }) }),
            /* @__PURE__ */ jsx(TooltipContent, { side: "top", className: "max-w-xs text-sm", children: "Usar sessões do paciente serve para registrar que o paciente consumiu sessões de um pacote que ele já comprou — sem cobrar de novo." })
          ] }) }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: packages.map((pkg) => {
            const remaining = pkg.total_sessions - pkg.used_sessions;
            const canCheckoff = remaining > 0;
            return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                disabled: !canCheckoff,
                onClick: () => openSessionCheckoff(pkg),
                className: "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: pkg.service_name }),
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                      pkg.used_sessions,
                      "/",
                      pkg.total_sessions,
                      " realizadas · ",
                      remaining,
                      " ",
                      "restantes"
                    ] })
                  ] }),
                  canCheckoff && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-xs font-medium text-primary", children: "Dar baixa" })
                ]
              }
            ) }, pkg.id);
          }) })
        ] }),
        estimatedTotal > 0 && /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground", children: [
          "Total a lançar no financeiro:",
          " ",
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: fmt(estimatedTotal) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Separator$1, {}),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 px-6 py-4", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: saving, children: "Cancelar" }),
        /* @__PURE__ */ jsxs(Button, { onClick: () => void finish(), disabled: saving, children: [
          saving && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
          "Finalizar Consulta"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      SessionCheckoffDialog,
      {
        open: checkoffOpen,
        onOpenChange: setCheckoffOpen,
        target: checkoffTarget,
        onSuccess: () => void loadPackages()
      }
    ),
    /* @__PURE__ */ jsx(
      PostConsultationFollowUpDialog,
      {
        open: followUpOpen,
        onOpenChange: setFollowUpOpen,
        patientId,
        patientName,
        appointmentId: finishedAppointmentId,
        onComplete: goToAgenda
      }
    )
  ] });
}
const MODULES = [
  { id: "receituario", label: "Receituário", key: "rx" },
  { id: "nutrologia", label: "Nutrologia", key: "nutro" }
];
const ICON_STYLES = {
  finish: "text-emerald-600",
  sessions: "text-violet-600",
  rx: "text-primary",
  nutro: "text-lime-600",
  modules: "text-primary",
  photos: "text-rose-600"
};
const PHOTO_OPTIONS = [
  { id: "exams", label: "Exames", icon: FlaskConical, iconClass: "text-sky-600" },
  { id: "before_after", label: "Anexar Antes x Depois", icon: ArrowLeftRight, iconClass: "text-amber-600" },
  { id: "compare", label: "Comparação Antes x Depois", icon: Columns2, iconClass: "text-violet-600" }
];
function RecordBottomBar({
  patientId,
  onSessionsClick,
  onPhotosExamsClick,
  onPhotosBeforeAfterClick,
  onPhotosCompareClick
}) {
  const navigate = useNavigate();
  const [finishOpen, setFinishOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const openPhotoOption = (id) => {
    setPhotosOpen(false);
    if (id === "exams") onPhotosExamsClick?.();
    if (id === "before_after") onPhotosBeforeAfterClick?.();
    if (id === "compare") onPhotosCompareClick?.();
  };
  const openPrescription = () => {
    navigate({
      to: "/professional/prescriptions/new",
      search: { patient_id: patientId }
    });
  };
  const openModule = (moduleId) => {
    if (moduleId === "receituario") {
      setModulesOpen(false);
      openPrescription();
      return;
    }
    toast.info("Módulo em desenvolvimento.");
  };
  const items = [
    {
      key: "finish",
      label: "Finalizar Consulta",
      icon: Flag,
      iconClass: ICON_STYLES.finish,
      onClick: () => setFinishOpen(true)
    },
    ...onSessionsClick ? [
      {
        key: "sessions",
        label: "Dar baixa em sessões",
        icon: CalendarCheck,
        iconClass: ICON_STYLES.sessions,
        onClick: onSessionsClick
      }
    ] : [],
    {
      key: "rx",
      label: "Receituário",
      icon: FilePenLine,
      iconClass: ICON_STYLES.rx,
      onClick: openPrescription
    },
    ...onPhotosExamsClick || onPhotosBeforeAfterClick || onPhotosCompareClick ? [
      {
        key: "photos",
        label: "Fotos",
        icon: Camera,
        iconClass: ICON_STYLES.photos,
        onClick: () => setPhotosOpen(true)
      }
    ] : [],
    {
      key: "nutro",
      label: "Nutrologia",
      icon: Salad,
      iconClass: ICON_STYLES.nutro,
      onClick: () => toast.info("Módulo de nutrologia em desenvolvimento.")
    },
    {
      key: "modules",
      label: "Todos os módulos",
      icon: LayoutGrid,
      iconClass: ICON_STYLES.modules,
      onClick: () => setModulesOpen(true)
    }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "nav",
      {
        "aria-label": "Ações da consulta",
        className: "flex shrink-0 items-center justify-center overflow-x-auto border-t bg-card px-3 py-2.5",
        children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1 sm:gap-0", children: items.map((item, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
          index > 0 && /* @__PURE__ */ jsx("span", { className: "mx-2 hidden text-border sm:inline", "aria-hidden": true, children: "|" }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: item.onClick,
              className: cn(
                "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item.key === "modules" && "text-foreground"
              ),
              children: [
                /* @__PURE__ */ jsx(item.icon, { className: cn("size-4", item.iconClass), strokeWidth: 2 }),
                /* @__PURE__ */ jsx("span", { className: "whitespace-nowrap", children: item.label })
              ]
            }
          )
        ] }, item.key)) })
      }
    ),
    /* @__PURE__ */ jsx(
      FinishConsultationDialog,
      {
        open: finishOpen,
        onOpenChange: setFinishOpen,
        patientId
      }
    ),
    /* @__PURE__ */ jsx(Sheet, { open: photosOpen, onOpenChange: setPhotosOpen, children: /* @__PURE__ */ jsxs(SheetContent, { side: "bottom", className: "rounded-t-xl pb-8", children: [
      /* @__PURE__ */ jsxs(SheetHeader, { children: [
        /* @__PURE__ */ jsx(SheetTitle, { children: "Fotos" }),
        /* @__PURE__ */ jsx(SheetDescription, { children: "Escolha o tipo de foto que deseja anexar." })
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "mt-4 divide-y rounded-lg border", children: PHOTO_OPTIONS.map((option) => {
        const disabled = option.id === "exams" ? !onPhotosExamsClick : option.id === "before_after" ? !onPhotosBeforeAfterClick : !onPhotosCompareClick;
        if (disabled) return null;
        const Icon = option.icon;
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => openPhotoOption(option.id),
            className: "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
            children: [
              /* @__PURE__ */ jsx(Icon, { className: cn("size-4 shrink-0", option.iconClass), strokeWidth: 2 }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: option.label })
            ]
          }
        ) }, option.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsx(Sheet, { open: modulesOpen, onOpenChange: setModulesOpen, children: /* @__PURE__ */ jsxs(SheetContent, { side: "bottom", className: "rounded-t-xl pb-8", children: [
      /* @__PURE__ */ jsxs(SheetHeader, { children: [
        /* @__PURE__ */ jsx(SheetTitle, { children: "Módulos clínicos" }),
        /* @__PURE__ */ jsx(SheetDescription, { children: "Selecione uma ferramenta para este atendimento." })
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "mt-4 divide-y rounded-lg border", children: MODULES.map((mod) => {
        const item = items.find((i) => i.key === mod.key);
        if (!item) return null;
        const Icon = item.icon;
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => openModule(mod.id),
            className: "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
            children: [
              /* @__PURE__ */ jsx(Icon, { className: cn("size-4 shrink-0", item.iconClass), strokeWidth: 2 }),
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: mod.label })
            ]
          }
        ) }, mod.id);
      }) })
    ] }) })
  ] });
}
function openStoragePath(path) {
  return supabase.storage.from("patient-documents").createSignedUrl(path, 120);
}
function AttachmentLink({
  fileName,
  caption,
  sizeKb,
  mimeType,
  storagePath
}) {
  const open = async () => {
    const { data, error } = await openStoragePath(storagePath);
    if (error || !data) {
      toast.error("Erro ao abrir arquivo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };
  const isImage = mimeType.startsWith("image/");
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => void open(),
      className: "flex w-full items-start gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-left text-xs transition hover:bg-muted",
      children: [
        isImage ? /* @__PURE__ */ jsx(Image, { className: "mt-0.5 size-3.5 shrink-0" }) : /* @__PURE__ */ jsx(FileText, { className: "mt-0.5 size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("span", { className: "block truncate font-medium", children: caption || fileName }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: formatFileSizeKb(Number(sizeKb)) })
        ] })
      ]
    }
  );
}
function MediaHistoryCard({
  entry,
  highlight
}) {
  const when = fmtDateTimeFromDate(new Date(entry.created_at), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return /* @__PURE__ */ jsx(Card, { className: cn("w-full", highlight ? "border-primary/40 bg-primary/5" : void 0), children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2 p-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: when }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          entry.profiles?.full_name ?? "Profissional",
          entry.profiles?.specialty ? ` · ${entry.profiles.specialty}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
        highlight && /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "Novo" }),
        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-[10px]", children: entry.mime_type === "application/pdf" && entry.caption?.toLowerCase().includes("receita") ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(FileText, { className: "mr-1 size-3" }),
          "Receita"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Paperclip, { className: "mr-1 size-3" }),
          "Anexo"
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      AttachmentLink,
      {
        fileName: entry.file_name,
        caption: entry.caption,
        sizeKb: Number(entry.file_size_kb),
        mimeType: entry.mime_type,
        storagePath: entry.storage_path
      }
    )
  ] }) });
}
function EvolutionHistoryItem({ entry, highlight }) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.evolution_text.length > 280;
  const shown = expanded || !long ? entry.evolution_text : `${entry.evolution_text.slice(0, 280)}…`;
  const when = fmtDateTimeFromDate(new Date(entry.created_at || entry.date), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return /* @__PURE__ */ jsx(Card, { className: cn("w-full", highlight ? "border-primary/40 bg-primary/5" : void 0), children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2 p-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: when }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          entry.profiles?.full_name ?? "Profissional",
          entry.profiles?.specialty ? ` · ${entry.profiles.specialty}` : ""
        ] })
      ] }),
      highlight && /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "Novo" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-sm leading-relaxed", children: shown }),
    long && /* @__PURE__ */ jsx(Button, { variant: "link", size: "sm", className: "h-auto p-0", onClick: () => setExpanded((v) => !v), children: expanded ? "Ver menos" : "Ver mais" }),
    (entry.evolution_attachments ?? []).length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 pt-1", children: [
      /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-xs font-medium text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Paperclip, { className: "size-3" }),
        "Anexos (",
        (entry.evolution_attachments ?? []).length,
        ")"
      ] }),
      (entry.evolution_attachments ?? []).map((att) => /* @__PURE__ */ jsx(
        AttachmentLink,
        {
          fileName: att.file_name,
          caption: att.caption,
          sizeKb: Number(att.file_size_kb),
          mimeType: att.mime_type,
          storagePath: att.storage_path
        },
        att.id
      ))
    ] })
  ] }) });
}
function EvolutionHistory({
  entries,
  loading,
  highlightKey,
  uploading = false,
  onAddFiles
}) {
  const fileRef = useRef(null);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0 flex-col rounded-lg border bg-card shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 border-b px-4 py-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-display text-sm font-semibold", children: "Histórico" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          entries.length,
          " registro(s)"
        ] })
      ] }),
      onAddFiles && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "h-7 shrink-0 gap-1.5 px-2 text-xs",
            disabled: uploading,
            onClick: () => fileRef.current?.click(),
            title: "Anexar fotos ou PDF",
            children: [
              uploading ? /* @__PURE__ */ jsx(Loader2, { className: "size-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Paperclip, { className: "size-3.5" }),
              "Anexar"
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileRef,
            type: "file",
            accept: "image/*,application/pdf",
            multiple: true,
            className: "hidden",
            onChange: (e) => {
              if (e.target.files?.length) onAddFiles(e.target.files);
              e.target.value = "";
            }
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(ScrollArea, { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsx("div", { className: "p-3", children: loading ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "Carregando…" }) : entries.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "Nenhum registro ainda. Anexe fotos ou escreva uma evolução à direita." }) : entries.map((item, index) => {
      const key = `${item.kind}:${item.data.id}`;
      const highlight = highlightKey === key;
      return /* @__PURE__ */ jsxs(Fragment$1, { children: [
        index > 0 && /* @__PURE__ */ jsx(
          "div",
          {
            className: "my-3 h-1 w-full rounded-full bg-primary/35",
            role: "separator",
            "aria-hidden": true
          }
        ),
        item.kind === "media" ? /* @__PURE__ */ jsx(MediaHistoryCard, { entry: item.data, highlight }) : /* @__PURE__ */ jsx(EvolutionHistoryItem, { entry: item.data, highlight })
      ] }, key);
    }) }) })
  ] });
}
function MediaCaptionDialog({
  open,
  items,
  uploading,
  photoKind,
  groupCaption,
  onCaptionChange,
  onConfirm,
  onCancel
}) {
  const batchMode = Boolean(photoKind && groupCaption);
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange: (v) => !v && !uploading && onCancel(), children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[85vh] max-w-md overflow-y-auto", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: batchMode ? groupCaption : "Legenda do anexo" }) }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: batchMode ? "Todos os arquivos serão salvos em uma única mensagem no histórico, com a data de hoje em cada foto." : "Informe a legenda de cada arquivo antes de salvar no histórico." }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3 py-2", children: items.map((item, index) => /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-md border p-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        item.previewUrl ? /* @__PURE__ */ jsx(
          "img",
          {
            src: item.previewUrl,
            alt: "",
            className: "size-10 shrink-0 rounded object-cover"
          }
        ) : /* @__PURE__ */ jsx("div", { className: "grid size-10 shrink-0 place-items-center rounded bg-muted text-[10px] font-medium", children: "PDF" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "truncate text-xs font-medium", children: item.file.name }),
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: formatFileSizeKb(item.sizeKb) })
        ] })
      ] }),
      batchMode ? /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Legenda: ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: item.caption })
      ] }) : /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs(Label, { htmlFor: `caption-${item.id}`, className: "text-xs", children: [
          "Legenda ",
          items.length > 1 ? `${index + 1}` : "",
          " *"
        ] }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: `caption-${item.id}`,
            value: item.caption,
            onChange: (e) => onCaptionChange(item.id, e.target.value),
            placeholder: "Ex.: antes, depois, raio-x…",
            className: "mt-1 h-9 text-sm",
            autoFocus: index === 0
          }
        )
      ] })
    ] }, item.id)) }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: onCancel, disabled: uploading, children: "Cancelar" }),
      /* @__PURE__ */ jsxs(Button, { onClick: onConfirm, disabled: uploading, children: [
        uploading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }) : null,
        "Salvar no histórico"
      ] })
    ] })
  ] }) });
}
function mergeHistory(evolutions, media) {
  const items = [
    ...evolutions.map((data) => ({ kind: "evolution", data })),
    ...media.map((data) => ({ kind: "media", data }))
  ];
  return items.sort(
    (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
  );
}
function historyHighlightKey(kind, id) {
  return `${kind}:${id}`;
}
function photoDateLabel(date = /* @__PURE__ */ new Date()) {
  return fmtDateFromDate(date);
}
function photoGroupCaption(kind, dateLabel = photoDateLabel()) {
  return kind === "exams" ? `Exame do dia ${dateLabel}` : `Foto do dia ${dateLabel}`;
}
function photoAttachmentCaption(dateLabel = photoDateLabel()) {
  return `Anexo do dia ${dateLabel}`;
}
const APPOINTMENT_PRIORITY = {
  in_progress: 0,
  scheduled: 1,
  confirmed: 1,
  rescheduled: 2,
  completed: 3
};
function todayIso() {
  return todayISO();
}
async function findPatientAppointmentToday(patientId, professionalId) {
  const { data, error } = await supabase.from("appointments").select("id, status, start_time").eq("patient_id", patientId).eq("professional_id", professionalId).eq("date", todayIso()).in("status", ["in_progress", "scheduled", "confirmed", "rescheduled", "completed"]);
  if (error || !data?.length) return null;
  const sorted = [...data].sort((a, b) => {
    const pa = APPOINTMENT_PRIORITY[a.status ?? ""] ?? 9;
    const pb = APPOINTMENT_PRIORITY[b.status ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.start_time ?? "").localeCompare(a.start_time ?? "");
  });
  return sorted[0]?.id ?? null;
}
async function findLinkedMedicalRecord(appointmentId) {
  const { data } = await supabase.from("medical_records").select("id").eq("appointment_id", appointmentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.id ?? null;
}
async function ensureTodayConsultationLinked(patientId, professionalId, tenantId) {
  const appointmentId = await findPatientAppointmentToday(patientId, professionalId);
  if (!appointmentId) return { appointmentId: null, linked: false };
  const existing = await findLinkedMedicalRecord(appointmentId);
  if (existing) return { appointmentId, linked: true };
  const today = todayIso();
  const { data: orphanRecords } = await supabase.from("medical_records").select("id").eq("patient_id", patientId).eq("professional_id", professionalId).eq("date", today).is("appointment_id", null).order("created_at", { ascending: false }).limit(1);
  if (orphanRecords?.[0]) {
    const { error } = await supabase.from("medical_records").update({ appointment_id: appointmentId }).eq("id", orphanRecords[0].id);
    return { appointmentId, linked: !error };
  }
  const { data: orphanEvolutions } = await supabase.from("patient_evolutions").select("id, evolution_text").eq("patient_id", patientId).eq("professional_id", professionalId).eq("date", today).is("medical_record_id", null).order("created_at", { ascending: false }).limit(1);
  if (!orphanEvolutions?.[0]) return { appointmentId, linked: false };
  const evolution = orphanEvolutions[0];
  const { data: mr, error: mrErr } = await supabase.from("medical_records").insert({
    tenant_id: tenantId,
    patient_id: patientId,
    professional_id: professionalId,
    appointment_id: appointmentId,
    date: today,
    notes: evolution.evolution_text
  }).select("id").single();
  if (mrErr || !mr) return { appointmentId, linked: false };
  await supabase.from("patient_evolutions").update({ medical_record_id: mr.id }).eq("id", evolution.id);
  return { appointmentId, linked: true };
}
function RecordPage() {
  const {
    id
  } = Route.useParams();
  const {
    profile
  } = useAuth();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [pendingPhotoKind, setPendingPhotoKind] = useState(null);
  const [highlightKey, setHighlightKey] = useState(null);
  const [financialPending, setFinancialPending] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [todayAppointmentLinked, setTodayAppointmentLinked] = useState(false);
  const photoFileRef = useRef(null);
  const photoKindRef = useRef(null);
  const openPhotoPicker = (kind) => {
    photoKindRef.current = kind;
    photoFileRef.current?.click();
  };
  const clearPendingMedia = useCallback(() => {
    setPendingMedia((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setCaptionDialogOpen(false);
    setPendingPhotoKind(null);
  }, []);
  const loadHistory = useCallback(async () => {
    const [evRes, mediaRes] = await Promise.all([supabase.from("patient_evolutions").select("id, date, created_at, evolution_text, professional_id, profiles:professional_id(full_name, specialty), evolution_attachments(id, storage_path, file_name, mime_type, file_size_kb, caption)").eq("patient_id", id).order("created_at", {
      ascending: false
    }), supabase.from("patient_media_history").select("id, created_at, storage_path, file_name, mime_type, file_size_kb, caption, professional_id, profiles:professional_id(full_name, specialty)").eq("patient_id", id).order("created_at", {
      ascending: false
    })]);
    if (evRes.error) toast.error(evRes.error.message);
    const mediaError = mediaRes.error;
    if (mediaError) toast.error(mediaError.message);
    const evolutions = evRes.data ?? [];
    const media = mediaRes.data ?? [];
    setHistory(mergeHistory(evolutions, media));
  }, [id]);
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const {
        data: p
      } = await supabase.from("patients").select("id, full_name, cpf, phone, email, birth_date").eq("id", id).maybeSingle();
      setPatient(p);
      const [finRes, , linkResult] = await Promise.all([supabase.rpc("patient_has_financial_pending", {
        p_patient_id: id
      }), loadHistory(), ensureTodayConsultationLinked(id, profile.id, profile.tenant_id)]);
      setFinancialPending(Boolean(finRes.data));
      setTodayAppointmentLinked(linkResult.linked);
      setLoading(false);
    })();
  }, [id, profile, loadHistory]);
  const prepareMediaFiles = async (list, options) => {
    setCompressing(true);
    try {
      const dateLabel = photoDateLabel();
      const items = [];
      for (const raw of Array.from(list)) {
        const {
          file,
          sizeKb
        } = await compressForUpload(raw);
        const caption = options?.kind ? photoAttachmentCaption(dateLabel) : "";
        items.push({
          id: randomUUID(),
          file,
          sizeKb,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          caption
        });
      }
      setPendingPhotoKind(options?.kind ?? null);
      setPendingMedia(items);
      setCaptionDialogOpen(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCompressing(false);
    }
  };
  const confirmMediaUpload = async () => {
    if (!profile || pendingMedia.length === 0) return;
    if (!pendingPhotoKind && pendingMedia.some((item) => !item.caption.trim())) {
      toast.error("Preencha a legenda de todos os arquivos.");
      return;
    }
    setUploading(true);
    try {
      if (pendingPhotoKind) {
        const today = todayISO();
        const dateLabel = photoDateLabel();
        const groupText = photoGroupCaption(pendingPhotoKind, dateLabel);
        const {
          data: evolution,
          error: evErr
        } = await supabase.from("patient_evolutions").insert({
          tenant_id: profile.tenant_id,
          patient_id: id,
          professional_id: profile.id,
          date: today,
          evolution_text: groupText
        }).select("id").single();
        if (evErr || !evolution) {
          throw new Error(evErr?.message ?? "Erro ao salvar fotos no histórico");
        }
        const evId = evolution.id;
        for (const item of pendingMedia) {
          const attachmentId = randomUUID();
          const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${id}/media/${attachmentId}/${Date.now()}_${safeName}`;
          const {
            error: upErr
          } = await supabase.storage.from("patient-documents").upload(storagePath, item.file, {
            upsert: false,
            contentType: item.file.type
          });
          if (upErr) throw new Error(upErr.message);
          const {
            error: attErr
          } = await supabase.from("evolution_attachments").insert({
            id: attachmentId,
            tenant_id: profile.tenant_id,
            evolution_id: evId,
            patient_id: id,
            professional_id: profile.id,
            storage_path: storagePath,
            file_name: item.file.name,
            mime_type: item.file.type,
            file_size_kb: item.sizeKb,
            caption: item.caption.trim() || dateLabel
          });
          if (attErr) throw new Error(attErr.message);
        }
        clearPendingMedia();
        await loadHistory();
        setHighlightKey(historyHighlightKey("evolution", evId));
        toast.success(pendingPhotoKind === "exams" ? "Exames salvos no histórico" : "Fotos salvas no histórico");
        setTimeout(() => setHighlightKey(null), 4e3);
        return;
      }
      let saved = 0;
      let lastId = null;
      for (const item of pendingMedia) {
        const mediaId = randomUUID();
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${id}/media/${mediaId}/${Date.now()}_${safeName}`;
        const {
          error: upErr
        } = await supabase.storage.from("patient-documents").upload(storagePath, item.file, {
          upsert: false,
          contentType: item.file.type
        });
        if (upErr) throw new Error(upErr.message);
        const {
          data: row,
          error: dbErr
        } = await supabase.from("patient_media_history").insert({
          id: mediaId,
          tenant_id: profile.tenant_id,
          patient_id: id,
          professional_id: profile.id,
          storage_path: storagePath,
          file_name: item.file.name,
          mime_type: item.file.type,
          file_size_kb: item.sizeKb,
          caption: item.caption.trim()
        }).select("id").single();
        if (dbErr || !row) throw new Error(dbErr?.message ?? "Erro ao salvar anexo");
        saved += 1;
        lastId = row.id;
      }
      clearPendingMedia();
      await loadHistory();
      if (lastId) setHighlightKey(historyHighlightKey("media", lastId));
      toast.success(saved === 1 ? "Anexo salvo no histórico" : `${saved} anexos salvos no histórico`);
      setTimeout(() => setHighlightKey(null), 4e3);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const handleSave = async (form, options) => {
    if (!profile) return;
    setSaving(true);
    try {
      const today = todayISO();
      const appointmentId = await findPatientAppointmentToday(id, profile.id);
      let evId;
      if (options?.writeMode && options.freeText) {
        let medicalRecordId = null;
        if (appointmentId) {
          const {
            data: linked
          } = await supabase.from("medical_records").select("id").eq("appointment_id", appointmentId).order("created_at", {
            ascending: false
          }).limit(1).maybeSingle();
          medicalRecordId = linked?.id ?? null;
          if (!medicalRecordId) {
            const {
              data: mr,
              error: mrErr
            } = await supabase.from("medical_records").insert({
              tenant_id: profile.tenant_id,
              patient_id: id,
              professional_id: profile.id,
              appointment_id: appointmentId,
              date: today,
              notes: options.freeText
            }).select("id").single();
            if (mrErr || !mr) throw new Error(mrErr?.message ?? "Erro ao vincular prontuário");
            medicalRecordId = mr.id;
          }
        }
        const {
          data,
          error
        } = await supabase.from("patient_evolutions").insert({
          tenant_id: profile.tenant_id,
          patient_id: id,
          professional_id: profile.id,
          medical_record_id: medicalRecordId,
          date: today,
          evolution_text: options.freeText
        }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "Erro ao salvar evolução");
        evId = data.id;
        setTodayAppointmentLinked(Boolean(appointmentId && medicalRecordId));
      } else {
        const evolutionText = buildEvolutionText(form) || form.consultReason.trim();
        const clinicalHistory = buildClinicalHistory(form);
        const {
          data: mr,
          error: mrErr
        } = await supabase.from("medical_records").insert({
          tenant_id: profile.tenant_id,
          patient_id: id,
          professional_id: profile.id,
          appointment_id: appointmentId,
          date: today,
          chief_complaint: form.consultReason || null,
          history: clinicalHistory || null,
          physical_exam: null,
          diagnosis: form.diagnosis || null,
          icd10_code: form.cid?.code ?? null,
          icd10_description: form.cid?.description ?? null,
          conduct: form.conduct || null,
          notes: form.notes || null
        }).select("id").single();
        if (mrErr || !mr) throw new Error(mrErr?.message ?? "Erro ao salvar prontuário");
        const {
          data,
          error
        } = await supabase.from("patient_evolutions").insert({
          tenant_id: profile.tenant_id,
          patient_id: id,
          professional_id: profile.id,
          medical_record_id: mr.id,
          date: today,
          evolution_text: evolutionText,
          bp_systolic: form.systolic ? parseInt(form.systolic, 10) : null,
          bp_diastolic: form.diastolic ? parseInt(form.diastolic, 10) : null,
          heart_rate: form.hr ? parseInt(form.hr, 10) : null,
          temperature: form.temp ? parseFloat(form.temp) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          spo2: form.spo2 ? parseInt(form.spo2, 10) : null,
          blood_glucose: form.glucose ? parseInt(form.glucose, 10) : null
        }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "Erro ao salvar evolução");
        evId = data.id;
        setTodayAppointmentLinked(Boolean(appointmentId));
      }
      await loadHistory();
      setHighlightKey(historyHighlightKey("evolution", evId));
      toast.success(appointmentId ? "Evolução salva e vinculada à consulta de hoje" : "Evolução salva no histórico");
      setTimeout(() => setHighlightKey(null), 4e3);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx(DashboardShell, { title: "Prontuário", children: /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "Carregando…" }) });
  }
  if (!patient) {
    return /* @__PURE__ */ jsx(DashboardShell, { title: "Prontuário", children: /* @__PURE__ */ jsx("div", { children: "Paciente não encontrado" }) });
  }
  const age = ageFromBirthDate(patient.birth_date);
  const displayName = shortDisplayName(patient.full_name);
  return /* @__PURE__ */ jsx(DashboardShell, { title: `Prontuário · ${displayName}`, fullWidth: true, children: /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100dvh-4.5rem)] min-h-[36rem] flex-col gap-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: displayName }),
        age !== null && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "," }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
            age,
            " anos"
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "," }),
        /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 200, children: /* @__PURE__ */ jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("span", { className: "inline-flex cursor-default", children: /* @__PURE__ */ jsx(DollarSign, { className: cn("size-4", financialPending ? "text-destructive" : "text-emerald-600"), "aria-label": financialPending ? "Pendência financeira" : "Financeiro em dia" }) }) }),
          /* @__PURE__ */ jsx(TooltipContent, { side: "bottom", children: financialPending ? "Pendência financeira" : "Financeiro em dia" })
        ] }) }),
        todayAppointmentLinked && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1 border-emerald-200 bg-emerald-50 text-emerald-800", children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "size-3" }),
          "Consulta de hoje vinculada"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "h-8 gap-1.5", onClick: () => setSessionsOpen(true), children: [
        /* @__PURE__ */ jsx(CalendarCheck, { className: "size-4" }),
        "Sessões"
      ] })
    ] }),
    /* @__PURE__ */ jsxs(ResizablePanelGroup, { orientation: "horizontal", className: "min-h-0 flex-1", children: [
      /* @__PURE__ */ jsx(ResizablePanel, { defaultSize: 56, minSize: 30, className: "min-h-0 pr-1", children: /* @__PURE__ */ jsx(EvolutionHistory, { entries: history, loading, highlightKey, uploading: uploading || compressing, onAddFiles: (files) => void prepareMediaFiles(files) }) }),
      /* @__PURE__ */ jsx(ResizableHandle, { className: "w-1 rounded-full bg-border transition-colors hover:bg-primary/30" }),
      /* @__PURE__ */ jsx(ResizablePanel, { defaultSize: 44, minSize: 28, className: "min-h-0 pl-1", children: /* @__PURE__ */ jsx("div", { className: "flex h-full min-h-0 flex-col rounded-xl border border-primary/10 bg-muted/40 p-2 ring-1 ring-inset ring-primary/5", children: /* @__PURE__ */ jsx(EvolutionEditor, { saving, onSave: handleSave }) }) })
    ] }),
    /* @__PURE__ */ jsx(MediaCaptionDialog, { open: captionDialogOpen, items: pendingMedia, uploading, photoKind: pendingPhotoKind, groupCaption: pendingPhotoKind ? photoGroupCaption(pendingPhotoKind) : void 0, onCaptionChange: (itemId, caption) => setPendingMedia((prev) => prev.map((item) => item.id === itemId ? {
      ...item,
      caption
    } : item)), onConfirm: () => void confirmMediaUpload(), onCancel: clearPendingMedia }),
    /* @__PURE__ */ jsx(RecordBottomBar, { patientId: id, onSessionsClick: () => setSessionsOpen(true), onPhotosExamsClick: () => openPhotoPicker("exams"), onPhotosBeforeAfterClick: () => openPhotoPicker("before_after"), onPhotosCompareClick: () => setCompareOpen(true) }),
    /* @__PURE__ */ jsx("input", { ref: photoFileRef, type: "file", accept: "image/*,application/pdf", multiple: true, className: "hidden", onChange: (e) => {
      const files = e.target.files;
      const kind = photoKindRef.current;
      photoKindRef.current = null;
      if (files?.length && kind) void prepareMediaFiles(files, {
        kind
      });
      e.target.value = "";
    } }),
    /* @__PURE__ */ jsx(PatientSessionsDialog, { open: sessionsOpen, onOpenChange: setSessionsOpen, patientId: id, patientName: displayName }),
    /* @__PURE__ */ jsx(BeforeAfterComparisonDialog, { open: compareOpen, onOpenChange: setCompareOpen, patientId: id, patientName: displayName })
  ] }) });
}
export {
  RecordPage as component
};
