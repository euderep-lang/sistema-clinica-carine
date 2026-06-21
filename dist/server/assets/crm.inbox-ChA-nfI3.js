import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { _ as fmtMessageTime, P as fmtDateTimeFromDate, f as fmtDate, $ as TEMPLATE_VARS, J as renderTemplate, N as fmtDateTime, s as supabase, a0 as dedupeConversationsByPhone, k as phonesMatch, a1 as fmtRelativeTime } from "../server.js";
import { Link, getRouteApi } from "@tanstack/react-router";
import { u as useServerFn, c as createSsrRpc } from "./createSsrRpc-tPKO4KfQ.js";
import { UserRound, Reply, Loader2, FileText, ExternalLink, Square, Mic, Inbox, UserX, MessageCircle, Timer, Calendar, Plus, X, Pencil, Trash2, Search, Megaphone, Check, Zap, BarChart3, RefreshCw, Bell, ArrowLeft, Info, ArrowRightLeft, MessageSquare, Paperclip, Video, FileAudio, Send, Tag, StickyNote, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { A as Avatar, ak as AvatarImage, E as cn, k as AvatarFallback, al as isDirectMediaUrl, am as waMessageStatusTicks, B as Button, u as useAuth, an as appointmentStatusLabel, ao as QUICK_REPLY_CATEGORY_LABELS, I as Input, T as Textarea, s as Dialog, ap as DialogTrigger, t as DialogContent, w as DialogHeader, x as DialogTitle, c as conversationDisplayName, q as Badge, aq as CHANNEL_LABEL, L as Label, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, y as DialogFooter, ar as TASK_TYPE_LABEL, as as TASK_PRIORITY_LABEL, at as WA_CLOSE_REASONS, au as TAG_COLORS, av as getWaNotificationPermission, aw as conversationPrimaryTagColor, D as DashboardShell, C as Card, ax as isSecureNotificationContext, ay as CHANNEL_BADGE_CLASS, az as formatPhoneBR, aA as WA_STATUS_LABEL, aB as WA_OBJECTION_LABELS, aC as requestWaNotificationPermission, aD as fileToBase64, aE as waInboxFocus } from "./router-DKQJQoSP.js";
import { f as fetchWaContactPhoto, b as getWhatsAppConnection, c as getCrmMetrics, d as getWaPatientContext, h as getWaQuickReplies, s as seedWaQuickReplies, i as seedFollowUpQuickReplies, u as upsertWaQuickReply, j as deleteWaQuickReply, k as searchWaMessagesGlobal, l as getMetaWaTemplates, n as sendWaBroadcast, o as getWaTasks, p as createWaTask, q as completeWaTask, r as getWaTagRules, v as upsertWaTagRule, w as deleteWaTagRule, x as closeWaConversation, y as reopenWaConversation, z as linkWaPatient, A as assignWaConversation, B as assignWaQueueToReception, C as toggleWaConversationTag, D as markWaObjection, E as processWaFollowUps, F as searchWaMessages, G as syncWaChatsFromZApi, H as createWaDeal } from "./whatsapp-crm.functions-ymrxBlWd.js";
import { i as isContactPhotoCacheFresh } from "./wa-contact-photo-nUeTrbPu.js";
import lamejs from "lamejs";
import { N as NewAppointmentDialog } from "./new-appointment-dialog-BI6SH79I.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { S as ScrollArea } from "./scroll-area-PxN7ZI4Y.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BKWVL3n-.js";
import { c as compressForUpload } from "./media-compress-Cz9BOr4H.js";
import { a as createServerFn } from "./server-CAXiU2vY.js";
import { r as requireSupabaseAuth } from "./auth-middleware-BBfyoGmP.js";
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
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "./agenda-utils-CO-C_DbJ.js";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-tabs";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
function useWaContactPhotos(conversations) {
  const photoFn = useServerFn(fetchWaContactPhoto);
  const photoFnRef = useRef(photoFn);
  photoFnRef.current = photoFn;
  const [photos, setPhotos] = useState({});
  const fetchedRef = useRef(/* @__PURE__ */ new Set());
  useEffect(() => {
    const seeded = {};
    for (const c of conversations) {
      if (c.contact_photo_url && isContactPhotoCacheFresh(c.contact_photo_fetched_at)) {
        seeded[c.id] = c.contact_photo_url;
        fetchedRef.current.add(c.id);
      }
    }
    if (Object.keys(seeded).length > 0) {
      setPhotos((prev) => ({ ...prev, ...seeded }));
    }
  }, [conversations]);
  useEffect(() => {
    let cancelled = false;
    const pending = conversations.filter((c) => !fetchedRef.current.has(c.id)).slice(0, 10);
    if (!pending.length) return;
    for (const c of pending) fetchedRef.current.add(c.id);
    void Promise.all(
      pending.map(async (c) => {
        try {
          const { url } = await photoFnRef.current({ data: { conversationId: c.id } });
          if (!cancelled) {
            setPhotos((prev) => ({ ...prev, [c.id]: url ?? null }));
          }
        } catch {
          if (!cancelled) {
            setPhotos((prev) => ({ ...prev, [c.id]: null }));
          }
        }
      })
    );
    return () => {
      cancelled = true;
    };
  }, [conversations]);
  return photos;
}
const SIZE_CLASS = {
  sm: "size-9",
  md: "size-10",
  lg: "size-12"
};
const ICON_SIZE_CLASS = {
  sm: "size-4",
  md: "size-[1.125rem]",
  lg: "size-5"
};
function CrmContactAvatarFallback({
  tagColor,
  size
}) {
  const hasTag = !!tagColor;
  return /* @__PURE__ */ jsx(
    AvatarFallback,
    {
      className: cn(
        "flex items-center justify-center rounded-full",
        hasTag ? "border border-transparent text-white" : "border border-gray-200 bg-white text-gray-300 dark:border-gray-600 dark:bg-background dark:text-muted-foreground/40"
      ),
      style: hasTag ? { backgroundColor: tagColor } : void 0,
      children: /* @__PURE__ */ jsx(UserRound, { className: ICON_SIZE_CLASS[size], strokeWidth: 2.25, "aria-hidden": true })
    }
  );
}
function CrmContactAvatar({
  name,
  conversationId,
  photoUrl,
  tagColor = null,
  size = "sm",
  className,
  ringClassName
}) {
  return /* @__PURE__ */ jsxs(
    Avatar,
    {
      className: cn(
        SIZE_CLASS[size],
        ringClassName,
        className
      ),
      children: [
        photoUrl ? /* @__PURE__ */ jsx(
          AvatarImage,
          {
            src: photoUrl,
            alt: name,
            referrerPolicy: "no-referrer"
          }
        ) : null,
        /* @__PURE__ */ jsx(CrmContactAvatarFallback, { tagColor, size })
      ]
    }
  );
}
function CrmContactAvatarFromMap({
  name,
  conversationId,
  photos,
  tagColor,
  ...props
}) {
  return /* @__PURE__ */ jsx(
    CrmContactAvatar,
    {
      name,
      conversationId,
      photoUrl: photos[conversationId],
      tagColor,
      ...props
    }
  );
}
function CrmMessageBubble({
  message,
  resolveMediaUrl,
  replyTo,
  onReply,
  highlighted
}) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const loadMedia = useCallback(async () => {
    if (!message.media_id) return;
    if (isDirectMediaUrl(message.media_id)) {
      setMediaUrl(message.media_id);
      return;
    }
    setLoadingMedia(true);
    setMediaError(false);
    try {
      const url = await resolveMediaUrl(message.media_id, message.media_mime);
      setMediaUrl(url);
    } catch {
      setMediaError(true);
    } finally {
      setLoadingMedia(false);
    }
  }, [message.media_id, message.media_mime, resolveMediaUrl]);
  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);
  const openMedia = () => {
    if (mediaUrl) window.open(mediaUrl, "_blank", "noopener,noreferrer");
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "group relative max-w-[min(88%,26rem)] rounded-lg px-3 py-2 text-[13px] leading-relaxed shadow-sm",
        message.direction === "outbound" ? "ml-auto rounded-tr-sm bg-[#d9fdd3] text-zinc-900 dark:bg-emerald-900/40 dark:text-emerald-50" : "rounded-tl-sm bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        highlighted && "ring-2 ring-amber-400/80 ring-offset-2"
      ),
      children: [
        onReply ? /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "absolute -left-8 top-1 hidden rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 lg:block",
            onClick: () => onReply(message),
            title: "Responder",
            children: /* @__PURE__ */ jsx(Reply, { className: "size-3.5" })
          }
        ) : null,
        replyTo ? /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "mb-1 rounded-lg border-l-4 px-2 py-1 text-xs opacity-90",
              message.direction === "outbound" ? "border-emerald-600/30 bg-emerald-900/5" : "border-emerald-500/40 bg-muted/40"
            ),
            children: /* @__PURE__ */ jsx("p", { className: "line-clamp-2", children: replyTo.body ?? replyTo.message_type })
          }
        ) : null,
        message.media_id ? /* @__PURE__ */ jsx("div", { className: "mb-1", children: loadingMedia ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 py-2 text-xs opacity-80", children: [
          /* @__PURE__ */ jsx(Loader2, { className: "size-3.5 animate-spin" }),
          "Carregando mídia…"
        ] }) : mediaError ? /* @__PURE__ */ jsx("button", { type: "button", className: "text-xs underline", onClick: () => void loadMedia(), children: "Falha ao carregar — tentar de novo" }) : message.message_type === "image" && mediaUrl ? /* @__PURE__ */ jsx("button", { type: "button", onClick: openMedia, className: "block overflow-hidden rounded-lg", children: /* @__PURE__ */ jsx(
          "img",
          {
            src: mediaUrl,
            alt: message.media_filename ?? "Imagem",
            className: "max-h-64 w-full object-cover",
            loading: "lazy"
          }
        ) }) : message.message_type === "audio" && mediaUrl ? /* @__PURE__ */ jsx("audio", { controls: true, preload: "metadata", className: "max-w-full", src: mediaUrl, children: /* @__PURE__ */ jsx("track", { kind: "captions" }) }) : message.message_type === "video" && mediaUrl ? /* @__PURE__ */ jsx("video", { controls: true, preload: "metadata", className: "max-h-64 w-full rounded-lg", src: mediaUrl, children: /* @__PURE__ */ jsx("track", { kind: "captions" }) }) : mediaUrl ? /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: openMedia,
            className: "flex items-center gap-2 rounded-md bg-black/10 px-2 py-1.5 text-xs underline",
            children: [
              /* @__PURE__ */ jsx(FileText, { className: "size-3.5 shrink-0" }),
              message.media_filename ?? "Abrir arquivo",
              /* @__PURE__ */ jsx(ExternalLink, { className: "size-3 shrink-0" })
            ]
          }
        ) : null }) : null,
        message.body ? /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap break-words", children: message.body }) : null,
        /* @__PURE__ */ jsxs("p", { className: "mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            fmtMessageTime(message.created_at),
            message.sender_profile?.full_name ? ` · ${message.sender_profile.full_name}` : ""
          ] }),
          message.direction === "outbound" ? /* @__PURE__ */ jsx(
            "span",
            {
              className: cn(
                "font-medium",
                message.status === "read" || message.status === "played" ? "text-sky-600 dark:text-sky-400" : "text-emerald-700/70 dark:text-emerald-300/70"
              ),
              title: message.status,
              children: waMessageStatusTicks(message.status)
            }
          ) : null
        ] })
      ]
    }
  );
}
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const AUDIO_EXTENSIONS = /* @__PURE__ */ new Set(["mp3", "ogg", "m4a", "aac", "webm", "wav", "opus"]);
function mimeFromFilename$1(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
    case "heif":
      return "image/heic";
    case "pdf":
      return "application/pdf";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "m4a":
    case "aac":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "wav":
      return "audio/wav";
    default:
      return "";
  }
}
function guessMediaTypeFromFile(file) {
  const mime = (file.type || mimeFromFilename$1(file.name)).toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "document";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && IMAGE_EXTENSIONS.has(ext)) return "image";
  if (ext && AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (ext === "pdf") return "document";
  return "document";
}
async function prepareImageFileForWhatsApp(file) {
  const mime = (file.type || mimeFromFilename$1(file.name)).toLowerCase();
  if (mime.includes("heic") || mime.includes("heif")) {
    throw new Error(
      "Fotos HEIC não são suportadas aqui. No iPhone: Ajustes → Câmera → Formatos → Mais compatível, ou envie JPG/PNG."
    );
  }
  try {
    const { file: compressed } = await compressForUpload(file);
    return compressed;
  } catch (e) {
    const msg = e.message;
    if (msg.includes("Formato não suportado")) {
      throw new Error("Use JPG, PNG ou WebP para enviar fotos.");
    }
    throw e;
  }
}
async function prepareDocumentFileForWhatsApp(file) {
  const { file: prepared } = await compressForUpload(file);
  return prepared;
}
const WHATSAPP_AUDIO_MIMES = /* @__PURE__ */ new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/aac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a"
]);
function mimeFromFilename(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "m4a":
    case "aac":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "wav":
      return "audio/wav";
    default:
      return "";
  }
}
function isWhatsAppReadyAudio(mime) {
  const m = mime.toLowerCase();
  if (WHATSAPP_AUDIO_MIMES.has(m)) return true;
  return m.includes("ogg") || m.includes("mpeg") || m.includes("mp3");
}
function floatTo16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return out;
}
async function convertAudioToMp3(file) {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const sampleRate = decoded.sampleRate;
    const left = floatTo16(decoded.getChannelData(0));
    const channels = decoded.numberOfChannels;
    const right = channels > 1 ? floatTo16(decoded.getChannelData(1)) : left;
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
    const mp3Chunks = [];
    const block = 1152;
    for (let i = 0; i < left.length; i += block) {
      const l = left.subarray(i, i + block);
      const r = right.subarray(i, i + block);
      const buf = channels > 1 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
      if (buf.length > 0) mp3Chunks.push(buf);
    }
    const tail = encoder.flush();
    if (tail.length > 0) mp3Chunks.push(tail);
    const blob = new Blob(mp3Chunks, { type: "audio/mpeg" });
    const baseName = file.name.replace(/\.[^.]+$/, "") || `audio-${Date.now()}`;
    return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
  } finally {
    await ctx.close();
  }
}
async function prepareAudioFileForWhatsApp(file) {
  const mime = (file.type || mimeFromFilename(file.name)).toLowerCase();
  if (isWhatsAppReadyAudio(mime)) {
    if (!file.type && mime) {
      return new File([file], file.name, { type: mime });
    }
    return file;
  }
  return convertAudioToMp3(file);
}
function canRecordAudio() {
  return typeof window !== "undefined" && window.isSecureContext && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}
function CrmAudioRecorder({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  useEffect(() => {
    return () => {
      mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const start = async () => {
    if (disabled || recording) return;
    if (!canRecordAudio()) {
      toast.error(
        "Microfone indisponível neste endereço. Use HTTPS (ngrok) ou anexe um arquivo de áudio pelo clipe.",
        { duration: 8e3 }
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const durationMs = Date.now() - startedAtRef.current;
        if (durationMs < 400 || chunksRef.current.length === 0) {
          toast.info("Gravação muito curta. Segure o botão e fale por pelo menos 1 segundo.");
          return;
        }
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        onRecorded(new File([blob], `audio-${Date.now()}.${ext}`, { type }));
      };
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Permissão negada";
      toast.error(`Não foi possível gravar áudio: ${msg}`);
    }
  };
  const stop = () => {
    if (!recording || !mediaRef.current) return;
    if (mediaRef.current.state !== "inactive") {
      mediaRef.current.requestData();
      mediaRef.current.stop();
    }
    setRecording(false);
  };
  return /* @__PURE__ */ jsx(
    Button,
    {
      type: "button",
      variant: "ghost",
      size: "icon",
      disabled,
      className: cn("size-9 shrink-0 rounded-full", recording && "animate-pulse bg-red-500/10 text-red-600 hover:bg-red-500/20"),
      onClick: () => recording ? stop() : void start(),
      title: recording ? "Parar e enviar gravação" : "Gravar áudio",
      children: recording ? /* @__PURE__ */ jsx(Square, { className: "size-4" }) : /* @__PURE__ */ jsx(Mic, { className: "size-4" })
    }
  );
}
function getSupportedMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac"
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}
function CrmConnectionBadge({ subtle }) {
  const statusFn = useServerFn(getWhatsAppConnection);
  const [connected, setConnected] = useState(null);
  useEffect(() => {
    const load = () => void statusFn().then((s) => setConnected(s.connected ?? false));
    load();
    const id = window.setInterval(load, 6e4);
    return () => window.clearInterval(id);
  }, [statusFn]);
  if (connected === null) {
    return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "size-3 animate-spin" }),
      "Conectando…"
    ] });
  }
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        connected ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
        subtle && "bg-transparent px-0 py-0"
      ),
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: cn(
              "size-1.5 rounded-full",
              connected ? "animate-pulse bg-emerald-500" : "bg-amber-500"
            )
          }
        ),
        connected ? "Online" : "Offline"
      ]
    }
  );
}
function CrmMetricsStrip({ onFilterUnassigned, onFilterUnread, compact }) {
  const metricsFn = useServerFn(getCrmMetrics);
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    const load = () => void metricsFn().then(setMetrics);
    load();
    const id = window.setInterval(load, 3e4);
    return () => window.clearInterval(id);
  }, [metricsFn]);
  if (!metrics) return null;
  const items = [
    { label: "Abertas", value: metrics.open, icon: Inbox, highlight: false, onClick: void 0 },
    {
      label: "Fila",
      value: metrics.unassigned,
      icon: UserX,
      highlight: metrics.unassigned > 0,
      onClick: onFilterUnassigned
    },
    {
      label: "Não lidas",
      value: metrics.unreadTotal,
      icon: MessageCircle,
      highlight: metrics.unreadTotal > 0,
      onClick: onFilterUnread
    },
    { label: "Hoje", value: metrics.closedToday, icon: Timer, highlight: false, onClick: void 0 }
  ];
  if (compact) {
    return /* @__PURE__ */ jsxs("div", { className: "hidden items-center gap-1.5 md:flex", children: [
      items.map(({ label, value, icon: Icon, highlight, onClick }) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          disabled: !onClick,
          onClick,
          className: cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition",
            highlight ? "bg-amber-500/10 text-amber-900 dark:text-amber-200" : "text-muted-foreground hover:bg-muted/60",
            onClick && "cursor-pointer"
          ),
          children: [
            /* @__PURE__ */ jsx(Icon, { className: "size-3.5 opacity-70" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold tabular-nums text-foreground", children: value }),
            /* @__PURE__ */ jsx("span", { className: "hidden lg:inline", children: label })
          ]
        },
        label
      )),
      metrics.avgFirstResponseMinutes != null ? /* @__PURE__ */ jsxs("span", { className: "ml-1 hidden rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground xl:inline", children: [
        "1ª resp. ~",
        metrics.avgFirstResponseMinutes,
        " min"
      ] }) : null
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden", children: items.map(({ label, value, icon: Icon, highlight, onClick }) => /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled: !onClick,
      className: cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition",
        highlight ? "bg-amber-500/15 text-amber-900 dark:text-amber-100" : "bg-muted/50 text-muted-foreground",
        onClick && "cursor-pointer active:scale-[0.98]"
      ),
      children: [
        /* @__PURE__ */ jsx(Icon, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: value }),
        /* @__PURE__ */ jsx("span", { children: label })
      ]
    },
    label
  )) });
}
function CrmPatientPanel({ patientId, patientName }) {
  const { profile } = useAuth();
  const contextFn = useServerFn(getWaPatientContext);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [lastCompleted, setLastCompleted] = useState(null);
  const loadContext = useCallback(() => {
    setLoading(true);
    return contextFn({ data: { patientId } }).then((ctx) => {
      setUpcoming(ctx.upcoming);
      setLastCompleted(ctx.lastCompleted);
    }).finally(() => setLoading(false));
  }, [contextFn, patientId]);
  useEffect(() => {
    void loadContext();
  }, [loadContext]);
  const recordLink = profile?.role === "professional" ? { to: "/professional/patients/$id/record", params: { id: patientId } } : { to: "/reception/pacientes/$id", params: { id: patientId } };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-lg border bg-muted/30 p-3 text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: patientName }),
        /* @__PURE__ */ jsxs(Link, { to: recordLink.to, params: recordLink.params, className: "inline-flex items-center gap-1 text-xs text-primary hover:underline", children: [
          "Prontuário",
          /* @__PURE__ */ jsx(ExternalLink, { className: "size-3" })
        ] })
      ] }),
      loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-2", children: /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin text-muted-foreground" }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        upcoming.length > 0 ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Calendar, { className: "size-3" }),
            "Próximas consultas"
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: upcoming.map((a) => /* @__PURE__ */ jsxs("li", { className: "text-xs", children: [
            fmtDateTimeFromDate(/* @__PURE__ */ new Date(`${a.date}T${a.start_time}`), {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            }),
            " · ",
            a.profiles?.full_name ?? "—",
            " · ",
            appointmentStatusLabel(a.status)
          ] }, a.id)) })
        ] }) : /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Sem consultas futuras agendadas." }),
        lastCompleted ? /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Última consulta:",
          " ",
          fmtDate(`${lastCompleted.date}T${lastCompleted.start_time}`)
        ] }) : null,
        /* @__PURE__ */ jsx(
          Button,
          {
            size: "sm",
            variant: "outline",
            className: "h-7 w-full text-xs",
            onClick: () => setScheduleOpen(true),
            children: "Agendar consulta"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      NewAppointmentDialog,
      {
        open: scheduleOpen,
        onOpenChange: setScheduleOpen,
        defaultPatientId: patientId,
        defaultPatientName: patientName,
        defaultProfessionalId: profile?.role === "professional" ? profile.id : void 0,
        onSaved: () => void loadContext()
      }
    )
  ] });
}
const CUSTOM_CATEGORY = "personalizadas";
function CrmQuickReplies({ onSelect, disabled, templateVars }) {
  const { tenant } = useAuth();
  const repliesFn = useServerFn(getWaQuickReplies);
  const seedFn = useServerFn(seedWaQuickReplies);
  const seedFollowUpFn = useServerFn(seedFollowUpQuickReplies);
  const upsertFn = useServerFn(upsertWaQuickReply);
  const deleteFn = useServerFn(deleteWaQuickReply);
  const [replies, setReplies] = useState([]);
  const [category, setCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);
  const loadReplies = useCallback(async () => {
    const rows = await repliesFn();
    setReplies(rows);
  }, [repliesFn]);
  useEffect(() => {
    void (async () => {
      await seedFn().catch(() => {
      });
      await seedFollowUpFn().catch(() => {
      });
      await loadReplies();
    })();
  }, [loadReplies, seedFn, seedFollowUpFn]);
  const categories = useMemo(() => {
    const set = new Set(replies.map((r) => r.category ?? "geral"));
    set.delete(CUSTOM_CATEGORY);
    return ["all", ...Array.from(set).sort(), CUSTOM_CATEGORY];
  }, [replies]);
  const customReplies = useMemo(
    () => replies.filter((r) => (r.category ?? "geral") === CUSTOM_CATEGORY),
    [replies]
  );
  const filtered = useMemo(() => {
    if (category === "all") return replies.filter((r) => (r.category ?? "geral") !== CUSTOM_CATEGORY);
    if (category === CUSTOM_CATEGORY) return customReplies;
    return replies.filter((r) => (r.category ?? "geral") === category);
  }, [replies, category, customReplies]);
  const vars = useMemo(
    () => ({
      nome_clinica: tenant?.name ?? "Sua Clínica",
      nome_paciente: "Paciente",
      primeiro_nome: "Paciente",
      data_consulta: "—",
      hora_consulta: "—",
      nome_profissional: "equipe médica",
      ...templateVars
    }),
    [tenant?.name, templateVars]
  );
  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormContent("");
    setFormOpen(false);
  };
  const openCreateForm = () => {
    setEditingId(null);
    setFormName("");
    setFormContent("");
    setFormOpen(true);
  };
  const openEditForm = (reply) => {
    setEditingId(reply.id);
    setFormName(reply.name);
    setFormContent(reply.content);
    setFormOpen(true);
  };
  const saveCustom = async () => {
    if (!formName.trim() || !formContent.trim()) {
      toast.error("Preencha o nome e a mensagem.");
      return;
    }
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: editingId ?? void 0,
          name: formName.trim(),
          content: formContent.trim(),
          category: CUSTOM_CATEGORY
        }
      });
      toast.success(editingId ? "Mensagem atualizada" : "Mensagem criada");
      resetForm();
      await loadReplies();
    } catch (e) {
      toast.error(e.message || "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };
  const removeCustom = async (id) => {
    try {
      await deleteFn({ data: { id } });
      toast.success("Mensagem removida");
      if (editingId === id) resetForm();
      await loadReplies();
    } catch (e) {
      toast.error(e.message || "Não foi possível remover");
    }
  };
  const isCustomTab = category === CUSTOM_CATEGORY;
  if (replies.length === 0 && !isCustomTab) {
    return /* @__PURE__ */ jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground",
        onClick: () => setCategory(CUSTOM_CATEGORY),
        children: "Personalizadas"
      }
    ) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "mb-2 space-y-1.5", children: [
    /* @__PURE__ */ jsx("div", { className: "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: categories.map((c) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] transition",
          category === c ? c === CUSTOM_CATEGORY ? "bg-violet-600 text-white" : "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
        ),
        onClick: () => {
          setCategory(c);
          if (c !== CUSTOM_CATEGORY) resetForm();
        },
        children: QUICK_REPLY_CATEGORY_LABELS[c] ?? c
      },
      c
    )) }),
    isCustomTab ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-violet-200/80 bg-violet-50/40 p-2.5 dark:border-violet-900/40 dark:bg-violet-950/20", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[11px] font-medium text-violet-900 dark:text-violet-200", children: "Suas mensagens personalizadas" }),
        !formOpen ? /* @__PURE__ */ jsxs(
          Button,
          {
            type: "button",
            size: "sm",
            variant: "outline",
            className: "h-7 gap-1 rounded-full border-violet-300 text-[11px] text-violet-800",
            onClick: openCreateForm,
            children: [
              /* @__PURE__ */ jsx(Plus, { className: "size-3" }),
              "Nova"
            ]
          }
        ) : /* @__PURE__ */ jsx(Button, { type: "button", size: "icon", variant: "ghost", className: "size-7", onClick: resetForm, children: /* @__PURE__ */ jsx(X, { className: "size-3.5" }) })
      ] }),
      formOpen ? /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-lg border border-violet-200/60 bg-background/80 p-2.5", children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Nome curto (ex.: Boas-vindas VIP)",
            value: formName,
            onChange: (e) => setFormName(e.target.value),
            className: "h-8 text-xs"
          }
        ),
        /* @__PURE__ */ jsx(
          Textarea,
          {
            placeholder: "Digite a mensagem… Use {{primeiro_nome}}, {{data_consulta}}, {{hora_consulta}}",
            value: formContent,
            onChange: (e) => setFormContent(e.target.value),
            rows: 3,
            className: "min-h-[72px] resize-none text-xs"
          }
        ),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
          "Variáveis: ",
          TEMPLATE_VARS.map((v) => `{{${v}}}`).join(", ")
        ] }),
        /* @__PURE__ */ jsxs(
          Button,
          {
            type: "button",
            size: "sm",
            className: "h-8 w-full rounded-full bg-violet-600 text-xs hover:bg-violet-700",
            disabled: saving,
            onClick: () => void saveCustom(),
            children: [
              saving ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1.5 size-3.5 animate-spin" }) : null,
              editingId ? "Salvar alterações" : "Criar mensagem"
            ]
          }
        )
      ] }) : null,
      customReplies.length === 0 && !formOpen ? /* @__PURE__ */ jsx("p", { className: "py-2 text-center text-[11px] text-muted-foreground", children: "Nenhuma mensagem personalizada ainda. Clique em Nova para criar." }) : /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5 pt-1", children: customReplies.map((r) => /* @__PURE__ */ jsxs("div", { className: "group relative flex items-center", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled,
            className: cn(
              "shrink-0 rounded-full border border-violet-200/80 bg-white/90 px-3 py-1 pr-7 text-[11px] font-medium text-violet-900",
              "transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50",
              "dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100"
            ),
            onClick: () => onSelect(renderTemplate(r.content, vars)),
            children: r.name
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "absolute right-0.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "rounded-full p-0.5 text-violet-600 hover:bg-violet-100",
              title: "Editar",
              onClick: () => openEditForm(r),
              children: /* @__PURE__ */ jsx(Pencil, { className: "size-3" })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "rounded-full p-0.5 text-red-600 hover:bg-red-50",
              title: "Excluir",
              onClick: () => void removeCustom(r.id),
              children: /* @__PURE__ */ jsx(Trash2, { className: "size-3" })
            }
          )
        ] })
      ] }, r.id)) })
    ] }) : /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: filtered.map((r) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled,
        title: r.shortcut ? `Atalho: ${r.shortcut}` : r.name,
        className: cn(
          "shrink-0 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-emerald-900",
          "transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50",
          "dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
        ),
        onClick: () => onSelect(renderTemplate(r.content, vars)),
        children: r.name
      },
      r.id
    )) })
  ] });
}
function CrmGlobalSearch({ onOpenConversation }) {
  const searchFn = useServerFn(searchWaMessagesGlobal);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState([]);
  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchFn({ data: { query: q, limit: 40 } });
      setHits(rows);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5", children: [
      /* @__PURE__ */ jsx(Search, { className: "size-3.5" }),
      "Buscar mensagens"
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-lg", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Busca global no CRM" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Texto, nome de arquivo, palavra-chave…",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && void runSearch(),
            autoFocus: true
          }
        ),
        /* @__PURE__ */ jsx(Button, { onClick: () => void runSearch(), disabled: loading, children: loading ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(Search, { className: "size-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "max-h-[360px] space-y-2 overflow-y-auto", children: [
        hits.length === 0 && query.trim().length >= 2 && !loading ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Nenhuma mensagem encontrada." }) : null,
        hits.map((h) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "block w-full rounded-lg border p-2.5 text-left hover:bg-muted/60",
            onClick: () => {
              onOpenConversation(h.conversation_id);
              setOpen(false);
            },
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs font-medium", children: conversationDisplayName({
                  contact_name: h.contact_name,
                  contact_phone: h.contact_phone
                }) }),
                /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "text-[10px]", children: CHANNEL_LABEL[h.channel] ?? h.channel })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 line-clamp-2 text-sm", children: h.body ?? h.message_type }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-[10px] text-muted-foreground", children: fmtDateTime(h.created_at) })
            ]
          },
          h.message_id
        ))
      ] })
    ] })
  ] });
}
function CrmBroadcastDialog({ conversations, provider }) {
  const templatesFn = useServerFn(getMetaWaTemplates);
  const broadcastFn = useServerFn(sendWaBroadcast);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [variablesText, setVariablesText] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!open || provider !== "meta") return;
    void templatesFn().then((t) => setTemplates(t));
  }, [open, provider, templatesFn]);
  if (provider !== "meta") return null;
  const whatsappConvs = conversations.filter((c) => (c.channel ?? "whatsapp") === "whatsapp");
  const send = async () => {
    if (!name.trim() || !templateName) {
      toast.error("Informe nome da campanha e template");
      return;
    }
    setSending(true);
    try {
      const variables = variablesText.split("\n").map((v) => v.trim()).filter(Boolean);
      const res = await broadcastFn({
        data: {
          name: name.trim(),
          templateName,
          variables,
          conversationIds: whatsappConvs.map((c) => c.id)
        }
      });
      toast.success(`Broadcast enviado: ${res.sent} ok, ${res.failed} falhas`);
      setOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5", children: [
      /* @__PURE__ */ jsx(Megaphone, { className: "size-3.5" }),
      "Broadcast"
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Broadcast com template Meta" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Nome da campanha" }),
          /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value), placeholder: "Promoção março" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Template aprovado" }),
          /* @__PURE__ */ jsxs(Select, { value: templateName, onValueChange: setTemplateName, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione…" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: templates.map((t) => /* @__PURE__ */ jsxs(SelectItem, { value: t.name, children: [
              t.name,
              " (",
              t.language,
              ")"
            ] }, `${t.name}-${t.language}`)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { children: "Variáveis do corpo (uma por linha)" }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              value: variablesText,
              onChange: (e) => setVariablesText(e.target.value),
              placeholder: "Nome do paciente\nData",
              rows: 3
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "Serão enviados para ",
          whatsappConvs.length,
          " contatos WhatsApp abertos no CRM."
        ] })
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { onClick: () => void send(), disabled: sending, children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : "Enviar broadcast" }) })
    ] })
  ] });
}
function CrmDetailSection({
  title,
  description,
  children,
  className,
  bare
}) {
  return /* @__PURE__ */ jsxs("section", { className: cn("space-y-2", className), children: [
    title ? /* @__PURE__ */ jsxs("div", { className: "px-0.5", children: [
      /* @__PURE__ */ jsx("h4", { className: "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground", children: title }),
      description ? /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-[11px] leading-relaxed text-muted-foreground/90", children: description }) : null
    ] }) : null,
    bare ? children : /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-border/45 bg-background p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", children })
  ] });
}
function CrmDetailEmpty({
  icon: Icon,
  title,
  description
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-2 flex size-10 items-center justify-center rounded-full bg-muted", children: /* @__PURE__ */ jsx(Icon, { className: "size-4 text-muted-foreground" }) }),
    /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-foreground/90", children: title }),
    description ? /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-[220px] text-xs text-muted-foreground", children: description }) : null
  ] });
}
const crmDetailTabTrigger = "group flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all lg:min-w-0 lg:w-full data-[state=active]:bg-background data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-emerald-200/80 dark:data-[state=active]:text-emerald-200 dark:data-[state=active]:ring-emerald-900/50 text-muted-foreground hover:bg-background/70 hover:text-foreground";
const crmDetailAsideShell = "flex min-w-0 w-full shrink-0 flex-col overflow-hidden border-border/60 bg-[#f7f9f8] dark:bg-zinc-950 lg:w-auto lg:border-l";
const crmDetailTabsRoot = "flex min-h-0 flex-1 flex-col lg:flex-row";
const crmDetailTabList = "mx-0 flex h-auto w-full shrink-0 gap-1 overflow-x-auto border-b border-border/50 bg-background/80 p-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:w-[4.25rem] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-1 [&::-webkit-scrollbar]:hidden";
const crmDetailContentWrap = "flex min-h-0 min-w-0 flex-1 flex-col";
const crmDetailHeader = "shrink-0 border-b border-border/40 bg-background/90 px-3 py-2.5 backdrop-blur-sm";
const crmDetailScroll = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3";
const crmDetailTabContent = "mt-0 space-y-4 focus-visible:outline-none focus-visible:ring-0";
const crmNoteCard = "relative rounded-xl border border-border/40 bg-background p-3 pl-4 shadow-sm before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-0.5 before:rounded-full before:bg-emerald-500/70";
function CrmTasksPanel({ conversationId, staff, currentUserId }) {
  const loadFn = useServerFn(getWaTasks);
  const createFn = useServerFn(createWaTask);
  const completeFn = useServerFn(completeWaTask);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [taskType, setTaskType] = useState("follow_up");
  const [priority, setPriority] = useState("normal");
  const reload = async () => {
    if (!conversationId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await loadFn({ data: { conversationId, onlyOpen: true } });
      setTasks(rows);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, [conversationId]);
  const create = async () => {
    if (!conversationId || !title.trim() || !dueAt) return;
    try {
      await createFn({
        data: {
          conversationId,
          title: title.trim(),
          assignedTo,
          dueAt: new Date(dueAt).toISOString(),
          taskType,
          priority,
          createReminder: true
        }
      });
      setTitle("");
      setDueAt("");
      toast.success("Tarefa criada com lembrete");
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const complete = async (taskId) => {
    try {
      await completeFn({ data: { taskId } });
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  if (!conversationId) {
    return /* @__PURE__ */ jsx(
      CrmDetailEmpty,
      {
        icon: Check,
        title: "Selecione uma conversa",
        description: "Abra um chat para criar tarefas de follow-up."
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Nova tarefa", description: "Cria lembrete automático no prazo.", children: [
      /* @__PURE__ */ jsx(Input, { placeholder: "Título da tarefa", value: title, onChange: (e) => setTitle(e.target.value), className: "h-9" }),
      /* @__PURE__ */ jsx(Input, { type: "datetime-local", value: dueAt, onChange: (e) => setDueAt(e.target.value), className: "mt-2 h-9" }),
      /* @__PURE__ */ jsxs(Select, { value: assignedTo, onValueChange: setAssignedTo, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "mt-2 h-9", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsx(SelectContent, { children: staff.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.full_name }, s.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxs(Select, { value: taskType, onValueChange: setTaskType, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: Object.entries(TASK_TYPE_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k)) })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: priority, onValueChange: setPriority, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: Object.entries(TASK_PRIORITY_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k)) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "sm", className: "mt-3 w-full bg-emerald-600 hover:bg-emerald-700", onClick: () => void create(), disabled: !title.trim() || !dueAt, children: "Criar tarefa + lembrete" })
    ] }),
    /* @__PURE__ */ jsx(CrmDetailSection, { title: tasks.length ? `Abertas (${tasks.length})` : "Abertas", bare: true, children: loading ? /* @__PURE__ */ jsx(Loader2, { className: "mx-auto size-5 animate-spin text-muted-foreground" }) : tasks.length === 0 ? /* @__PURE__ */ jsx(CrmDetailEmpty, { icon: Check, title: "Nenhuma tarefa aberta" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: tasks.map((t) => /* @__PURE__ */ jsxs("div", { className: cn(crmNoteCard, "flex items-start justify-between gap-2 before:bg-violet-500/70"), children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: t.title }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
          TASK_TYPE_LABEL[t.task_type] ?? t.task_type,
          " · ",
          TASK_PRIORITY_LABEL[t.priority] ?? t.priority
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground", children: fmtDateTime(t.due_at) }),
        t.assignee?.full_name ? /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground", children: t.assignee.full_name }) : null
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", className: "size-7 shrink-0", onClick: () => void complete(t.id), children: /* @__PURE__ */ jsx(Check, { className: "size-4" }) })
    ] }, t.id)) }) })
  ] });
}
function CrmTagRulesPanel({ tags }) {
  const loadFn = useServerFn(getWaTagRules);
  const upsertFn = useServerFn(upsertWaTagRule);
  const deleteFn = useServerFn(deleteWaTagRule);
  const [rules, setRules] = useState([]);
  const [name, setName] = useState("");
  const [tagId, setTagId] = useState("");
  const [triggerType, setTriggerType] = useState("keyword");
  const [triggerValue, setTriggerValue] = useState("");
  const reload = async () => {
    const rows = await loadFn();
    setRules(rows);
  };
  useEffect(() => {
    void reload();
  }, [loadFn]);
  const save = async () => {
    if (!name.trim() || !tagId) return;
    try {
      await upsertFn({
        data: {
          name: name.trim(),
          tagId,
          triggerType,
          triggerValue: triggerType === "first_message" ? void 0 : triggerValue
        }
      });
      setName("");
      setTriggerValue("");
      toast.success("Regra salva");
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const remove = async (id) => {
    try {
      await deleteFn({ data: { id } });
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Automação", description: "Aplica tags automaticamente em mensagens recebidas.", children: [
    /* @__PURE__ */ jsx(Input, { placeholder: "Nome da regra", value: name, onChange: (e) => setName(e.target.value), className: "h-9" }),
    /* @__PURE__ */ jsxs(Select, { value: tagId, onValueChange: setTagId, children: [
      /* @__PURE__ */ jsx(SelectTrigger, { className: "mt-2 h-9", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Tag" }) }),
      /* @__PURE__ */ jsx(SelectContent, { children: tags.map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t.id, children: t.name }, t.id)) })
    ] }),
    /* @__PURE__ */ jsxs(Select, { value: triggerType, onValueChange: (v) => setTriggerType(v), children: [
      /* @__PURE__ */ jsx(SelectTrigger, { className: "mt-2 h-9", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
      /* @__PURE__ */ jsxs(SelectContent, { children: [
        /* @__PURE__ */ jsx(SelectItem, { value: "keyword", children: "Palavra-chave na mensagem" }),
        /* @__PURE__ */ jsx(SelectItem, { value: "first_message", children: "Primeira mensagem do contato" }),
        /* @__PURE__ */ jsx(SelectItem, { value: "channel", children: "Canal (whatsapp / instagram / messenger)" })
      ] })
    ] }),
    triggerType !== "first_message" ? /* @__PURE__ */ jsx(
      Input,
      {
        placeholder: triggerType === "keyword" ? "Ex: orçamento, agendar" : "whatsapp, instagram ou messenger",
        value: triggerValue,
        onChange: (e) => setTriggerValue(e.target.value),
        className: "mt-2 h-9"
      }
    ) : null,
    /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", className: "mt-3 w-full", onClick: () => void save(), children: [
      /* @__PURE__ */ jsx(Zap, { className: "mr-1.5 size-3.5" }),
      "Adicionar regra"
    ] }),
    rules.length > 0 ? /* @__PURE__ */ jsx("div", { className: "mt-3 space-y-1.5 border-t border-border/40 pt-3", children: rules.map((r) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-2 text-[11px]", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: r.name }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
          " → ",
          r.wa_tags?.name ?? "tag"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
          r.trigger_type,
          r.trigger_value ? `: ${r.trigger_value}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", className: "size-7", onClick: () => void remove(r.id), children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5" }) })
    ] }, r.id)) }) : null
  ] });
}
const crmChatBg = "bg-[#e7ece8] dark:bg-zinc-950 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] [background-size:18px_18px] dark:[background-image:none]";
const crmListItemActive = "bg-background shadow-sm ring-1 ring-border/70 dark:bg-zinc-900";
const crmListItemBase = "mb-0.5 w-full max-w-full overflow-hidden rounded-xl px-2.5 py-2.5 text-left transition-all duration-150 hover:bg-background/80";
const crmListScrollArea = "min-w-0 w-full [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!max-w-full";
const crmFilterPill = (active) => active ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:bg-background/60 hover:text-foreground";
const crmComposerBar = "border-t border-border/50 bg-[#f0f2f5]/95 px-2 py-2 backdrop-blur-sm dark:bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))]";
const crmPanelShell = "flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:grid lg:grid-cols-[228px_minmax(0,1fr)_248px]";
const getWhatsAppStatus = createServerFn({
  method: "GET"
}).handler(createSsrRpc("a5fc2b8cb05e19a518ccc78c00d97d1583e6a384df746e541b6d771697f9f644"));
const sendWaText = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("e7ec6a62d61b180d0c96650810171af0f2a3ea489a0c8a9a9baaf030f1301499"));
const sendWaMedia = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("86c43e18f9d0c9ec68e538086d093545fb298fdff3e6d4540632fc3d6de58194"));
const transferWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("efe697151b75f2e1faec7ac4ff3fec0c3389ee466b2988bbe73d9f8f8347e92e"));
const markWaConversationRead = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("4aaaa01d9d5daf6718651677c2427623eb3e7bd9deb6befc1eb2e430d46fb455"));
const fetchWaMediaUrl = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("17342be8d286ce6c9268ff69e85868a1f4495e85ae0db32e0706e504312c21b2"));
const startWaConversation = createServerFn({
  method: "POST"
}).middleware([requireSupabaseAuth]).inputValidator((d) => d).handler(createSsrRpc("53061f53ec775a2a7e9f2d7571ce345f807daaad7671225015b2b46567c0159d"));
const crmInboxRoute = getRouteApi("/_authenticated/crm/inbox");
function CrmInboxPage() {
  const { conversation: conversationFromUrl, patient: patientFromUrl, phone: phoneFromUrl, draft: draftFromUrl } = crmInboxRoute.useSearch();
  const { profile, tenant } = useAuth();
  const [configured, setConfigured] = useState(null);
  const [provider, setProvider] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tags, setTags] = useState([]);
  const [conversationTagIds, setConversationTagIds] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchHits, setMsgSearchHits] = useState([]);
  const [filter, setFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const [convTagsMap, setConvTagsMap] = useState({});
  const [mobileView, setMobileView] = useState("list");
  const [replyTo, setReplyTo] = useState(null);
  const [closeReason, setCloseReason] = useState(WA_CLOSE_REASONS[0]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [noteText, setNoteText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [composeTarget, setComposeTarget] = useState(null);
  const [manualConvOpen, setManualConvOpen] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState(
    () => getWaNotificationPermission()
  );
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);
  const audioFileRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  const relatedConvIdsRef = useRef([]);
  const loadConversationsRef = useRef(async () => {
  });
  const reloadListTimerRef = useRef(null);
  const initialListLoadedRef = useRef(false);
  const transferToastShown = useRef(false);
  const statusFn = useServerFn(getWhatsAppStatus);
  const sendTextFn = useServerFn(sendWaText);
  const sendMediaFn = useServerFn(sendWaMedia);
  const transferFn = useServerFn(transferWaConversation);
  const readFn = useServerFn(markWaConversationRead);
  const mediaUrlFn = useServerFn(fetchWaMediaUrl);
  const startConvFn = useServerFn(startWaConversation);
  const closeFn = useServerFn(closeWaConversation);
  const reopenFn = useServerFn(reopenWaConversation);
  const linkPatientFn = useServerFn(linkWaPatient);
  const assignFn = useServerFn(assignWaConversation);
  const assignQueueFn = useServerFn(assignWaQueueToReception);
  const toggleTagFn = useServerFn(toggleWaConversationTag);
  const markObjectionFn = useServerFn(markWaObjection);
  const processFollowUpsFn = useServerFn(processWaFollowUps);
  const searchMsgFn = useServerFn(searchWaMessages);
  const syncChatsFn = useServerFn(syncWaChatsFromZApi);
  const createDealFn = useServerFn(createWaDeal);
  const [syncingChats, setSyncingChats] = useState(false);
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );
  const contactPhotos = useWaContactPhotos(conversations);
  const resolveTagColor = useCallback(
    (tagIds) => conversationPrimaryTagColor(tagIds, tags),
    [tags]
  );
  useEffect(() => {
    void statusFn().then((s) => {
      setConfigured(s.configured);
      setProvider(s.provider ?? null);
    });
  }, [statusFn]);
  const loadConversations = useCallback(async (opts) => {
    if (!profile) return;
    const silent = opts?.silent ?? initialListLoadedRef.current;
    if (!silent) setLoadingList(true);
    const [convRes, transferRes, tagLinksRes] = await Promise.all([
      supabase.from("wa_conversations").select(
        "id, tenant_id, patient_id, contact_phone, contact_name, channel, external_user_id, assigned_to, status, last_message_at, last_message_preview, unread_count, contact_photo_url, contact_photo_fetched_at, deal_id, patients(full_name), assigned_profile:assigned_to(full_name)"
      ).order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase.from("wa_transfers").select(
        "id, conversation_id, from_user_id, note, created_at, from_profile:from_user_id(full_name)"
      ).eq("to_user_id", profile.id).is("seen_at", null).order("created_at", { ascending: false }),
      supabase.from("wa_conversation_tags").select("conversation_id, tag_id")
    ]);
    if (convRes.error) toast.error(convRes.error.message);
    if (transferRes.error) toast.error(transferRes.error.message);
    const tagMap = {};
    for (const row of tagLinksRes.data ?? []) {
      if (!tagMap[row.conversation_id]) tagMap[row.conversation_id] = [];
      tagMap[row.conversation_id].push(row.tag_id);
    }
    setConvTagsMap(tagMap);
    const nextConversations = dedupeConversationsByPhone(convRes.data ?? []);
    setConversations((prev) => {
      if (prev.length === nextConversations.length && prev.every(
        (p, i) => p.id === nextConversations[i]?.id && p.last_message_at === nextConversations[i]?.last_message_at && p.last_message_preview === nextConversations[i]?.last_message_preview && p.unread_count === nextConversations[i]?.unread_count && p.status === nextConversations[i]?.status && p.assigned_to === nextConversations[i]?.assigned_to
      )) {
        return prev;
      }
      return nextConversations;
    });
    const pending = {};
    for (const row of transferRes.data ?? []) {
      if (!pending[row.conversation_id]) pending[row.conversation_id] = row;
    }
    setPendingTransfers(pending);
    initialListLoadedRef.current = true;
    setLoadingList(false);
  }, [profile]);
  const scheduleReloadConversations = useCallback((delayMs = 400) => {
    if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
    reloadListTimerRef.current = window.setTimeout(() => {
      reloadListTimerRef.current = null;
      void loadConversationsRef.current({ silent: true });
    }, delayMs);
  }, []);
  selectedIdRef.current = selectedId;
  waInboxFocus.selectedConversationId = selectedId;
  loadConversationsRef.current = loadConversations;
  useEffect(() => {
    if (conversationFromUrl) {
      setSelectedId(conversationFromUrl);
      setMobileView("chat");
    }
  }, [conversationFromUrl]);
  useEffect(() => {
    if (!patientFromUrl || conversationFromUrl) return;
    const byPatient = conversations.find((c) => c.patient_id === patientFromUrl);
    if (byPatient) {
      setSelectedId(byPatient.id);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: patient } = await supabase.from("patients").select("phone, full_name").eq("id", patientFromUrl).maybeSingle();
      if (cancelled || !patient?.phone) {
        if (!cancelled && patient && !patient.phone) {
          toast.error("Paciente sem telefone cadastrado.");
        }
        return;
      }
      const patientPhone = patient.phone;
      const byPhone = conversations.find((c) => phonesMatch(c.contact_phone, patientPhone));
      if (byPhone) {
        setSelectedId(byPhone.id);
        setMobileView("chat");
        if (draftFromUrl) setText(draftFromUrl);
        if (!byPhone.patient_id) {
          void linkPatientFn({ data: { conversationId: byPhone.id, patientId: patientFromUrl } }).then(() => loadConversationsRef.current({ silent: true })).catch(() => {
          });
        }
        return;
      }
      setComposeTarget({
        phone: patient.phone,
        name: patient.full_name ?? patient.phone,
        patientId: patientFromUrl
      });
      setSelectedId(null);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientFromUrl, conversationFromUrl, conversations, draftFromUrl]);
  useEffect(() => {
    if (!phoneFromUrl || conversationFromUrl || patientFromUrl) return;
    const byPhone = conversations.find((c) => phonesMatch(c.contact_phone, phoneFromUrl));
    if (byPhone) {
      setSelectedId(byPhone.id);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
      return;
    }
    setComposeTarget({
      phone: phoneFromUrl,
      name: phoneFromUrl
    });
    setSelectedId(null);
    setMobileView("chat");
    if (draftFromUrl) setText(draftFromUrl);
  }, [phoneFromUrl, patientFromUrl, conversationFromUrl, conversations, draftFromUrl]);
  useEffect(() => {
    return () => {
      waInboxFocus.selectedConversationId = null;
    };
  }, []);
  const enableNotifications = async () => {
    if (!isSecureNotificationContext()) {
      toast.info(
        "Neste endereço (IP local, sem HTTPS) o navegador não abre pop-up. Mesmo assim você recebe som e alerta na tela quando chega mensagem.",
        { duration: 9e3 }
      );
      return;
    }
    const permission = await requestWaNotificationPermission();
    setNotifyPermission(permission);
    if (permission === "granted") toast.success("Notificações ativadas");
    else if (permission === "denied") {
      toast.info(
        "Pop-up bloqueado. No Chrome: ícone ao lado da URL → Configurações do site → Notificações → Permitir.",
        { duration: 9e3 }
      );
    }
  };
  const loadStaff = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase.from("profiles").select("id, full_name, role").eq("tenant_id", tenant.id).in("role", ["admin", "professional", "receptionist"]).eq("active", true).order("full_name");
    setStaff(data ?? []);
  }, [tenant]);
  const loadTags = useCallback(async () => {
    const { data } = await supabase.from("wa_tags").select("id, name, color").order("name");
    setTags(data ?? []);
  }, []);
  const loadConversationDetails = useCallback(async (conversationId) => {
    setLoadingChat(true);
    const { data: convRow } = await supabase.from("wa_conversations").select("id, contact_phone").eq("id", conversationId).maybeSingle();
    const phone = convRow?.contact_phone;
    let relatedIds = [conversationId];
    if (phone && tenant) {
      const { data: related } = await supabase.from("wa_conversations").select("id, contact_phone").eq("tenant_id", tenant.id);
      relatedIds = (related ?? []).filter((c) => phonesMatch(c.contact_phone, phone)).map((c) => c.id);
      if (!relatedIds.length) relatedIds = [conversationId];
    }
    relatedConvIdsRef.current = relatedIds;
    const [msgRes, tagRes, noteRes, remRes, trRes] = await Promise.all([
      supabase.from("wa_messages").select(
        "id, conversation_id, direction, message_type, body, media_id, media_mime, media_filename, status, sent_by, created_at, wa_message_id, reply_to_message_id, sender_profile:sent_by(full_name)"
      ).in("conversation_id", relatedIds).order("created_at", { ascending: true }),
      supabase.from("wa_conversation_tags").select("tag_id").in("conversation_id", relatedIds),
      supabase.from("wa_notes").select("id, content, created_at, author_id, author:author_id(full_name)").eq("conversation_id", conversationId).order("created_at", { ascending: false }),
      supabase.from("wa_reminders").select("id, remind_at, note, completed, assigned_to, assignee:assigned_to(full_name)").eq("conversation_id", conversationId).order("remind_at", { ascending: true }),
      supabase.from("wa_transfers").select(
        "id, from_user_id, to_user_id, note, created_at, seen_at, from_profile:from_user_id(full_name), to_profile:to_user_id(full_name)"
      ).eq("conversation_id", conversationId).order("created_at", { ascending: false })
    ]);
    const rawMessages = msgRes.data ?? [];
    const seenWaIds = /* @__PURE__ */ new Set();
    const dedupedMessages = rawMessages.filter((m) => {
      const waId = m.wa_message_id;
      if (!waId) return true;
      if (seenWaIds.has(waId)) return false;
      seenWaIds.add(waId);
      return true;
    });
    setMessages(dedupedMessages);
    setConversationTagIds([
      ...new Set((tagRes.data ?? []).map((t) => t.tag_id))
    ]);
    setNotes(noteRes.data ?? []);
    setReminders(remRes.data ?? []);
    setTransfers(trRes.data ?? []);
    setLoadingChat(false);
    void readFn({ data: { conversationId } });
    setConversations(
      (prev) => prev.map((c) => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    );
    setPendingTransfers((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, [readFn, tenant]);
  useEffect(() => {
    void loadConversations();
    void loadStaff();
    void loadTags();
  }, [loadConversations, loadStaff, loadTags]);
  useEffect(() => {
    const tick = () => void processFollowUpsFn().catch(() => {
    });
    tick();
    const id = window.setInterval(tick, 6e4);
    return () => window.clearInterval(id);
  }, [processFollowUpsFn]);
  useEffect(() => {
    if (!selectedId) return;
    void loadConversationDetails(selectedId);
  }, [selectedId, loadConversationDetails]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const tenantId = tenant?.id;
    if (!tenantId) return;
    for (const ch of supabase.getChannels()) {
      if (ch.topic.startsWith(`wa-crm:${tenantId}`)) {
        void supabase.removeChannel(ch);
      }
    }
    const channel = supabase.channel(`wa-crm:${tenantId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wa_conversations", filter: `tenant_id=eq.${tenantId}` },
      () => scheduleReloadConversations()
    ).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "wa_messages", filter: `tenant_id=eq.${tenantId}` },
      (payload) => {
        const row = payload.new;
        if (relatedConvIdsRef.current.includes(row.conversation_id)) {
          setMessages((prev) => {
            const waId = row.wa_message_id;
            if (waId && prev.some((m) => m.wa_message_id === waId)) {
              return prev;
            }
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
        scheduleReloadConversations();
      }
    ).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wa_transfers", filter: `tenant_id=eq.${tenantId}` },
      () => scheduleReloadConversations()
    ).subscribe();
    const poll = window.setInterval(() => scheduleReloadConversations(0), 6e4);
    return () => {
      window.clearInterval(poll);
      if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id, scheduleReloadConversations]);
  const pendingTransferCount = useMemo(() => Object.keys(pendingTransfers).length, [pendingTransfers]);
  useEffect(() => {
    if (pendingTransferCount > 0 && !transferToastShown.current) {
      transferToastShown.current = true;
      toast.info(
        pendingTransferCount === 1 ? "Você tem 1 conversa transferida para você" : `Você tem ${pendingTransferCount} conversas transferidas para você`,
        { description: "Confira na aba Transferidas" }
      );
    }
  }, [pendingTransferCount]);
  const selectedPendingTransfer = selectedId ? pendingTransfers[selectedId] : void 0;
  const filteredConversations = useMemo(() => {
    let list = conversations;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) => (c.contact_name?.toLowerCase().includes(q) ?? false) || c.contact_phone.includes(q) || (c.last_message_preview?.toLowerCase().includes(q) ?? false) || (pendingTransfers[c.id]?.from_profile?.full_name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filter === "mine" && profile) list = list.filter((c) => c.assigned_to === profile.id);
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    if (filter === "transferred") list = list.filter((c) => !!pendingTransfers[c.id]);
    if (filter === "queue") list = list.filter((c) => !c.assigned_to && c.status === "open");
    if (filter === "closed") list = list.filter((c) => c.status === "closed");
    if (channelFilter !== "all") {
      list = list.filter((c) => (c.channel ?? "whatsapp") === channelFilter);
    }
    if (tagFilter) {
      list = list.filter((c) => convTagsMap[c.id]?.includes(tagFilter));
    }
    return [...list].sort((a, b) => {
      const aPending = pendingTransfers[a.id];
      const bPending = pendingTransfers[b.id];
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      if (aPending && bPending) {
        return new Date(bPending.created_at).getTime() - new Date(aPending.created_at).getTime();
      }
      return new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime();
    });
  }, [conversations, search, filter, channelFilter, tagFilter, convTagsMap, profile, pendingTransfers]);
  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (composeTarget) {
      setSending(true);
      try {
        const res = await startConvFn({
          data: {
            phone: composeTarget.phone,
            name: composeTarget.name,
            patientId: composeTarget.patientId,
            text: body
          }
        });
        setComposeTarget(null);
        setText("");
        await loadConversations({ silent: true });
        setSelectedId(res.conversationId);
        setMobileView("chat");
        toast.success("Conversa iniciada");
      } catch (e) {
        toast.error(e.message);
      } finally {
        setSending(false);
      }
      return;
    }
    if (!selectedId) return;
    setSending(true);
    try {
      await sendTextFn({
        data: {
          conversationId: selectedId,
          text: text.trim(),
          replyToMessageId: replyTo?.id
        }
      });
      setText("");
      setReplyTo(null);
      await loadConversationDetails(selectedId);
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };
  const runMsgSearch = async () => {
    if (!selectedId || !msgSearch.trim()) {
      setMsgSearchHits([]);
      return;
    }
    const hits = await searchMsgFn({ data: { conversationId: selectedId, query: msgSearch.trim() } });
    setMsgSearchHits(hits);
  };
  const closeConversation = async () => {
    if (!selectedId) return;
    try {
      await closeFn({ data: { conversationId: selectedId, reason: closeReason } });
      toast.success("Conversa encerrada");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const reopenConversation = async () => {
    if (!selectedId) return;
    try {
      await reopenFn({ data: { conversationId: selectedId } });
      toast.success("Conversa reaberta");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const searchPatients = async (q) => {
    setPatientSearch(q);
    if (!tenant || q.trim().length < 2) {
      setPatientOptions([]);
      return;
    }
    const { data } = await supabase.from("patients").select("id, full_name, phone").eq("tenant_id", tenant.id).eq("active", true).ilike("full_name", `%${q.trim()}%`).limit(8);
    setPatientOptions(data ?? []);
  };
  const linkPatient = async (patientId) => {
    if (!selectedId) return;
    try {
      await linkPatientFn({ data: { conversationId: selectedId, patientId } });
      toast.success(patientId ? "Paciente vinculado" : "Vínculo removido");
      setPatientSearch("");
      setPatientOptions([]);
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };
  const selectConversation = (id) => {
    setComposeTarget(null);
    setSelectedId(id);
    setMobileView("chat");
    setReplyTo(null);
    setMsgSearchHits([]);
  };
  const messagesById = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);
  const sendFile = async (file) => {
    if (!selectedId) return;
    setSending(true);
    try {
      let prepared = file;
      let mediaType = guessMediaTypeFromFile(file);
      if (mediaType === "image") {
        try {
          prepared = await prepareImageFileForWhatsApp(file);
          mediaType = "image";
        } catch (e) {
          toast.error(e.message || "Não foi possível preparar a imagem.");
          return;
        }
      } else if (mediaType === "audio") {
        try {
          prepared = await prepareAudioFileForWhatsApp(file);
          mediaType = "audio";
        } catch (e) {
          toast.error(
            e.message || "Não foi possível converter o áudio. Tente um arquivo MP3 ou OGG."
          );
          return;
        }
      } else if (mediaType === "document") {
        try {
          prepared = await prepareDocumentFileForWhatsApp(file);
        } catch (e) {
          toast.error(e.message || "Documento inválido ou muito grande (máx. 2 MB).");
          return;
        }
      }
      const mimeType = prepared.type || "application/octet-stream";
      if (prepared.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 5 MB após compressão.");
        return;
      }
      const base64 = await fileToBase64(prepared);
      await sendMediaFn({
        data: {
          conversationId: selectedId,
          base64,
          mimeType,
          filename: prepared.name,
          mediaType
        }
      });
      toast.success(
        mediaType === "audio" ? "Áudio enviado" : mediaType === "image" ? "Foto enviada" : "Arquivo enviado"
      );
      await loadConversationDetails(selectedId);
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error(e.message || "Falha ao enviar arquivo.");
    } finally {
      setSending(false);
    }
  };
  const createTag = async () => {
    if (!profile || !newTagName.trim()) return;
    const { error } = await supabase.from("wa_tags").insert({
      tenant_id: profile.tenant_id,
      name: newTagName.trim(),
      color: newTagColor
    });
    if (error) toast.error(error.message);
    else {
      setNewTagName("");
      await loadTags();
    }
  };
  const toggleTag = async (tagId) => {
    if (!selectedId) return;
    const has = conversationTagIds.includes(tagId);
    try {
      await toggleTagFn({
        data: {
          conversationId: selectedId,
          tagId,
          apply: !has
        }
      });
      setConversationTagIds(
        (prev) => has ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      );
      await loadConversations({ silent: true });
      toast.success(has ? "Tag removida" : "Tag aplicada");
    } catch (e) {
      toast.error(e.message || "Não foi possível alterar a tag");
    }
  };
  const markObjection = async (objectionType) => {
    if (!selectedId) return;
    try {
      const { suggestedMessage } = await markObjectionFn({
        data: { conversationId: selectedId, objectionType }
      });
      if (suggestedMessage) {
        setText(suggestedMessage);
        setDetailTab("tags");
      }
      toast.success("Objeção registrada — envie a mensagem manualmente");
    } catch (e) {
      toast.error(e.message || "Não foi possível registrar objeção");
    }
  };
  const addNote = async () => {
    if (!selectedId || !profile || !noteText.trim()) return;
    const { error } = await supabase.from("wa_notes").insert({
      tenant_id: profile.tenant_id,
      conversation_id: selectedId,
      author_id: profile.id,
      content: noteText.trim()
    });
    if (error) toast.error(error.message);
    else {
      setNoteText("");
      await loadConversationDetails(selectedId);
    }
  };
  const addReminder = async () => {
    if (!selectedId || !profile || !reminderAt) return;
    const { error } = await supabase.from("wa_reminders").insert({
      tenant_id: profile.tenant_id,
      conversation_id: selectedId,
      assigned_to: selected?.assigned_to ?? profile.id,
      remind_at: new Date(reminderAt).toISOString(),
      note: reminderNote.trim() || null,
      created_by: profile.id
    });
    if (error) toast.error(error.message);
    else {
      setReminderAt("");
      setReminderNote("");
      await loadConversationDetails(selectedId);
      toast.success("Lembrete criado");
    }
  };
  const completeReminder = async (id) => {
    await supabase.from("wa_reminders").update({ completed: true }).eq("id", id);
    if (selectedId) await loadConversationDetails(selectedId);
  };
  const doTransfer = async () => {
    if (!selectedId || !transferTo) return;
    try {
      await transferFn({ data: { conversationId: selectedId, toUserId: transferTo, note: transferNote || void 0 } });
      toast.success("Conversa transferida");
      setTransferNote("");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const startConversation = async () => {
    if (!newPhone.trim() || !newMsg.trim()) return;
    setSending(true);
    try {
      const res = await startConvFn({
        data: { phone: newPhone, name: newName || void 0, text: newMsg.trim() }
      });
      setNewPhone("");
      setNewName("");
      setNewMsg("");
      setManualConvOpen(false);
      setComposeTarget(null);
      await loadConversations({ silent: true });
      setSelectedId(res.conversationId);
      setMobileView("chat");
      toast.success("Conversa iniciada");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };
  const addToPipeline = async () => {
    if (!selectedId) return;
    try {
      await createDealFn({ data: { conversationId: selectedId } });
      toast.success("Negócio adicionado ao funil");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };
  const [detailTab, setDetailTab] = useState("tags");
  const detailTabLabels = {
    tags: "Tags",
    patient: "Paciente",
    notes: "Notas internas",
    tasks: "Tarefas",
    reminders: "Lembretes",
    transfer: "Transferência"
  };
  const assignToMe = async () => {
    if (!selectedId || !profile) return;
    try {
      await assignFn({ data: { conversationId: selectedId } });
      toast.success("Conversa atribuída a você");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };
  const syncChatsFromWhatsApp = async () => {
    setSyncingChats(true);
    try {
      const res = await syncChatsFn();
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
      toast.success(`${res.synced} conversa(s) sincronizada(s) com o WhatsApp`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSyncingChats(false);
    }
  };
  const assignQueueToReception = async (allOpen = false) => {
    try {
      const res = await assignQueueFn({ data: { allOpen } });
      await loadConversations({ silent: true });
      toast.success(`${res.updated} conversa(s) atribuída(s) à recepção`);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const resolveMediaUrl = useCallback(
    async (mediaId, mimeType) => {
      const { url } = await mediaUrlFn({ data: { mediaId, mimeType: mimeType ?? void 0 } });
      return url;
    },
    [mediaUrlFn]
  );
  const patientLink = useMemo(() => {
    if (!selected?.patient_id) return null;
    if (profile?.role === "professional") {
      return {
        to: "/professional/patients/$id/record",
        params: { id: selected.patient_id }
      };
    }
    return {
      to: "/reception/pacientes/$id",
      params: { id: selected.patient_id }
    };
  }, [selected?.patient_id, profile?.role]);
  const quickReplyVars = useMemo(() => {
    const name = composeTarget?.name ?? (selected ? conversationDisplayName(selected) : "");
    if (!name) return void 0;
    const parts = name.trim().split(/\s+/);
    return {
      primeiro_nome: parts[0] ?? name,
      nome_paciente: name,
      nome_clinica: tenant?.name ?? "Clínica"
    };
  }, [composeTarget, selected, tenant?.name]);
  if (configured === false) {
    return /* @__PURE__ */ jsxs(DashboardShell, { title: "CRM WhatsApp", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "CRM WhatsApp", description: "Inbox compartilhado via Z-API ou Meta" }),
      /* @__PURE__ */ jsxs(Card, { className: "p-6 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: "WhatsApp não configurado" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2", children: [
          "Para ",
          /* @__PURE__ */ jsx("strong", { children: "Z-API" }),
          " (recomendado para começar), adicione no ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-muted px-1", children: ".env" }),
          ":"
        ] }),
        /* @__PURE__ */ jsxs("ul", { className: "mt-2 list-inside list-disc space-y-1", children: [
          /* @__PURE__ */ jsx("li", { children: "WHATSAPP_PROVIDER=zapi" }),
          /* @__PURE__ */ jsx("li", { children: "ZAPI_INSTANCE_ID" }),
          /* @__PURE__ */ jsx("li", { children: "ZAPI_TOKEN" }),
          /* @__PURE__ */ jsx("li", { children: "ZAPI_CLIENT_TOKEN (se ativou token de segurança)" })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3", children: [
          "Webhook Z-API (HTTPS): ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-muted px-1", children: "https://seu-dominio/api/whatsapp/webhook" })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-3 text-xs", children: [
          "No painel Z-API → Instâncias → editar → configure o webhook ",
          /* @__PURE__ */ jsx("strong", { children: "Ao receber" }),
          '. Ative também "notificar mensagens enviadas por mim" para espelhar respostas do celular no CRM.'
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "CRM WhatsApp", fullWidth: true, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100dvh-4rem)] min-w-0 flex-col gap-3 overflow-x-hidden lg:h-[calc(100dvh-7.5rem)]", children: [
      /* @__PURE__ */ jsxs("div", { className: "hidden min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 lg:flex", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 shrink", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsx("h1", { className: "font-display text-xl font-semibold tracking-tight", children: "Inbox WhatsApp" }),
            /* @__PURE__ */ jsx(CrmConnectionBadge, { subtle: true })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-sm text-muted-foreground", children: provider === "zapi" ? "Sincronizado com Z-API · celular e CRM juntos" : "Atendimento compartilhado da clínica" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2", children: [
          /* @__PURE__ */ jsx(CrmGlobalSearch, { onOpenConversation: (id) => selectConversation(id) }),
          /* @__PURE__ */ jsx(CrmBroadcastDialog, { conversations, provider }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/crm/pipeline", children: "Funil" }) }),
          profile?.role === "admin" ? /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/crm/analytics", children: [
            /* @__PURE__ */ jsx(BarChart3, { className: "mr-2 size-4" }),
            "Métricas"
          ] }) }) : null,
          /* @__PURE__ */ jsx(
            CrmMetricsStrip,
            {
              compact: true,
              onFilterUnassigned: () => {
                setFilter("queue");
                setMobileView("list");
              },
              onFilterUnread: () => {
                setFilter("unread");
                setMobileView("list");
              }
            }
          ),
          provider === "zapi" ? /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              disabled: syncingChats,
              onClick: () => void syncChatsFromWhatsApp(),
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: cn("mr-2 size-4", syncingChats && "animate-spin") }),
                "Sincronizar chats"
              ]
            }
          ) : null,
          profile?.role === "admin" || profile?.role === "receptionist" ? /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => void assignQueueToReception(true), children: "Atribuir à recepção" }) : null,
          notifyPermission === "granted" ? null : /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "text-muted-foreground", onClick: () => void enableNotifications(), children: [
            /* @__PURE__ */ jsx(Bell, { className: "mr-1.5 size-4" }),
            isSecureNotificationContext() ? "Notificações" : "Alertas"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 px-1 lg:hidden", children: [
        mobileView !== "list" ? /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "shrink-0",
            onClick: () => setMobileView(mobileView === "details" ? "chat" : "list"),
            children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" })
          }
        ) : /* @__PURE__ */ jsx("div", { className: "size-9" }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 text-center", children: [
          /* @__PURE__ */ jsx("p", { className: "truncate font-semibold", children: mobileView === "list" ? "WhatsApp" : selected ? conversationDisplayName(selected) : composeTarget ? composeTarget.name : "Conversa" }),
          mobileView === "list" ? /* @__PURE__ */ jsx("p", { className: "truncate text-xs text-muted-foreground", children: "Inbox da clínica" }) : null
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
          /* @__PURE__ */ jsx(CrmConnectionBadge, {}),
          mobileView === "chat" && selected ? /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => setMobileView("details"), children: /* @__PURE__ */ jsx(Info, { className: "size-5" }) }) : /* @__PURE__ */ jsx("div", { className: "size-9" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        CrmMetricsStrip,
        {
          onFilterUnassigned: () => {
            setFilter("queue");
            setMobileView("list");
          },
          onFilterUnread: () => {
            setFilter("unread");
            setMobileView("list");
          }
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: cn(crmPanelShell, "min-h-0 flex-1"), children: [
        /* @__PURE__ */ jsxs(
          "aside",
          {
            className: cn(
              "flex min-w-0 flex-col overflow-hidden border-border/60 bg-muted/20 lg:border-r",
              mobileView !== "list" && "hidden lg:flex"
            ),
            children: [
              /* @__PURE__ */ jsxs("div", { className: "space-y-2 border-b border-border/50 p-2.5", children: [
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      placeholder: "Buscar conversa…",
                      value: search,
                      onChange: (e) => setSearch(e.target.value),
                      className: "h-9 rounded-full border-border/60 bg-background pl-9 text-sm shadow-none"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("div", { className: "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: [
                  ["all", "Todas"],
                  ["queue", "Fila"],
                  ["mine", "Minhas"],
                  ["unread", "Não lidas"],
                  ["transferred", "Transferidas"],
                  ["closed", "Encerradas"]
                ].map(([f, label]) => /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      crmFilterPill(filter === f),
                      f === "transferred" && pendingTransferCount > 0 && filter !== f && "text-violet-700"
                    ),
                    onClick: () => setFilter(f),
                    children: [
                      label,
                      f === "transferred" && pendingTransferCount > 0 ? /* @__PURE__ */ jsx("span", { className: "ml-1 inline-flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white", children: pendingTransferCount }) : null
                    ]
                  },
                  f
                )) }),
                /* @__PURE__ */ jsx("div", { className: "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: [
                  ["all", "Todos canais"],
                  ["whatsapp", "WhatsApp"],
                  ["instagram", "Instagram"],
                  ["messenger", "Messenger"]
                ].map(([ch, label]) => /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                      crmFilterPill(channelFilter === ch)
                    ),
                    onClick: () => setChannelFilter(ch),
                    children: label
                  },
                  ch
                )) }),
                tags.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                        crmFilterPill(!tagFilter)
                      ),
                      onClick: () => setTagFilter(null),
                      children: "Todas tags"
                    }
                  ),
                  tags.map((t) => /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      className: cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-white transition",
                        tagFilter === t.id ? "ring-2 ring-offset-1" : "opacity-80"
                      ),
                      style: { backgroundColor: t.color },
                      onClick: () => setTagFilter(tagFilter === t.id ? null : t.id),
                      children: t.name
                    },
                    t.id
                  ))
                ] }) : null
              ] }),
              /* @__PURE__ */ jsx(ScrollArea, { className: cn("flex-1 py-1", crmListScrollArea), children: loadingList ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsx(Loader2, { className: "size-6 animate-spin text-muted-foreground" }) }) : filteredConversations.length === 0 ? /* @__PURE__ */ jsx("p", { className: "p-4 text-center text-sm text-muted-foreground", children: "Nenhuma conversa." }) : /* @__PURE__ */ jsx("div", { className: "min-w-0 max-w-full px-2", children: filteredConversations.map((c) => {
                const name = conversationDisplayName(c);
                const pendingTransfer = pendingTransfers[c.id];
                const isPendingTransfer = !!pendingTransfer;
                return /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => selectConversation(c.id),
                    className: cn(
                      crmListItemBase,
                      selectedId === c.id && crmListItemActive,
                      isPendingTransfer && "ring-1 ring-violet-400/60 bg-violet-50/80 dark:bg-violet-950/20",
                      !isPendingTransfer && c.unread_count > 0 && selectedId !== c.id && "bg-emerald-500/5"
                    ),
                    children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2.5", children: [
                      /* @__PURE__ */ jsx(
                        CrmContactAvatarFromMap,
                        {
                          name,
                          conversationId: c.id,
                          photos: contactPhotos,
                          tagColor: resolveTagColor(convTagsMap[c.id]),
                          size: "sm",
                          ringClassName: cn(
                            isPendingTransfer && "ring-2 ring-violet-500 ring-offset-1"
                          )
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                          /* @__PURE__ */ jsx(
                            "p",
                            {
                              className: cn(
                                "truncate",
                                isPendingTransfer || c.unread_count > 0 ? "font-semibold" : "font-medium"
                              ),
                              children: name
                            }
                          ),
                          /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[10px] text-muted-foreground", children: isPendingTransfer ? fmtRelativeTime(pendingTransfer.created_at) : fmtRelativeTime(c.last_message_at) })
                        ] }),
                        isPendingTransfer ? /* @__PURE__ */ jsxs("p", { className: "truncate text-xs font-medium text-violet-700 dark:text-violet-300", children: [
                          /* @__PURE__ */ jsx(ArrowRightLeft, { className: "mr-1 inline size-3" }),
                          "Transferida por ",
                          pendingTransfer.from_profile?.full_name ?? "equipe",
                          pendingTransfer.note ? ` · ${pendingTransfer.note}` : ""
                        ] }) : /* @__PURE__ */ jsx(
                          "p",
                          {
                            className: cn(
                              "truncate text-xs",
                              c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                            ),
                            children: c.last_message_preview ?? "Sem mensagens"
                          }
                        ),
                        /* @__PURE__ */ jsxs("div", { className: "mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden", children: [
                          (c.channel ?? "whatsapp") !== "whatsapp" ? /* @__PURE__ */ jsx(
                            Badge,
                            {
                              variant: "secondary",
                              className: cn("h-4 shrink-0 px-1.5 text-[9px]", CHANNEL_BADGE_CLASS[c.channel ?? "whatsapp"]),
                              children: CHANNEL_LABEL[c.channel ?? "whatsapp"] ?? c.channel
                            }
                          ) : null,
                          isPendingTransfer ? /* @__PURE__ */ jsx(Badge, { className: "h-4 shrink-0 bg-violet-600 px-1.5 text-[10px] hover:bg-violet-600", children: "Nova transferência" }) : null,
                          /* @__PURE__ */ jsxs("p", { className: "min-w-0 flex-1 truncate text-[10px] text-muted-foreground", children: [
                            c.patients?.full_name && c.contact_name && c.contact_name !== c.patients.full_name ? `${c.contact_name} · ` : "",
                            c.assigned_profile?.full_name ? /* @__PURE__ */ jsxs(Fragment, { children: [
                              "→ ",
                              c.assigned_profile.full_name
                            ] }) : /* @__PURE__ */ jsx("span", { className: "text-amber-600 dark:text-amber-400", children: "Sem responsável" })
                          ] }),
                          c.unread_count > 0 ? /* @__PURE__ */ jsx(Badge, { className: "h-4 shrink-0 px-1.5 text-[10px]", children: c.unread_count }) : null
                        ] })
                      ] })
                    ] })
                  },
                  c.id
                );
              }) }) }),
              /* @__PURE__ */ jsx("div", { className: "border-t border-border/50 bg-background/50 p-2", children: /* @__PURE__ */ jsxs(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  className: "h-8 w-full rounded-full text-xs",
                  onClick: () => setManualConvOpen(true),
                  children: [
                    /* @__PURE__ */ jsx(Plus, { className: "mr-1.5 size-3.5" }),
                    "Iniciar por telefone"
                  ]
                }
              ) })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "main",
          {
            className: cn(
              "flex min-w-0 flex-col overflow-hidden",
              mobileView === "list" && "hidden lg:flex",
              mobileView === "details" && "hidden lg:flex"
            ),
            children: !selected && !composeTarget ? /* @__PURE__ */ jsx("div", { className: cn("flex flex-1 flex-col items-center justify-center", crmChatBg), children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-background/80 px-8 py-10 text-center shadow-sm backdrop-blur-sm", children: [
              /* @__PURE__ */ jsx(MessageSquare, { className: "mx-auto mb-3 size-10 text-emerald-600/40" }),
              /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: "Selecione uma conversa" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Escolha um contato na lista ou inicie por telefone" })
            ] }) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-center gap-2.5", children: [
                  composeTarget ? /* @__PURE__ */ jsx(
                    CrmContactAvatar,
                    {
                      name: composeTarget.name,
                      conversationId: "compose",
                      size: "md"
                    }
                  ) : selected ? /* @__PURE__ */ jsx(
                    CrmContactAvatarFromMap,
                    {
                      name: conversationDisplayName(selected),
                      conversationId: selected.id,
                      photos: contactPhotos,
                      tagColor: resolveTagColor(conversationTagIds),
                      size: "md"
                    }
                  ) : null,
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsx("p", { className: "truncate font-semibold tracking-tight", children: composeTarget ? composeTarget.name : conversationDisplayName(selected) }),
                    /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: composeTarget ? formatPhoneBR(composeTarget.phone) : formatPhoneBR(selected.contact_phone) }),
                    !composeTarget && patientLink ? /* @__PURE__ */ jsxs(
                      Link,
                      {
                        to: patientLink.to,
                        params: patientLink.params,
                        className: "mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400",
                        children: [
                          "Prontuário",
                          /* @__PURE__ */ jsx(ExternalLink, { className: "size-3" })
                        ]
                      }
                    ) : null
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "flex shrink-0 items-center gap-2", children: composeTarget ? /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-700", children: "Nova conversa" }) : selected ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "font-normal", children: WA_STATUS_LABEL[selected.status] ?? selected.status }),
                  profile && selected.assigned_to !== profile.id ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", className: "h-8 rounded-full text-xs", onClick: () => void assignToMe(), children: "Assumir" }) : null
                ] }) : null })
              ] }),
              !composeTarget && selectedPendingTransfer ? /* @__PURE__ */ jsxs("div", { className: "border-b border-violet-200 bg-violet-50 px-4 py-2.5 text-sm dark:border-violet-900 dark:bg-violet-950/40", children: [
                /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1.5 font-medium text-violet-800 dark:text-violet-200", children: [
                  /* @__PURE__ */ jsx(ArrowRightLeft, { className: "size-4 shrink-0" }),
                  selectedPendingTransfer.from_profile?.full_name ?? "Alguém da equipe",
                  " transferiu esta conversa para você"
                ] }),
                selectedPendingTransfer.note ? /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-violet-700 dark:text-violet-300", children: [
                  "Observação: ",
                  selectedPendingTransfer.note
                ] }) : null
              ] }) : null,
              /* @__PURE__ */ jsx(ScrollArea, { className: cn("min-h-0 flex-1 overflow-x-hidden px-3 py-3", crmChatBg), children: composeTarget ? /* @__PURE__ */ jsx("div", { className: "flex min-h-[min(50vh,320px)] flex-col items-center justify-center py-12", children: /* @__PURE__ */ jsxs("div", { className: "max-w-sm rounded-2xl bg-background/85 px-5 py-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-sm", children: [
                /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: "Nova conversa" }),
                /* @__PURE__ */ jsxs("p", { className: "mt-2", children: [
                  "Digite abaixo e envie para iniciar o chat com",
                  " ",
                  /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: composeTarget.name }),
                  " no WhatsApp."
                ] })
              ] }) }) : loadingChat ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsx(Loader2, { className: "size-6 animate-spin text-muted-foreground" }) }) : messages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "flex min-h-[min(50vh,320px)] flex-col items-center justify-center px-6 py-12", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md rounded-2xl bg-background/85 px-5 py-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-sm", children: [
                /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: "Sem histórico nesta conversa" }),
                /* @__PURE__ */ jsxs("p", { className: "mt-2", children: [
                  "O CRM só guarda mensagens que chegam pelo ",
                  /* @__PURE__ */ jsx("strong", { children: "webhook" }),
                  " depois de configurado. A Z-API não permite importar conversas antigas do celular."
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-2", children: selected?.last_message_preview === "Sincronizado com WhatsApp" || selected?.last_message_preview === "Aguardando mensagens (webhook)" ? "Este contato veio do botão “Sincronizar chats” (só a lista, sem mensagens)." : "Envie ou receba uma mensagem agora para começar o histórico aqui." })
              ] }) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 pb-2", children: [
                messages.map((m) => /* @__PURE__ */ jsx(
                  CrmMessageBubble,
                  {
                    message: m,
                    resolveMediaUrl,
                    replyTo: m.reply_to_message_id ? messagesById.get(m.reply_to_message_id) : null,
                    onReply: setReplyTo,
                    highlighted: msgSearchHits.some((h) => h.id === m.id)
                  },
                  m.id
                )),
                /* @__PURE__ */ jsx("div", { ref: bottomRef })
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: crmComposerBar, children: [
                replyTo ? /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs", children: [
                  /* @__PURE__ */ jsx(Reply, { className: "size-3.5 shrink-0 text-emerald-600" }),
                  /* @__PURE__ */ jsx("p", { className: "line-clamp-1 flex-1 text-muted-foreground", children: replyTo.body ?? replyTo.message_type }),
                  /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground hover:text-foreground", onClick: () => setReplyTo(null), children: /* @__PURE__ */ jsx(X, { className: "size-3.5" }) })
                ] }) : null,
                /* @__PURE__ */ jsx(
                  CrmQuickReplies,
                  {
                    disabled: sending || !selectedId && !composeTarget || selected?.status === "closed",
                    templateVars: quickReplyVars,
                    onSelect: (t) => setText((prev) => prev ? `${prev}
${t}` : t)
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-1.5 rounded-2xl border border-border/50 bg-background p-1.5 shadow-sm", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: fileRef,
                      type: "file",
                      accept: "image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf",
                      className: "hidden",
                      onChange: (e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: videoFileRef,
                      type: "file",
                      accept: "video/mp4,video/3gpp,video/quicktime,.mp4,.3gp,.mov",
                      className: "hidden",
                      onChange: (e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: audioFileRef,
                      type: "file",
                      accept: "audio/*,.mp3,.ogg,.m4a,.aac,.wav",
                      className: "hidden",
                      onChange: (e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "size-9 shrink-0 rounded-full", onClick: () => fileRef.current?.click(), disabled: sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp", title: "Enviar foto ou PDF", children: /* @__PURE__ */ jsx(Paperclip, { className: "size-4" }) }),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "ghost",
                      size: "icon",
                      className: "size-9 shrink-0 rounded-full",
                      onClick: () => videoFileRef.current?.click(),
                      disabled: sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp",
                      title: "Enviar vídeo",
                      children: /* @__PURE__ */ jsx(Video, { className: "size-4" })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      variant: "ghost",
                      size: "icon",
                      className: "size-9 shrink-0 rounded-full",
                      onClick: () => audioFileRef.current?.click(),
                      disabled: sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp",
                      title: "Anexar áudio",
                      children: /* @__PURE__ */ jsx(FileAudio, { className: "size-4" })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    CrmAudioRecorder,
                    {
                      disabled: sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp",
                      onRecorded: (f) => void sendFile(f)
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      placeholder: "Digite uma mensagem…",
                      value: text,
                      onChange: (e) => setText(e.target.value),
                      disabled: !composeTarget && selected?.status === "closed",
                      onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void sendText()),
                      className: "min-h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    Button,
                    {
                      size: "icon",
                      className: "size-9 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700",
                      onClick: () => void sendText(),
                      disabled: sending || !text.trim() || !composeTarget && selected?.status === "closed",
                      children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "size-4" })
                    }
                  )
                ] })
              ] })
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "aside",
          {
            className: cn(
              crmDetailAsideShell,
              mobileView !== "details" && "hidden lg:flex"
            ),
            children: /* @__PURE__ */ jsxs(Tabs, { value: detailTab, onValueChange: setDetailTab, className: crmDetailTabsRoot, children: [
              /* @__PURE__ */ jsx(TabsList, { className: crmDetailTabList, children: [
                ["tags", Tag, "Tags"],
                ["patient", UserRound, "Paciente"],
                ["notes", StickyNote, "Notas"],
                ["tasks", ClipboardList, "Tarefas"],
                ["reminders", Bell, "Alertas"],
                ["transfer", ArrowRightLeft, "Equipe"]
              ].map(([value, Icon, label]) => /* @__PURE__ */ jsxs(
                TabsTrigger,
                {
                  value,
                  className: cn(crmDetailTabTrigger, "h-auto data-[state=active]:shadow-none"),
                  children: [
                    /* @__PURE__ */ jsx(Icon, { className: "size-4 shrink-0" }),
                    /* @__PURE__ */ jsx("span", { className: "leading-none", children: label })
                  ]
                },
                value
              )) }),
              /* @__PURE__ */ jsxs("div", { className: crmDetailContentWrap, children: [
                /* @__PURE__ */ jsxs("div", { className: crmDetailHeader, children: [
                  /* @__PURE__ */ jsx("p", { className: "text-[11px] font-medium uppercase tracking-wide text-muted-foreground", children: detailTabLabels[detailTab] ?? "Detalhes" }),
                  /* @__PURE__ */ jsx("p", { className: "mt-0.5 truncate text-sm font-semibold", children: selected ? conversationDisplayName(selected) : "Selecione uma conversa" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: crmDetailScroll, children: [
                  /* @__PURE__ */ jsxs(TabsContent, { value: "patient", className: crmDetailTabContent, children: [
                    selected?.patient_id ? /* @__PURE__ */ jsx(CrmDetailSection, { title: "Prontuário vinculado", bare: true, children: /* @__PURE__ */ jsx(
                      CrmPatientPanel,
                      {
                        patientId: selected.patient_id,
                        patientName: selected.patients?.full_name ?? conversationDisplayName(selected)
                      }
                    ) }) : /* @__PURE__ */ jsx(
                      CrmDetailEmpty,
                      {
                        icon: UserRound,
                        title: "Sem paciente vinculado",
                        description: "Busque e vincule um paciente para ver agenda e histórico."
                      }
                    ),
                    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Vincular paciente", children: [
                      /* @__PURE__ */ jsx(
                        Input,
                        {
                          placeholder: "Buscar por nome…",
                          value: patientSearch,
                          onChange: (e) => void searchPatients(e.target.value),
                          className: "h-9"
                        }
                      ),
                      /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-1", children: patientOptions.map((p) => /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          className: "block w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-xs transition hover:border-border hover:bg-muted/50",
                          onClick: () => void linkPatient(p.id),
                          children: [
                            p.full_name,
                            p.phone ? /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
                              " · ",
                              p.phone
                            ] }) : null
                          ]
                        },
                        p.id
                      )) }),
                      selected?.patient_id ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", className: "mt-2 h-8 w-full text-xs", onClick: () => void linkPatient(null), children: "Remover vínculo" }) : null
                    ] }),
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: "Funil de vendas", children: !selected?.deal_id ? /* @__PURE__ */ jsx(Button, { size: "sm", className: "w-full bg-emerald-600 hover:bg-emerald-700", onClick: () => void addToPipeline(), children: "Adicionar ao funil" }) : /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", className: "w-full", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/crm/pipeline", children: "Ver no funil" }) }) }),
                    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Buscar no histórico", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                        /* @__PURE__ */ jsx(
                          Input,
                          {
                            placeholder: "Texto da mensagem…",
                            value: msgSearch,
                            onChange: (e) => setMsgSearch(e.target.value),
                            onKeyDown: (e) => e.key === "Enter" && void runMsgSearch(),
                            className: "h-9"
                          }
                        ),
                        /* @__PURE__ */ jsx(Button, { size: "icon", variant: "outline", className: "size-9 shrink-0", onClick: () => void runMsgSearch(), children: /* @__PURE__ */ jsx(Search, { className: "size-4" }) })
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-1.5", children: msgSearchHits.map((h) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-muted/40 px-2.5 py-2 text-xs", children: [
                        /* @__PURE__ */ jsx("p", { className: "line-clamp-2", children: h.body }),
                        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[10px] text-muted-foreground", children: fmtDateTime(h.created_at) })
                      ] }, h.id)) })
                    ] }),
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: "Status da conversa", children: selected?.status === "closed" ? /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                        "Encerrada",
                        selected.close_reason ? `: ${selected.close_reason}` : ""
                      ] }),
                      /* @__PURE__ */ jsx(Button, { size: "sm", className: "mt-2 w-full", onClick: () => void reopenConversation(), children: "Reabrir conversa" })
                    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsxs(Select, { value: closeReason, onValueChange: setCloseReason, children: [
                        /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                        /* @__PURE__ */ jsx(SelectContent, { children: WA_CLOSE_REASONS.map((r) => /* @__PURE__ */ jsx(SelectItem, { value: r, children: r }, r)) })
                      ] }),
                      /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", className: "mt-2 w-full", onClick: () => void closeConversation(), children: "Encerrar conversa" })
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsxs(TabsContent, { value: "tags", className: crmDetailTabContent, children: [
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: "Tags da conversa", description: "Clique na tag colorida (com ✓) para remover", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: tags.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhuma tag criada ainda." }) : tags.map((t) => {
                      const active = conversationTagIds.includes(t.id);
                      return /* @__PURE__ */ jsxs(
                        "button",
                        {
                          type: "button",
                          disabled: !selectedId,
                          onClick: () => void toggleTag(t.id),
                          className: cn(
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white transition hover:scale-[1.02] active:scale-[0.98]",
                            active ? "ring-2 ring-offset-2 ring-offset-background shadow-sm" : "opacity-60 hover:opacity-100",
                            !selectedId && "cursor-not-allowed opacity-40"
                          ),
                          style: { backgroundColor: t.color },
                          title: active ? "Clique para remover" : "Clique para aplicar",
                          children: [
                            active ? "✓ " : null,
                            t.name
                          ]
                        },
                        t.id
                      );
                    }) }) }),
                    /* @__PURE__ */ jsx(
                      CrmDetailSection,
                      {
                        title: "Objeção do lead",
                        description: "Dispara sequência manual — a secretária envia a mensagem sugerida",
                        children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: Object.entries(WA_OBJECTION_LABELS).map(
                          ([key, label]) => /* @__PURE__ */ jsx(
                            Button,
                            {
                              type: "button",
                              size: "sm",
                              variant: selected?.objection_type === key ? "default" : "outline",
                              className: "h-8 rounded-full text-xs",
                              disabled: !selectedId,
                              onClick: () => void markObjection(key),
                              children: label
                            },
                            key
                          )
                        ) })
                      }
                    ),
                    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Nova tag", children: [
                      /* @__PURE__ */ jsx(Input, { value: newTagName, onChange: (e) => setNewTagName(e.target.value), placeholder: "Nome da tag", className: "h-9" }),
                      /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: TAG_COLORS.map((c) => /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          className: cn("size-7 rounded-full transition", newTagColor === c && "ring-2 ring-offset-2 ring-offset-background"),
                          style: { backgroundColor: c },
                          onClick: () => setNewTagColor(c)
                        },
                        c
                      )) }),
                      /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", className: "mt-3 w-full", onClick: () => void createTag(), children: "Criar tag" })
                    ] }),
                    /* @__PURE__ */ jsx(CrmTagRulesPanel, { tags })
                  ] }),
                  /* @__PURE__ */ jsx(TabsContent, { value: "tasks", className: crmDetailTabContent, children: /* @__PURE__ */ jsx(
                    CrmTasksPanel,
                    {
                      conversationId: selectedId,
                      staff,
                      currentUserId: profile?.id ?? ""
                    }
                  ) }),
                  /* @__PURE__ */ jsxs(TabsContent, { value: "notes", className: crmDetailTabContent, children: [
                    /* @__PURE__ */ jsxs(
                      CrmDetailSection,
                      {
                        title: "Nova nota",
                        description: "Visível só para a equipe — não é enviada ao WhatsApp.",
                        children: [
                          /* @__PURE__ */ jsx(
                            Textarea,
                            {
                              placeholder: "Ex.: paciente prefere horário da tarde, aguardando exames…",
                              value: noteText,
                              onChange: (e) => setNoteText(e.target.value),
                              rows: 4,
                              className: "min-h-[96px] resize-none border-0 bg-muted/30 px-3 py-2.5 shadow-none focus-visible:ring-1"
                            }
                          ),
                          /* @__PURE__ */ jsx(
                            Button,
                            {
                              size: "sm",
                              disabled: !selectedId || !noteText.trim(),
                              className: "mt-3 w-full bg-emerald-600 hover:bg-emerald-700",
                              onClick: () => void addNote(),
                              children: "Salvar nota"
                            }
                          )
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: notes.length ? `Histórico (${notes.length})` : "Histórico", bare: true, children: notes.length === 0 ? /* @__PURE__ */ jsx(
                      CrmDetailEmpty,
                      {
                        icon: StickyNote,
                        title: "Nenhuma nota ainda",
                        description: "Registre observações internas sobre este atendimento."
                      }
                    ) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: notes.map((n) => /* @__PURE__ */ jsxs("div", { className: crmNoteCard, children: [
                      /* @__PURE__ */ jsx("p", { className: "text-sm leading-relaxed text-foreground/90", children: n.content }),
                      /* @__PURE__ */ jsxs("p", { className: "mt-2 text-[10px] text-muted-foreground", children: [
                        n.author?.full_name ?? "Equipe",
                        " · ",
                        fmtDateTime(n.created_at)
                      ] })
                    ] }, n.id)) }) })
                  ] }),
                  /* @__PURE__ */ jsxs(TabsContent, { value: "reminders", className: crmDetailTabContent, children: [
                    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Novo lembrete", children: [
                      /* @__PURE__ */ jsx(Input, { type: "datetime-local", value: reminderAt, onChange: (e) => setReminderAt(e.target.value), className: "h-9" }),
                      /* @__PURE__ */ jsx(
                        Input,
                        {
                          placeholder: "Descrição (opcional)",
                          value: reminderNote,
                          onChange: (e) => setReminderNote(e.target.value),
                          className: "mt-2 h-9"
                        }
                      ),
                      /* @__PURE__ */ jsx(Button, { size: "sm", disabled: !selectedId || !reminderAt, className: "mt-3 w-full", onClick: () => void addReminder(), children: "Criar lembrete" })
                    ] }),
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: "Pendentes", bare: true, children: reminders.length === 0 ? /* @__PURE__ */ jsx(CrmDetailEmpty, { icon: Bell, title: "Sem lembretes", description: "Crie alertas para retornar a este contato." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: reminders.map((r) => /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: cn(
                          "rounded-xl border border-border/40 bg-background p-3 shadow-sm",
                          r.completed && "opacity-50"
                        ),
                        children: [
                          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: fmtDateTime(r.remind_at) }),
                          r.note ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: r.note }) : null,
                          !r.completed ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", className: "mt-2 h-7 px-2 text-xs", onClick: () => void completeReminder(r.id), children: "Marcar concluído" }) : null
                        ]
                      },
                      r.id
                    )) }) })
                  ] }),
                  /* @__PURE__ */ jsxs(TabsContent, { value: "transfer", className: crmDetailTabContent, children: [
                    /* @__PURE__ */ jsxs(CrmDetailSection, { title: "Transferir conversa", children: [
                      /* @__PURE__ */ jsxs(Select, { value: transferTo, onValueChange: setTransferTo, children: [
                        /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Transferir para…" }) }),
                        /* @__PURE__ */ jsx(SelectContent, { children: staff.map((s) => /* @__PURE__ */ jsx(SelectItem, { value: s.id, children: s.full_name }, s.id)) })
                      ] }),
                      /* @__PURE__ */ jsx(
                        Input,
                        {
                          placeholder: "Observação para quem recebe",
                          value: transferNote,
                          onChange: (e) => setTransferNote(e.target.value),
                          className: "mt-2 h-9"
                        }
                      ),
                      /* @__PURE__ */ jsx(Button, { size: "sm", disabled: !selectedId || !transferTo, className: "mt-3 w-full", onClick: () => void doTransfer(), children: "Transferir agora" })
                    ] }),
                    /* @__PURE__ */ jsx(CrmDetailSection, { title: "Histórico", bare: true, children: transfers.length === 0 ? /* @__PURE__ */ jsx(CrmDetailEmpty, { icon: ArrowRightLeft, title: "Nenhuma transferência" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: transfers.map((t) => {
                      const isPendingForMe = profile?.id === t.to_user_id && !t.seen_at;
                      return /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: cn(
                            "rounded-xl border p-3 text-xs",
                            isPendingForMe ? "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100" : "border-border/40 bg-background"
                          ),
                          children: [
                            /* @__PURE__ */ jsxs("p", { className: "font-medium", children: [
                              t.from_profile?.full_name ?? "—",
                              " → ",
                              t.to_profile?.full_name
                            ] }),
                            isPendingForMe ? /* @__PURE__ */ jsx(Badge, { className: "mt-1 h-4 bg-violet-600 px-1.5 text-[10px] hover:bg-violet-600", children: "Aguardando leitura" }) : null,
                            /* @__PURE__ */ jsx("p", { className: "mt-1 text-muted-foreground", children: fmtDateTime(t.created_at) }),
                            t.note ? /* @__PURE__ */ jsx("p", { className: "mt-1 italic text-muted-foreground", children: t.note }) : null
                          ]
                        },
                        t.id
                      );
                    }) }) })
                  ] })
                ] })
              ] })
            ] })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: manualConvOpen, onOpenChange: setManualConvOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-md", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Iniciar conversa por telefone" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "manual-phone", children: "Telefone (com DDD)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "manual-phone",
              placeholder: "(33) 99999-9999",
              value: newPhone,
              onChange: (e) => setNewPhone(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "manual-name", children: "Nome (opcional)" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "manual-name",
              placeholder: "Nome do contato",
              value: newName,
              onChange: (e) => setNewName(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "manual-msg", children: "Primeira mensagem" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "manual-msg",
              placeholder: "Olá, tudo bem?",
              value: newMsg,
              onChange: (e) => setNewMsg(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setManualConvOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { disabled: sending || !newPhone.trim() || !newMsg.trim(), onClick: () => void startConversation(), children: sending ? "Enviando…" : "Iniciar conversa" })
      ] })
    ] }) })
  ] });
}
const SplitComponent = CrmInboxPage;
export {
  SplitComponent as component
};
